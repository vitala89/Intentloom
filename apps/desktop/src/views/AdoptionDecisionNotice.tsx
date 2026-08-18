import type { AdoptionPreviewItem } from "@intentloom/protocol";
import { Card } from "../design/components/layout/Card.js";
import { FilePath } from "../design/components/code/FilePath.js";
import { StatusChip } from "../design/components/status/StatusChip.js";
import { futureResolutionLabel } from "./adoption-preview-presentation.js";

export interface AdoptionDecisionNoticeProps {
  readonly item: AdoptionPreviewItem;
  readonly index: number;
}

export function AdoptionDecisionNotice({
  item,
  index,
}: AdoptionDecisionNoticeProps) {
  return (
    <Card
      title="Requires decision"
      action={<StatusChip label="Manual decision" size="sm" tone="warning" />}
    >
      <section
        aria-labelledby={`adoption-decision-${index}-title`}
        id={`adoption-decision-${index}`}
        tabIndex={0}
      >
        <h3 id={`adoption-decision-${index}-title`}>
          <FilePath path={item.path} />
        </h3>
        <p>
          This item needs an explicit mapping choice in a later slice. No
          resolution control is available in this preview.
        </p>
        <dl className="inspect-facts">
          <div>
            <dt>Current classification</dt>
            <dd>{item.currentClassification}</dd>
          </div>
          <div>
            <dt>Reason</dt>
            <dd>{item.reason}</dd>
          </div>
          {item.conflictDetails.length > 0 ? (
            <div>
              <dt>Conflict details</dt>
              <dd>
                <ul>
                  {item.conflictDetails.map((detail) => (
                    <li key={detail}>{detail}</li>
                  ))}
                </ul>
              </dd>
            </div>
          ) : null}
          <div>
            <dt>Safe next action</dt>
            <dd>{item.safeNextAction}</dd>
          </div>
          <div>
            <dt>Available future resolution</dt>
            <dd>{futureResolutionLabel(item)}</dd>
          </div>
        </dl>
      </section>
    </Card>
  );
}
