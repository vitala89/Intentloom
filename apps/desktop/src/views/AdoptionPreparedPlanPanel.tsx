import type {
  ExistingProjectAdoptionPreparedPlan,
  ExistingProjectAdoptionRevalidateViewModel,
} from "@intentloom/protocol";
import { Button } from "../design/components/core/Button.js";
import { Card } from "../design/components/layout/Card.js";

export function AdoptionPreparedPlanPanel(props: {
  readonly plan: ExistingProjectAdoptionPreparedPlan | null;
  readonly revalidation: ExistingProjectAdoptionRevalidateViewModel | null;
  readonly canPrepare: boolean;
  readonly onPrepare: () => void;
  readonly onRevalidate: () => void;
}) {
  const expiry = props.plan
    ? new Date(props.plan.expiresAt).toISOString()
    : null;
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
          <dt>Plan prepared</dt>
          <dd>Not approved</dd>
          <dt>Plan ID</dt>
          <dd>{props.plan.preparedPlanId}</dd>
          <dt>Valid until</dt>
          <dd>{expiry}</dd>
          <dt>Files affected</dt>
          <dd>{props.plan.affectedPaths.length}</dd>
          <dt>Decisions</dt>
          <dd>{props.plan.decisions.length}</dd>
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
    </Card>
  );
}
