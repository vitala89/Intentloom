import { Card } from "../design/components/layout/Card.js";
import {
  formatList,
  formatYesNo,
  type BoundedExecutionPanelState,
} from "./bounded-execution-view-helpers.js";

export function BoundedExecutionResultCards({
  panel,
}: {
  readonly panel: BoundedExecutionPanelState;
}) {
  return (
    <>
      <Card title="Execution gate">
        <dl className="detail-grid">
          <div>
            <dt>Gate</dt>
            <dd>{panel.executionGate}</dd>
          </div>
          <div>
            <dt>Mutation allowed</dt>
            <dd>{formatYesNo(panel.mutationAllowed)}</dd>
          </div>
        </dl>
      </Card>
      <Card title="Capability bounds">
        <dl className="detail-grid">
          <div>
            <dt>Approved root</dt>
            <dd>{panel.approvedRoot || "none"}</dd>
          </div>
          <div>
            <dt>Allowed paths</dt>
            <dd>{formatList(panel.allowedPaths)}</dd>
          </div>
          <div>
            <dt>Allowed commands</dt>
            <dd>{formatList(panel.allowedCommands)}</dd>
          </div>
          <div>
            <dt>Network access</dt>
            <dd>{formatYesNo(panel.networkAccess)}</dd>
          </div>
          <div>
            <dt>Process execution</dt>
            <dd>{formatYesNo(panel.processExecution)}</dd>
          </div>
        </dl>
      </Card>
      <Card title="Checkpoints">
        <ul className="flow-step-list">
          {panel.checkpoints.map((checkpoint) => (
            <li key={checkpoint.id || checkpoint.label}>
              <strong>{checkpoint.label}</strong>
              <span>{checkpoint.status}</span>
            </li>
          ))}
        </ul>
      </Card>
      <Card title="Checkers">
        <dl className="detail-grid">
          <div>
            <dt>Checker count</dt>
            <dd>{panel.checkerCount}</dd>
          </div>
          <div>
            <dt>Architecture passed</dt>
            <dd>{formatYesNo(panel.architecturePassed)}</dd>
          </div>
        </dl>
      </Card>
      <Card title="Diff paths">
        <dl className="detail-grid">
          <div>
            <dt>Proposed paths</dt>
            <dd>{formatList(panel.proposedPaths)}</dd>
          </div>
          <div>
            <dt>Outside approved paths</dt>
            <dd>{formatList(panel.outsideApprovedPaths)}</dd>
          </div>
        </dl>
      </Card>
      <Card title="Apply">
        <dl className="detail-grid">
          <div>
            <dt>Apply attempted</dt>
            <dd>{formatYesNo(panel.applyAttempted)}</dd>
          </div>
          <div>
            <dt>Apply applied</dt>
            <dd>{formatYesNo(panel.applyApplied)}</dd>
          </div>
        </dl>
      </Card>
      <Card title="Diagnostics">
        <p>{formatList(panel.diagnostics)}</p>
      </Card>
      <Card title="Harness status">
        <p>{panel.harnessScorecardStatus}</p>
      </Card>
    </>
  );
}
