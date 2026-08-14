import { useCallback, useMemo, useState } from "react";
import { Card } from "../design/components/layout/Card.js";
import { Button } from "../design/components/core/Button.js";
import { EmptyState } from "../design/components/states/EmptyState.js";
import { StatusChip } from "../design/components/status/StatusChip.js";
import { desktopClient, DesktopBridgeError } from "../desktop-client.js";
import { ContinuousLoopResultCards } from "./ContinuousLoopResultCards.js";
import {
  CONTINUOUS_LOOP_CHANGE_KINDS,
  DEFAULT_CURRENT_SNAPSHOT,
  DEFAULT_PREVIOUS_SNAPSHOT,
  parseContinuousLoopViewmodel,
  parseSnapshotJson,
  type ContinuousLoopPanelState,
} from "./continuous-loop-view-helpers.js";
import type { ContinuousLoopChangeKind } from "@intentloom/protocol";

type SurfaceState = "empty" | "loading" | "ready" | "error" | "unsupported";

export interface ContinuousLoopViewProps {
  readonly root: string | null;
  readonly onSelectProject: () => void;
}

function bridgeMessage(error: unknown): string {
  if (error instanceof DesktopBridgeError) return error.message;
  if (error instanceof Error) return error.message;
  return String(error);
}

function surfaceTone(
  surfaceState: SurfaceState,
): "success" | "error" | "warning" | "neutral" {
  if (surfaceState === "ready") return "success";
  if (surfaceState === "error") return "error";
  if (surfaceState === "unsupported") return "warning";
  return "neutral";
}

function restoreFocus(triggerId: string) {
  document.getElementById(triggerId)?.focus();
}

