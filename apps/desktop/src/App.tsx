import { useState, useRef, useEffect, useCallback } from "react";
import { desktopClient, DesktopBridgeError } from "./desktop-client.js";
import { Logo } from "./design/components/brand/Logo.js";
import { Wordmark } from "./design/components/brand/Wordmark.js";
import { Button } from "./design/components/core/Button.js";
import { IconButton } from "./design/components/core/IconButton.js";
import { KeyboardKey } from "./design/components/core/KeyboardKey.js";
import { EvidenceBadge } from "./design/components/evidence/EvidenceBadge.js";
import { SearchInput } from "./design/components/forms/SearchInput.js";
import { StatusChip } from "./design/components/status/StatusChip.js";
import { Card } from "./design/components/layout/Card.js";
import { Tabs } from "./design/components/navigation/Tabs.js";
import { Modal } from "./design/components/overlays/Modal.js";
import { EmptyState } from "./design/components/states/EmptyState.js";
import type {
  DaemonInfoResult,
  DoctorFinding,
  DoctorResult,
  InspectResult,
  ProjectDiffChange,
  ProjectDiffResult,
  ProjectTimelineEvent,
  ProjectTimelineResult,
} from "@intentloom/protocol";

type View =
  "Overview" | "Inspect" | "Doctor" | "Diff review" | "Timeline" | "Settings";
type InspectStatus =
  | "idle"
  | "loading"
  | "ready"
  | "stale"
  | "invalid-root"
  | "disconnected"
  | "protocol-mismatch"
  | "error";
type TimelineStatus = InspectStatus | "empty";

const views: Array<{ label: View; icon: string }> = [
  { label: "Overview", icon: "◈" },
  { label: "Inspect", icon: "⌘" },
  { label: "Doctor", icon: "✚" },
  { label: "Diff review", icon: "⇄" },
  { label: "Timeline", icon: "◷" },
];

function StatusChipHelper({ children }: { children: string }) {
  const tone =
    children.includes("Connected") ||
    children.includes("ready") ||
    children.includes("available")
      ? "success"
      : children.includes("Disconnected") ||
          children.includes("Error") ||
          children.includes("failed") ||
          children.includes("stale")
        ? "error"
        : "neutral";
  return <StatusChip tone={tone} label={children} size="sm" />;
}

import { ConfirmRootChange } from "./ConfirmRootChange.js";

function inspectStatusForError(error: unknown): InspectStatus {
  if (!(error instanceof DesktopBridgeError)) return "error";
  if (error.code === "stale_root") return "stale";
  if (error.code === "invalid_root") return "invalid-root";
  if (error.code === "disconnected" || error.code === "authentication_failed") {
    return "disconnected";
  }
  if (error.code === "protocol_incompatible") return "protocol-mismatch";
  return "error";
}

function findingKey(finding: DoctorFinding, index: number) {
  return `${finding.code}:${finding.path}:${index}`;
}

function diffChangeKey(change: ProjectDiffChange, index: number) {
  return `${change.kind}:${change.path}:${index}`;
}

