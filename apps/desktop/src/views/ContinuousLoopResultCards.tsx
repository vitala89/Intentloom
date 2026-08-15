import { Card } from "../design/components/layout/Card.js";
import { StatusChip } from "../design/components/status/StatusChip.js";
import {
  formatList,
  formatYesNo,
  type ContinuousLoopPanelState,
} from "./continuous-loop-view-helpers.js";

function gateTone(
  gate: string,
): "success" | "warning" | "error" | "neutral" | "info" {
  if (gate === "accepted" || gate === "ready") return "success";
  if (gate === "unsupported" || gate === "incompatible") return "warning";
  if (
    gate === "w12-blocked" ||
    gate === "blocked" ||
    gate === "validation-failed"
  ) {
    return "error";
  }
  return "neutral";
}

export function ContinuousLoopResultCards({
  panel,
}: {
  readonly panel: ContinuousLoopPanelState;
}) {
  return (
    <>
      <Card title="Loop gate">
        <dl className="detail-grid">
          <div>
            <dt>Gate</dt>
            <dd>
              <StatusChip
                label={panel.loopGate}
                tone={gateTone(panel.loopGate)}
              />
            </dd>
          </div>
          <div>
            <dt>Mutation allowed</dt>
            <dd>{formatYesNo(panel.mutationAllowed)}</dd>
          </div>
          <div>
            <dt>Compatible</dt>
            <dd>{formatYesNo(panel.compatible)}</dd>
          </div>
          <div>
            <dt>Change kind</dt>
            <dd>{panel.changeKind}</dd>
          </div>
        </dl>
      </Card>
      <Card title="Findings">
        <dl className="detail-grid">
          <div>
            <dt>New findings</dt>
            <dd className="il-tnum">{panel.newFindingCount}</dd>
          </div>
          <div>
            <dt>Fixed findings</dt>
            <dd className="il-tnum">{panel.fixedFindingCount}</dd>
          </div>
        </dl>
      </Card>
      <Card title="Memory">
        <dl className="detail-grid">
          <div>
            <dt>Lifecycle</dt>
            <dd>{panel.memoryLifecycleState}</dd>
          </div>
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
      <Card title="Next feature">
        <p>{panel.nextFeatureTitle || "Not evaluated"}</p>
      </Card>
      <Card title="Checkpoints">
        <ul className="flow-step-list">
          {panel.checkpoints.map((checkpoint) => (
            <li key={checkpoint.id || checkpoint.label}>
              <strong>{checkpoint.label}</strong>
              <StatusChip label={checkpoint.status} tone="neutral" />
            </li>
          ))}
        </ul>
      </Card>
      <Card title="Diagnostics">
        <p>{formatList(panel.diagnostics)}</p>
      </Card>
    </>
  );
}
