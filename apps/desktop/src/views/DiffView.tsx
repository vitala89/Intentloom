import { useState } from "react";
import type {
  ProjectDiffChange,
  ProjectDiffResult,
} from "@intentloom/protocol";
import type { InspectStatus } from "./InspectView.js";
import { StatusChip } from "../design/components/status/StatusChip.js";
import { EmptyState } from "../design/components/states/EmptyState.js";
import { Button } from "../design/components/core/Button.js";

export interface DiffViewProps {
  root: string | null;
  result: ProjectDiffResult | null;
  status: InspectStatus;
  errorMessage: string | null;
  onSelectProject: () => void;
  onLoadDiff: () => void;
}

function diffChangeKey(change: ProjectDiffChange, index: number) {
  return `${change.kind}:${change.path}:${index}`;
}

export function DiffView({
  root,
  result,
  status,
  errorMessage,
  onSelectProject,
  onLoadDiff,
}: DiffViewProps) {
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
      <EmptyState
        icon="scan-search"
        title={copy.title}
        description={copy.description}
        action={
          <Button
            variant="primary"
            onClick={
              status === "stale" || status === "invalid-root"
                ? onSelectProject
                : onLoadDiff
            }
            disabled={status === "loading"}
          >
            {copy.action}
          </Button>
        }
      />
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
        <StatusChip tone="info" label="Review-only" size="sm" />
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
        <EmptyState
          icon="file"
          title={
            result.changes.length === 0
              ? "No changes in this preview"
              : "No changes match this filter"
          }
          description={
            result.changes.length === 0
              ? "The local project is unchanged for the selected profile."
              : "Choose another change type to broaden the review."
          }
          compact
        />
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
