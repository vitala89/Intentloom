import { useState } from "react";
import type { DoctorFinding, DoctorResult } from "@intentloom/protocol";
import type { InspectStatus } from "./InspectView.js";
import { StatusChip } from "../design/components/status/StatusChip.js";
import { EmptyState } from "../design/components/states/EmptyState.js";
import { Button } from "../design/components/core/Button.js";
import { hasExternalSpecializedPackDoctorFindings } from "./specialized-pack-external-doctor.js";

export interface DoctorViewProps {
  root: string | null;
  result: DoctorResult | null;
  status: InspectStatus;
  errorMessage: string | null;
  onSelectProject: () => void;
  onConnect: () => void;
  onRefreshDoctor: () => void;
  onOpenExternalSpecializedPackPreview?: () => void;
}

function findingKey(finding: DoctorFinding, index: number) {
  return `${finding.code}:${finding.path}:${index}`;
}

export function DoctorView({
  root,
  result,
  status,
  errorMessage,
  onSelectProject,
  onConnect,
  onRefreshDoctor,
  onOpenExternalSpecializedPackPreview,
}: DoctorViewProps) {
  const [severityFilter, setSeverityFilter] = useState<
    "all" | DoctorFinding["severity"]
  >("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [selectedIndex, setSelectedIndex] = useState(0);

  if ((status !== "ready" && status !== "loading") || !result) {
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
      <EmptyState
        icon="shield-check"
        title={status === "loading" ? "Running read-only checks…" : copy.title}
        description={
          status === "loading"
            ? "The daemon is validating the selected canonical root."
            : copy.description
        }
        action={
          <Button
            variant="primary"
            onClick={
              status === "stale" || status === "invalid-root"
                ? onSelectProject
                : onConnect
            }
            disabled={status === "loading"}
          >
            {status === "loading" ? "Checking…" : copy.action}
          </Button>
        }
      />
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
    <section
      className={`doctor-page${status === "loading" ? " doctor-page-loading" : ""}`}
      aria-labelledby="doctor-title"
      aria-busy={status === "loading"}
    >
      <div className="section-heading doctor-heading">
        <div>
          <span className="eyebrow">Validated diagnostics</span>
          <h2 id="doctor-title">Doctor</h2>
        </div>
        <StatusChip
          tone={result.exitCode === 0 ? "success" : "error"}
          label={
            result.exitCode === 0 ? "No blocking findings" : "Findings present"
          }
          size="sm"
        />
        <Button
          type="button"
          variant="secondary"
          onClick={onRefreshDoctor}
          disabled={status === "loading" || root === null}
          aria-label="Refresh Doctor"
        >
          {status === "loading" ? "Refreshing…" : "Refresh Doctor"}
        </Button>
      </div>

      <div className="doctor-summary" aria-label="Doctor summary">
        <span className="doctor-count error">{errorCount} errors</span>
        <span className="doctor-count warning">{warningCount} warnings</span>
        <span className="doctor-count info">{infoCount} info</span>
        <span className="doctor-exit">Exit code {result.exitCode}</span>
        {hasExternalSpecializedPackDoctorFindings(result.findings) &&
        onOpenExternalSpecializedPackPreview ? (
          <Button
            type="button"
            variant="secondary"
            onClick={onOpenExternalSpecializedPackPreview}
          >
            Review external specialized pack
          </Button>
        ) : null}
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
        <EmptyState
          icon="check"
          title="No findings match these filters"
          description="Change severity or category to broaden the read-only result set."
          compact
        />
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
