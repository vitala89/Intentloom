import { useCallback, useState } from "react";
import type {
  ExistingProjectScanScope,
  ExistingProjectViewmodelPayload,
} from "@intentloom/protocol";
import { Card } from "../design/components/layout/Card.js";
import { Button } from "../design/components/core/Button.js";
import { EmptyState } from "../design/components/states/EmptyState.js";
import { StatusChip } from "../design/components/status/StatusChip.js";
import { desktopClient, DesktopBridgeError } from "../desktop-client.js";

export type ExistingProjectClientSurfaceState =
  "empty" | "loading" | "ready" | "error" | "unsupported";

interface ExistingProjectFlowStepRow {
  readonly id: string;
  readonly label: string;
  readonly status: string;
}

interface ExistingProjectWorkspaceState {
  readonly root: string;
  readonly scope: ExistingProjectScanScope;
  readonly profile: string;
  readonly readiness: string;
  readonly inspectFindingCount: number;
  readonly specializedCandidateCount: number;
  readonly compatiblePackIds: readonly string[];
  readonly assessmentFindingsCount: number;
  readonly recommendationsCount: number;
  readonly flowSteps: readonly ExistingProjectFlowStepRow[];
}

export interface OpenExistingProjectViewProps {
  readonly root: string | null;
  readonly onSelectProject: () => void;
}

function parseExistingProjectViewmodel(
  payload: ExistingProjectViewmodelPayload,
): ExistingProjectWorkspaceState {
  if (typeof payload !== "object" || payload === null) {
    throw new Error("Invalid existing project workspace viewmodel");
  }
  const record = payload as Record<string, unknown>;
  const flowSteps = Array.isArray(record.flowSteps)
    ? record.flowSteps.map((step) => {
        if (typeof step !== "object" || step === null) {
          throw new Error("Invalid flow step");
        }
        const row = step as Record<string, unknown>;
        return {
          id: String(row.id ?? ""),
          label: String(row.label ?? ""),
          status: String(row.status ?? ""),
        };
      })
    : [];
  return {
    root: String(record.root ?? ""),
    scope: (record.scope as ExistingProjectScanScope) ?? "standard",
    profile: String(record.profile ?? "unknown"),
    readiness: String(record.readiness ?? "unknown"),
    inspectFindingCount: Number(record.inspectFindingCount ?? 0),
    specializedCandidateCount: Number(record.specializedCandidateCount ?? 0),
    compatiblePackIds: Array.isArray(record.compatiblePackIds)
      ? record.compatiblePackIds.map(String)
      : [],
    assessmentFindingsCount: Number(record.assessmentFindingsCount ?? 0),
    recommendationsCount: Number(record.recommendationsCount ?? 0),
    flowSteps,
  };
}

const scopeOptions: readonly ExistingProjectScanScope[] = [
  "quick",
  "standard",
  "deep",
];

export function OpenExistingProjectView({
  root,
  onSelectProject,
}: OpenExistingProjectViewProps) {
  const [surfaceState, setSurfaceState] =
    useState<ExistingProjectClientSurfaceState>("empty");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [scope, setScope] = useState<ExistingProjectScanScope>("standard");
  const [workspace, setWorkspace] =
    useState<ExistingProjectWorkspaceState | null>(null);

  const runPrepare = useCallback(async () => {
    if (!root) {
      setSurfaceState("empty");
      return;
    }
    setSurfaceState("loading");
    setErrorMessage(null);
    try {
      const viewmodel = await desktopClient.existingProjectWorkspacePrepare(
        root,
        scope,
      );
      setWorkspace(parseExistingProjectViewmodel(viewmodel));
      setSurfaceState("ready");
    } catch (error: unknown) {
      const message =
        error instanceof DesktopBridgeError
          ? error.message
          : error instanceof Error
            ? error.message
            : String(error);
      setErrorMessage(message);
      setSurfaceState("error");
    }
  }, [root, scope]);

  if (!root) {
    return (
      <EmptyState
        description="Select an explicit project root to run a read-only existing-project workspace assessment."
        title="Open existing project"
        action={
          <Button variant="primary" onClick={onSelectProject}>
            Select project
          </Button>
        }
      />
    );
  }

  return (
    <section
      aria-labelledby="open-existing-project-heading"
      className="view-panel"
    >
      <header className="view-header">
        <div>
          <span className="hero-kicker">Open existing project</span>
          <h1 id="open-existing-project-heading">Workspace assessment</h1>
          <p className="view-lead">
            Compose inspect, adoption readiness, specialized-pack detection, and
            assessment into one read-only flow. No project files are modified.
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

      <Card title="Scan scope">
        <fieldset className="scope-fieldset">
          <legend className="sr-only">Assessment scope</legend>
          {scopeOptions.map((option) => (
            <label key={option} className="scope-option">
              <input
                checked={scope === option}
                name="existing-project-scope"
                type="radio"
                value={option}
                onChange={() => setScope(option)}
              />
              <span>{option}</span>
            </label>
          ))}
        </fieldset>
        <div className="view-actions">
          <Button disabled={surfaceState === "loading"} onClick={runPrepare}>
            {surfaceState === "loading"
              ? "Running assessment…"
              : "Run assessment"}
          </Button>
        </div>
      </Card>

      {errorMessage ? (
        <Card title="Error">
          <p role="alert">{errorMessage}</p>
        </Card>
      ) : null}

      {workspace ? (
        <>
          <Card title="Project overview">
            <dl className="detail-grid">
              <div>
                <dt>Root</dt>
                <dd>{workspace.root}</dd>
              </div>
              <div>
                <dt>Profile</dt>
                <dd>
                  {workspace.profile} ({workspace.readiness})
                </dd>
              </div>
              <div>
                <dt>Inspect findings</dt>
                <dd>{workspace.inspectFindingCount}</dd>
              </div>
              <div>
                <dt>Specialized candidates</dt>
                <dd>{workspace.specializedCandidateCount}</dd>
              </div>
              <div>
                <dt>Compatible packs</dt>
                <dd>
                  {workspace.compatiblePackIds.length > 0
                    ? workspace.compatiblePackIds.join(", ")
                    : "none"}
                </dd>
              </div>
              <div>
                <dt>Assessment findings</dt>
                <dd>{workspace.assessmentFindingsCount}</dd>
              </div>
              <div>
                <dt>Recommendations</dt>
                <dd>{workspace.recommendationsCount}</dd>
              </div>
            </dl>
          </Card>

          <Card title="Flow progress">
            <ul className="flow-step-list">
              {workspace.flowSteps.map((step) => (
                <li key={step.id}>
                  <strong>{step.label}</strong>
                  <span>{step.status}</span>
                </li>
              ))}
            </ul>
          </Card>
        </>
      ) : null}
    </section>
  );
}
