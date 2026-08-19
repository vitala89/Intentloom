import type {
  ExistingProjectAdoptionApproveViewModel,
  ExistingProjectAdoptionPreparedPlan,
  ExistingProjectAdoptionRevalidateViewModel,
} from "@intentloom/protocol";
import { Button } from "../design/components/core/Button.js";
import { Card } from "../design/components/layout/Card.js";
import { canApprovePreparedPlan } from "./adoption-prepared-plan-controller.js";

export const ADOPTION_APPROVAL_INTENT =
  "You are approving this exact prepared plan.";
export const ADOPTION_APPROVAL_NO_WRITE =
  "No project files will be changed by this approval.";
export const ADOPTION_APPROVAL_WARNING =
  "Approval does not apply changes. The project will remain unchanged.";

export function renderAdoptionApprovalSummary(options: {
  readonly plan: ExistingProjectAdoptionPreparedPlan | null;
  readonly revalidation: ExistingProjectAdoptionRevalidateViewModel | null;
  readonly approval: ExistingProjectAdoptionApproveViewModel | null;
}): string {
  if (options.approval?.status === "approved") {
    return "Approved\nChanges applied: 0";
  }
  if (!options.plan) return "No prepared plan";
  return [
    `Project: ${options.plan.root}`,
    `Plan digest: ${options.plan.planDigest}`,
    `Affected files: ${options.plan.affectedPaths.length}`,
    `Decisions: ${options.plan.decisions.length}`,
    `Valid until: ${new Date(options.plan.expiresAt).toISOString()}`,
    `Status: ${options.revalidation?.status ?? "Prepared"}`,
  ].join("\n");
}

export function AdoptionPreparedPlanPanel(props: {
  readonly plan: ExistingProjectAdoptionPreparedPlan | null;
  readonly revalidation: ExistingProjectAdoptionRevalidateViewModel | null;
  readonly approval: ExistingProjectAdoptionApproveViewModel | null;
  readonly canPrepare: boolean;
  readonly onPrepare: () => void;
  readonly onRevalidate: () => void;
  readonly onApprove: () => void;
}) {
  const expiry = props.plan
    ? new Date(props.plan.expiresAt).toISOString()
    : null;
  const canApprove = canApprovePreparedPlan(props.revalidation);
  const approved = props.approval?.status === "approved";
  return (
    <Card title="Prepared plan">
      <p>Preparing a plan does not approve or apply it. Changes applied: 0.</p>
      <div className="view-actions">
        <Button
          disabled={!props.canPrepare}
          id="adoption-prepare-plan"
          onClick={props.onPrepare}
          variant="secondary"
        >
          Prepare plan
        </Button>
        <Button
          disabled={props.plan === null}
          id="adoption-revalidate-plan"
          onClick={props.onRevalidate}
          variant="secondary"
        >
          Revalidate plan
        </Button>
      </div>
      {props.plan ? (
        <dl>
          <dt>Project</dt>
          <dd>{props.plan.root}</dd>
          <dt>Plan digest</dt>
          <dd>{props.plan.planDigest}</dd>
          <dt>Plan ID</dt>
          <dd>{props.plan.preparedPlanId}</dd>
          <dt>Valid until</dt>
          <dd>{expiry}</dd>
          <dt>Files affected</dt>
          <dd>{props.plan.affectedPaths.length}</dd>
          <dt>Decisions</dt>
          <dd>{props.plan.decisions.length}</dd>
          <dt>Status</dt>
          <dd>{props.revalidation?.status ?? "Prepared"}</dd>
          <dt>Changes applied</dt>
          <dd>0</dd>
        </dl>
      ) : null}
      {props.revalidation ? (
        <p aria-live="polite">
          Revalidation: {props.revalidation.status}
          {props.revalidation.reasons.length > 0
            ? ` (${props.revalidation.reasons.join(", ")})`
            : ""}
        </p>
      ) : null}
      {props.plan ? (
        <div>
          <p id="adoption-approve-intent">{ADOPTION_APPROVAL_INTENT}</p>
          <p id="adoption-approve-no-write">{ADOPTION_APPROVAL_NO_WRITE}</p>
          <p id="adoption-approve-warning" role="note">
            Warning: {ADOPTION_APPROVAL_WARNING}
          </p>
          <Button
            aria-describedby="adoption-approve-intent adoption-approve-no-write adoption-approve-warning"
            disabled={!canApprove || approved}
            id="adoption-approve-plan"
            onClick={props.onApprove}
            variant="primary"
          >
            Approve prepared plan
          </Button>
        </div>
      ) : null}
      {approved ? (
        <p aria-live="polite">
          Approved
          <br />
          Changes applied: 0
        </p>
      ) : null}
      {props.approval?.status === "denied" ? (
        <p aria-live="polite">
          Approval denied
          {props.approval.reasons.length > 0
            ? ` (${props.approval.reasons.join(", ")})`
            : ""}
        </p>
      ) : null}
    </Card>
  );
}
