import type { NeutronMutationReviewView } from "@intentloom/protocol";
import { Button } from "../design/components/core/Button.js";
import { APPROVE_APPLY_LABEL } from "./neutron-approve-apply-copy.js";
import { MUTATION_STATUS_REFRESH_LABEL } from "./neutron-mutation-recovery-copy.js";
import type { NeutronMutationReviewScope } from "./neutron-mutation-review-state.js";
import {
  isolatedRecoveryNotice,
  projectMutationRecoveryView,
  type MutationRecoveryView,
} from "./neutron-mutation-recovery-view.js";
import type { NeutronMutationRecoveryModel } from "./neutron-mutation-recovery-model.js";
import type { NeutronMutationSubmitInput } from "./neutron-mutation-recovery-controller.js";

export function NeutronMutationReviewApply({
  daemonReady,
  model,
  review,
  reviewReady,
  scope,
  onRefresh,
  onSubmit,
}: {
  readonly daemonReady: boolean;
  readonly model: NeutronMutationRecoveryModel;
  readonly review: NeutronMutationReviewView;
  readonly reviewReady: boolean;
  readonly scope: NeutronMutationReviewScope;
  readonly onRefresh: () => void;
  readonly onSubmit: (input: NeutronMutationSubmitInput) => void;
}) {
  const view = projectMutationRecoveryView({
    currentness: review.currentness,
    daemonReady,
    model,
    proposalId: review.proposalId,
    reviewReady,
  });
  return (
    <NeutronApproveApplyControl
      view={view}
      onRefresh={onRefresh}
      onSubmit={() => {
        onSubmit({
          graphId: review.graphId,
          projectId: scope.projectId,
          proposalId: review.proposalId,
          root: scope.root,
          sessionId: scope.sessionId,
        });
      }}
    />
  );
}

export function NeutronApproveApplyControl({
  view,
  onSubmit,
  onRefresh,
}: {
  readonly view: MutationRecoveryView;
  readonly onSubmit: () => void;
  readonly onRefresh: () => void;
}) {
  return (
    <div>
      <Button
        disabled={view.applyDisabled}
        mutation
        type="button"
        variant="danger"
        onClick={onSubmit}
      >
        {APPROVE_APPLY_LABEL}
      </Button>
      {view.statusCopy === null ? null : <p role="status">{view.statusCopy}</p>}
      {view.alertCopy === null ? null : <p role="alert">{view.alertCopy}</p>}
      {view.refreshVisible ? (
        <Button
          disabled={view.refreshDisabled}
          type="button"
          variant="secondary"
          onClick={onRefresh}
        >
          {MUTATION_STATUS_REFRESH_LABEL}
        </Button>
      ) : null}
      {view.isolatedNotice === null ? null : (
        <p role="status">{view.isolatedNotice}</p>
      )}
    </div>
  );
}

export function mutationRecoveryScopeNotice(
  model: NeutronMutationRecoveryModel,
): string | null {
  return isolatedRecoveryNotice(model);
}
