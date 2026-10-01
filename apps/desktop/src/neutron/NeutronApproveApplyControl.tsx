import type { NeutronMutationApproveAndApplyResult } from "@intentloom/protocol";
import type { NeutronMutationReviewView } from "@intentloom/protocol";
import { Button } from "../design/components/core/Button.js";
import {
  APPROVE_APPLY_LABEL,
  approveApplyDisabledReason,
  approveApplyResultCopy,
} from "./neutron-approve-apply-copy.js";
import type { NeutronMutationReviewScope } from "./neutron-mutation-review-state.js";
import {
  useNeutronApproveApply,
  type NeutronApproveApplyPort,
} from "./use-neutron-approve-apply.js";

export function NeutronApproveApplyAction({
  scope,
  review,
  reviewReady,
  port,
}: {
  readonly scope: NeutronMutationReviewScope;
  readonly review: NeutronMutationReviewView;
  readonly reviewReady: boolean;
  readonly port?: NeutronApproveApplyPort;
}) {
  const action = useNeutronApproveApply({
    graphId: review.graphId,
    proposalId: review.proposalId,
    scope,
    ...(port === undefined ? {} : { port }),
  });
  return (
    <NeutronApproveApplyControl
      currentness={review.currentness}
      error={action.error}
      pending={action.pending}
      result={action.result}
      reviewReady={reviewReady}
      settled={action.settled}
      onSubmit={() => {
        void action.submit();
      }}
    />
  );
}

export function NeutronApproveApplyControl({
  currentness,
  reviewReady,
  pending,
  settled,
  result,
  error,
  onSubmit,
}: {
  readonly currentness: NeutronMutationReviewView["currentness"] | null;
  readonly reviewReady: boolean;
  readonly pending: boolean;
  readonly settled: boolean;
  readonly result: NeutronMutationApproveAndApplyResult | null;
  readonly error: string | null;
  readonly onSubmit: () => void;
}) {
  const reason = approveApplyDisabledReason({
    currentness,
    pending,
    reviewReady,
    settled,
  });
  return (
    <div>
      <Button
        disabled={reason !== null}
        mutation
        type="button"
        variant="danger"
        onClick={onSubmit}
      >
        {APPROVE_APPLY_LABEL}
      </Button>
      {reason === null ? null : <p role="status">{reason}</p>}
      {result === null ? null : (
        <p role="status">{approveApplyResultCopy(result)}</p>
      )}
      {error === null ? null : <p role="alert">{error}</p>}
    </div>
  );
}
