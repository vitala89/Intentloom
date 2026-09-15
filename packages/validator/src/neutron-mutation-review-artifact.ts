import { checksum } from "@intentloom/core";
import type { GeneratedFile } from "@intentloom/core";
import { NEUTRON_MUTATION_CLASS } from "../../protocol/src/neutron-mutation.js";
import type { NeutronMutationProposal } from "../../protocol/src/neutron-mutation.js";
import {
  NEUTRON_MUTATION_REVIEW_ARTIFACT_SCHEMA_URN,
  NEUTRON_MUTATION_REVIEW_MAX_AGGREGATE_CONTENT_BYTES,
  NEUTRON_MUTATION_REVIEW_MAX_FILE_CONTENT_BYTES,
  NEUTRON_MUTATION_REVIEW_MAX_FILES,
  NEUTRON_MUTATION_REVIEW_MAX_PATH_LENGTH,
  type NeutronMutationReviewArtifact,
  type NeutronMutationReviewFileBinding,
} from "../../protocol/src/neutron-mutation-review-artifact.js";
import {
  assertNeutronMutationDigest,
  canonicalizeNeutronMutationPaths,
} from "./neutron-mutation-canonical.js";
import { exactNeutronMutationPathSetsEqual } from "./neutron-mutation-path-set.js";
import {
  canonicalizeReviewFileBindings,
  digestContentBoundApplyPlan,
  digestGeneratedFileContent,
  digestNeutronMutationReviewArtifact,
  type NeutronMutationReviewArtifactFacts,
} from "./neutron-mutation-review-digest.js";
import {
  finiteInt,
  isObject,
  nonEmpty,
  oneOf,
} from "./neutron-runtime-helpers.js";

function optionalId(value: unknown, field: string): string | undefined {
  if (value === undefined) return undefined;
  return nonEmpty(value, field);
}

function assertPathLength(path: string, field: string): void {
  if (path.length > NEUTRON_MUTATION_REVIEW_MAX_PATH_LENGTH) {
    throw new Error(`${field} exceeds maximum path length`);
  }
}

function bindingsFromGeneratedFiles(
  files: readonly GeneratedFile[],
): NeutronMutationReviewFileBinding[] {
  if (files.length === 0) {
    throw new Error("mutation payload must include at least one file");
  }
  if (files.length > NEUTRON_MUTATION_REVIEW_MAX_FILES) {
    throw new Error("mutation payload exceeds maximum file count");
  }
  let aggregateBytes = 0;
  const bindings: NeutronMutationReviewFileBinding[] = [];
  for (const [index, file] of files.entries()) {
    if (typeof file.content !== "string") {
      throw new Error(`files[${String(index)}].content must be a string`);
    }
    const byteLength = Buffer.byteLength(file.content, "utf8");
    if (byteLength > NEUTRON_MUTATION_REVIEW_MAX_FILE_CONTENT_BYTES) {
      throw new Error(`files[${String(index)}] exceeds maximum content size`);
    }
    aggregateBytes += byteLength;
    if (aggregateBytes > NEUTRON_MUTATION_REVIEW_MAX_AGGREGATE_CONTENT_BYTES) {
      throw new Error(
        "mutation payload exceeds maximum aggregate content size",
      );
    }
    const path = canonicalizeNeutronMutationPaths(
      [file.path],
      `files[${String(index)}].path`,
    )[0]!;
    assertPathLength(path, `files[${String(index)}].path`);
    const contentDigest = digestGeneratedFileContent(file.content);
    if (
      file.checksum !== undefined &&
      file.checksum !== checksum(file.content)
    ) {
      throw new Error(
        `files[${String(index)}].checksum does not match content`,
      );
    }
    bindings.push({ path, contentDigest });
  }
  return [...canonicalizeReviewFileBindings(bindings)];
}

export function buildNeutronMutationReviewArtifactFacts(input: {
  readonly proposal: NeutronMutationProposal;
  readonly files: readonly GeneratedFile[];
  readonly artifactId: string;
  readonly transactionId: string;
}): NeutronMutationReviewArtifactFacts {
  const fileBindings = bindingsFromGeneratedFiles(input.files);
  const changedPaths = fileBindings.map((binding) => binding.path);
  if (
    !exactNeutronMutationPathSetsEqual(
      changedPaths,
      input.proposal.plan.changedPaths,
    )
  ) {
    throw new Error("proposal changedPaths must match payload paths exactly");
  }
  const planDigest = digestContentBoundApplyPlan({
    projectStateDigest: input.proposal.plan.projectStateDigest,
    targetRoot: input.proposal.plan.targetRoot,
    fileBindings,
  });
  if (input.proposal.plan.planDigest !== planDigest) {
    throw new Error(
      "planDigest must be the content-bound digest of reviewed file bytes",
    );
  }
  return {
    artifactId: input.artifactId,
    transactionId: input.transactionId,
    proposalId: input.proposal.proposalId,
    sessionId: input.proposal.sessionId,
    projectId: input.proposal.projectId,
    root: input.proposal.root,
    ...(input.proposal.taskId !== undefined
      ? { taskId: input.proposal.taskId }
      : {}),
    ...(input.proposal.graphId !== undefined
      ? { graphId: input.proposal.graphId }
      : {}),
    mutationClass: input.proposal.mutationClass,
    projectStateDigest: input.proposal.plan.projectStateDigest,
    changedPaths,
    fileBindings,
    planDigest,
    ...(input.proposal.plan.expiresAt !== undefined
      ? { expiresAt: input.proposal.plan.expiresAt }
      : {}),
  };
}

