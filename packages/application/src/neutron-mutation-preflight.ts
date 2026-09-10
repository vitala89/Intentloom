import type { AgentRoleCapabilities } from "../../protocol/src/index.js";
import type {
  NeutronMutationPreflightRejectionReason,
  NeutronMutationPreflightRequest,
} from "../../protocol/src/neutron-mutation.js";
import type { NeutronRuntimeSession } from "../../protocol/src/neutron-runtime.js";
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
  buildNeutronMutationPreflightOutcome,
  type NeutronMutationPreflightOutcome,
} from "./neutron-mutation-diagnostics.js";
import {
  neutronMutationUnknownIds,
  parseNeutronMutationPreflightRequest,
  parseNeutronMutationPreflightSession,
  rejectedNeutronMutationOutcome,
} from "./neutron-mutation-preflight-parse.js";
import { neutronMutationApprovalIsConsumed } from "./neutron-mutation-replay.js";
import type { NeutronMutationReplayChecker } from "./neutron-mutation-replay.js";

/**
 * Semantic authorization/preflight only. Slice 3 must repeat project-state,
 * containment, approval/consumption, affected scope, and project lock
 * immediately before the first write. Slice 2 does not eliminate TOCTOU.
 */
export interface NeutronMutationPreflightInput {
  readonly request: unknown;
  readonly authorization: NeutronMutationAuthorizationInput;
  readonly fs: NeutronMutationPathFilesystem;
  readonly now?: () => number;
  readonly signal?: AbortSignal;
  readonly session?: NeutronRuntimeSession;
  readonly roleCapabilities?: AgentRoleCapabilities;
  readonly delegatedRole?: string;
  readonly actualRoot?: string;
  readonly evaluateProjectStateDigest?: (root: string) => Promise<string>;
  readonly replay?: NeutronMutationReplayChecker;
}

export async function preflightNeutronMutation(
  input: NeutronMutationPreflightInput,
): Promise<NeutronMutationPreflightOutcome> {
  const nowMs = input.now?.() ?? Date.now();
  const earlyCancel = evaluateMutationCancellation(
    undefined,
    undefined,
    input.signal,
  );
  if (earlyCancel !== undefined) {
    return rejectedNeutronMutationOutcome(
      neutronMutationUnknownIds(input.request),
      [],
      "denied",
      nowMs,
      [earlyCancel],
    );
  }
  const parsed = parseNeutronMutationPreflightRequest(input.request);
  if (parsed.reason !== undefined || parsed.request === undefined) {
    return rejectedNeutronMutationOutcome(
      neutronMutationUnknownIds(input.request),
      [],
      "denied",
      nowMs,
      [parsed.reason ?? "invalid-approval"],
    );
  }
  return evaluateParsedPreflight(parsed.request, input, nowMs);
}

async function evaluateParsedPreflight(
  request: NeutronMutationPreflightRequest,
  input: NeutronMutationPreflightInput,
  nowMs: number,
): Promise<NeutronMutationPreflightOutcome> {
  const paths = request.proposal.plan.changedPaths;
  const ids = {
    proposalDigest: request.proposal.proposalDigest,
    approvalId: request.approval.approvalId,
  };
  const session = parseNeutronMutationPreflightSession(input.session);
  if (session.reason !== undefined) {
    return rejectedNeutronMutationOutcome(ids, paths, "denied", nowMs, [
      session.reason,
    ]);
  }
  const reason = await firstSemanticRejection(
    request,
    input,
    session.value,
    nowMs,
  );
  if (reason !== undefined) {
    return rejectedNeutronMutationOutcome(ids, paths, "denied", nowMs, [
      reason,
    ]);
  }
  return buildNeutronMutationPreflightOutcome({
    decision: "eligible",
    reasons: [],
    ...ids,
    affectedPaths: paths,
    capabilityClass: "host",
    checkedAt: nowMs,
  });
}

