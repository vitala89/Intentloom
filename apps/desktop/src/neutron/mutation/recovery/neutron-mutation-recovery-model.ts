import type {
  NeutronMutationApproveAndApplyResult,
  NeutronMutationStatusResult,
} from "@intentloom/protocol";
import type { NeutronMutationReviewScope } from "../neutron-mutation-review-state.js";

export const RECOVERY_PHASES = [
  "idle",
  "pending",
  "uncertain",
  "recovering",
  "authoritative",
  "verifying",
  "integrity",
] as const;

export type VerificationRetryNotice = "succeeded" | "failed" | "incomplete";

export type NeutronMutationRecoveryPhase = (typeof RECOVERY_PHASES)[number];

/** Safe status.get identity. Never an approval token or file body. */
export interface NeutronMutationRecoveryIdentity {
  readonly root: string;
  readonly sessionId: string;
  readonly projectId: string;
  readonly graphId: string;
  readonly proposalId: string;
  readonly transactionId?: string;
}

export interface NeutronMutationRecoveryModel {
  readonly phase: NeutronMutationRecoveryPhase;
  readonly identity: NeutronMutationRecoveryIdentity | null;
  readonly direct: NeutronMutationApproveAndApplyResult | null;
  readonly status: NeutronMutationStatusResult | null;
  readonly isolatedNotice: boolean;
  readonly generation: number;
  readonly resume: "uncertain" | "authoritative" | "integrity" | null;
  readonly verificationNotice: VerificationRetryNotice | null;
}

export function idleRecoveryModel(): NeutronMutationRecoveryModel {
  return {
    phase: "idle",
    identity: null,
    direct: null,
    status: null,
    isolatedNotice: false,
    generation: 0,
    resume: null,
    verificationNotice: null,
  };
}

export function recoveryIdentity(input: {
  readonly root: string;
  readonly sessionId: string;
  readonly projectId: string;
  readonly graphId: string;
  readonly proposalId: string;
  readonly transactionId?: string;
}): NeutronMutationRecoveryIdentity {
  return {
    root: input.root,
    sessionId: input.sessionId,
    projectId: input.projectId,
    graphId: input.graphId,
    proposalId: input.proposalId,
    ...(input.transactionId === undefined
      ? {}
      : { transactionId: input.transactionId }),
  };
}

export function recoveryScopeMatches(
  identity: NeutronMutationRecoveryIdentity,
  scope: NeutronMutationReviewScope | null,
): boolean {
  if (scope?.graphId === undefined) return false;
  return (
    identity.root === scope.root &&
    identity.sessionId === scope.sessionId &&
    identity.projectId === scope.projectId &&
    identity.graphId === scope.graphId
  );
}

export function isInProgressStatus(
  status: NeutronMutationStatusResult | null,
): boolean {
  return (
    status?.outcome === "recorded" &&
    (status.transactionState === "claimed" ||
      status.transactionState === "executing")
  );
}

export function isTerminalRecovery(
  model: NeutronMutationRecoveryModel,
): boolean {
  if (model.phase === "authoritative" && model.direct !== null) return true;
  if (model.phase !== "authoritative" || model.status === null) return false;
  return !isInProgressStatus(model.status);
}

export function blocksAnotherApply(
  model: NeutronMutationRecoveryModel,
  proposalId: string,
): boolean {
  if (model.phase === "idle" || model.identity === null) return false;
  if (model.identity.proposalId === proposalId) return true;
  return !isTerminalRecovery(model);
}

export function beginPending(
  model: NeutronMutationRecoveryModel,
  identity: NeutronMutationRecoveryIdentity,
): NeutronMutationRecoveryModel {
  return {
    phase: "pending",
    identity,
    direct: null,
    status: null,
    isolatedNotice: false,
    generation: model.generation + 1,
    resume: null,
    verificationNotice: null,
  };
}

export function recordDirectResult(
  model: NeutronMutationRecoveryModel,
  generation: number,
  direct: NeutronMutationApproveAndApplyResult,
): NeutronMutationRecoveryModel {
  if (generation !== model.generation || model.identity === null) return model;
  return {
    ...model,
    phase: "authoritative",
    direct,
    status: null,
    resume: null,
    identity: withTransaction(model.identity, direct.transactionId),
    verificationNotice: null,
  };
}

export function markUncertain(
  model: NeutronMutationRecoveryModel,
  generation: number,
): NeutronMutationRecoveryModel {
  if (generation !== model.generation || model.identity === null) return model;
  return {
    ...model,
    phase: "uncertain",
    identity: recoveryIdentity({
      graphId: model.identity.graphId,
      projectId: model.identity.projectId,
      proposalId: model.identity.proposalId,
      root: model.identity.root,
      sessionId: model.identity.sessionId,
    }),
    direct: null,
    status: null,
    resume: null,
    verificationNotice: null,
  };
}

export function beginStatusRead(
  model: NeutronMutationRecoveryModel,
): NeutronMutationRecoveryModel | null {
  if (model.identity === null) return null;
  if (model.phase === "uncertain") {
    return { ...model, phase: "recovering", resume: "uncertain" };
  }
  if (model.phase === "authoritative" && isInProgressStatus(model.status)) {
    return { ...model, phase: "recovering", resume: "authoritative" };
  }
  if (model.phase === "integrity") {
    return { ...model, phase: "recovering", resume: "integrity" };
  }
  if (
    model.phase === "authoritative" &&
    model.direct === null &&
    model.status !== null &&
    model.status.outcome !== "recorded"
  ) {
    return { ...model, phase: "recovering", resume: "authoritative" };
  }
  return null;
}

export function recordStatusResult(
  model: NeutronMutationRecoveryModel,
  generation: number,
  status: NeutronMutationStatusResult,
): NeutronMutationRecoveryModel {
  if (generation !== model.generation || model.identity === null) return model;
  if (model.phase !== "recovering") return model;
  return {
    ...model,
    phase: "authoritative",
    direct: null,
    status,
    resume: null,
    verificationNotice: null,
  };
}

export function markIntegrity(
  model: NeutronMutationRecoveryModel,
  generation: number,
): NeutronMutationRecoveryModel {
  if (generation !== model.generation || model.identity === null) return model;
  if (model.phase !== "recovering") return model;
  return {
    ...model,
    phase: "integrity",
    direct: null,
    status: null,
    resume: null,
    verificationNotice: null,
  };
}

export function restoreAfterStatusTransport(
  model: NeutronMutationRecoveryModel,
  generation: number,
): NeutronMutationRecoveryModel {
  if (generation !== model.generation || model.phase !== "recovering") {
    return model;
  }
  return {
    ...model,
    phase: resumedPhase(model.resume),
    resume: null,
  };
}

function resumedPhase(
  resume: NeutronMutationRecoveryModel["resume"],
): NeutronMutationRecoveryPhase {
  if (resume === "authoritative") return "authoritative";
  if (resume === "integrity") return "integrity";
  return "uncertain";
}

export function isolateRecovery(
  model: NeutronMutationRecoveryModel,
): NeutronMutationRecoveryModel {
  if (model.phase === "idle" && model.identity === null) return model;
  return {
    phase: "idle",
    identity: null,
    direct: null,
    status: null,
    isolatedNotice: !isTerminalRecovery(model) || model.phase === "integrity",
    generation: model.generation + 1,
    resume: null,
    verificationNotice: null,
  };
}

function withTransaction(
  identity: NeutronMutationRecoveryIdentity,
  transactionId: string | undefined,
): NeutronMutationRecoveryIdentity {
  if (transactionId === undefined) return identity;
  return { ...identity, transactionId };
}
