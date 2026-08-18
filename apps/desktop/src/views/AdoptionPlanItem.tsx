import type { AdoptionPreviewItem } from "@intentloom/protocol";
import { FilePath } from "../design/components/code/FilePath.js";
import { StatusChip } from "../design/components/status/StatusChip.js";
import { futureResolutionLabel } from "./adoption-preview-presentation.js";

export interface AdoptionPlanItemProps {
  readonly item: AdoptionPreviewItem;
}

export function AdoptionPlanItem({ item }: AdoptionPlanItemProps) {
  const decision = item.manualDecisionRequired;
  return (
    <article
      aria-label={decision ? `Requires decision ${item.path}` : item.path}
    >
      <header>
        <FilePath path={item.path} />
        <StatusChip
          label={decision ? "Requires decision" : item.action}
          size="sm"
          tone={decision ? "warning" : "neutral"}
        />
      </header>
      <dl>
        <div>
          <dt>Action</dt>
          <dd>{item.action}</dd>
        </div>
        <div>
          <dt>Current classification</dt>
          <dd>{item.currentClassification}</dd>
        </div>
        <div>
          <dt>Proposed classification</dt>
          <dd>{item.proposedClassification}</dd>
        </div>
        <div>
          <dt>Reason</dt>
          <dd>{item.reason}</dd>
        </div>
        {item.adapter ? (
          <div>
            <dt>Adapter</dt>
            <dd>{item.adapter}</dd>
          </div>
        ) : null}
        <div>
          <dt>Available future resolution</dt>
          <dd>{futureResolutionLabel(item)}</dd>
        </div>
        <div>
          <dt>Safe next action</dt>
          <dd>{item.safeNextAction}</dd>
        </div>
      </dl>
    </article>
  );
}
