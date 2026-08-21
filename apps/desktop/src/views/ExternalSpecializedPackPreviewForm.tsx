import { Button } from "../design/components/core/Button.js";
import { Card } from "../design/components/layout/Card.js";
import { EXTERNAL_QUALITY_PACK_SOURCE_KINDS } from "../desktop-client-specialized-pack-external.js";
import type { ExternalSpecializedPackPreviewInput } from "./specialized-pack-external-preview-types.js";

export function ExternalSpecializedPackPreviewForm(props: {
  readonly input: ExternalSpecializedPackPreviewInput;
  readonly loadingPreview: boolean;
  readonly applying: boolean;
  readonly onInputChange: (
    patch: Partial<ExternalSpecializedPackPreviewInput>,
  ) => void;
  readonly onPreview: () => void;
  readonly onCancelPreview: () => void;
  readonly onOpenDoctor: () => void;
}) {
  return (
    <Card>
      <div className="external-pack-input-grid">
        <label>
          <span>Manifest JSON</span>
          <textarea
            value={props.input.manifestJson}
            onChange={(event) =>
              props.onInputChange({ manifestJson: event.target.value })
            }
            rows={8}
            spellCheck={false}
            aria-label="Manifest JSON"
          />
        </label>
        <label>
          <span>Source kind</span>
          <select
            value={props.input.sourceKind}
            onChange={(event) =>
              props.onInputChange({ sourceKind: event.target.value })
            }
          >
            {EXTERNAL_QUALITY_PACK_SOURCE_KINDS.map((kind) => (
              <option key={kind} value={kind}>
                {kind}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Source locator</span>
          <input
            value={props.input.sourceLocator}
            onChange={(event) =>
              props.onInputChange({ sourceLocator: event.target.value })
            }
            spellCheck={false}
          />
        </label>
        <label>
          <span>Exact pin</span>
          <input
            className="external-pack-code"
            value={props.input.sourcePin}
            onChange={(event) =>
              props.onInputChange({ sourcePin: event.target.value })
            }
            spellCheck={false}
          />
        </label>
        <label>
          <span>Canonical digest</span>
          <input
            className="external-pack-code"
            value={props.input.sourceDigest}
            onChange={(event) =>
              props.onInputChange({ sourceDigest: event.target.value })
            }
            spellCheck={false}
          />
        </label>
        <label>
          <span>Declared publisher</span>
          <input
            value={props.input.declaredPublisher}
            onChange={(event) =>
              props.onInputChange({ declaredPublisher: event.target.value })
            }
            spellCheck={false}
          />
        </label>
        <label>
          <span>Declared license</span>
          <input
            value={props.input.declaredLicense}
            onChange={(event) =>
              props.onInputChange({ declaredLicense: event.target.value })
            }
            spellCheck={false}
          />
        </label>
      </div>
      <div className="external-pack-preview-actions">
        <Button
          variant="primary"
          onClick={props.onPreview}
          disabled={props.loadingPreview || props.applying}
        >
          {props.loadingPreview ? "Previewing…" : "Preview"}
        </Button>
        {props.loadingPreview ? (
          <Button variant="secondary" onClick={props.onCancelPreview}>
            Cancel
          </Button>
        ) : null}
        <Button variant="secondary" onClick={props.onOpenDoctor}>
          Open Doctor
        </Button>
      </div>
    </Card>
  );
}
