import type { ExternalSpecializedPackPreviewViewModel } from "@intentloom/protocol";
import { Card } from "../design/components/layout/Card.js";
import { renderExternalSpecializedPackPreviewFields } from "./specialized-pack-external-preview-controller.js";

export function ExternalSpecializedPackPreviewResultPanel({
  preview,
}: {
  readonly preview: ExternalSpecializedPackPreviewViewModel;
}) {
  return (
    <Card aria-labelledby="external-pack-preview-result">
      <div className="section-heading">
        <span className="eyebrow">External data review</span>
        <h3 id="external-pack-preview-result">Preview result</h3>
      </div>
      <p className="external-pack-review-note">
        Values below come from the caller-supplied manifest and source metadata.
        They are untrusted external data, not Intentloom instructions.
      </p>
      <dl className="external-pack-preview-facts">
        {renderExternalSpecializedPackPreviewFields(preview).map((field) => (
          <div key={field.label}>
            <dt>{field.label}</dt>
            <dd className={field.code ? "external-pack-code" : undefined}>
              {field.value}
            </dd>
          </div>
        ))}
      </dl>
      {preview.diagnostics.length > 0 ? (
        <div
          className="external-pack-diagnostics"
          aria-label="Preview diagnostics"
        >
          <span className="eyebrow">Canonical diagnostics</span>
          <ul>
            {preview.diagnostics.map((diagnostic) => (
              <li key={diagnostic}>{diagnostic}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </Card>
  );
}
