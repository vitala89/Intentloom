import { useCallback, useEffect, useRef, useState } from "react";
import type { ExternalSpecializedPackPreviewViewModel } from "@intentloom/protocol";
import { Button } from "../design/components/core/Button.js";
import { Card } from "../design/components/layout/Card.js";
import { EmptyState } from "../design/components/states/EmptyState.js";
import { StatusChip } from "../design/components/status/StatusChip.js";
import { desktopClient } from "../desktop-client.js";
import { EXTERNAL_QUALITY_PACK_SOURCE_KINDS } from "../desktop-client-specialized-pack-external.js";
import {
  loadExternalSpecializedPackPreview,
  renderExternalSpecializedPackPreviewFields,
} from "./specialized-pack-external-preview-controller.js";
import {
  EMPTY_EXTERNAL_SPECIALIZED_PACK_PREVIEW_INPUT,
  externalSpecializedPackPreviewStatusLabel,
  shouldClearExternalSpecializedPackPreview,
  type ExternalSpecializedPackPreviewInput,
  type ExternalSpecializedPackPreviewSurfaceState,
} from "./specialized-pack-external-preview-types.js";

export interface ExternalSpecializedPackPreviewPageProps {
  readonly root: string | null;
  readonly onSelectProject: () => void;
  readonly onOpenDoctor: () => void;
}

function previewTone(
  status: ExternalSpecializedPackPreviewSurfaceState,
): "neutral" | "success" | "warning" | "error" {
  if (status === "ready-for-review") return "success";
  if (status === "rejected") return "warning";
  if (
    status === "error" ||
    status === "disconnected" ||
    status === "stale-root"
  ) {
    return "error";
  }
  return "neutral";
}

function PreviewResultPanel({
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
      {preview.activationRequiresApproval ? (
        <p className="external-pack-review-note">
          Activation requires explicit human approval. Approval controls are not
          available in this read-only preview slice.
        </p>
      ) : null}
    </Card>
  );
}

