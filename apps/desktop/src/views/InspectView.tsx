import type { InspectResult } from "@intentloom/protocol";
import { Card } from "../design/components/layout/Card.js";
import { EmptyState } from "../design/components/states/EmptyState.js";
import { StatusChip } from "../design/components/status/StatusChip.js";
import { Button } from "../design/components/core/Button.js";
import { Icon } from "../design/components/core/Icon.js";

export type InspectStatus =
  | "idle"
  | "loading"
  | "ready"
  | "stale"
  | "invalid-root"
  | "disconnected"
  | "protocol-mismatch"
  | "error";

export interface InspectViewProps {
  root: string | null;
  result: InspectResult | null;
  status: InspectStatus;
  errorMessage: string | null;
  onSelectProject: () => void;
  onOpenAdoptionPreview: () => void;
  onConnect: () => void;
}

export function InspectView({
  root,
  result,
  status,
  errorMessage,
  onSelectProject,
  onOpenAdoptionPreview,
  onConnect,
}: InspectViewProps) {
  if (status === "ready" && result) {
    return (
      <section className="inspect-layout" aria-labelledby="inspect-title">
        <Card
          variant="default"
          title="Inspect"
          action={<StatusChip tone="info" label="Read-only" size="sm" />}
        >
          <div className="inspect-identity">
            <Icon name="scan-search" size={24} color="var(--action-primary)" />
            <div>
              <small style={{ color: "var(--text-tertiary)" }}>
                Project ID
              </small>
              <strong
                style={{ display: "block", color: "var(--text-primary)" }}
              >
                {result.projectId}
              </strong>
              <p style={{ margin: 0, color: "var(--text-secondary)" }}>
                Returned by the authenticated daemon Inspect operation.
              </p>
            </div>
          </div>
        </Card>
        <Card variant="subtle" title="Source and freshness">
          <dl className="inspect-facts">
            <div>
              <dt>Canonical root</dt>
              <dd>{result.root}</dd>
            </div>
            <div>
              <dt>Protocol</dt>
              <dd>v{result.protocolVersion}</dd>
            </div>
            <div>
              <dt>Data source</dt>
              <dd>Local daemon response</dd>
            </div>
            <div>
              <dt>Write scope</dt>
              <dd>None</dd>
            </div>
          </dl>
          <p className="inspect-muted">
            Profile, adapter, and configuration details will appear when the
            corresponding typed contract is exposed by the platform.
          </p>
          <Button variant="secondary" onClick={onOpenAdoptionPreview}>
            Review Intentloom setup
          </Button>
        </Card>
      </section>
    );
  }

  const stateCopy: Record<
    Exclude<InspectStatus, "ready" | "loading">,
    { title: string; description: string; action: string }
  > = {
    idle: {
      title: root ? "Connect to inspect this project" : "Select a project",
      description: root
        ? "The canonical root is selected. Connect the local daemon to load validated project identity."
        : "Choose a local project root before requesting a read-only Inspect result.",
      action: root ? "Connect daemon" : "Select local project",
    },
    stale: {
      title: "Project root changed",
      description:
        errorMessage ??
        "The selected root is no longer a stable canonical directory. Select it again before inspecting.",
      action: "Select project again",
    },
    "invalid-root": {
      title: "Project root unavailable",
      description:
        errorMessage ??
        "The selected directory is no longer available. Choose a readable local project root.",
      action: "Select project again",
    },
    disconnected: {
      title: "Daemon unavailable",
      description:
        errorMessage ??
        "The local daemon disconnected before Inspect could complete. Retry without changing the project.",
      action: "Retry connection",
    },
    "protocol-mismatch": {
      title: "Protocol mismatch",
      description:
        errorMessage ??
        "This daemon cannot safely serve the current Desktop protocol contract.",
      action: "Retry connection",
    },
    error: {
      title: "Inspect unavailable",
      description:
        errorMessage ??
        "The validated Inspect result could not be loaded. Review the connection and try again.",
      action: "Retry connection",
    },
  };
  const copy =
    stateCopy[status === "loading" || status === "ready" ? "idle" : status];

  return (
    <EmptyState
      icon="scan-search"
      title={status === "loading" ? "Reading project…" : copy.title}
      description={
        status === "loading"
          ? "The daemon is validating the selected canonical root."
          : copy.description
      }
      action={
        <Button
          variant="primary"
          onClick={status === "stale" ? onSelectProject : onConnect}
          disabled={status === "loading"}
        >
          {status === "loading" ? "Reading…" : copy.action}
        </Button>
      }
    />
  );
}
