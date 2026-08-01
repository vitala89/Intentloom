import { useState } from "react";
import type {
  ProjectTimelineEvent,
  ProjectTimelineResult,
} from "@intentloom/protocol";
import { StatusChip } from "../design/components/status/StatusChip.js";
import { EmptyState } from "../design/components/states/EmptyState.js";
import { Button } from "../design/components/core/Button.js";

export type TimelineStatus =
  | "idle"
  | "loading"
  | "ready"
  | "stale"
  | "invalid-root"
  | "disconnected"
  | "protocol-mismatch"
  | "error"
  | "empty";

export interface TimelineViewProps {
  root: string | null;
  result: ProjectTimelineResult | null;
  status: TimelineStatus;
  errorMessage: string | null;
  onSelectProject: () => void;
  onLoadTimeline: () => void;
}

function timelineEventKey(event: ProjectTimelineEvent, index: number) {
  return `${event.commitId}:${index}`;
}

function formatTimestamp(ts: number): string {
  if (ts <= 0) return "Unknown";
  try {
    return new Date(ts * 1000).toISOString().replace("T", " ").slice(0, 19);
  } catch {
    return String(ts);
  }
}

export function TimelineView({
  root,
  result,
  status,
  errorMessage,
  onSelectProject,
  onLoadTimeline,
}: TimelineViewProps) {
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
      <EmptyState
        icon="circle-dashed"
        title={copy.title}
        description={copy.description}
        action={
          <Button
            variant="primary"
            onClick={
              status === "stale" || status === "invalid-root"
                ? onSelectProject
                : onLoadTimeline
            }
            disabled={status === "loading"}
          >
            {copy.action}
          </Button>
        }
      />
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
        <StatusChip tone="info" label="Read-only" size="sm" />
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
        <EmptyState
          icon="inbox"
          title="No events in this bounded result window"
          description="Select a wider caseId or check daemon evidence availability."
          compact
        />
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