export function ExternalSpecializedPackPreviewPage({
  root,
  onSelectProject,
  onOpenDoctor,
}: ExternalSpecializedPackPreviewPageProps) {
  const [status, setStatus] =
    useState<ExternalSpecializedPackPreviewSurfaceState>("idle");
  const [input, setInput] = useState<ExternalSpecializedPackPreviewInput>(
    EMPTY_EXTERNAL_SPECIALIZED_PACK_PREVIEW_INPUT,
  );
  const [preview, setPreview] =
    useState<ExternalSpecializedPackPreviewViewModel | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [previewRoot, setPreviewRoot] = useState<string | null>(null);
  const operationRef = useRef<AbortController | null>(null);

  const resetPreview = useCallback(() => {
    operationRef.current?.abort();
    operationRef.current = null;
    setStatus("idle");
    setPreview(null);
    setErrorMessage(null);
    setPreviewRoot(null);
    setInput(EMPTY_EXTERNAL_SPECIALIZED_PACK_PREVIEW_INPUT);
  }, []);

  useEffect(() => {
    if (shouldClearExternalSpecializedPackPreview(root, previewRoot)) {
      resetPreview();
    }
  }, [previewRoot, resetPreview, root]);

  const updateInput = useCallback(
    (patch: Partial<ExternalSpecializedPackPreviewInput>) => {
      setInput((current) => ({ ...current, ...patch }));
    },
    [],
  );

  const cancelPreview = useCallback(() => {
    operationRef.current?.abort();
    operationRef.current = null;
    setStatus("cancelled");
    setPreview(null);
    setErrorMessage("Preview cancelled.");
  }, []);

  const runPreview = useCallback(async () => {
    operationRef.current?.abort();
    const controller = new AbortController();
    operationRef.current = controller;
    const requestRoot = root;
    setStatus("loading-preview");
    setPreview(null);
    setErrorMessage(null);
    setPreviewRoot(requestRoot);

    const result = await loadExternalSpecializedPackPreview({
      root: requestRoot,
      input,
      client: desktopClient,
      signal: controller.signal,
      requestRoot,
    });

    if (controller.signal.aborted) {
      setStatus("cancelled");
      setErrorMessage("Preview cancelled.");
      return;
    }
    if (root !== requestRoot) {
      setStatus("stale-root");
      setPreview(null);
      setErrorMessage("The project root changed before the preview completed.");
      return;
    }

    setStatus(result.status);
    setPreview(result.preview);
    setErrorMessage(result.errorMessage);
    setPreviewRoot(result.previewRoot);
    operationRef.current = null;
  }, [input, root]);

  if (!root) {
    return (
      <EmptyState
        icon="folder"
        title="Select a project"
        description="Choose a local project root before reviewing an external specialized pack."
        action={
          <Button variant="primary" onClick={onSelectProject}>
            Select local project
          </Button>
        }
      />
    );
  }

  return (
    <section
      className="external-pack-preview-page"
      aria-labelledby="external-pack-preview-title"
      aria-busy={status === "loading-preview"}
    >
      <div className="section-heading">
        <div>
          <span className="eyebrow">Read-only review</span>
          <h2 id="external-pack-preview-title">
            External specialized pack preview
          </h2>
        </div>
        <StatusChip
          tone={previewTone(status)}
          label={externalSpecializedPackPreviewStatusLabel(status)}
          size="sm"
        />
      </div>

      <p className="external-pack-review-note">
        Paste caller-supplied manifest JSON and source metadata. Intentloom does
        not fetch remote packs in this view.
      </p>

      <Card>
        <div className="external-pack-input-grid">
          <label>
            <span>Manifest JSON</span>
            <textarea
              value={input.manifestJson}
              onChange={(event) =>
                updateInput({ manifestJson: event.target.value })
              }
              rows={8}
              spellCheck={false}
              aria-label="Manifest JSON"
            />
          </label>
          <label>
            <span>Source kind</span>
            <select
              value={input.sourceKind}
              onChange={(event) =>
                updateInput({ sourceKind: event.target.value })
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
              value={input.sourceLocator}
              onChange={(event) =>
                updateInput({ sourceLocator: event.target.value })
              }
              spellCheck={false}
            />
          </label>
          <label>
            <span>Exact pin</span>
            <input
              className="external-pack-code"
              value={input.sourcePin}
              onChange={(event) =>
                updateInput({ sourcePin: event.target.value })
              }
              spellCheck={false}
            />
          </label>
          <label>
            <span>Canonical digest</span>
            <input
              className="external-pack-code"
              value={input.sourceDigest}
              onChange={(event) =>
                updateInput({ sourceDigest: event.target.value })
              }
              spellCheck={false}
            />
          </label>
          <label>
            <span>Declared publisher</span>
            <input
              value={input.declaredPublisher}
              onChange={(event) =>
                updateInput({ declaredPublisher: event.target.value })
              }
              spellCheck={false}
            />
          </label>
          <label>
            <span>Declared license</span>
            <input
              value={input.declaredLicense}
              onChange={(event) =>
                updateInput({ declaredLicense: event.target.value })
              }
              spellCheck={false}
            />
          </label>
        </div>
        <div className="external-pack-preview-actions">
          <Button
            variant="primary"
            onClick={() => void runPreview()}
            disabled={status === "loading-preview"}
          >
            {status === "loading-preview" ? "Previewing…" : "Preview"}
          </Button>
          {status === "loading-preview" ? (
            <Button variant="secondary" onClick={cancelPreview}>
              Cancel
            </Button>
          ) : null}
          <Button variant="secondary" onClick={onOpenDoctor}>
            Open Doctor
          </Button>
        </div>
      </Card>

      {status === "stale-root" ? (
        <EmptyState
          icon="alert"
          title="Project root changed"
          description={
            errorMessage ??
            "The preview no longer matches the selected canonical root."
          }
          compact
        />
      ) : null}

      {status === "error" ||
      status === "disconnected" ||
      status === "cancelled" ? (
        <EmptyState
          icon="alert"
          title={externalSpecializedPackPreviewStatusLabel(status)}
          description={errorMessage ?? "Preview could not be loaded."}
          compact
        />
      ) : null}

      {preview ? <PreviewResultPanel preview={preview} /> : null}
    </section>
  );
}
