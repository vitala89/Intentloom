import type { NeutronMutationReviewCurrentness } from "@intentloom/protocol";
import { approveApplyDisabledReason } from "./neutron-approve-apply-copy.js";
import { approveApplyResultCopy } from "./neutron-approve-apply-copy.js";
import {
  MUTATION_INTEGRITY_COPY,
  MUTATION_ISOLATED_SCOPE_COPY,
  MUTATION_OTHER_UNRESOLVED_COPY,
  MUTATION_RESULT_UNKNOWN_COPY,
  MUTATION_STATUS_RECOVERING_COPY,
  VERIFICATION_RETRY_FAILED_COPY,
  VERIFICATION_RETRY_INCOMPLETE_COPY,
  VERIFICATION_RETRY_PENDING_COPY,
  VERIFICATION_RETRY_SUCCEEDED_COPY,
  mutationStatusPresentation,
} from "./neutron-mutation-recovery-copy.js";
import { verificationRetryEligible } from "./neutron-mutation-verification-retry-model.js";
import {
  blocksAnotherApply,
  type NeutronMutationRecoveryModel,
} from "./neutron-mutation-recovery-model.js";

export interface MutationRecoveryView {
  readonly applyDisabled: boolean;
  readonly statusCopy: string | null;
  readonly alertCopy: string | null;
  readonly refreshVisible: boolean;
  readonly refreshDisabled: boolean;
  readonly retryVisible: boolean;
  readonly retryDisabled: boolean;
  readonly isolatedNotice: string | null;
}

export function projectMutationRecoveryView(input: {
  readonly model: NeutronMutationRecoveryModel;
  readonly proposalId: string;
  readonly currentness: NeutronMutationReviewCurrentness | null;
  readonly reviewReady: boolean;
  readonly daemonReady: boolean;
}): MutationRecoveryView {
  const own = ownsProposal(input.model, input.proposalId);
  if (!own) return blockedByOther(input);
  return projectOwned(input);
}

function ownsProposal(
  model: NeutronMutationRecoveryModel,
  proposalId: string,
): boolean {
  return (
    model.identity === null ||
    model.phase === "idle" ||
    model.identity.proposalId === proposalId
  );
}

function blockedByOther(input: {
  readonly model: NeutronMutationRecoveryModel;
  readonly proposalId: string;
  readonly currentness: NeutronMutationReviewCurrentness | null;
  readonly reviewReady: boolean;
}): MutationRecoveryView {
  const blocked = blocksAnotherApply(input.model, input.proposalId);
  const reason = approveApplyDisabledReason({
    currentness: input.currentness,
    pending: false,
    reviewReady: input.reviewReady,
    settled: blocked,
  });
  return {
    applyDisabled: reason !== null,
    statusCopy: blocked ? MUTATION_OTHER_UNRESOLVED_COPY : reason,
    alertCopy: null,
    refreshVisible: false,
    refreshDisabled: true,
    retryVisible: false,
    retryDisabled: true,
    isolatedNotice: null,
  };
}

function projectOwned(input: {
  readonly model: NeutronMutationRecoveryModel;
  readonly currentness: NeutronMutationReviewCurrentness | null;
  readonly reviewReady: boolean;
  readonly daemonReady: boolean;
}): MutationRecoveryView {
  const phase = input.model.phase;
  if (phase === "idle") return idleView(input);
  if (phase === "pending") {
    return statusView(
      approveApplyDisabledReason({
        currentness: input.currentness,
        pending: true,
        reviewReady: input.reviewReady,
        settled: false,
      }),
    );
  }
  if (phase === "uncertain") return uncertainView(input.daemonReady);
  if (phase === "recovering") return recoveringView();
  if (phase === "integrity") return integrityView(input.daemonReady);
  if (phase === "verifying") return verifyingView();
  return authoritativeView(input);
}