export function materializeNeutronMutationReviewArtifact(input: {
  readonly proposal: NeutronMutationProposal;
  readonly files: readonly GeneratedFile[];
  readonly artifactId: string;
  readonly transactionId: string;
}): NeutronMutationReviewArtifact {
  const facts = buildNeutronMutationReviewArtifactFacts(input);
  const artifactDigest = digestNeutronMutationReviewArtifact(facts);
  return validateNeutronMutationReviewArtifact({
    schemaVersion: NEUTRON_MUTATION_REVIEW_ARTIFACT_SCHEMA_URN,
    ...facts,
    artifactDigest,
  });
}

export function validateNeutronMutationReviewArtifact(
  value: unknown,
): NeutronMutationReviewArtifact {
  if (!isObject(value)) {
    throw new Error("mutation review artifact must be an object");
  }
  if (value.schemaVersion !== NEUTRON_MUTATION_REVIEW_ARTIFACT_SCHEMA_URN) {
    throw new Error("unsupported neutron mutation review artifact schema");
  }
  const changedPaths = canonicalizeNeutronMutationPaths(
    Array.isArray(value.changedPaths) ? value.changedPaths : [],
    "changedPaths",
  );
  if (changedPaths.length > NEUTRON_MUTATION_REVIEW_MAX_FILES) {
    throw new Error("changedPaths exceeds maximum file count");
  }
  for (const path of changedPaths) assertPathLength(path, "changedPaths entry");
  if (!Array.isArray(value.fileBindings)) {
    throw new Error("fileBindings must be an array");
  }
  const fileBindings = canonicalizeReviewFileBindings(
    value.fileBindings as NeutronMutationReviewFileBinding[],
  );
  if (
    !exactNeutronMutationPathSetsEqual(
      changedPaths,
      fileBindings.map((b) => b.path),
    )
  ) {
    throw new Error("changedPaths must match fileBindings paths exactly");
  }
  const planDigest = assertNeutronMutationDigest(
    value.planDigest,
    "planDigest",
  );
  const projectStateDigest = assertNeutronMutationDigest(
    value.projectStateDigest,
    "projectStateDigest",
  );
  const taskId = optionalId(value.taskId, "taskId");
  const graphId = optionalId(value.graphId, "graphId");
  let expiresAt: number | undefined;
  if (value.expiresAt !== undefined) {
    expiresAt = finiteInt(value.expiresAt, "expiresAt");
    if (expiresAt <= 0) throw new Error("expiresAt must be positive");
  }
  const facts: NeutronMutationReviewArtifactFacts = {
    artifactId: nonEmpty(value.artifactId, "artifactId"),
    transactionId: nonEmpty(value.transactionId, "transactionId"),
    proposalId: nonEmpty(value.proposalId, "proposalId"),
    sessionId: nonEmpty(value.sessionId, "sessionId"),
    projectId: nonEmpty(value.projectId, "projectId"),
    root: nonEmpty(value.root, "root"),
    ...(taskId !== undefined ? { taskId } : {}),
    ...(graphId !== undefined ? { graphId } : {}),
    mutationClass: oneOf(
      value.mutationClass,
      [NEUTRON_MUTATION_CLASS] as const,
      "mutationClass",
    ),
    projectStateDigest,
    changedPaths,
    fileBindings,
    planDigest,
    ...(expiresAt !== undefined ? { expiresAt } : {}),
  };
  const artifactDigest = assertNeutronMutationDigest(
    value.artifactDigest,
    "artifactDigest",
  );
  if (artifactDigest !== digestNeutronMutationReviewArtifact(facts)) {
    throw new Error(
      "artifactDigest does not match bound review artifact facts",
    );
  }
  const artifact: NeutronMutationReviewArtifact = {
    schemaVersion: NEUTRON_MUTATION_REVIEW_ARTIFACT_SCHEMA_URN,
    artifactId: facts.artifactId,
    transactionId: facts.transactionId,
    proposalId: facts.proposalId,
    sessionId: facts.sessionId,
    projectId: facts.projectId,
    root: facts.root,
    ...(facts.taskId !== undefined ? { taskId: facts.taskId } : {}),
    ...(facts.graphId !== undefined ? { graphId: facts.graphId } : {}),
    mutationClass: facts.mutationClass,
    projectStateDigest: facts.projectStateDigest,
    changedPaths: facts.changedPaths,
    fileBindings: facts.fileBindings,
    planDigest: facts.planDigest,
    ...(facts.expiresAt !== undefined ? { expiresAt: facts.expiresAt } : {}),
    artifactDigest,
  };
  return artifact;
}

export function assertCanonicalContentBoundPlanDigest(
  planDigest: string,
  fileBindings: readonly NeutronMutationReviewFileBinding[],
  projectStateDigest: string,
  targetRoot: string,
): void {
  const expected = digestContentBoundApplyPlan({
    projectStateDigest,
    targetRoot,
    fileBindings,
  });
  if (planDigest !== expected) {
    throw new Error("planDigest does not match content-bound file digests");
  }
}
