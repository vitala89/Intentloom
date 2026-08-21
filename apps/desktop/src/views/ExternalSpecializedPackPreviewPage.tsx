import { useCallback, useEffect, useRef, useState } from "react";
import type {
  ExternalQualityPackActivationApproval,
  ExternalSpecializedPackApplyViewModel,
  ExternalSpecializedPackPreviewViewModel,
} from "@intentloom/protocol";
import { Button } from "../design/components/core/Button.js";
import { EmptyState } from "../design/components/states/EmptyState.js";
import { StatusChip } from "../design/components/status/StatusChip.js";
import { desktopClient } from "../desktop-client.js";
import { ExternalSpecializedPackActivateResultPanel } from "./ExternalSpecializedPackActivateResultPanel.js";
import { ExternalSpecializedPackApprovalPanel } from "./ExternalSpecializedPackApprovalPanel.js";
import { ExternalSpecializedPackPreviewForm } from "./ExternalSpecializedPackPreviewForm.js";
import { ExternalSpecializedPackPreviewResultPanel } from "./ExternalSpecializedPackPreviewResultPanel.js";
import {
  activateExternalSpecializedPackFromApproval,
  canActivateExternalSpecializedPack,
  canApproveExternalSpecializedPack,
  externalSpecializedPackActivationStatusLabel,
  type ExternalSpecializedPackActivationSurfaceState,
} from "./specialized-pack-external-activate-controller.js";
import { buildExternalSpecializedPackActivationApproval } from "./specialized-pack-external-approval.js";
import { isExternalSpecializedPackReviewStale } from "./specialized-pack-external-input-staleness.js";
import { loadExternalSpecializedPackPreview } from "./specialized-pack-external-preview-controller.js";
import {
  EMPTY_EXTERNAL_SPECIALIZED_PACK_PREVIEW_INPUT,
  externalSpecializedPackPreviewStatusLabel,
  shouldClearExternalSpecializedPackPreview,
  type ExternalSpecializedPackPreviewInput,
  type ExternalSpecializedPackPreviewSurfaceState,
} from "./specialized-pack-external-preview-types.js";
import type { ExternalSpecializedPackReviewSnapshot } from "./specialized-pack-external-input-staleness.js";

