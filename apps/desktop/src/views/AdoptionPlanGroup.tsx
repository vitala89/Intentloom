import type { AdoptionPreviewItem } from "@intentloom/protocol";
import { Card } from "../design/components/layout/Card.js";
import { AdoptionPlanItem } from "./AdoptionPlanItem.js";
import type { AdoptionPlanGroupId } from "./adoption-preview-grouping.js";

export interface AdoptionPlanGroupProps {
  readonly id: AdoptionPlanGroupId;
  readonly heading: string;
  readonly items: readonly AdoptionPreviewItem[];
}

export function AdoptionPlanGroup({
  id,
  heading,
  items,
}: AdoptionPlanGroupProps) {
  const headingId = `adoption-group-${id}`;
  return (
    <Card title={heading}>
      <ul aria-labelledby={headingId} className="flow-step-list">
        <span className="sr-only" id={headingId}>
          {heading}
        </span>
        {items.map((item) => (
          <li key={`${item.path}:${item.action}`}>
            <AdoptionPlanItem item={item} />
          </li>
        ))}
      </ul>
    </Card>
  );
}
