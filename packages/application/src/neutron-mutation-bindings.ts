import { resolve } from "node:path";
import type {
  NeutronMutationApproval,
  NeutronMutationPreflightRejectionReason,
  NeutronMutationPreflightRequest,
  NeutronMutationProposal,
} from "../../protocol/src/neutron-mutation.js";
import type { NeutronRuntimeSession } from "../../protocol/src/neutron-runtime.js";
import { NEUTRON_SESSION_STATES } from "../../protocol/src/neutron-runtime.js";
import {
  digestNeutronMutationProposal,
  expectedNeutronMutationApprovalToken,
} from "../../validator/src/neutron-mutation.js";
import {
  canonicalizeNeutronMutationRoot,
  type NeutronMutationPathFilesystem,
} from "./neutron-mutation-containment.js";

const ACTIVE_SESSION_STATES = [
  "created",
  "discussing",
  "inspecting",
  "planning",
] as const;

export function evaluateMutationExpiry(
  approval: NeutronMutationApproval,
  planExpiresAt: number | undefined,
  nowMs: number,
): NeutronMutationPreflightRejectionReason | undefined {
  if (nowMs >= approval.approvalValidUntil) return "approval-expired";
  if (planExpiresAt !== undefined && nowMs > planExpiresAt) {
    return "approval-expired";
  }
  return undefined;
}

export function evaluateMutationDigestBindings(
  proposal: NeutronMutationProposal,
  approval: NeutronMutationApproval,
): NeutronMutationPreflightRejectionReason | undefined {
  if (approval.proposalDigest !== proposal.proposalDigest) {
    return "proposal-digest-mismatch";
  }
  const expectedToken = expectedNeutronMutationApprovalToken(
    proposal.proposalDigest,
  );
  if (approval.approvalToken !== expectedToken) return "invalid-approval";
  if (approval.proposalId !== proposal.proposalId) return "invalid-approval";
  if (approval.planDigest !== proposal.plan.planDigest) {
    return "approval-scope-mismatch";
  }
  const recomputed = digestNeutronMutationProposal(proposal);
  if (recomputed !== proposal.proposalDigest) return "proposal-digest-mismatch";
  return undefined;
}

export function evaluateMutationIdentityBindings(
  proposal: NeutronMutationProposal,
  approval: NeutronMutationApproval,
  session: NeutronRuntimeSession | undefined,
): NeutronMutationPreflightRejectionReason | undefined {
  if (approval.projectId !== proposal.projectId) return "invalid-approval";
  if (approval.sessionId !== proposal.sessionId) return "invalid-approval";
  if (approval.mutationClass !== proposal.mutationClass) {
    return "invalid-approval";
  }
  const taskReason = optionalIdMismatch(proposal.taskId, approval.taskId);
  if (taskReason !== undefined) return taskReason;
  const graphReason = optionalIdMismatch(proposal.graphId, approval.graphId);
  if (graphReason !== undefined) return graphReason;
  if (session === undefined) return undefined;
  if (session.sessionId !== proposal.sessionId) return "invalid-approval";
  if (session.projectId !== proposal.projectId) return "invalid-approval";
  if (session.mutationAllowed !== false) return "capability-denied";
  return undefined;
}

export function evaluateMutationCancellation(
  sessionState: NeutronMutationPreflightRequest["sessionState"],
  session: NeutronRuntimeSession | undefined,
  signal: AbortSignal | undefined,
): NeutronMutationPreflightRejectionReason | undefined {
  if (signal?.aborted === true) return "cancelled";
  if (sessionState === "cancelled" || session?.state === "cancelled") {
    return "cancelled";
  }
  if (sessionState === "timed-out" || session?.state === "timed-out") {
    return "cancelled";
  }
  if (session !== undefined && !isActiveSession(session.state)) {
    return "cancelled";
  }
  if (
    sessionState !== undefined &&
    !(ACTIVE_SESSION_STATES as readonly string[]).includes(sessionState)
  ) {
    return "cancelled";
  }
  return undefined;
}

export function evaluateMutationPathScope(
  proposal: NeutronMutationProposal,
  approval: NeutronMutationApproval,
): NeutronMutationPreflightRejectionReason | undefined {
  const planPaths = proposal.plan.changedPaths;
  const approvedPaths = approval.changedPaths;
  if (planPaths.length !== approvedPaths.length) {
    return wideningOrScope(planPaths, approvedPaths);
  }
  for (let index = 0; index < planPaths.length; index += 1) {
    if (planPaths[index] !== approvedPaths[index]) {
      return wideningOrScope(planPaths, approvedPaths);
    }
  }
  return undefined;
}

export function evaluateMutationProjectState(
  proposal: NeutronMutationProposal,
  approval: NeutronMutationApproval,
  currentDigest: string,
): NeutronMutationPreflightRejectionReason | undefined {
  if (currentDigest !== approval.projectStateDigest) {
    return "project-state-mismatch";
  }
  if (currentDigest !== proposal.plan.projectStateDigest) {
    return "project-state-mismatch";
  }
  return undefined;
}

export async function evaluateMutationRootBinding(
  proposal: NeutronMutationProposal,
  approval: NeutronMutationApproval,
  actualRoot: string,
  fs: NeutronMutationPathFilesystem,
  session: NeutronRuntimeSession | undefined,
): Promise<NeutronMutationPreflightRejectionReason | undefined> {
  const canonicalActual = await canonicalizeNeutronMutationRoot(actualRoot, fs);
  if (canonicalActual === undefined) return "root-mismatch";
  const candidates = [proposal.root, proposal.plan.targetRoot, approval.root];
  if (session !== undefined) candidates.push(session.root);
  for (const candidate of candidates) {
    if (resolve(candidate) === resolve(actualRoot)) continue;
    const canonical = await canonicalizeNeutronMutationRoot(candidate, fs);
    if (canonical === undefined || canonical !== canonicalActual) {
      return "root-mismatch";
    }
  }
  return undefined;
}

function optionalIdMismatch(
  left: string | undefined,
  right: string | undefined,
): NeutronMutationPreflightRejectionReason | undefined {
  if (left === undefined && right === undefined) return undefined;
  if (left !== right) return "invalid-approval";
  return undefined;
}

function isActiveSession(state: NeutronRuntimeSession["state"]): boolean {
  return (
    (ACTIVE_SESSION_STATES as readonly string[]).includes(state) &&
    (NEUTRON_SESSION_STATES as readonly string[]).includes(state)
  );
}

function wideningOrScope(
  planPaths: readonly string[],
  approvedPaths: readonly string[],
): NeutronMutationPreflightRejectionReason {
  const approved = new Set(approvedPaths);
  if (planPaths.some((path) => !approved.has(path))) {
    return "affected-path-mismatch";
  }
  return "approval-scope-mismatch";
}