export function ContinuousLoopView({
  root,
  onSelectProject,
}: ContinuousLoopViewProps) {
  const [surfaceState, setSurfaceState] = useState<SurfaceState>("empty");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [previousText, setPreviousText] = useState(DEFAULT_PREVIOUS_SNAPSHOT);
  const [currentText, setCurrentText] = useState(DEFAULT_CURRENT_SNAPSHOT);
  const [changeKind, setChangeKind] = useState<"" | ContinuousLoopChangeKind>(
    "",
  );
  const [memoryContent, setMemoryContent] = useState("");
  const [grantMemoryApproval, setGrantMemoryApproval] = useState(false);
  const [panel, setPanel] = useState<ContinuousLoopPanelState | null>(null);

  const callOptions = useMemo(
    () => ({
      ...(changeKind !== "" ? { changeKind } : {}),
      ...(memoryContent.trim().length > 0
        ? { memoryContent: memoryContent.trim() }
        : {}),
      ...(grantMemoryApproval
        ? { grantedApprovals: ["approved:w12-memory"] as const }
        : {}),
    }),
    [changeKind, memoryContent, grantMemoryApproval],
  );

  const applyViewmodel = (viewmodel: Record<string, unknown>) => {
    const next = parseContinuousLoopViewmodel(viewmodel);
    setPanel(next);
    setSurfaceState(next.loopGate === "unsupported" ? "unsupported" : "ready");
  };

  const runPrepare = useCallback(async () => {
    if (!root) {
      setSurfaceState("empty");
      return;
    }
    setSurfaceState("loading");
    setErrorMessage(null);
    try {
      const viewmodel = await desktopClient.continuousLoopWorkspacePrepare(
        root,
        parseSnapshotJson(previousText),
        parseSnapshotJson(currentText),
        callOptions,
      );
      applyViewmodel(viewmodel);
    } catch (error: unknown) {
      setErrorMessage(bridgeMessage(error));
      setSurfaceState("error");
    }
    restoreFocus("continuous-loop-prepare");
  }, [root, previousText, currentText, callOptions]);

  const runExecute = useCallback(async () => {
    if (!root) {
      setSurfaceState("empty");
      return;
    }
    setSurfaceState("loading");
    setErrorMessage(null);
    try {
      const viewmodel = await desktopClient.continuousLoopWorkspaceExecute(
        root,
        parseSnapshotJson(previousText),
        parseSnapshotJson(currentText),
        true,
        callOptions,
      );
      applyViewmodel(viewmodel);
    } catch (error: unknown) {
      setErrorMessage(bridgeMessage(error));
      setSurfaceState("error");
    }
    restoreFocus("continuous-loop-execute");
  }, [root, previousText, currentText, callOptions]);

  if (!root) {
    return (
      <EmptyState
        description="Select an explicit project root to prepare a read-only continuous-loop overview. Snapshots are caller-supplied. Apply runs only after an explicit execute action."
        title="Continuous loop"
        action={
          <Button variant="primary" onClick={onSelectProject}>
            Select project
          </Button>
        }
      />
    );
  }

  return (
    <section aria-labelledby="continuous-loop-heading" className="view-panel">
      <header className="view-header">
        <div>
          <span className="hero-kicker">Feature development</span>
          <h1 id="continuous-loop-heading">Continuous loop</h1>
          <p className="view-lead">
            Prepare stays read-only and never sends applyRequested. Execute and
            memory apply require an explicit action. Desktop does not call
            assessProject or models.
          </p>
        </div>
        <StatusChip label={surfaceState} tone={surfaceTone(surfaceState)} />
      </header>

      <Card title="Caller-supplied snapshots">
        <label className="field-label" htmlFor="continuous-loop-previous">
          Previous snapshot
        </label>
        <textarea
          id="continuous-loop-previous"
          rows={8}
          value={previousText}
          onChange={(event) => setPreviousText(event.target.value)}
        />
        <label className="field-label" htmlFor="continuous-loop-current">
          Current snapshot
        </label>
        <textarea
          id="continuous-loop-current"
          rows={8}
          value={currentText}
          onChange={(event) => setCurrentText(event.target.value)}
        />
        <label className="field-label" htmlFor="continuous-loop-change-kind">
          Change kind
        </label>
        <select
          id="continuous-loop-change-kind"
          value={changeKind}
          onChange={(event) =>
            setChangeKind(event.target.value as "" | ContinuousLoopChangeKind)
          }
        >
          <option value="">Infer from snapshots</option>
          {CONTINUOUS_LOOP_CHANGE_KINDS.map((kind) => (
            <option key={kind} value={kind}>
              {kind}
            </option>
          ))}
        </select>
        <label className="field-label" htmlFor="continuous-loop-memory">
          Memory content
        </label>
        <textarea
          id="continuous-loop-memory"
          rows={3}
          value={memoryContent}
          onChange={(event) => setMemoryContent(event.target.value)}
        />
        <label className="field-label" htmlFor="continuous-loop-apply-approval">
          <input
            id="continuous-loop-apply-approval"
            type="checkbox"
            checked={grantMemoryApproval}
            onChange={(event) => setGrantMemoryApproval(event.target.checked)}
          />
          Grant approved:w12-memory for execute
        </label>
        <div className="view-actions">
          <Button
            id="continuous-loop-prepare"
            disabled={surfaceState === "loading"}
            onClick={() => void runPrepare()}
          >
            {surfaceState === "loading" ? "Working…" : "Prepare overview"}
          </Button>
          <Button
            id="continuous-loop-execute"
            variant="primary"
            disabled={surfaceState === "loading"}
            onClick={() => void runExecute()}
          >
            Execute and apply
          </Button>
        </div>
      </Card>

      {errorMessage ? (
        <Card title="Error">
          <p role="alert">{errorMessage}</p>
        </Card>
      ) : null}

      {surfaceState === "unsupported" ? (
        <EmptyState
          compact
          title="Unsupported"
          description="This loop change is unsupported for automatic memory apply. Model-interpretation stays a human review gate."
        />
      ) : null}

      {panel ? <ContinuousLoopResultCards panel={panel} /> : null}
    </section>
  );
}
