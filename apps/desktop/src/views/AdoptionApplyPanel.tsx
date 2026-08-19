import type {
  ExistingProjectAdoptionApplyViewModel,
  ExistingProjectAdoptionApproval,
  ExistingProjectAdoptionPreparedPlan,
} from "@intentloom/protocol";
import { Button } from "../design/components/core/Button.js";
import { Card } from "../design/components/layout/Card.js";
import {
  applyOutcomeLabel,
  canApplyApprovedPlan,
} from "./adoption-apply-controller.js";

export const ADOPTION_APPLY_WARNING =
  "This will modify files in the selected project.";

export function renderAdoptionApplySummary(options: {
  readonly plan: ExistingProjectAdoptionPreparedPlan | null;
  readonly approval: ExistingProjectAdoptionApproval | null;
  readonly applying: boolean;
  readonly result: ExistingProjectAdoptionApplyViewModel | null;
}): string {
  if (options.result) return applyOutcomeLabel(options.result);
  if (options.applying) return "Applying...";
  if (!options.plan || !options.approval) return "Apply is unavailable";
  return [
    `Project root: ${options.plan.root}`,
    `Plan digest: ${options.plan.planDigest.slice(0, 12)}…`,
    "Approval status: approved",
    `Affected paths: ${options.plan.affectedPaths.length}`,
    `Expires: ${new Date(options.approval.approvalValidUntil).toISOString()}`,
    ADOPTION_APPLY_WARNING,
  ].join("\n");
}

export function AdoptionApplyPanel(props: {
  readonly plan: ExistingProjectAdoptionPreparedPlan | null;
  readonly approval: ExistingProjectAdoptionApproval | null;
  readonly revalidationStatus: string | null;
  readonly applying: boolean;
  readonly result: ExistingProjectAdoptionApplyViewModel | null;
  readonly onApply: () => void;
}) {
  const canApply =
    canApplyApprovedPlan(props.approval, props.revalidationStatus) &&
    !props.applying;
  return (
    <Card title="Apply approved plan">
      <p>
        Apply is a separate action from approval. The project is not modified
        until you click Apply approved plan.
      </p>
      {props.plan && props.approval ? (
        <dl>
          <dt>Project root</dt>
          <dd>{props.plan.root}</dd>
          <dt>Plan digest</dt>
          <dd>{props.plan.planDigest}</dd>
          <dt>Approval</dt>
          <dd>approved</dd>
          <dt>Affected paths</dt>
          <dd>{props.plan.affectedPaths.length}</dd>
          <dt>Expires</dt>
          <dd>{new Date(props.approval.approvalValidUntil).toISOString()}</dd>
        </dl>
      ) : null}
      <p id="adoption-apply-warning" role="note">
        Warning: {ADOPTION_APPLY_WARNING}
      </p>
      <div className="view-actions">
        <Button
          aria-describedby="adoption-apply-warning"
          disabled={!canApply}
          id="adoption-apply-plan"
          loading={props.applying}
          mutation
          onClick={props.onApply}
          type="button"
          variant="danger"
        >
          Apply approved plan
        </Button>
      </div>
      {props.applying ? <p aria-live="polite">Applying...</p> : null}
      {props.result ? (
        <div aria-live="polite">
          <p>{applyOutcomeLabel(props.result)}</p>
          <p>Changes applied: {props.result.changesApplied}</p>
          {props.result.recoveryGuidance ? (
            <p>{props.result.recoveryGuidance}</p>
          ) : null}
          {props.result.rollbackFailures.length > 0 ? (
            <p>Rollback failures: {props.result.rollbackFailures.join(", ")}</p>
          ) : null}
          {props.result.appliedPaths.length > 0 ? (
            <p>Applied paths: {props.result.appliedPaths.join(", ")}</p>
          ) : null}
        </div>
      ) : null}
    </Card>
  );
}
