import type {
  DaemonInfoResult,
  DoctorResult,
  InspectResult,
} from "@intentloom/protocol";
import { Card } from "../design/components/layout/Card.js";
import { StatusChip } from "../design/components/status/StatusChip.js";
import { Button } from "../design/components/core/Button.js";
import { Icon } from "../design/components/core/Icon.js";

export interface OverviewViewProps {
  root: string | null;
  connection: string;
  isConnecting: boolean;
  retryCount: number;
  message: string | null;
  inspect: InspectResult | null;
  doctor: DoctorResult | null;
  daemonInfo: DaemonInfoResult | null;
  onConnectDaemon: () => void;
  onRequestProjectSelect: (triggerEl?: HTMLButtonElement | null) => void;
}

export function OverviewView({
  root,
  connection,
  isConnecting,
  retryCount,
  message,
  inspect,
  doctor,
  daemonInfo,
  onConnectDaemon,
  onRequestProjectSelect,
}: OverviewViewProps) {
  const doctorErrors =
    doctor?.findings.filter((finding) => finding.severity === "error").length ??
    0;
  const doctorWarnings =
    doctor?.findings.filter((finding) => finding.severity === "warning")
      .length ?? 0;
  const evaluated = inspect !== null && doctor !== null;

  const tone =
    connection.includes("Connected") ||
    connection.includes("ready") ||
    connection.includes("available")
      ? "success"
      : connection.includes("Disconnected") ||
          connection.includes("Error") ||
          connection.includes("failed") ||
          connection.includes("stale")
        ? "error"
        : "neutral";

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-5)",
      }}
    >
      <div className="connection-row">
        <StatusChip tone={tone} label={connection} size="sm" />
        <span className="connection-detail">
          Read-only scope ·{" "}
          {root ? "Project root selected" : "Awaiting project root"}
        </span>
        <Button
          variant="secondary"
          onClick={onConnectDaemon}
          disabled={isConnecting}
        >
          {isConnecting ? "Connecting…" : "Connect daemon"}
        </Button>
      </div>

      {retryCount > 0 && isConnecting ? (
        <div className="reconnect-notice" role="status">
          Daemon not ready — retrying (attempt {retryCount})…
        </div>
      ) : message ? (
        <div className="notice error">{message}</div>
      ) : null}

      <Card variant="raised" className="hero-panel">
        <div className="hero-copy">
          <span className="hero-kicker">Project workspace</span>
          <h2>Make engineering intent visible.</h2>
          <p>
            Select a local project to inspect health, review exact changes, and
            understand its engineering history. Intentloom stays read-only until
            you explicitly approve a future action.
          </p>
          <Button
            variant="primary"
            onClick={(e) =>
              onRequestProjectSelect(
                e.currentTarget as unknown as HTMLButtonElement,
              )
            }
          >
            Select local project →
          </Button>
        </div>
        <div className="loop-illustration" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
      </Card>

      <div className="section-heading">
        <div>
          <span className="eyebrow">Read-only signal</span>
          <h3>Project health</h3>
        </div>
        <StatusChip
          tone={
            evaluated
              ? doctor?.exitCode === 0
                ? "success"
                : "error"
              : "neutral"
          }
          label={
            evaluated
              ? doctor?.exitCode === 0
                ? "Ready"
                : "Findings present"
              : root
                ? "Not evaluated"
                : "Awaiting root"
          }
          size="sm"
        />
      </div>

      <section className="signal-grid" aria-label="Project health signals">
        <Card variant="subtle" className="signal-card">
          <Icon name="scan-search" size={24} color="var(--action-primary)" />
          <div>
            <small style={{ color: "var(--text-tertiary)" }}>
              Project inspect
            </small>
            <strong style={{ display: "block", color: "var(--text-primary)" }}>
              {inspect?.projectId ??
                (root ? "Awaiting connection" : "Awaiting root")}
            </strong>
            <p style={{ margin: 0, color: "var(--text-secondary)" }}>
              {inspect
                ? `Canonical root: ${inspect.root}`
                : "Validated project identity will appear here."}
            </p>
          </div>
        </Card>

        <Card variant="subtle" className="signal-card">
          <Icon name="shield-check" size={24} color="var(--status-warning)" />
          <div>
            <small style={{ color: "var(--text-tertiary)" }}>Doctor</small>
            <strong style={{ display: "block", color: "var(--text-primary)" }}>
              {doctor
                ? `${doctorErrors} errors · ${doctorWarnings} warnings`
                : "Not evaluated"}
            </strong>
            <p style={{ margin: 0, color: "var(--text-secondary)" }}>
              {doctor
                ? `${doctor.findings.length} validated finding${doctor.findings.length === 1 ? "" : "s"}. Exit code ${doctor.exitCode}.`
                : "Diagnostics remain empty until a project is connected."}
            </p>
          </div>
        </Card>

        <Card variant="subtle" className="signal-card">
          <Icon name="clock-alert" size={24} color="var(--text-tertiary)" />
          <div>
            <small style={{ color: "var(--text-tertiary)" }}>
              Release timeline
            </small>
            <strong style={{ display: "block", color: "var(--text-primary)" }}>
              {root ? "Not loaded" : "Not available"}
            </strong>
            <p style={{ margin: 0, color: "var(--text-secondary)" }}>
              Evidence is loaded from the local project only.
            </p>
          </div>
        </Card>
      </section>

      {evaluated ? (
        <div className="result-note" role="status">
          Read-only evaluation complete for {inspect.projectId}. No project
          files were changed.
        </div>
      ) : null}

      <footer className="status-footer">
        <span>
          <i className="footer-dot" />
          {connection}
        </span>
        <span>
          Protocol v{daemonInfo?.protocolVersion ?? 1} · Desktop v0.6 beta
        </span>
      </footer>
    </div>
  );
}
