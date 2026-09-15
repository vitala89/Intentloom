import type { GeneratedFile } from "@intentloom/core";
import type { AgentRoleCapabilities } from "../../protocol/src/index.js";
import type { NeutronMutationApplyFailureCode } from "../../protocol/src/neutron-mutation-apply.js";
import type {
  NeutronMutationApproval,
  NeutronMutationProposal,
} from "../../protocol/src/neutron-mutation.js";
import type { NeutronMutationReviewArtifact } from "../../protocol/src/neutron-mutation-review-artifact.js";
import type { NeutronRuntimeSession } from "../../protocol/src/neutron-runtime.js";
import { exactNeutronMutationPathSetsEqual } from "../../validator/src/neutron-mutation-path-set.js";
import { assertCanonicalContentBoundPlanDigest } from "../../validator/src/neutron-mutation-review-artifact.js";
import {
  resolveNeutronMutationAuthorization,
  type NeutronMutationAuthorizationInput,
} from "./neutron-mutation-authorization.js";
import {
  evaluateMutationCancellation,
  evaluateMutationDigestBindings,
  evaluateMutationExpiry,
  evaluateMutationIdentityBindings,
  evaluateMutationPathScope,
  evaluateMutationProjectState,
  evaluateMutationRootBinding,
} from "./neutron-mutation-bindings.js";
import {
  assertNeutronMutationPathContained,
  canonicalizeNeutronMutationRoot,
  type NeutronMutationPathFilesystem,
} from "./neutron-mutation-containment.js";
import {
  mapPayloadCodeToApplyCode,
  mapPreflightReasonToApplyCode,
} from "./neutron-mutation-apply-codes.js";
import { verifyMutationPayloadAgainstReviewArtifact } from "./neutron-mutation-review-payload.js";
import {
  detectNeutronGraphStaleness,
  type NeutronGraphStaleBaseline,
  type NeutronGraphStaleSnapshot,
} from "./neutron-scheduler-stale.js";

export interface NeutronMutationApplyValidationInput {
  readonly proposal: NeutronMutationProposal;
  readonly approval: NeutronMutationApproval;
  readonly artifact: NeutronMutationReviewArtifact;
  readonly files: readonly GeneratedFile[];
  readonly authorization: NeutronMutationAuthorizationInput;
  readonly fs: NeutronMutationPathFilesystem;
  readonly actualRoot: string;
  readonly currentProjectStateDigest: string;
  readonly nowMs: number;
  readonly signal?: AbortSignal;
  readonly session?: NeutronRuntimeSession;
  readonly lockOwner?: string;
  readonly transactionId: string;
  readonly graphStale?: {
    readonly baseline: NeutronGraphStaleBaseline;
    readonly current: NeutronGraphStaleSnapshot;
  };
  readonly roleCapabilities?: AgentRoleCapabilities;
  readonly delegatedRole?: string;
}

export async function validateNeutronMutationApplyPreWrite(
  input: NeutronMutationApplyValidationInput,
): Promise<NeutronMutationApplyFailureCode | undefined> {
  const early = evaluateEarlyApplyRejection(input);
  if (early !== undefined) return early;
  const bindings = evaluateApplyBindingRejection(input);
  if (bindings !== undefined) return bindings;
  const payload = evaluatePayloadAndPlan(input);
  if (payload !== undefined) return payload;
  const live = await evaluateLiveApplyGuards(input);
  if (live !== undefined) return live;
  return evaluateLockAndCancel(input);
}

function evaluateEarlyApplyRejection(
  input: NeutronMutationApplyValidationInput,
): NeutronMutationApplyFailureCode | undefined {
  const cancelled = evaluateMutationCancellation(
    input.session?.state,
    input.session,
    input.signal,
  );
  if (cancelled !== undefined) return mapPreflightReasonToApplyCode(cancelled);
  const auth = resolveNeutronMutationAuthorization(input.authorization, {
    ...(input.roleCapabilities !== undefined
      ? { roleCapabilities: input.roleCapabilities }
      : {}),
    ...(input.delegatedRole !== undefined
      ? { delegatedRole: input.delegatedRole }
      : {}),
  });
  if (!auth.allowed && auth.reason !== undefined) {
    return mapPreflightReasonToApplyCode(auth.reason);
  }
  if (input.approval.reviewArtifactDigest === undefined) {
    return "approval-invalid";
  }
  if (input.approval.reviewArtifactDigest !== input.artifact.artifactDigest) {
    return "artifact-mismatch";
  }
  if (input.approval.approvalSource !== "local-interactive") {
    return "approval-invalid";
  }
  return undefined;
}