function idleView(input: {
  readonly currentness: NeutronMutationReviewCurrentness | null;
  readonly reviewReady: boolean;
}): MutationRecoveryView {
  const reason = approveApplyDisabledReason({
    currentness: input.currentness,
    pending: false,
    reviewReady: input.reviewReady,
    settled: false,
  });
  return {
    applyDisabled: reason !== null,
    statusCopy: reason,
    alertCopy: null,
    refreshVisible: false,
    refreshDisabled: true,
    retryVisible: false,
    retryDisabled: true,
    isolatedNotice: null,
  };
}

function uncertainView(daemonReady: boolean): MutationRecoveryView {
  return {
    applyDisabled: true,
    statusCopy: MUTATION_RESULT_UNKNOWN_COPY,
    alertCopy: null,
    refreshVisible: daemonReady,
    refreshDisabled: false,
    retryVisible: false,
    retryDisabled: true,
    isolatedNotice: null,
  };
}

function recoveringView(): MutationRecoveryView {
  return {
    applyDisabled: true,
    statusCopy: MUTATION_STATUS_RECOVERING_COPY,
    alertCopy: null,
    refreshVisible: true,
    refreshDisabled: true,
    retryVisible: false,
    retryDisabled: true,
    isolatedNotice: null,
  };
}

function integrityView(daemonReady: boolean): MutationRecoveryView {
  return {
    applyDisabled: true,
    statusCopy: null,
    alertCopy: MUTATION_INTEGRITY_COPY,
    refreshVisible: daemonReady,
    refreshDisabled: false,
    retryVisible: false,
    retryDisabled: true,
    isolatedNotice: null,
  };
}

function verifyingView(): MutationRecoveryView {
  return {
    applyDisabled: true,
    statusCopy: VERIFICATION_RETRY_PENDING_COPY,
    alertCopy: null,
    refreshVisible: false,
    refreshDisabled: true,
    retryVisible: true,
    retryDisabled: true,
    isolatedNotice: null,
  };
}

function authoritativeView(input: {
  readonly model: NeutronMutationRecoveryModel;
  readonly daemonReady: boolean;
}): MutationRecoveryView {
  const presented = presentAuthoritative(input.model);
  const refreshable = canRefresh(input.model);
  return {
    applyDisabled: true,
    statusCopy: presented.role === "status" ? presented.text : null,
    alertCopy: presented.role === "alert" ? presented.text : null,
    refreshVisible: refreshable && input.daemonReady,
    refreshDisabled: false,
    retryVisible: verificationRetryEligible(input.model) && input.daemonReady,
    retryDisabled: false,
    isolatedNotice: null,
  };
}

function presentAuthoritative(model: NeutronMutationRecoveryModel): {
  readonly role: "status" | "alert";
  readonly text: string;
} {
  const notice = verificationNoticeCopy(model.verificationNotice);
  if (notice !== null) return { role: "status", text: notice };
  if (model.direct !== null) {
    return { role: "status", text: approveApplyResultCopy(model.direct) };
  }
  if (model.status === null) {
    return { role: "status", text: "The host reported a mutation result." };
  }
  return mutationStatusPresentation(model.status);
}

function verificationNoticeCopy(
  notice: NeutronMutationRecoveryModel["verificationNotice"],
): string | null {
  if (notice === "succeeded") return VERIFICATION_RETRY_SUCCEEDED_COPY;
  if (notice === "failed") return VERIFICATION_RETRY_FAILED_COPY;
  if (notice === "incomplete") return VERIFICATION_RETRY_INCOMPLETE_COPY;
  return null;
}

function canRefresh(model: NeutronMutationRecoveryModel): boolean {
  if (model.direct !== null || model.status === null) return false;
  if (model.status.outcome !== "recorded") return true;
  return (
    model.status.transactionState === "claimed" ||
    model.status.transactionState === "executing"
  );
}

function statusView(statusCopy: string | null): MutationRecoveryView {
  return {
    applyDisabled: true,
    statusCopy,
    alertCopy: null,
    refreshVisible: false,
    refreshDisabled: true,
    retryVisible: false,
    retryDisabled: true,
    isolatedNotice: null,
  };
}

export function isolatedRecoveryNotice(
  model: NeutronMutationRecoveryModel,
): string | null {
  return model.isolatedNotice ? MUTATION_ISOLATED_SCOPE_COPY : null;
}