function InspectView({
  root,
  result,
  status,
  errorMessage,
  onSelectProject,
  onConnect,
}: {
  root: string | null;
  result: InspectResult | null;
  status: InspectStatus;
  errorMessage: string | null;
  onSelectProject: () => void;
  onConnect: () => void;
}) {
  if (status === "ready" && result) {
    return (
      <section className="inspect-layout" aria-labelledby="inspect-title">
        <div className="inspect-main-card">
          <div className="section-heading inspect-heading">
            <div>
              <span className="eyebrow">Validated project identity</span>
              <h2 id="inspect-title">Inspect</h2>
            </div>
            <StatusChipHelper>Read-only</StatusChipHelper>
          </div>
          <div className="inspect-identity">
            <span className="signal-icon blue">⌘</span>
            <div>
              <small>Project ID</small>
              <strong>{result.projectId}</strong>
              <p>Returned by the authenticated daemon Inspect operation.</p>
            </div>
          </div>
        </div>
        <aside className="inspect-detail-card" aria-label="Inspect details">
          <span className="eyebrow">Source and freshness</span>
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
        </aside>
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
    <section className="inspect-state" aria-labelledby="inspect-title">
      <span className="eyebrow">Project Inspect</span>
      <h2 id="inspect-title">
        {status === "loading" ? "Reading project…" : copy.title}
      </h2>
      <p>
        {status === "loading"
          ? "The daemon is validating the selected canonical root."
          : copy.description}
      </p>
      <button
        className="primary-button"
        onClick={status === "stale" ? onSelectProject : onConnect}
        type="button"
        disabled={status === "loading"}
      >
        {status === "loading" ? "Reading…" : copy.action}
      </button>
    </section>
  );
}

function DoctorView({
  root,
  result,
  status,
  errorMessage,
  onSelectProject,
  onConnect,
}: {
  root: string | null;
  result: DoctorResult | null;
  status: InspectStatus;
  errorMessage: string | null;
  onSelectProject: () => void;
  onConnect: () => void;
}) {
  const [severityFilter, setSeverityFilter] = useState<
    "all" | DoctorFinding["severity"]
  >("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [selectedIndex, setSelectedIndex] = useState(0);

  if (status !== "ready" || !result) {
    const stateCopy: Record<
      Exclude<InspectStatus, "ready" | "loading">,
      { title: string; description: string; action: string }
    > = {
      idle: {
        title: root ? "Connect to run Doctor" : "Select a project",
        description: root
          ? "The canonical root is selected. Connect the local daemon to load validated diagnostics."
          : "Choose a local project root before requesting a read-only Doctor result.",
        action: root ? "Connect daemon" : "Select local project",
      },
      stale: {
        title: "Project root changed",
        description:
          errorMessage ??
          "The selected root is no longer stable. Select it again before running Doctor.",
        action: "Select project again",
      },
      "invalid-root": {
        title: "Project root unavailable",
        description:
          errorMessage ??
          "The selected directory is no longer available for read-only diagnostics.",
        action: "Select project again",
      },
      disconnected: {
        title: "Daemon unavailable",
        description:
          errorMessage ??
          "The local daemon disconnected before Doctor could complete. Retry without changing the project.",
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
        title: "Doctor unavailable",
        description:
          errorMessage ??
          "The validated Doctor result could not be loaded. Review the connection and try again.",
        action: "Retry connection",
      },
    };
    const copy =
      stateCopy[status === "loading" || status === "ready" ? "idle" : status];
    return (
      <section className="doctor-state" aria-labelledby="doctor-title">
        <span className="eyebrow">Project Doctor</span>
        <h2 id="doctor-title">
          {status === "loading" ? "Running read-only checks…" : copy.title}
        </h2>
        <p>
          {status === "loading"
            ? "The daemon is validating the selected canonical root."
            : copy.description}
        </p>
        <button
          className="primary-button"
          onClick={
            status === "stale" || status === "invalid-root"
              ? onSelectProject
              : onConnect
          }
          type="button"
          disabled={status === "loading"}
        >
          {status === "loading" ? "Checking…" : copy.action}
        </button>
      </section>
    );
  }

  const categories = [
    ...new Set(result.findings.map((finding) => finding.category)),
  ].sort();
  const filteredFindings = result.findings.filter(
    (finding) =>
      (severityFilter === "all" || finding.severity === severityFilter) &&
      (categoryFilter === "all" || finding.category === categoryFilter),
  );
  const selectedFinding = filteredFindings[selectedIndex] ?? null;
  const errorCount = result.findings.filter(
    (finding) => finding.severity === "error",
  ).length;
  const warningCount = result.findings.filter(
    (finding) => finding.severity === "warning",
  ).length;
  const infoCount = result.findings.filter(
    (finding) => finding.severity === "info",
  ).length;

  function moveSelection(direction: 1 | -1) {
    if (filteredFindings.length === 0) return;
    setSelectedIndex((current) => {
      const next = current + direction;
      if (next < 0) return filteredFindings.length - 1;
      if (next >= filteredFindings.length) return 0;
      return next;
    });
  }

  return (
    <section className="doctor-page" aria-labelledby="doctor-title">
      <div className="section-heading doctor-heading">
        <div>
          <span className="eyebrow">Validated diagnostics</span>
          <h2 id="doctor-title">Doctor</h2>
        </div>
        <StatusChipHelper>
          {result.exitCode === 0 ? "No blocking findings" : "Findings present"}
        </StatusChipHelper>
      </div>

      <div className="doctor-summary" aria-label="Doctor summary">
        <span className="doctor-count error">{errorCount} errors</span>
        <span className="doctor-count warning">{warningCount} warnings</span>
        <span className="doctor-count info">{infoCount} info</span>
        <span className="doctor-exit">Exit code {result.exitCode}</span>
      </div>

      <div className="doctor-toolbar" aria-label="Doctor filters">
        <label>
          <span>Severity</span>
          <select
            value={severityFilter}
            onChange={(event) => {
              setSeverityFilter(
                event.target.value as "all" | DoctorFinding["severity"],
              );
              setSelectedIndex(0);
            }}
          >
            <option value="all">All severities</option>
            <option value="error">Errors</option>
            <option value="warning">Warnings</option>
            <option value="info">Info</option>
          </select>
        </label>
        <label>
          <span>Category</span>
          <select
            value={categoryFilter}
            onChange={(event) => {
              setCategoryFilter(event.target.value);
              setSelectedIndex(0);
            }}
          >
            <option value="all">All categories</option>
            {categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </label>
        <span className="doctor-result-count">
          {filteredFindings.length} of {result.findings.length} findings
        </span>
      </div>

      {filteredFindings.length === 0 ? (
        <div className="doctor-empty" role="status">
          <strong>No findings match these filters.</strong>
          <p>
            Change severity or category to broaden the read-only result set.
          </p>
        </div>
      ) : (
        <div className="doctor-layout">
          <div
            className="finding-list"
            aria-label="Doctor findings"
            role="listbox"
            aria-activedescendant={
              filteredFindings.length > 0
                ? `finding-item-${selectedIndex}`
                : undefined
            }
            tabIndex={0}
            onKeyDown={(event) => {
              if (event.key === "ArrowDown") {
                event.preventDefault();
                moveSelection(1);
              }
              if (event.key === "ArrowUp") {
                event.preventDefault();
                moveSelection(-1);
              }
            }}
          >
            {filteredFindings.map((finding, index) => (
              <button
                className={`finding-item ${index === selectedIndex ? "selected" : ""}`}
                id={`finding-item-${index}`}
                key={findingKey(finding, index)}
                onClick={() => setSelectedIndex(index)}
                role="option"
                aria-selected={index === selectedIndex}
                type="button"
              >
                <span className={`finding-severity ${finding.severity}`}>
                  {finding.severity}
                </span>
                <span className="finding-item-copy">
                  <strong>{finding.code}</strong>
                  <small>{finding.category}</small>
                  <span>{finding.message}</span>
                </span>
              </button>
            ))}
          </div>

          <aside className="finding-detail" aria-label="Selected finding">
            {selectedFinding ? (
              <>
                <div className="finding-detail-header">
                  <span
                    className={`finding-severity ${selectedFinding.severity}`}
                  >
                    {selectedFinding.severity}
                  </span>
                  <span className="eyebrow">Finding detail</span>
                </div>
                <h3>{selectedFinding.code}</h3>
                <p className="finding-message">{selectedFinding.message}</p>
                <dl className="finding-facts">
                  <div>
                    <dt>Category</dt>
                    <dd>{selectedFinding.category}</dd>
                  </div>
                  <div>
                    <dt>Affected path</dt>
                    <dd>{selectedFinding.path}</dd>
                  </div>
                  <div>
                    <dt>Evidence</dt>
                    <dd>
                      Local Doctor response · protocol v{result.protocolVersion}
                    </dd>
                  </div>
                </dl>
                <div className="finding-guidance">
                  <span className="eyebrow">Remediation guidance</span>
                  <p>
                    No remediation instruction is present in the current Doctor
                    contract. This page remains review-only.
                  </p>
                </div>
              </>
            ) : null}
          </aside>
        </div>
      )}

      {result.diagnostics.length > 0 ? (
        <details className="doctor-diagnostics">
          <summary>Technical diagnostics ({result.diagnostics.length})</summary>
          <ul>
            {result.diagnostics.map((diagnostic) => (
              <li key={diagnostic}>{diagnostic}</li>
            ))}
          </ul>
        </details>
      ) : null}
    </section>
  );
}

function DiffView({
  root,
  result,
  status,
  errorMessage,
  onSelectProject,
  onLoadDiff,
}: {
  root: string | null;
  result: ProjectDiffResult | null;
  status: InspectStatus;
  errorMessage: string | null;
  onSelectProject: () => void;
  onLoadDiff: () => void;
}) {
  const [kindFilter, setKindFilter] = useState<
    "all" | ProjectDiffChange["kind"]
  >("all");
  const [selectedIndex, setSelectedIndex] = useState(0);

  if (status !== "ready" || !result) {
    const stateCopy: Record<
      Exclude<InspectStatus, "ready">,
      { title: string; description: string; action: string }
    > = {
      idle: {
        title: root ? "Load a read-only diff" : "Select a project",
        description: root
          ? "Preview exact project changes from the local daemon before any future approval boundary."
          : "Choose a local project root before requesting a read-only diff.",
        action: root ? "Load diff" : "Select local project",
      },
      loading: {
        title: "Loading diff",
        description: "The daemon is preparing a bounded read-only change list.",
        action: "Loading…",
      },
      stale: {
        title: "Project root changed",
        description:
          errorMessage ??
          "The selected root is no longer stable. Select it again before reviewing changes.",
        action: "Select project again",
      },
      "invalid-root": {
        title: "Project root unavailable",
        description:
          errorMessage ??
          "The selected directory is no longer available for a read-only diff.",
        action: "Select project again",
      },
      disconnected: {
        title: "Daemon unavailable",
        description:
          errorMessage ??
          "The local daemon disconnected before Diff could complete. Retry without changing the project.",
        action: "Retry diff",
      },
      "protocol-mismatch": {
        title: "Protocol mismatch",
        description:
          errorMessage ??
          "This daemon cannot safely serve the current Desktop protocol contract.",
        action: "Retry diff",
      },
      error: {
        title: "Diff unavailable",
        description:
          errorMessage ??
          "The validated ProjectDiff result could not be loaded. Review the connection and try again.",
        action: "Retry diff",
      },
    };
    const copy = stateCopy[status === "ready" ? "idle" : status];
    return (
      <section className="diff-state" aria-labelledby="diff-title">
        <span className="eyebrow">Read-only change preview</span>
        <h2 id="diff-title">{copy.title}</h2>
        <p>{copy.description}</p>
        <button
          className="primary-button"
          onClick={
            status === "stale" || status === "invalid-root"
              ? onSelectProject
              : onLoadDiff
          }
          type="button"
          disabled={status === "loading"}
        >
          {copy.action}
        </button>
      </section>
    );
  }

  const filteredChanges = result.changes.filter(
    (change) => kindFilter === "all" || change.kind === kindFilter,
  );
  const selectedChange = filteredChanges[selectedIndex] ?? null;
  const conflictCount = result.changes.filter(
    (change) => change.kind === "conflict",
  ).length;
  const securityErrorCount = result.changes.filter(
    (change) => change.kind === "security-error",
  ).length;
  const modifiedCount = result.changes.filter((change) =>
    ["create", "update", "modified"].includes(change.kind),
  ).length;

  function moveSelection(direction: 1 | -1) {
    if (filteredChanges.length === 0) return;
    setSelectedIndex((current) => {
      const next = current + direction;
      if (next < 0) return filteredChanges.length - 1;
      if (next >= filteredChanges.length) return 0;
      return next;
    });
  }

  return (
    <section className="diff-page" aria-labelledby="diff-title">
      <div className="section-heading diff-heading">
        <div>
          <span className="eyebrow">Validated change preview</span>
          <h2 id="diff-title">Diff Review</h2>
        </div>
        <StatusChipHelper>Review-only</StatusChipHelper>
      </div>

      <div className="diff-summary" aria-label="Diff summary">
        <span className="diff-count">{modifiedCount} changes</span>
        <span className="diff-count conflict">{conflictCount} conflicts</span>
        <span className="diff-count security-error">
          {securityErrorCount} security errors
        </span>
        <span className="diff-root">{result.root}</span>
      </div>

      <div className="diff-toolbar" aria-label="Diff filters">
        <label>
          <span>Change type</span>
          <select
            value={kindFilter}
            onChange={(event) => {
              setKindFilter(
                event.target.value as "all" | ProjectDiffChange["kind"],
              );
              setSelectedIndex(0);
            }}
          >
            <option value="all">All changes</option>
            <option value="create">Create</option>
            <option value="update">Update</option>
            <option value="modified">Modified</option>
            <option value="missing">Missing</option>
            <option value="stale">Stale</option>
            <option value="conflict">Conflict</option>
            <option value="security-error">Security error</option>
          </select>
        </label>
        <span className="diff-result-count">
          {filteredChanges.length} of {result.changes.length} changes
        </span>
      </div>

      {filteredChanges.length === 0 ? (
        <div className="diff-empty" role="status">
          <strong>
            {result.changes.length === 0
              ? "No changes in this preview."
              : "No changes match this filter."}
          </strong>
          <p>
            {result.changes.length === 0
              ? "The local project is unchanged for the selected profile."
              : "Choose another change type to broaden the review."}
          </p>
        </div>
      ) : (
        <div className="diff-layout">
          <div
            className="change-list"
            aria-label="Project changes"
            role="listbox"
            aria-activedescendant={
              filteredChanges.length > 0
                ? `change-item-${selectedIndex}`
                : undefined
            }
            tabIndex={0}
            onKeyDown={(event) => {
              if (event.key === "ArrowDown") {
                event.preventDefault();
                moveSelection(1);
              }
              if (event.key === "ArrowUp") {
                event.preventDefault();
                moveSelection(-1);
              }
            }}
          >
            {filteredChanges.map((change, index) => (
              <button
                className={`change-item ${index === selectedIndex ? "selected" : ""}`}
                id={`change-item-${index}`}
                key={diffChangeKey(change, index)}
                onClick={() => setSelectedIndex(index)}
                role="option"
                aria-selected={index === selectedIndex}
                type="button"
              >
                <span className={`change-kind ${change.kind}`}>
                  {change.kind}
                </span>
                <span className="change-item-copy">
                  <strong>{change.path}</strong>
                  <span>{change.reason}</span>
                </span>
              </button>
            ))}
          </div>

          <aside className="change-detail" aria-label="Selected change">
            {selectedChange ? (
              <>
                <div className="change-detail-header">
                  <span className={`change-kind ${selectedChange.kind}`}>
                    {selectedChange.kind}
                  </span>
                  <span className="eyebrow">Change detail</span>
                </div>
                <h3>{selectedChange.path}</h3>
                <p className="change-reason">{selectedChange.reason}</p>
                <dl className="change-facts">
                  <div>
                    <dt>Operation</dt>
                    <dd>ProjectDiff v{result.operationVersion}</dd>
                  </div>
                  <div>
                    <dt>Protocol</dt>
                    <dd>v{result.protocolVersion}</dd>
                  </div>
                  <div>
                    <dt>Write scope</dt>
                    <dd>None</dd>
                  </div>
                </dl>
                {selectedChange.content ? (
                  <div className="change-content">
                    <span className="eyebrow">Provided content</span>
                    <pre>{selectedChange.content}</pre>
                  </div>
                ) : (
                  <p className="change-muted">
                    This change does not include content in the current bounded
                    protocol response.
                  </p>
                )}
              </>
            ) : null}
          </aside>
        </div>
      )}

      {result.diagnostics.length > 0 ? (
        <details className="diff-diagnostics">
          <summary>Technical diagnostics ({result.diagnostics.length})</summary>
          <ul>
            {result.diagnostics.map((diagnostic) => (
              <li key={diagnostic}>{diagnostic}</li>
            ))}
          </ul>
        </details>
      ) : null}
    </section>
  );
}

function timelineEventKey(event: ProjectTimelineEvent, index: number) {
  return `${event.id}:${event.commitId}:${index}`;
}

function formatTimestamp(ts: number): string {
  try {
    return new Date(ts).toISOString().replace("T", " ").replace("Z", " UTC");
  } catch {
    return String(ts);
  }
}

function TimelineView({
  root,
  result,
  status,
  errorMessage,
  onSelectProject,
  onLoadTimeline,
}: {
  root: string | null;
  result: ProjectTimelineResult | null;
  status: TimelineStatus;
  errorMessage: string | null;
  onSelectProject: () => void;
  onLoadTimeline: () => void;
}) {
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Non-ready states: loading skeleton, empty, and all error/lifecycle states
  if (status !== "ready" || !result) {
    const stateCopy: Record<
      Exclude<TimelineStatus, "ready">,
      { title: string; description: string; action: string }
    > = {
      idle: {
        title: root ? "Load project timeline" : "Select a project",
        description: root
          ? "Load a read-only evidence timeline for the selected canonical root."
          : "Choose a local project root before requesting a read-only timeline.",
        action: root ? "Load timeline" : "Select local project",
      },
      loading: {
        title: "Loading timeline",
        description: "The daemon is reading evidence events for this project.",
        action: "Loading…",
      },
      empty: {
        title: "No timeline events",
        description:
          "The project has no recorded events within the bounded result window.",
        action: "Reload timeline",
      },
      stale: {
        title: "Project root changed",
        description:
          errorMessage ??
          "The selected root is no longer stable. Select it again before loading the timeline.",
        action: "Select project again",
      },
      "invalid-root": {
        title: "Project root unavailable",
        description:
          errorMessage ??
          "The selected directory is no longer available for a read-only timeline.",
        action: "Select project again",
      },
      disconnected: {
        title: "Daemon unavailable",
        description:
          errorMessage ??
          "The local daemon disconnected before the timeline could load. Retry without changing the project.",
        action: "Retry timeline",
      },
      "protocol-mismatch": {
        title: "Protocol mismatch",
        description:
          errorMessage ??
          "This daemon cannot safely serve the current Desktop protocol contract.",
        action: "Retry timeline",
      },
      error: {
        title: "Timeline unavailable",
        description:
          errorMessage ??
          "The read-only timeline result could not be loaded. Review the connection and try again.",
        action: "Retry timeline",
      },
    };
    const copy = stateCopy[status === "ready" ? "idle" : status];
    return (
      <section className="timeline-state" aria-labelledby="timeline-title">
        <span className="eyebrow">Project Timeline</span>
        <h2 id="timeline-title">{copy.title}</h2>
        <p>{copy.description}</p>
        <button
          className="primary-button"
          onClick={
            status === "stale" || status === "invalid-root"
              ? onSelectProject
              : onLoadTimeline
          }
          type="button"
          disabled={status === "loading"}
        >
          {copy.action}
        </button>
      </section>
    );
  }

  const events = result.events;
  const selectedEvent = events[selectedIndex] ?? null;

  function moveSelection(direction: 1 | -1) {
    if (events.length === 0) return;
    setSelectedIndex((current) => {
      const next = current + direction;
      if (next < 0) return events.length - 1;
      if (next >= events.length) return 0;
      return next;
    });
  }

  return (
    <section className="timeline-page" aria-labelledby="timeline-title">
      <div className="section-heading timeline-heading">
        <div>
          <span className="eyebrow">Read-only evidence timeline</span>
          <h2 id="timeline-title">Timeline</h2>
        </div>
        <StatusChipHelper>Read-only</StatusChipHelper>
      </div>

      <dl className="timeline-meta" aria-label="Timeline metadata">
        <div>
          <dt>Case ID</dt>
          <dd>{result.caseId}</dd>
        </div>
        <div>
          <dt>Case type</dt>
          <dd>{result.caseType}</dd>
        </div>
        <div>
          <dt>Quality</dt>
          <dd>
            <span
              className={`timeline-quality ${result.quality}`}
              aria-label={`Evidence quality: ${result.quality}`}
            >
              {result.quality}
            </span>
          </dd>
        </div>
        <div>
          <dt>Events</dt>
          <dd>{events.length}</dd>
        </div>
      </dl>

      {result.quality === "bounded" ? (
        <div className="timeline-quality-notice bounded" role="status">
          <strong>Evidence is bounded.</strong> The timeline is limited by the
          configured event window. Earlier events are not included in this
          read-only result.
        </div>
      ) : result.quality === "unavailable" ? (
        <div className="timeline-quality-notice unavailable" role="status">
          <strong>Evidence is unavailable.</strong> The daemon could not
          retrieve a complete timeline for this project. The events shown are
          partial.
        </div>
      ) : null}

      {result.findings.length > 0 ? (
        <div className="timeline-findings" aria-label="Timeline findings">
          {result.findings.map((finding) => (
            <span key={finding} className={`timeline-finding ${finding}`}>
              {finding}
            </span>
          ))}
        </div>
      ) : null}

      {events.length === 0 ? (
        <div className="timeline-empty" role="status">
          <strong>No events in this bounded result window.</strong>
          <p>Select a wider caseId or check daemon evidence availability.</p>
        </div>
      ) : (
        <div className="timeline-layout">
          <div
            className="timeline-event-list"
            role="listbox"
            aria-label="Timeline events"
            aria-activedescendant={
              events.length > 0 ? `timeline-row-${selectedIndex}` : undefined
            }
            tabIndex={0}
            onKeyDown={(event) => {
              if (event.key === "ArrowDown") {
                event.preventDefault();
                moveSelection(1);
              }
              if (event.key === "ArrowUp") {
                event.preventDefault();
                moveSelection(-1);
              }
            }}
          >
            <table className="timeline-table" aria-label="Timeline event list">
              <thead>
                <tr>
                  <th scope="col">Timestamp</th>
                  <th scope="col">Commit</th>
                  <th scope="col">Source</th>
                  <th scope="col">Trust</th>
                  <th scope="col">Paths</th>
                </tr>
              </thead>
              <tbody>
                {events.map((ev, index) => (
                  <tr
                    id={`timeline-row-${index}`}
                    key={timelineEventKey(ev, index)}
                    className={`timeline-event-row ${
                      index === selectedIndex ? "selected" : ""
                    }`}
                    role="option"
                    aria-selected={index === selectedIndex}
                    tabIndex={-1}
                    onClick={() => setSelectedIndex(index)}
                  >
                    <td className="timeline-ts">
                      {formatTimestamp(ev.timestamp)}
                    </td>
                    <td className="timeline-commit">
                      <code>{ev.commitId.slice(0, 9)}</code>
                    </td>
                    <td className="timeline-source">{ev.source}</td>
                    <td className="timeline-trust">{ev.trust}</td>
                    <td className="timeline-paths">{ev.changedPaths.length}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <aside
            className="timeline-event-detail"
            aria-label="Selected event detail"
          >
            {selectedEvent ? (
              <>
                <div className="timeline-detail-header">
                  <code className="timeline-commit-full">
                    {selectedEvent.commitId}
                  </code>
                  <span className="eyebrow">Event detail</span>
                </div>
                <dl className="timeline-detail-facts">
                  <div>
                    <dt>Timestamp</dt>
                    <dd>{formatTimestamp(selectedEvent.timestamp)}</dd>
                  </div>
                  <div>
                    <dt>Source</dt>
                    <dd>{selectedEvent.source}</dd>
                  </div>
                  <div>
                    <dt>Trust</dt>
                    <dd>{selectedEvent.trust}</dd>
                  </div>
                  <div>
                    <dt>Parents</dt>
                    <dd>
                      {selectedEvent.parents.length === 0
                        ? "None (root commit)"
                        : selectedEvent.parents.map((p) => (
                            <code key={p} className="timeline-parent">
                              {p.slice(0, 9)}
                            </code>
                          ))}
                    </dd>
                  </div>
                  <div>
                    <dt>Write scope</dt>
                    <dd>None</dd>
                  </div>
                </dl>
                {selectedEvent.changedPaths.length > 0 ? (
                  <div className="timeline-changed-paths">
                    <span className="eyebrow">Changed paths</span>
                    <ul>
                      {selectedEvent.changedPaths.map((p) => (
                        <li key={p}>
                          <code>{p}</code>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <p className="timeline-muted">
                    No changed paths recorded for this event.
                  </p>
                )}
              </>
            ) : null}
          </aside>
        </div>
      )}

      {result.diagnostics.length > 0 ? (
        <details className="timeline-diagnostics">
          <summary>Technical diagnostics ({result.diagnostics.length})</summary>
          <ul>
            {result.diagnostics.map((diagnostic) => (
              <li key={diagnostic}>{diagnostic}</li>
            ))}
          </ul>
        </details>
      ) : null}
    </section>
  );
}

function SettingsView({
  theme,
  onThemeToggle,
  root,
  daemonInfo,
  connection,
}: {
  theme: "dark" | "light";
  onThemeToggle: (theme: "dark" | "light") => void;
  root: string | null;
  daemonInfo: DaemonInfoResult | null;
  connection: string;
}) {
  const [copied, setCopied] = useState(false);

  function handleCopyRoot() {
    if (!root) return;
    void navigator.clipboard.writeText(root);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <section className="settings-page" aria-labelledby="settings-title">
      <div className="section-heading">
        <div>
          <span className="eyebrow">Desktop Configuration & Status</span>
          <h2 id="settings-title">Settings & Diagnostics</h2>
        </div>
        <StatusChipHelper>Read-only Scope</StatusChipHelper>
      </div>

      <div className="settings-grid">
        <div className="settings-card">
          <h3>Appearance & Preferences</h3>
          <p>
            Customize Desktop shell color theme and accessibility preferences.
          </p>
          <div className="settings-field-group">
            <div
              className="theme-btn-group"
              role="group"
              aria-label="Theme selector"
            >
              <button
                className={`theme-btn ${theme === "dark" ? "active" : ""}`}
                onClick={() => onThemeToggle("dark")}
                type="button"
              >
                ☾ Dark
              </button>
              <button
                className={`theme-btn ${theme === "light" ? "active" : ""}`}
                onClick={() => onThemeToggle("light")}
                type="button"
              >
                ☼ Light
              </button>
            </div>
          </div>
        </div>

        <div className="settings-card">
          <h3>Daemon Diagnostics</h3>
          <p>
            Local authenticated daemon IPC details and wire protocol
            compatibility.
          </p>
          <dl className="change-facts">
            <div>
              <dt>Protocol version</dt>
              <dd>v{daemonInfo?.protocolVersion ?? 1}</dd>
            </div>
            <div>
              <dt>Daemon version</dt>
              <dd>{daemonInfo?.daemonVersion ?? "0.5.0-beta.1"}</dd>
            </div>
            <div>
              <dt>Connection</dt>
              <dd>{connection}</dd>
            </div>
            <div>
              <dt>Transport</dt>
              <dd>IPC Unix socket / Named Pipe</dd>
            </div>
            <div>
              <dt>Capabilities</dt>
              <dd>{daemonInfo?.capabilities.length ?? 5} read-only methods</dd>
            </div>
          </dl>
        </div>

        <div className="settings-card">
          <h3>Project & Data Boundary</h3>
          <p>
            Canonical project root and local storage confidentiality bounds.
          </p>
          <div className="confirm-current">
            <span className="eyebrow">Active root</span>
            <code className="confirm-root-path">
              {root ?? "No project selected"}
            </code>
          </div>
          {root ? (
            <button
              className="secondary-button"
              onClick={handleCopyRoot}
              type="button"
              style={{ marginTop: 12 }}
            >
              {copied ? "Copied path!" : "Copy root path"}
            </button>
          ) : null}
          <p style={{ marginTop: 12, marginBottom: 0 }}>
            <strong>Local-only execution:</strong> No telemetric data,
            analytics, or source code leaves your local workstation.
          </p>
        </div>
      </div>

      <div className="settings-card">
        <h3>Keyboard Shortcuts Cheat Sheet</h3>
        <p>
          Essential navigation and control shortcuts for keyboard-first
          operation.
        </p>
        <table className="shortcut-table">
          <thead>
            <tr>
              <th scope="col">Shortcut</th>
              <th scope="col">Action</th>
              <th scope="col">Scope</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <kbd>⌘ K</kbd> / <kbd>Ctrl K</kbd>
              </td>
              <td>Open Command Palette</td>
              <td>Global</td>
            </tr>
            <tr>
              <td>
                <kbd>Esc</kbd>
              </td>
              <td>Close modal dialogs / Cancel confirm overlay</td>
              <td>Global</td>
            </tr>
            <tr>
              <td>
                <kbd>↑</kbd> / <kbd>↓</kbd>
              </td>
              <td>Navigate findings, diff changes, and timeline events</td>
              <td>Doctor / Diff / Timeline</td>
            </tr>
            <tr>
              <td>
                <kbd>Tab</kbd> (first)
              </td>
              <td>Focus "Skip to main content" link</td>
              <td>App shell root</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  );
}

interface CommandOption {
  id: string;
  category: "Navigation" | "Actions" | "Diagnostics";
  label: string;
  icon: string;
  shortcut?: string;
  action: () => void;
}

function CommandPaletteModal({
  isOpen,
  onClose,
  options,
  triggerRef,
}: {
  isOpen: boolean;
  onClose: () => void;
  options: readonly CommandOption[];
  triggerRef: React.RefObject<HTMLButtonElement | null>;
}) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);

  const filteredOptions = options.filter(
    (opt) =>
      opt.label.toLowerCase().includes(query.toLowerCase()) ||
      opt.category.toLowerCase().includes(query.toLowerCase()),
  );

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Handle Escape and Arrow navigation
  useEffect(() => {
    if (!isOpen) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((i) =>
          filteredOptions.length === 0 ? 0 : (i + 1) % filteredOptions.length,
        );
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((i) =>
          filteredOptions.length === 0
            ? 0
            : (i - 1 + filteredOptions.length) % filteredOptions.length,
        );
      } else if (e.key === "Enter") {
        e.preventDefault();
        const selected = filteredOptions[selectedIndex];
        if (selected) {
          selected.action();
          onClose();
        }
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, filteredOptions, selectedIndex, onClose]);

  // Focus return on close
  useEffect(() => {
    if (!isOpen) {
      triggerRef.current?.focus();
    }
  }, [isOpen, triggerRef]);

  if (!isOpen) return null;

  return (
    <div
      className="command-palette-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="palette-title"
    >
      <div className="command-palette-dialog">
        <div className="command-palette-header">
          <input
            id="palette-title"
            className="command-palette-input"
            type="search"
            placeholder="Type a command or search view... (Esc to close)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            // eslint-disable-next-line jsx-a11y/no-autofocus
            autoFocus
          />
        </div>
        <div
          className="command-palette-body"
          role="listbox"
          aria-label="Commands"
          aria-activedescendant={
            filteredOptions.length > 0 ? `cmd-item-${selectedIndex}` : undefined
          }
        >
          {filteredOptions.length === 0 ? (
            <div className="command-palette-empty">
              No matching commands found.
            </div>
          ) : (
            filteredOptions.map((opt, index) => (
              <button
                key={opt.id}
                id={`cmd-item-${index}`}
                className={`command-palette-item ${
                  index === selectedIndex ? "selected" : ""
                }`}
                onClick={() => {
                  opt.action();
                  onClose();
                }}
                role="option"
                aria-selected={index === selectedIndex}
                type="button"
              >
                <div className="command-palette-item-left">
                  <span className="command-palette-icon">{opt.icon}</span>
                  <span>{opt.label}</span>
                </div>
                {opt.shortcut ? (
                  <span className="command-palette-shortcut">
                    {opt.shortcut}
                  </span>
                ) : (
                  <span className="command-palette-category">
                    {opt.category}
                  </span>
                )}
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [activeView, setActiveView] = useState<View>("Overview");
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [connection, setConnection] = useState("Not connected");
  const [root, setRoot] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [daemonInfo, setDaemonInfo] = useState<DaemonInfoResult | null>(null);
  const [inspect, setInspect] = useState<InspectResult | null>(null);
  const [inspectStatus, setInspectStatus] = useState<InspectStatus>("idle");
  const [inspectError, setInspectError] = useState<string | null>(null);
  const [doctor, setDoctor] = useState<DoctorResult | null>(null);
  const [diff, setDiff] = useState<ProjectDiffResult | null>(null);
  const [diffStatus, setDiffStatus] = useState<InspectStatus>("idle");
  const [diffError, setDiffError] = useState<string | null>(null);
  const [timeline, setTimeline] = useState<ProjectTimelineResult | null>(null);
  const [timelineStatus, setTimelineStatus] = useState<TimelineStatus>("idle");
  const [timelineError, setTimelineError] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [confirmSwitch, setConfirmSwitch] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  // Ref to the element that triggered the confirm overlay, for focus return
  const confirmTriggerRef = useRef<HTMLButtonElement | null>(null);
  // Ref to the element that triggered the Command Palette
  const commandPaletteTriggerRef = useRef<HTMLButtonElement | null>(null);
  // Ref to the AbortController for the current in-flight daemon operation
  const operationRef = useRef<AbortController | null>(null);

  // Derived loading state — true whenever any daemon operation is in-flight
  const isOperationLoading =
    isConnecting ||
    inspectStatus === "loading" ||
    diffStatus === "loading" ||
    timelineStatus === "loading";

  // Derived: which views currently hold loaded data
  const loadedViews: string[] = [];
  if (inspect !== null) loadedViews.push("Inspect");
  if (doctor !== null) loadedViews.push("Doctor");
  if (diffStatus === "ready") loadedViews.push("Diff Review");
  if (timelineStatus === "ready" || timelineStatus === "empty")
    loadedViews.push("Timeline");

  // Wrap selectProject with a confirmation guard when data is loaded
  const requestProjectSelect = useCallback(
    (triggerEl?: HTMLButtonElement | null) => {
      if (root !== null && loadedViews.length > 0) {
        confirmTriggerRef.current = triggerEl ?? null;
        setConfirmSwitch(true);
      } else {
        void selectProject();
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [root, loadedViews.join(",")],
  );

  // Global ⌘K / Ctrl+K keyboard shortcut listener for Command Palette
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  const commandOptions: CommandOption[] = [
    {
      id: "nav-overview",
      category: "Navigation",
      label: "Go to Overview",
      icon: "◈",
      shortcut: "1",
      action: () => setActiveView("Overview"),
    },
    {
      id: "nav-inspect",
      category: "Navigation",
      label: "Go to Inspect",
      icon: "⌘",
      shortcut: "2",
      action: () => setActiveView("Inspect"),
    },
    {
      id: "nav-doctor",
      category: "Navigation",
      label: "Go to Doctor",
      icon: "✚",
      shortcut: "3",
      action: () => setActiveView("Doctor"),
    },
    {
      id: "nav-diff",
      category: "Navigation",
      label: "Go to Diff Review",
      icon: "⇄",
      shortcut: "4",
      action: () => setActiveView("Diff review"),
    },
    {
      id: "nav-timeline",
      category: "Navigation",
      label: "Go to Timeline",
      icon: "◷",
      shortcut: "5",
      action: () => setActiveView("Timeline"),
    },
    {
      id: "nav-settings",
      category: "Navigation",
      label: "Go to Settings & Diagnostics",
      icon: "⚙",
      action: () => setActiveView("Settings"),
    },
    {
      id: "action-select-root",
      category: "Actions",
      label: "Select local project root...",
      icon: "⌂",
      action: () => requestProjectSelect(),
    },
    {
      id: "action-reconnect",
      category: "Actions",
      label: "Reconnect daemon",
      icon: "↻",
      action: () => void connectDaemon(),
    },
    {
      id: "action-load-diff",
      category: "Actions",
      label: "Load diff preview",
      icon: "⇄",
      action: () => void loadDiff(),
    },
    {
      id: "action-load-timeline",
      category: "Actions",
      label: "Load project timeline",
      icon: "◷",
      action: () => void loadTimeline(),
    },
    {
      id: "action-toggle-theme",
      category: "Actions",
      label: `Switch to ${theme === "dark" ? "Light" : "Dark"} mode`,
      icon: theme === "dark" ? "☼" : "☾",
      action: () => setTheme((t) => (t === "dark" ? "light" : "dark")),
    },
  ];

  /**
   * Start a new cancellable operation.
   * Aborts any prior in-flight operation and returns a fresh AbortSignal.
   */
  function startOperation(): AbortSignal {
    operationRef.current?.abort();
    const controller = new AbortController();
    operationRef.current = controller;
    return controller.signal;
  }

  /**
   * Cancel the current in-flight operation (if any).
   * Called by the Cancel button in the topbar.
   */
  function cancelOperation() {
    operationRef.current?.abort();
    operationRef.current = null;
    setIsConnecting(false);
    if (inspectStatus === "loading") setInspectStatus("idle");
    if (diffStatus === "loading") setDiffStatus("idle");
    if (timelineStatus === "loading") setTimelineStatus("idle");
    setConnection(root ? "Cancelled" : "Not connected");
    setMessage("Operation cancelled.");
  }

  function handleConfirmChange() {
    setConfirmSwitch(false);
    void selectProject();
  }

  function handleCancelChange() {
    setConfirmSwitch(false);
  }

  async function selectProject() {
    // Cancel any in-flight daemon operation before clearing state
    operationRef.current?.abort();
    operationRef.current = null;
    setMessage(null);
    try {
      const selectedRoot = await desktopClient.selectProjectRoot();
      if (selectedRoot) {
        setRoot(selectedRoot);
        setConnection("Not connected");
        setDaemonInfo(null);
        setInspect(null);
        setInspectStatus("idle");
        setInspectError(null);
        setDoctor(null);
        setDiff(null);
        setDiffStatus("idle");
        setDiffError(null);
        setTimeline(null);
        setTimelineStatus("idle");
        setTimelineError(null);
      }
    } catch (error) {
      const selectionMessage =
        error instanceof DesktopBridgeError
          ? error.message
          : "The project directory could not be selected.";
      setInspectError(selectionMessage);
      setInspectStatus("error");
      setMessage(selectionMessage);
    }
  }

  async function loadDiff() {
    if (!root) {
      setDiffStatus("idle");
      return;
    }
    const signal = startOperation();
    setMessage(null);
    setDiff(null);
    setDiffError(null);
    setDiffStatus("loading");
    setConnection("Loading diff…");
    try {
      const result = await desktopClient.projectDiff(
        { root, profile: "generic", adapters: [] },
        signal,
      );
      if (signal.aborted) return;
      setDiff(result);
      setDiffStatus("ready");
      setConnection(
        daemonInfo ? `Daemon ${daemonInfo.daemonVersion}` : "Daemon connected",
      );
    } catch (error) {
      if (signal.aborted) return;
      const nextDiffStatus = inspectStatusForError(error);
      setDiffStatus(nextDiffStatus);
      if (error instanceof DesktopBridgeError) {
        setDiffError(error.message);
      }
      setConnection(
        nextDiffStatus === "stale" || nextDiffStatus === "invalid-root"
          ? nextDiffStatus === "stale"
            ? "Project root changed"
            : "Project root unavailable"
          : nextDiffStatus === "protocol-mismatch"
            ? "Protocol mismatch"
            : "Disconnected",
      );
      setMessage(
        error instanceof DesktopBridgeError
          ? error.message
          : "The project diff could not be loaded.",
      );
    }
  }

  async function loadTimeline() {
    if (!root) {
      setTimelineStatus("idle");
      return;
    }
    const signal = startOperation();
    setMessage(null);
    setTimeline(null);
    setTimelineError(null);
    setTimelineStatus("loading");
    setConnection("Loading timeline…");
    try {
      const result = await desktopClient.projectTimeline(
        {
          root,
          caseId: "desktop-release",
          limit: 50,
          timeoutMs: 5_000,
          maxOutputBytes: 512 * 1024,
        },
        signal,
      );
      if (signal.aborted) return;
      if (result.events.length === 0) {
        setTimelineStatus("empty");
      } else {
        setTimeline(result);
        setTimelineStatus("ready");
      }
      setConnection(
        daemonInfo ? `Daemon ${daemonInfo.daemonVersion}` : "Daemon connected",
      );
    } catch (error) {
      if (signal.aborted) return;
      const nextStatus = inspectStatusForError(error);
      setTimelineStatus(nextStatus);
      if (error instanceof DesktopBridgeError) {
        setTimelineError(error.message);
      }
      setConnection(
        nextStatus === "stale" || nextStatus === "invalid-root"
          ? nextStatus === "stale"
            ? "Project root changed"
            : "Project root unavailable"
          : nextStatus === "protocol-mismatch"
            ? "Protocol mismatch"
            : "Disconnected",
      );
      setMessage(
        error instanceof DesktopBridgeError
          ? error.message
          : "The project timeline could not be loaded.",
      );
    }
  }

  async function connectDaemon() {
    if (isConnecting) return;
    const signal = startOperation();
    setConnection("Connecting…");
    setMessage(null);
    setIsConnecting(true);
    setInspectError(null);
    if (root) {
      setInspect(null);
      setInspectStatus("loading");
      setDoctor(null);
      setDiff(null);
      setDiffStatus("idle");
      setDiffError(null);
      setTimeline(null);
      setTimelineStatus("idle");
      setTimelineError(null);
    }
    try {
      const info = await desktopClient.daemonInfo(signal);
      if (signal.aborted) return;
      setDaemonInfo(info);
      setRetryCount(0);
      if (info.compatibility.status === "incompatible") {
        setInspectStatus(root ? "protocol-mismatch" : "idle");
        setConnection("Protocol mismatch");
        setMessage(
          info.compatibility.reason ??
            "The local daemon is not compatible with this Desktop client.",
        );
        return;
      }
      if (root) {
        setConnection("Reading project…");
        const [projectInspect, projectDoctor] = await Promise.all([
          desktopClient.inspectProject(root, signal),
          desktopClient.doctorProject(root, signal),
        ]);
        if (signal.aborted) return;
        setInspect(projectInspect);
        setDoctor(projectDoctor);
        setInspectStatus("ready");
      }
      setConnection(`Daemon ${info.daemonVersion}`);
    } catch (error) {
      if (signal.aborted) return;
      const nextInspectStatus = root ? inspectStatusForError(error) : "idle";
      setInspectStatus(nextInspectStatus);
      if (error instanceof DesktopBridgeError) {
        setInspectError(error.message);
      }
      const isTransientDisconnect =
        error instanceof DesktopBridgeError &&
        (error.code === "disconnected" ||
          error.code === "native_bridge_unavailable");
      if (isTransientDisconnect && retryCount < 1) {
        // Single automatic retry after 1500ms for transient disconnections
        setRetryCount((c) => c + 1);
        setConnection("Reconnecting…");
        setMessage("Daemon not ready — retrying in 1.5s…");
        setIsConnecting(false);
        setTimeout(() => {
          void connectDaemon();
        }, 1500);
        return;
      }
      setConnection(
        nextInspectStatus === "stale" || nextInspectStatus === "invalid-root"
          ? nextInspectStatus === "stale"
            ? "Project root changed"
            : "Project root unavailable"
          : nextInspectStatus === "protocol-mismatch"
            ? "Protocol mismatch"
            : "Disconnected",
      );
      setMessage(
        error instanceof DesktopBridgeError
          ? error.message
          : "The local daemon could not be reached.",
      );
    } finally {
      setIsConnecting(false);
    }
  }

  const doctorErrors =
    doctor?.findings.filter((finding) => finding.severity === "error").length ??
    0;
  const doctorWarnings =
    doctor?.findings.filter((finding) => finding.severity === "warning")
      .length ?? 0;
  const evaluated = inspect !== null && doctor !== null;

  return (
    <main className={`app-shell theme-${theme}`}>
      {/* Skip to main content link for keyboard/screen-reader users */}
      <a className="skip-link" href="#workspace-content">
        Skip to main content
      </a>
      <aside className="sidebar">
        <div className="brand-lockup" aria-label="Intentloom">
          <Logo size={24} />
          <Wordmark size={16} />
        </div>

        <button
          className="project-switcher"
          id="project-switcher"
          onClick={(e) => requestProjectSelect(e.currentTarget)}
          type="button"
        >
          <span className="project-glyph">⌂</span>
          <span className="project-copy">
            <strong>
              {root ? root.split(/[\\/]/).at(-1) : "No project selected"}
            </strong>
            <small>{root ?? "Choose a local root"}</small>
          </span>
          <span className="chevron">⌄</span>
        </button>

        <nav aria-label="Primary navigation">
          <p className="nav-label">Workspace</p>
          {views.map((view) => (
            <button
              aria-current={activeView === view.label ? "page" : undefined}
              className={`nav-item ${activeView === view.label ? "active" : ""}`}
              key={view.label}
              onClick={() => setActiveView(view.label)}
              type="button"
            >
              <span className="nav-icon" aria-hidden="true">
                {view.icon}
              </span>
              {view.label}
            </button>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <button
            aria-current={activeView === "Settings" ? "page" : undefined}
            className={`nav-item ${activeView === "Settings" ? "active" : ""}`}
            onClick={() => setActiveView("Settings")}
            type="button"
          >
            <span className="nav-icon" aria-hidden="true">
              ⚙
            </span>
            Settings
          </button>
          <div className="privacy-note">
            <span className="privacy-dot" />
            <span>
              <strong>Local-only</strong>
              <small>No data leaves this device</small>
            </span>
          </div>
        </div>
      </aside>

      <section className="workspace" id="workspace-content" tabIndex={-1}>
        <header className="topbar">
          <div>
            <span className="eyebrow">Workspace / {activeView}</span>
            <h1>{activeView}</h1>
          </div>
          <div className="topbar-actions">
            <button
              ref={commandPaletteTriggerRef}
              className="command-palette-trigger"
              onClick={() => setIsCommandPaletteOpen(true)}
              title="Open Command Palette (⌘K)"
              type="button"
            >
              <span aria-hidden="true">🔍</span>
              <span>Search commands...</span>
              <kbd>⌘K</kbd>
            </button>
            {/* Cancel button — visible only during any loading operation */}
            {isOperationLoading ? (
              <button
                className="cancel-button"
                onClick={cancelOperation}
                title="Cancel the current operation"
                type="button"
                aria-label="Cancel current operation"
              >
                <span aria-hidden="true">×</span> Cancel
              </button>
            ) : null}
            <button
              className="icon-button"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              title="Toggle theme"
              type="button"
            >
              {theme === "dark" ? "\u263c" : "\u263e"}
            </button>
            <button className="avatar" title="Account" type="button">
              EK
            </button>
            {/* Live region for connection status changes */}
            <span
              className="status-chip"
              role="status"
              aria-live="polite"
              aria-atomic="true"
              style={{
                position: "absolute",
                left: "-9999px",
                width: 1,
                height: 1,
                overflow: "hidden",
              }}
            >
              {connection}
            </span>
          </div>
        </header>

        <div className="content">
          {activeView === "Inspect" ? (
            <InspectView
              errorMessage={inspectError}
              onConnect={connectDaemon}
              onSelectProject={() => requestProjectSelect()}
              result={inspect}
              root={root}
              status={inspectStatus}
            />
          ) : activeView === "Doctor" ? (
            <DoctorView
              errorMessage={inspectError}
              onConnect={connectDaemon}
              onSelectProject={() => requestProjectSelect()}
              result={doctor}
              root={root}
              status={inspectStatus}
            />
          ) : activeView === "Diff review" ? (
            <DiffView
              errorMessage={diffError}
              onLoadDiff={loadDiff}
              onSelectProject={() => requestProjectSelect()}
              result={diff}
              root={root}
              status={diffStatus}
            />
          ) : activeView === "Timeline" ? (
            <TimelineView
              errorMessage={timelineError}
              onLoadTimeline={loadTimeline}
              onSelectProject={() => requestProjectSelect()}
              result={timeline}
              root={root}
              status={timelineStatus}
            />
          ) : activeView === "Settings" ? (
            <SettingsView
              connection={connection}
              daemonInfo={daemonInfo}
              onThemeToggle={setTheme}
              root={root}
              theme={theme}
            />
          ) : (
            <>
              {confirmSwitch && root ? (
                <ConfirmRootChange
                  currentRoot={root}
                  loadedViews={loadedViews}
                  onConfirm={handleConfirmChange}
                  onCancel={handleCancelChange}
                  triggerRef={confirmTriggerRef}
                />
              ) : null}
              <div className="connection-row">
                <StatusChipHelper>{connection}</StatusChipHelper>
                <span className="connection-detail">
                  Read-only scope ·{" "}
                  {root ? "Project root selected" : "Awaiting project root"}
                </span>
                <button
                  className="text-button"
                  onClick={connectDaemon}
                  disabled={isConnecting}
                  type="button"
                >
                  {isConnecting ? "Connecting…" : "Connect daemon"}
                </button>
              </div>

              {retryCount > 0 && isConnecting ? (
                <div className="reconnect-notice" role="status">
                  Daemon not ready — retrying (attempt {retryCount})…
                </div>
              ) : message ? (
                <div className="notice error">{message}</div>
              ) : null}

              <section className="hero-panel">
                <div className="hero-copy">
                  <span className="hero-kicker">Project workspace</span>
                  <h2>Make engineering intent visible.</h2>
                  <p>
                    Select a local project to inspect health, review exact
                    changes, and understand its engineering history. Intentloom
                    stays read-only until you explicitly approve a future
                    action.
                  </p>
                  <button
                    className="primary-button"
                    onClick={(e) => requestProjectSelect(e.currentTarget)}
                    type="button"
                  >
                    Select local project <span aria-hidden="true">→</span>
                  </button>
                </div>
                <div className="loop-illustration" aria-hidden="true">
                  <span />
                  <span />
                  <span />
                </div>
              </section>

              <div className="section-heading">
                <div>
                  <span className="eyebrow">Read-only signal</span>
                  <h3>Project health</h3>
                </div>
                <StatusChipHelper>
                  {evaluated
                    ? doctor?.exitCode === 0
                      ? "Ready"
                      : "Findings present"
                    : root
                      ? "Not evaluated"
                      : "Awaiting root"}
                </StatusChipHelper>
              </div>

              <section
                className="signal-grid"
                aria-label="Project health signals"
              >
                <article className="signal-card">
                  <span className="signal-icon blue">⌘</span>
                  <div>
                    <small>Project inspect</small>
                    <strong>
                      {inspect?.projectId ??
                        (root ? "Awaiting connection" : "Awaiting root")}
                    </strong>
                    <p>
                      {inspect
                        ? `Canonical root: ${inspect.root}`
                        : "Validated project identity will appear here."}
                    </p>
                  </div>
                </article>
                <article className="signal-card">
                  <span className="signal-icon amber">✚</span>
                  <div>
                    <small>Doctor</small>
                    <strong>
                      {doctor
                        ? `${doctorErrors} errors · ${doctorWarnings} warnings`
                        : "Not evaluated"}
                    </strong>
                    <p>
                      {doctor
                        ? `${doctor.findings.length} validated finding${doctor.findings.length === 1 ? "" : "s"}. Exit code ${doctor.exitCode}.`
                        : "Diagnostics remain empty until a project is connected."}
                    </p>
                  </div>
                </article>
                <article className="signal-card">
                  <span className="signal-icon violet">◷</span>
                  <div>
                    <small>Release timeline</small>
                    <strong>{root ? "Not loaded" : "Not available"}</strong>
                    <p>Evidence is loaded from the local project only.</p>
                  </div>
                </article>
              </section>

              {evaluated ? (
                <div className="result-note" role="status">
                  Read-only evaluation complete for {inspect.projectId}. No
                  project files were changed.
                </div>
              ) : null}

              <footer className="status-footer">
                <span>
                  <i className="footer-dot" />
                  {connection}
                </span>
                <span>
                  Protocol v{daemonInfo?.protocolVersion ?? 1} · Desktop v0.6
                  beta
                </span>
              </footer>
            </>
          )}
        </div>

        <CommandPaletteModal
          isOpen={isCommandPaletteOpen}
          onClose={() => setIsCommandPaletteOpen(false)}
          options={commandOptions}
          triggerRef={commandPaletteTriggerRef}
        />
      </section>
    </main>
  );
}
