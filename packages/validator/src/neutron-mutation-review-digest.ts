import { checksum } from "@intentloom/core";
import type { NeutronMutationReviewFileBinding } from "../../protocol/src/neutron-mutation-review-artifact.js";
import { NEUTRON_MUTATION_REVIEW_ARTIFACT_SCHEMA_URN } from "../../protocol/src/neutron-mutation-review-artifact.js";
import {
  assertNeutronMutationDigest,
  canonicalNeutronMutationJson,
  canonicalizeNeutronMutationPaths,
  neutronMutationContentDigest,
} from "./neutron-mutation-canonical.js";

export const NEUTRON_CONTENT_BOUND_PLAN_SCHEMA_URN =
  "urn:intentloom:schema:neutron-mutation-content-bound-plan:1" as const;

export function digestGeneratedFileContent(content: string): string {
  return neutronMutationContentDigest(checksum(content));
}

export function canonicalizeReviewFileBindings(
  bindings: readonly NeutronMutationReviewFileBinding[],
): readonly NeutronMutationReviewFileBinding[] {
  if (bindings.length === 0) {
    throw new Error("fileBindings must contain at least one entry");
  }
  const normalized = bindings.map((binding, index) => {
    const path = canonicalizeNeutronMutationPaths(
      [binding.path],
      `fileBindings[${index}].path`,
    )[0]!;
    const contentDigest = assertNeutronMutationDigest(
      binding.contentDigest,
      `fileBindings[${index}].contentDigest`,
    );
    return { path, contentDigest };
  });
  normalized.sort((left, right) =>
    left.path < right.path ? -1 : left.path > right.path ? 1 : 0,
  );
  const paths = new Set<string>();
  for (const entry of normalized) {
    if (paths.has(entry.path)) {
      throw new Error("fileBindings must not contain duplicate paths");
    }
    paths.add(entry.path);
  }
  return normalized;
}

export function digestContentBoundApplyPlan(input: {
  readonly projectStateDigest: string;
  readonly targetRoot: string;
  readonly fileBindings: readonly NeutronMutationReviewFileBinding[];
}): string {
  const fileBindings = canonicalizeReviewFileBindings(input.fileBindings);
  const changedPaths = fileBindings.map((binding) => binding.path);
  return neutronMutationContentDigest(
    canonicalNeutronMutationJson({
      schemaVersion: NEUTRON_CONTENT_BOUND_PLAN_SCHEMA_URN,
      projectStateDigest: assertNeutronMutationDigest(
        input.projectStateDigest,
        "projectStateDigest",
      ),
      targetRoot: input.targetRoot,
      changedPaths,
      fileBindings,
    }),
  );
}

export interface NeutronMutationReviewArtifactFacts {
  readonly artifactId: string;
  readonly transactionId: string;
  readonly proposalId: string;
  readonly sessionId: string;
  readonly projectId: string;
  readonly root: string;
  readonly taskId?: string;
  readonly graphId?: string;
  readonly mutationClass: "approved-transaction-apply";
  readonly projectStateDigest: string;
  readonly changedPaths: readonly string[];
  readonly fileBindings: readonly NeutronMutationReviewFileBinding[];
  readonly planDigest: string;
  readonly expiresAt?: number;
}

export function digestNeutronMutationReviewArtifact(
  facts: NeutronMutationReviewArtifactFacts,
): string {
  const changedPaths = canonicalizeNeutronMutationPaths(
    facts.changedPaths,
    "changedPaths",
  );
  const fileBindings = canonicalizeReviewFileBindings(facts.fileBindings);
  if (!exactPathBindingAlignment(changedPaths, fileBindings)) {
    throw new Error("changedPaths must align exactly with fileBindings paths");
  }
  const expectedPlan = digestContentBoundApplyPlan({
    projectStateDigest: facts.projectStateDigest,
    targetRoot: facts.root,
    fileBindings,
  });
  if (facts.planDigest !== expectedPlan) {
    throw new Error("planDigest must match content-bound apply plan digest");
  }
  return neutronMutationContentDigest(
    canonicalNeutronMutationJson({
      schemaVersion: NEUTRON_MUTATION_REVIEW_ARTIFACT_SCHEMA_URN,
      artifactId: facts.artifactId,
      transactionId: facts.transactionId,
      proposalId: facts.proposalId,
      sessionId: facts.sessionId,
      projectId: facts.projectId,
      root: facts.root,
      taskId: facts.taskId ?? null,
      graphId: facts.graphId ?? null,
      mutationClass: facts.mutationClass,
      projectStateDigest: facts.projectStateDigest,
      changedPaths,
      fileBindings,
      planDigest: facts.planDigest,
      expiresAt: facts.expiresAt ?? null,
    }),
  );
}

function exactPathBindingAlignment(
  changedPaths: readonly string[],
  fileBindings: readonly NeutronMutationReviewFileBinding[],
): boolean {
  if (changedPaths.length !== fileBindings.length) return false;
  for (let index = 0; index < changedPaths.length; index += 1) {
    if (changedPaths[index] !== fileBindings[index]!.path) return false;
  }
  return true;
}