async function firstSemanticRejection(
  request: NeutronMutationPreflightRequest,
  input: NeutronMutationPreflightInput,
  session: NeutronRuntimeSession | undefined,
  nowMs: number,
): Promise<NeutronMutationPreflightRejectionReason | undefined> {
  const cancelled = evaluateMutationCancellation(
    request.sessionState,
    session,
    input.signal,
  );
  if (cancelled !== undefined) return cancelled;
  const auth = resolveNeutronMutationAuthorization(input.authorization, {
    ...(input.roleCapabilities !== undefined
      ? { roleCapabilities: input.roleCapabilities }
      : {}),
    ...(input.delegatedRole !== undefined
      ? { delegatedRole: input.delegatedRole }
      : {}),
  });
  if (!auth.allowed) return auth.reason;
  const identity = evaluateMutationIdentityBindings(
    request.proposal,
    request.approval,
    session,
  );
  if (identity !== undefined) return identity;
  const expired = evaluateMutationExpiry(
    request.approval,
    request.proposal.plan.expiresAt,
    nowMs,
  );
  if (expired !== undefined) return expired;
  const digests = evaluateMutationDigestBindings(
    request.proposal,
    request.approval,
  );
  if (digests !== undefined) return digests;
  return continueSemanticRejection(request, input, session);
}

async function continueSemanticRejection(
  request: NeutronMutationPreflightRequest,
  input: NeutronMutationPreflightInput,
  session: NeutronRuntimeSession | undefined,
): Promise<NeutronMutationPreflightRejectionReason | undefined> {
  const actualRoot = input.actualRoot ?? request.proposal.root;
  const root = await evaluateMutationRootBinding(
    request.proposal,
    request.approval,
    actualRoot,
    input.fs,
    session,
  );
  if (root !== undefined) return root;
  const state = await evaluateLiveProjectState(request, input, actualRoot);
  if (state !== undefined) return state;
  const scope = evaluateMutationPathScope(request.proposal, request.approval);
  if (scope !== undefined) return scope;
  if (input.signal?.aborted === true) return "cancelled";
  const replayed = await neutronMutationApprovalIsConsumed(input.replay, {
    approvalId: request.approval.approvalId,
    approvalDigest: request.approval.approvalDigest,
  });
  if (replayed) return "replayed-approval";
  return evaluateContainedScope(request, input.fs, actualRoot, input.signal);
}

async function evaluateLiveProjectState(
  request: NeutronMutationPreflightRequest,
  input: NeutronMutationPreflightInput,
  actualRoot: string,
): Promise<NeutronMutationPreflightRejectionReason | undefined> {
  const current =
    input.evaluateProjectStateDigest === undefined
      ? request.currentProjectStateDigest
      : await input.evaluateProjectStateDigest(actualRoot);
  if (current !== request.currentProjectStateDigest) {
    return "project-state-mismatch";
  }
  return evaluateMutationProjectState(
    request.proposal,
    request.approval,
    current,
  );
}

async function evaluateContainedScope(
  request: NeutronMutationPreflightRequest,
  fs: NeutronMutationPathFilesystem,
  actualRoot: string,
  signal: AbortSignal | undefined,
): Promise<NeutronMutationPreflightRejectionReason | undefined> {
  if (isAborted(signal)) return "cancelled";
  const canonicalRoot = await canonicalizeNeutronMutationRoot(actualRoot, fs);
  if (canonicalRoot === undefined) return "root-mismatch";
  for (const relativePath of request.proposal.plan.changedPaths) {
    if (isAborted(signal)) return "cancelled";
    const contained = await assertNeutronMutationPathContained(
      canonicalRoot,
      relativePath,
      fs,
    );
    if (!contained) return "affected-path-mismatch";
  }
  return undefined;
}

function isAborted(signal: AbortSignal | undefined): boolean {
  return signal !== undefined && signal.aborted;
}
