import { useCallback, useMemo, useState } from "react";
import { Card } from "../design/components/layout/Card.js";
import { Button } from "../design/components/core/Button.js";
import { EmptyState } from "../design/components/states/EmptyState.js";
import { StatusChip } from "../design/components/status/StatusChip.js";
import { desktopClient, DesktopBridgeError } from "../desktop-client.js";
import { BoundedExecutionResultCards } from "./BoundedExecutionResultCards.js";
import {
  parseBoundedExecutionViewmodel,
  type BoundedExecutionPanelState,
} from "./bounded-execution-view-helpers.js";

type SurfaceState = "empty" | "loading" | "ready" | "error";

export interface BoundedExecutionViewProps {
  readonly root: string | null;
  readonly onSelectProject: () => void;
}

function bridgeMessage(error: unknown): string {
  if (error instanceof DesktopBridgeError) return error.message;
  if (error instanceof Error) return error.message;
  return String(error);
}

export function BoundedExecutionView({
  root,
  onSelectProject,
}: BoundedExecutionViewProps) {
  const [surfaceState, setSurfaceState] = useState<SurfaceState>("empty");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [title, setTitle] = useState("Add structured logging");
  const [summary, setSummary] = useState(
    "Introduce a project-local logging helper without changing public APIs.",
  );
  const [planApproval, setPlanApproval] = useState("");
  const [grantApplyApproval, setGrantApplyApproval] = useState(false);
  const [panel, setPanel] = useState<BoundedExecutionPanelState | null>(null);

  const callOptions = useMemo(
    () => ({
      ...(planApproval.trim().length > 0
        ? { planApproval: planApproval.trim() }
        : {}),
      ...(grantApplyApproval
        ? { grantedApprovals: ["atomic-commit-approval"] as const }
        : {}),
    }),
    [planApproval, grantApplyApproval],
  );

  const runPrepare = useCallback(async () => {
    if (!root) {
      setSurfaceState("empty");
      return;
    }
    setSurfaceState("loading");
    setErrorMessage(null);
    try {
      const viewmodel = await desktopClient.boundedExecutionWorkspacePrepare(
        root,
        title,
        summary,
        callOptions,
      );
      setPanel(parseBoundedExecutionViewmodel(viewmodel));
      setSurfaceState("ready");
    } catch (error: unknown) {
      setErrorMessage(bridgeMessage(error));
      setSurfaceState("error");
    }
  }, [root, title, summary, callOptions]);

  const runExecute = useCallback(async () => {
    if (!root) {
      setSurfaceState("empty");
      return;
    }
    setSurfaceState("loading");
    setErrorMessage(null);
    try {
      const viewmodel = await desktopClient.boundedExecutionWorkspaceExecute(
        root,
        title,
        summary,
        true,
        callOptions,
      );
      setPanel(parseBoundedExecutionViewmodel(viewmodel));
      setSurfaceState("ready");
    } catch (error: unknown) {
      setErrorMessage(bridgeMessage(error));
      setSurfaceState("error");
    }
  }, [root, title, summary, callOptions]);

  if (!root) {
    return (
      <EmptyState
        description="Select an explicit project root to prepare a read-only bounded-execution overview. Apply runs only after an explicit execute action."
        title="Bounded execution"
        action={
          <Button variant="primary" onClick={onSelectProject}>
            Select project
          </Button>
        }
      />
    );
  }

  return (
    <section aria-labelledby="bounded-execution-heading" className="view-panel">
      <header className="view-header">
        <div>
          <span className="hero-kicker">Feature development</span>
          <h1 id="bounded-execution-heading">Bounded execution</h1>
          <p className="view-lead">
            Prepare stays read-only. Execute and apply require an explicit
            action and never widen network, process, or path capabilities.
          </p>
        </div>
        <StatusChip
          label={surfaceState}
          tone={
            surfaceState === "ready"
              ? "success"
              : surfaceState === "error"
                ? "error"
                : "neutral"
          }
        />
      </header>

      <Card title="Bounded task">
        <label className="field-label" htmlFor="bounded-execution-title">
          Title
        </label>
        <input
          id="bounded-execution-title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
        />
        <label className="field-label" htmlFor="bounded-execution-summary">
          Summary
        </label>
        <textarea
          id="bounded-execution-summary"
          rows={3}
          value={summary}
          onChange={(event) => setSummary(event.target.value)}
        />
        <label
          className="field-label"
          htmlFor="bounded-execution-plan-approval"
        >
          Plan approval
        </label>
        <input
          id="bounded-execution-plan-approval"
          value={planApproval}
          onChange={(event) => setPlanApproval(event.target.value)}
          placeholder="approved:implementation-plan"
        />
        <label
          className="field-label"
          htmlFor="bounded-execution-apply-approval"
        >
          <input
            id="bounded-execution-apply-approval"
            type="checkbox"
            checked={grantApplyApproval}
            onChange={(event) => setGrantApplyApproval(event.target.checked)}
          />
          Grant atomic-commit approval for apply
        </label>
        <div className="view-actions">
          <Button disabled={surfaceState === "loading"} onClick={runPrepare}>
            {surfaceState === "loading" ? "Working…" : "Prepare overview"}
          </Button>
          <Button
            variant="primary"
            disabled={surfaceState === "loading"}
            onClick={runExecute}
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

      {panel ? <BoundedExecutionResultCards panel={panel} /> : null}
    </section>
  );
}
