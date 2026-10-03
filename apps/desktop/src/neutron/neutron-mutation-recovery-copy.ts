import type { NeutronMutationStatusResult } from "@intentloom/protocol";

export const MUTATION_RESULT_UNKNOWN_COPY =
  "Mutation result unknown. Reconnect to recover authoritative status." as const;

export const MUTATION_STATUS_RECOVERING_COPY =
  "Recovering authoritative mutation status." as const;

export const MUTATION_STATUS_REFRESH_LABEL = "Refresh status" as const;

export const MUTATION_IN_PROGRESS_COPY =
  "The mutation is still in progress. The outcome is not terminal yet." as const;

export const MUTATION_UNKNOWN_RECORD_COPY =
  "The host has no durable record for this exact mutation." as const;

export const MUTATION_STATUS_UNAVAILABLE_COPY =
  "Authoritative recovery is unavailable. Apply is not retried." as const;

export const MUTATION_INTEGRITY_COPY =
  "Authoritative recovery failed an integrity check. Manual investigation is required." as const;

export const MUTATION_ISOLATED_SCOPE_COPY =
  "An unresolved mutation on the previous scope was not queried." as const;

export const MUTATION_OTHER_UNRESOLVED_COPY =
  "Another mutation result is still unresolved. Apply stays disabled." as const;

export const MUTATION_APPLIED_VERIFIED_COPY = "Applied and verified." as const;

export const MUTATION_APPLIED_VERIFICATION_FAILED_COPY =
  "Applied. Verification failed. The mutation was written." as const;

export const MUTATION_APPLIED_INCOMPLETE_COPY =
  "Applied. Verification is incomplete." as const;

export const MUTATION_RECONCILIATION_COPY = "Reconciliation required." as const;

export const MUTATION_APPLIED_RECONCILIATION_COPY =
  "Applied. Reconciliation required." as const;

export const MUTATION_FAILED_BEFORE_WRITE_COPY =
  "No mutation was applied for this transaction." as const;

const MISMATCH_COPY = {
  "root-mismatch":
    "Recovery stopped. The host root does not match this mutation.",
  "project-mismatch":
    "Recovery stopped. The host project does not match this mutation.",
  "session-mismatch":
    "Recovery stopped. The host session does not match this mutation.",
  "graph-mismatch":
    "Recovery stopped. The host graph does not match this mutation.",
  "transaction-mismatch":
    "Recovery stopped. The host transaction does not match this mutation.",
} as const;

export function mutationStatusPresentation(
  status: NeutronMutationStatusResult,
): { readonly role: "status" | "alert"; readonly text: string } {
  if (status.outcome === "unknown") {
    return { role: "status", text: MUTATION_UNKNOWN_RECORD_COPY };
  }
  if (status.outcome === "durable-state-unavailable") {
    return { role: "alert", text: MUTATION_STATUS_UNAVAILABLE_COPY };
  }
  if (status.outcome !== "recorded") {
    return { role: "alert", text: MISMATCH_COPY[status.outcome] };
  }
  return recordedPresentation(status);
}

function recordedPresentation(status: NeutronMutationStatusResult): {
  readonly role: "status" | "alert";
  readonly text: string;
} {
  if (
    status.transactionState === "claimed" ||
    status.transactionState === "executing"
  ) {
    return { role: "status", text: MUTATION_IN_PROGRESS_COPY };
  }
  if (status.applied === true && status.verificationStatus === "verified") {
    return { role: "status", text: MUTATION_APPLIED_VERIFIED_COPY };
  }
  if (
    status.applied === true &&
    status.verificationStatus === "verification-failed"
  ) {
    return { role: "status", text: MUTATION_APPLIED_VERIFICATION_FAILED_COPY };
  }
  if (status.reconciliationRequired === true) {
    return {
      role: "alert",
      text:
        status.applied === true
          ? MUTATION_APPLIED_RECONCILIATION_COPY
          : MUTATION_RECONCILIATION_COPY,
    };
  }
  if (status.applied === true) {
    return { role: "status", text: MUTATION_APPLIED_INCOMPLETE_COPY };
  }
  if (
    status.transactionState === "failed-before-write" ||
    status.status === "rejected" ||
    status.status === "cancelled-before-write"
  ) {
    return { role: "status", text: MUTATION_FAILED_BEFORE_WRITE_COPY };
  }
  return {
    role: "status",
    text: "The host reported a recorded mutation status.",
  };
}

export function isIntegrityStatusError(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false;
  const record = error as { code?: unknown; message?: unknown };
  return (
    record.code === "durable-status-corrupt" ||
    record.message === "durable-status-corrupt"
  );
}