function evaluateApplyBindingRejection(
  input: NeutronMutationApplyValidationInput,
): NeutronMutationApplyFailureCode | undefined {
  const identity = evaluateMutationIdentityBindings(
    input.proposal,
    input.approval,
    input.session,
  );
  if (identity !== undefined) return mapPreflightReasonToApplyCode(identity);
  const expired = evaluateMutationExpiry(
    input.approval,
    input.proposal.plan.expiresAt ?? input.artifact.expiresAt,
    input.nowMs,
  );
  if (expired !== undefined) return mapPreflightReasonToApplyCode(expired);
  const digests = evaluateMutationDigestBindings(
    input.proposal,
    input.approval,
  );
  if (digests !== undefined) return mapPreflightReasonToApplyCode(digests);
  if (!artifactMatchesProposal(input.proposal, input.artifact)) {
    return "artifact-mismatch";
  }
  const scope = evaluateMutationPathScope(input.proposal, input.approval);
  if (scope !== undefined) return mapPreflightReasonToApplyCode(scope);
  if (
    !exactNeutronMutationPathSetsEqual(
      input.artifact.changedPaths,
      input.proposal.plan.changedPaths,
    )
  ) {
    return "path-scope-mismatch";
  }
  return undefined;
}

function evaluatePayloadAndPlan(
  input: NeutronMutationApplyValidationInput,
): NeutronMutationApplyFailureCode | undefined {
  try {
    assertCanonicalContentBoundPlanDigest(
      input.proposal.plan.planDigest,
      input.artifact.fileBindings,
      input.artifact.projectStateDigest,
      input.proposal.plan.targetRoot,
    );
  } catch {
    return "plan-digest-mismatch";
  }
  if (input.artifact.planDigest !== input.proposal.plan.planDigest) {
    return "plan-digest-mismatch";
  }
  if (input.approval.planDigest !== input.artifact.planDigest) {
    return "plan-digest-mismatch";
  }
  const verified = verifyMutationPayloadAgainstReviewArtifact({
    artifact: input.artifact,
    files: input.files,
    root: input.proposal.root,
    ...(input.approval.reviewArtifactDigest !== undefined
      ? { artifactDigest: input.approval.reviewArtifactDigest }
      : {}),
  });
  if (!verified.ok) {
    return mapPayloadCodeToApplyCode(
      verified.codes[0] ?? "artifact-digest-mismatch",
    );
  }
  return undefined;
}

async function evaluateLiveApplyGuards(
  input: NeutronMutationApplyValidationInput,
): Promise<NeutronMutationApplyFailureCode | undefined> {
  const root = await evaluateMutationRootBinding(
    input.proposal,
    input.approval,
    input.actualRoot,
    input.fs,
    input.session,
  );
  if (root !== undefined) return mapPreflightReasonToApplyCode(root);
  const state = evaluateMutationProjectState(
    input.proposal,
    input.approval,
    input.currentProjectStateDigest,
  );
  if (state !== undefined) return mapPreflightReasonToApplyCode(state);
  if (input.artifact.projectStateDigest !== input.currentProjectStateDigest) {
    return "project-stale";
  }
  const graph = evaluateGraphStale(input);
  if (graph !== undefined) return graph;
  return evaluateContainedTargets(input);
}

async function evaluateContainedTargets(
  input: NeutronMutationApplyValidationInput,
): Promise<NeutronMutationApplyFailureCode | undefined> {
  const canonicalRoot = await canonicalizeNeutronMutationRoot(
    input.actualRoot,
    input.fs,
  );
  if (canonicalRoot === undefined) return "containment-failed";
  if (input.artifact.root !== input.proposal.root) return "containment-failed";
  for (const relativePath of input.artifact.changedPaths) {
    const contained = await assertNeutronMutationPathContained(
      canonicalRoot,
      relativePath,
      input.fs,
    );
    if (!contained) return "containment-failed";
  }
  return undefined;
}

function evaluateGraphStale(
  input: NeutronMutationApplyValidationInput,
): NeutronMutationApplyFailureCode | undefined {
  if (
    input.proposal.graphId === undefined &&
    input.artifact.graphId === undefined
  ) {
    return undefined;
  }
  if (input.graphStale === undefined) return "graph-stale";
  const report = detectNeutronGraphStaleness(input.graphStale);
  if (!report.accepted) return "graph-stale";
  return undefined;
}

function evaluateLockAndCancel(
  input: NeutronMutationApplyValidationInput,
): NeutronMutationApplyFailureCode | undefined {
  if (input.signal?.aborted === true) return "cancelled-before-write";
  if (input.lockOwner !== input.transactionId) return "lock-conflict";
  return undefined;
}

function artifactMatchesProposal(
  proposal: NeutronMutationProposal,
  artifact: NeutronMutationReviewArtifact,
): boolean {
  if (artifact.proposalId !== proposal.proposalId) return false;
  if (artifact.sessionId !== proposal.sessionId) return false;
  if (artifact.projectId !== proposal.projectId) return false;
  if (artifact.root !== proposal.root) return false;
  if (artifact.mutationClass !== proposal.mutationClass) return false;
  if ((artifact.taskId ?? undefined) !== (proposal.taskId ?? undefined)) {
    return false;
  }
  if ((artifact.graphId ?? undefined) !== (proposal.graphId ?? undefined)) {
    return false;
  }
  return artifact.projectStateDigest === proposal.plan.projectStateDigest;
}
