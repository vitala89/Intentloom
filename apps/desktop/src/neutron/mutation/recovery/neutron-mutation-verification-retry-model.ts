import type { NeutronMutationVerificationRetryResult } from "@intentloom/protocol";
import type {
  NeutronMutationRecoveryModel,
  VerificationRetryNotice,
} from "./neutron-mutation-recovery-model.js";

export function verificationRetryEligible(
  model: NeutronMutationRecoveryModel,
): boolean {
  if (model.phase !== "authoritative" && model.phase !== "verifying") {
    return false;
  }
  if (model.direct !== null) return directEligible(model);
  return statusEligible(model);
}

export function beginVerifying(
  model: NeutronMutationRecoveryModel,
): NeutronMutationRecoveryModel | null {
  if (model.phase !== "authoritative" || model.identity === null) return null;
  if (!verificationRetryEligible(model)) return null;
  return {
    ...model,
    phase: "verifying",
    generation: model.generation + 1,
    resume: "authoritative",
    verificationNotice: null,
  };
}

export function recordVerificationRetry(
  model: NeutronMutationRecoveryModel,
  generation: number,
  result: NeutronMutationVerificationRetryResult,
): NeutronMutationRecoveryModel {
  if (generation !== model.generation || model.phase !== "verifying") {
    return model;
  }
  if (result.outcome !== "recorded" || result.applied !== true) {
    return { ...model, phase: "authoritative", resume: null };
  }
  return {
    ...model,
    phase: "authoritative",
    direct: null,
    status: result,
    resume: null,
    verificationNotice: noticeFor(result.verificationStatus),
  };
}

export function restoreAfterVerificationRetry(
  model: NeutronMutationRecoveryModel,
  generation: number,
): NeutronMutationRecoveryModel {
  if (generation !== model.generation || model.phase !== "verifying") {
    return model;
  }
  return { ...model, phase: "authoritative", resume: null };
}

export function markVerificationIntegrity(
  model: NeutronMutationRecoveryModel,
  generation: number,
): NeutronMutationRecoveryModel {
  if (generation !== model.generation || model.phase !== "verifying") {
    return model;
  }
  return {
    ...model,
    phase: "integrity",
    direct: null,
    status: null,
    resume: null,
    verificationNotice: null,
  };
}

function directEligible(model: NeutronMutationRecoveryModel): boolean {
  const direct = model.direct;
  if (direct === null || direct.applied !== true) return false;
  return (
    direct.verificationStatus === "verification-failed" ||
    direct.verificationStatus === "verification-incomplete"
  );
}

function statusEligible(model: NeutronMutationRecoveryModel): boolean {
  const status = model.status;
  if (status === null || status.outcome !== "recorded") return false;
  if (status.applied !== true) return false;
  if (status.verificationStatus === "reconciliation-required") return false;
  return (
    status.verificationStatus === "verification-failed" ||
    status.verificationStatus === "verification-incomplete"
  );
}

function noticeFor(status: string | undefined): VerificationRetryNotice | null {
  if (status === "verified") return "succeeded";
  if (status === "verification-failed") return "failed";
  if (status === "verification-incomplete") return "incomplete";
  return null;
}
