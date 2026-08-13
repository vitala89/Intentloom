import { useCallback, useState } from "react";
import type { FeatureIntentViewmodelPayload } from "@intentloom/protocol";
import { Card } from "../design/components/layout/Card.js";
import { Button } from "../design/components/core/Button.js";
import { EmptyState } from "../design/components/states/EmptyState.js";
import { StatusChip } from "../design/components/status/StatusChip.js";
import { desktopClient, DesktopBridgeError } from "../desktop-client.js";

type SurfaceState = "empty" | "loading" | "ready" | "error";

interface FeatureIntentPanelState {
  readonly title: string;
  readonly impactSummary: string;
  readonly packages: readonly string[];
  readonly publicApiSurfaces: readonly string[];
  readonly publicApiChangeRisk: string;
  readonly specializedPackIds: readonly string[];
  readonly alternatives: readonly {
    readonly id: string;
    readonly title: string;
    readonly summary: string;
    readonly selected: boolean;
  }[];
  readonly planSteps: readonly {
    readonly id: string;
    readonly label: string;
  }[];
  readonly mutationAllowed: boolean;
  readonly executionGate: string;
}

export interface FeatureIntentViewProps {
  readonly root: string | null;
  readonly onSelectProject: () => void;
}

function asStringArray(value: unknown): readonly string[] {
  return Array.isArray(value) ? value.map(String) : [];
}

function parseFeatureIntentViewmodel(
  payload: FeatureIntentViewmodelPayload,
): FeatureIntentPanelState {
  const record = payload as Record<string, unknown>;
  const alternatives = Array.isArray(record.alternatives)
    ? record.alternatives.flatMap((entry) => {
        if (typeof entry !== "object" || entry === null) return [];
        const row = entry as Record<string, unknown>;
        return [
          {
            id: String(row.id ?? ""),
            title: String(row.title ?? ""),
            summary: String(row.summary ?? ""),
            selected: row.selected === true,
          },
        ];
      })
    : [];
  const planSteps = Array.isArray(record.planSteps)
    ? record.planSteps.flatMap((entry) => {
        if (typeof entry !== "object" || entry === null) return [];
        const row = entry as Record<string, unknown>;
        return [{ id: String(row.id ?? ""), label: String(row.label ?? "") }];
      })
    : [];
  return {
    title: String(record.title ?? ""),
    impactSummary: String(record.impactSummary ?? ""),
    packages: asStringArray(record.packages),
    publicApiSurfaces: asStringArray(record.publicApiSurfaces),
    publicApiChangeRisk: String(record.publicApiChangeRisk ?? "none"),
    specializedPackIds: asStringArray(record.specializedPackIds),
    alternatives,
    planSteps,
    mutationAllowed: record.mutationAllowed === true,
    executionGate: String(record.executionGate ?? "w11-blocked"),
  };
}

export function FeatureIntentView({
  root,
  onSelectProject,
}: FeatureIntentViewProps) {
  const [surfaceState, setSurfaceState] = useState<SurfaceState>("empty");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [title, setTitle] = useState("Add structured logging");
  const [summary, setSummary] = useState(
    "Introduce a project-local logging helper without changing public APIs.",
  );
  const [panel, setPanel] = useState<FeatureIntentPanelState | null>(null);

  const runPrepare = useCallback(async () => {
    if (!root) {
      setSurfaceState("empty");
      return;
    }
    setSurfaceState("loading");
    setErrorMessage(null);
    try {
      const viewmodel = await desktopClient.featureIntentWorkspacePrepare(
        root,
        title,
        summary,
      );
      setPanel(parseFeatureIntentViewmodel(viewmodel));
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
  }, [root, title, summary]);

  if (!root) {
    return (
      <EmptyState
        description="Select an explicit project root to prepare a read-only feature-intent impact summary and reviewed plan."
        title="Feature intent"
        action={
          <Button variant="primary" onClick={onSelectProject}>
            Select project
          </Button>
        }
      />
    );
  }

  return (
    <section aria-labelledby="feature-intent-heading" className="view-panel">
      <header className="view-header">
        <div>
          <span className="hero-kicker">Feature development</span>
          <h1 id="feature-intent-heading">Feature intent</h1>
          <p className="view-lead">
            Produce an explainable architecture impact and a reviewed plan
            before any code changes. Execution stays blocked until W11.
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

      <Card title="Feature request">
        <label className="field-label" htmlFor="feature-intent-title">
          Title
        </label>
        <input
          id="feature-intent-title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
        />
        <label className="field-label" htmlFor="feature-intent-summary">
          Summary
        </label>
        <textarea
          id="feature-intent-summary"
          rows={3}
          value={summary}
          onChange={(event) => setSummary(event.target.value)}
        />
        <div className="view-actions">
          <Button disabled={surfaceState === "loading"} onClick={runPrepare}>
            {surfaceState === "loading" ? "Preparing…" : "Prepare impact"}
          </Button>
        </div>
      </Card>

      {errorMessage ? (
        <Card title="Error">
          <p role="alert">{errorMessage}</p>
        </Card>
      ) : null}

      {panel ? (
        <>
          <Card title="Architecture impact">
            <p>{panel.impactSummary}</p>
            <dl className="detail-grid">
              <div>
                <dt>Public API change risk</dt>
                <dd>{panel.publicApiChangeRisk}</dd>
              </div>
              <div>
                <dt>Mutation allowed</dt>
                <dd>{panel.mutationAllowed ? "yes" : "no"}</dd>
              </div>
              <div>
                <dt>Execution gate</dt>
                <dd>{panel.executionGate}</dd>
              </div>
            </dl>
          </Card>
          <Card title="Affected scope">
            <dl className="detail-grid">
              <div>
                <dt>Packages</dt>
                <dd>{panel.packages.join(", ") || "none"}</dd>
              </div>
              <div>
                <dt>Public API surfaces</dt>
                <dd>{panel.publicApiSurfaces.join(", ") || "none"}</dd>
              </div>
              <div>
                <dt>Specialized packs</dt>
                <dd>{panel.specializedPackIds.join(", ") || "none"}</dd>
              </div>
            </dl>
          </Card>
          <Card title="Implementation alternatives">
            <ul className="flow-step-list">
              {panel.alternatives.map((alternative) => (
                <li key={alternative.id}>
                  <strong>
                    {alternative.title}
                    {alternative.selected ? " (selected)" : ""}
                  </strong>
                  <span>{alternative.summary}</span>
                </li>
              ))}
            </ul>
          </Card>
          <Card title="Reviewed plan">
            <ol className="flow-step-list">
              {panel.planSteps.map((step) => (
                <li key={step.id}>{step.label}</li>
              ))}
            </ol>
          </Card>
        </>
      ) : null}
    </section>
  );
}
