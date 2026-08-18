import type { ExistingProjectAdoptionPlanViewModel } from "@intentloom/protocol";
import { Card } from "../design/components/layout/Card.js";
import { FilePath } from "../design/components/code/FilePath.js";
import { StatusChip } from "../design/components/status/StatusChip.js";

export interface AdoptionProjectSummaryProps {
  readonly selectedRoot: string;
  readonly plan: ExistingProjectAdoptionPlanViewModel;
}

export function AdoptionProjectSummary({
  selectedRoot,
  plan,
}: AdoptionProjectSummaryProps) {
  const adapters =
    plan.detectedAdapters.length > 0
      ? plan.detectedAdapters.join(", ")
      : "none reported";
  return (
    <Card
      title="Project"
      action={<StatusChip label="Read-only preview" size="sm" tone="info" />}
    >
      <p>
        This is a read-only preview. No changes have been applied to the
        selected project.
      </p>
      <dl className="inspect-facts">
        <div>
          <dt>Selected project</dt>
          <dd>
            <FilePath kind="dir" path={selectedRoot} />
          </dd>
        </div>
        <div>
          <dt>Canonical root</dt>
          <dd>
            <FilePath kind="dir" path={plan.root} />
          </dd>
        </div>
        <div>
          <dt>Project</dt>
          <dd>{plan.projectId}</dd>
        </div>
        <div>
          <dt>Engineering profile</dt>
          <dd>{plan.profile}</dd>
        </div>
        <div>
          <dt>Workspace topology</dt>
          <dd>{plan.workspaceTopology}</dd>
        </div>
        <div>
          <dt>Adapters</dt>
          <dd>{adapters}</dd>
        </div>
        <div>
          <dt>Intentloom readiness</dt>
          <dd>{plan.readiness}</dd>
        </div>
      </dl>
    </Card>
  );
}
