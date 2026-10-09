import type { NeutronMutationApproveAndApplyResult } from "@intentloom/protocol";
import type { NeutronMutationReviewCurrentness } from "@intentloom/protocol";
import {
  MUTATION_REVIEW_CANCELLED_COPY,
  MUTATION_REVIEW_EXPIRED_COPY,
  MUTATION_REVIEW_STALE_COPY,
} from "../neutron-mutation-review-copy.js";

export const APPROVE_APPLY_LABEL = "Approve & Apply" as const;

export const APPROVE_APPLY_PENDING_COPY =
  "Approve & Apply is in progress." as const;

export const APPROVE_APPLY_SETTLED_COPY =
  "This proposal already has a host result." as const;

export function approveApplyDisabledReason(input: {
  readonly currentness: NeutronMutationReviewCurrentness | null;
  readonly reviewReady: boolean;
  readonly pending: boolean;
  readonly settled: boolean;
}): string | null {
  if (!input.reviewReady || input.currentness === null) {
    return "Review is not ready.";
  }
  if (input.pending) return APPROVE_APPLY_PENDING_COPY;
  if (input.settled) return APPROVE_APPLY_SETTLED_COPY;
  if (input.currentness === "stale") return MUTATION_REVIEW_STALE_COPY;
  if (input.currentness === "expired") return MUTATION_REVIEW_EXPIRED_COPY;
  if (input.currentness === "cancelled") return MUTATION_REVIEW_CANCELLED_COPY;
  if (input.currentness !== "current") return "This review cannot be applied.";
  return null;
}

export function approveApplyResultCopy(
  result: NeutronMutationApproveAndApplyResult,
): string {
  if (result.stage === "approval-rejected") {
    return approvalRejectedCopy(result.approvalOutcome);
  }
  if (result.applied === true && result.verificationStatus === "verified") {
    return "Applied and verified.";
  }
  if (
    result.applied === true &&
    result.verificationStatus === "verification-failed"
  ) {
    return "Applied. Verification failed. The write is not undone.";
  }
  if (result.applied === true && result.reconciliationRequired === true) {
    return "Applied. Reconciliation required.";
  }
  if (result.applied === true) return "Applied. Verification is incomplete.";
  if (result.failureCode === "lock-conflict") {
    return "Rejected before write. Another mutation holds the project lock.";
  }
  if (result.reconciliationRequired === true) {
    return "Reconciliation required. Apply was not repeated.";
  }
  return "Rejected before write.";
}

function approvalRejectedCopy(outcome: string | undefined): string {
  if (outcome === "stale" || outcome === "graph-stale") {
    return "Rejected before write. The review is stale.";
  }
  if (outcome === "expired")
    return "Rejected before write. The review expired.";
  if (outcome === "cancelled") {
    return "Rejected before write. The review was cancelled.";
  }
  if (outcome === "review-unavailable" || outcome === "proposal-not-found") {
    return "Rejected before write. The authoritative payload is unavailable.";
  }
  if (outcome === "durable-state-unavailable") {
    return "Rejected before write. Host durable state is unavailable.";
  }
  if (outcome === "lock-conflict") {
    return "Rejected before write. Another mutation holds the project lock.";
  }
  return "Rejected before write.";
}
