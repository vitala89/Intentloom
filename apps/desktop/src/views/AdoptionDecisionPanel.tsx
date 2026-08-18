import {
  adoptionDecisionKindLabel,
  supportedAdoptionDecisionKinds,
  type AdoptionDecisionKind,
  type AdoptionPreviewItem,
  type ExistingProjectAdoptionDecisionViewModel,
} from "@intentloom/protocol";
import { Card } from "../design/components/layout/Card.js";
import { FilePath } from "../design/components/code/FilePath.js";
import { Radio } from "../design/components/forms/Radio.js";
import { StatusChip } from "../design/components/status/StatusChip.js";
import { evaluationForPath } from "./adoption-decision-presentation.js";

export interface AdoptionDecisionPanelProps {
  readonly item: AdoptionPreviewItem;
  readonly index: number;
  readonly selectedKind: AdoptionDecisionKind | null;
  readonly result: ExistingProjectAdoptionDecisionViewModel | null;
  readonly onSelect: (path: string, kind: AdoptionDecisionKind) => void;
}

export function AdoptionDecisionPanel({
  item,
  index,
  selectedKind,
  result,
  onSelect,
}: AdoptionDecisionPanelProps) {
  const choices = supportedAdoptionDecisionKinds(item);
  const evaluation = evaluationForPath(result, item.path);
  const invalid = evaluation?.status === "invalid";
  const valid = evaluation?.status === "valid";
  const statusLabel = invalid
    ? "Invalid decision"
    : valid
      ? "Valid decision"
      : selectedKind
        ? "Selected, not applied"
        : "Requires decision";
  return (
    <Card
      title="Requires decision"
      action={
        <StatusChip
          label={statusLabel}
          size="sm"
          tone={invalid ? "error" : valid ? "success" : "warning"}
        />
      }
    >
      <section
        aria-labelledby={`adoption-decision-${index}-title`}
        id={`adoption-decision-${index}`}
      >
        <h3 id={`adoption-decision-${index}-title`}>
          <FilePath path={item.path} />
        </h3>
        <p>
          Choose a supported mapping. The project stays unchanged until a later
          prepared plan is approved.
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
        </dl>
        {choices.length === 0 ? (
          <p>No supported Desktop decision exists for this item.</p>
        ) : (
          <fieldset
            className="inspect-facts"
            id={`adoption-decision-${index}-choices`}
          >
            <legend>Supported decisions</legend>
            <div
              role="radiogroup"
              aria-labelledby={`adoption-decision-${index}-title`}
            >
              {choices.map((kind) => (
                <Radio
                  checked={selectedKind === kind}
                  description="Validated locally. Not written to the project."
                  id={`adoption-decision-${index}-${kind}`}
                  key={kind}
                  label={adoptionDecisionKindLabel(kind)}
                  name={`adoption-decision-${item.path}`}
                  onChange={() => onSelect(item.path, kind)}
                  value={kind}
                />
              ))}
            </div>
          </fieldset>
        )}
        {valid && evaluation?.resolvedItem ? (
          <p>
            Proposed resolution: {evaluation.resolvedItem.action}. Ready for a
            future prepared plan. Changes applied: 0.
          </p>
        ) : null}
        {invalid ? (
          <p aria-live="polite">
            Invalid decision: {evaluation?.reason ?? "rejected"}. The project
            was not changed.
          </p>
        ) : null}
      </section>
    </Card>
  );
}