export interface ExternalSpecializedPackPreviewPageProps {
  readonly root: string | null;
  readonly daemonConnected: boolean;
  readonly onSelectProject: () => void;
  readonly onOpenDoctor: () => void;
  readonly onLoadDoctor: () => void | Promise<void>;
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

export function ExternalSpecializedPackPreviewPage({
  root,
  daemonConnected,
  onSelectProject,
  onOpenDoctor,
  onLoadDoctor,
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
  const [reviewSnapshot, setReviewSnapshot] =
    useState<ExternalSpecializedPackReviewSnapshot | null>(null);
  const [approval, setApproval] =
    useState<ExternalQualityPackActivationApproval | null>(null);
  const [activationState, setActivationState] =
    useState<ExternalSpecializedPackActivationSurfaceState>("idle");
  const [applyResult, setApplyResult] =
    useState<ExternalSpecializedPackApplyViewModel | null>(null);
  const [activationError, setActivationError] = useState<string | null>(null);
  const previewOperationRef = useRef<AbortController | null>(null);
  const activationOperationRef = useRef<AbortController | null>(null);

  const clearActivation = useCallback(() => {
    activationOperationRef.current?.abort();
    activationOperationRef.current = null;
    setApproval(null);
    setActivationState("idle");
    setApplyResult(null);
    setActivationError(null);
  }, []);

  const resetPreview = useCallback(() => {
    previewOperationRef.current?.abort();
    previewOperationRef.current = null;
    setStatus("idle");
    setPreview(null);
    setErrorMessage(null);
    setPreviewRoot(null);
    setReviewSnapshot(null);
    setInput(EMPTY_EXTERNAL_SPECIALIZED_PACK_PREVIEW_INPUT);
    clearActivation();
  }, [clearActivation]);

  useEffect(() => {
    if (shouldClearExternalSpecializedPackPreview(root, previewRoot)) {
      resetPreview();
    }
  }, [previewRoot, resetPreview, root]);

  const reviewStale = isExternalSpecializedPackReviewStale({
    snapshot: reviewSnapshot,
    root,
    input,
  });

  useEffect(() => {
    if (reviewStale) {
      clearActivation();
    }
  }, [clearActivation, reviewStale]);

  const updateInput = useCallback(
    (patch: Partial<ExternalSpecializedPackPreviewInput>) => {
      setInput((current) => ({ ...current, ...patch }));
    },
    [],
  );

  const cancelPreview = useCallback(() => {
    previewOperationRef.current?.abort();
    previewOperationRef.current = null;
    setStatus("cancelled");
    setPreview(null);
    setErrorMessage("Preview cancelled.");
    clearActivation();
    setReviewSnapshot(null);
  }, [clearActivation]);

  const runPreview = useCallback(async () => {
    previewOperationRef.current?.abort();
    clearActivation();
    const controller = new AbortController();
    previewOperationRef.current = controller;
    const requestRoot = root;
    setStatus("loading-preview");
    setPreview(null);
    setErrorMessage(null);
    setPreviewRoot(requestRoot);
    setReviewSnapshot(null);

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
    if (result.preview && result.status === "ready-for-review" && requestRoot) {
      setReviewSnapshot({ root: requestRoot, input });
    }
    previewOperationRef.current = null;
  }, [clearActivation, input, root]);

  const approvePreview = useCallback(() => {
    if (!preview) return;
    setApproval(buildExternalSpecializedPackActivationApproval(preview));
    setActivationState("approved");
    setApplyResult(null);
    setActivationError(null);
  }, [preview]);

  const runActivate = useCallback(async () => {
    if (activationState === "applying" || !approval || !preview) return;
    activationOperationRef.current?.abort();
    const controller = new AbortController();
    activationOperationRef.current = controller;
    const requestRoot = root;
    setActivationState("applying");
    setApplyResult(null);
    setActivationError(null);

    const result = await activateExternalSpecializedPackFromApproval({
      root: requestRoot,
      input,
      preview,
      approval,
      client: desktopClient,
      signal: controller.signal,
      requestRoot,
    });

    if (controller.signal.aborted) {
      setActivationState("cancelled");
      setActivationError("Activation cancelled.");
      activationOperationRef.current = null;
      return;
    }
    if (root !== requestRoot) {
      setActivationState("stale-root");
      setActivationError(
        "The project root changed before activation completed.",
      );
      activationOperationRef.current = null;
      return;
    }

    setActivationState(result.status);
    setApplyResult(result.result);
    setActivationError(result.errorMessage);
    activationOperationRef.current = null;

    if (
      result.result &&
      (result.result.status === "applied" ||
        result.result.status === "already-applied")
    ) {
      await onLoadDoctor();
    }
  }, [activationState, approval, input, onLoadDoctor, preview, root]);

  const canApprove = canApproveExternalSpecializedPack({
    root,
    previewStatus: status,
    preview,
    snapshot: reviewSnapshot,
    input,
    activationState,
    daemonConnected,
  });

  const canActivate = canActivateExternalSpecializedPack({
    root,
    previewStatus: status,
    preview,
    snapshot: reviewSnapshot,
    input,
    approval,
    activationState,
    daemonConnected,
  });

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
      aria-busy={status === "loading-preview" || activationState === "applying"}
    >
      <div className="section-heading">
        <div>
          <span className="eyebrow">Human review and activation</span>
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

      <ExternalSpecializedPackPreviewForm
        applying={activationState === "applying"}
        input={input}
        loadingPreview={status === "loading-preview"}
        onCancelPreview={cancelPreview}
        onInputChange={updateInput}
        onOpenDoctor={onOpenDoctor}
        onPreview={() => void runPreview()}
      />

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

      {preview ? (
        <ExternalSpecializedPackPreviewResultPanel preview={preview} />
      ) : null}

      {preview && status === "ready-for-review" ? (
        <ExternalSpecializedPackApprovalPanel
          approved={activationState === "approved"}
          applying={activationState === "applying"}
          approval={approval}
          canActivate={canActivate}
          canApprove={canApprove}
          onActivate={() => void runActivate()}
          onApprove={approvePreview}
          reviewStale={reviewStale}
        />
      ) : null}

      {activationState !== "idle" && activationState !== "approved" ? (
        <ExternalSpecializedPackActivateResultPanel
          activationState={activationState}
          errorMessage={activationError}
          result={applyResult}
        />
      ) : null}

      {activationState === "approved" &&
      applyResult === null &&
      activationError === null ? (
        <p aria-live="polite">
          {externalSpecializedPackActivationStatusLabel(activationState)}
        </p>
      ) : null}
    </section>
  );
}
