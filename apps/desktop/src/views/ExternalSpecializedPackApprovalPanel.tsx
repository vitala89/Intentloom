import type { ExternalQualityPackActivationApproval } from "@intentloom/protocol";
import { Button } from "../design/components/core/Button.js";
import { Card } from "../design/components/layout/Card.js";
import { DESKTOP_EXTERNAL_SPECIALIZED_PACK_REVIEWER_ID } from "./specialized-pack-external-reviewer.js";

export const EXTERNAL_SPECIALIZED_PACK_APPROVAL_INTENT =
  "You are approving activation of the external specialized pack shown above. Intentloom will pin the referenced metadata in .aif/extension-lock.json. Pack contents are not copied into the project.";

export function ExternalSpecializedPackApprovalPanel(props: {
  readonly canApprove: boolean;
  readonly canActivate: boolean;
  readonly approved: boolean;
  readonly applying: boolean;
  readonly reviewStale: boolean;
  readonly approval: ExternalQualityPackActivationApproval | null;
  readonly onApprove: () => void;
  readonly onActivate: () => void;
}) {
  return (
    <Card title="Human approval">
      <p className="external-pack-review-note">
        Approval is an explicit Intentloom action. Manifest values remain
        untrusted external data.
      </p>
      {props.reviewStale ? (
        <p role="note">
          Inputs changed since preview. Preview again before approval.
        </p>
      ) : null}
      {!props.approved ? (
        <>
          <p id="external-pack-approve-intent">
            {EXTERNAL_SPECIALIZED_PACK_APPROVAL_INTENT}
          </p>
          <div className="external-pack-preview-actions">
            <Button
              aria-describedby="external-pack-approve-intent"
              disabled={!props.canApprove}
              id="external-pack-approve"
              onClick={props.onApprove}
              type="button"
              variant="primary"
            >
              Approve for activation
            </Button>
          </div>
        </>
      ) : (
        <>
          <dl className="external-pack-preview-facts">
            <div>
              <dt>Reviewer</dt>
              <dd>{DESKTOP_EXTERNAL_SPECIALIZED_PACK_REVIEWER_ID}</dd>
            </div>
            <div>
              <dt>Decision</dt>
              <dd>{props.approval?.decision ?? "approve"}</dd>
            </div>
            <div>
              <dt>Bound digest</dt>
              <dd className="external-pack-code">
                {props.approval?.source.digest}
              </dd>
            </div>
            <div>
              <dt>Bound pin</dt>
              <dd className="external-pack-code">
                {props.approval?.source.pin}
              </dd>
            </div>
            <div>
              <dt>Bound locator</dt>
              <dd>{props.approval?.source.locator}</dd>
            </div>
          </dl>
          <p id="external-pack-activate-warning" role="note">
            Activation updates .aif/extension-lock.json through the daemon
            transactional apply path.
          </p>
          <div className="external-pack-preview-actions">
            <Button
              aria-describedby="external-pack-activate-warning"
              disabled={!props.canActivate}
              id="external-pack-activate"
              loading={props.applying}
              mutation
              onClick={props.onActivate}
              type="button"
              variant="danger"
            >
              Activate approved pack
            </Button>
          </div>
        </>
      )}
    </Card>
  );
}
