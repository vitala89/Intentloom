import { Card } from "../design/components/layout/Card.js";
import { Button } from "../design/components/core/Button.js";
import { StatusChip } from "../design/components/status/StatusChip.js";
import type { FoundationWorkshopProgress } from "./foundation-workshop-view-helpers.js";
import { foundationReadinessTone } from "./foundation-workshop-view-helpers.js";

export interface FoundationWorkshopProgressPanelProps {
  readonly progress: FoundationWorkshopProgress;
  readonly onDelete: () => void;
  readonly onStartNew: () => void;
}

export function FoundationWorkshopProgressPanel({
  progress,
  onDelete,
  onStartNew,
}: FoundationWorkshopProgressPanelProps) {
  const tone = foundationReadinessTone(progress.readinessStatus);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-5)",
      }}
    >
      <Card variant="raised">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: "var(--space-4)",
            alignItems: "flex-start",
          }}
        >
          <div>
            <span className="hero-kicker">Foundation workshop</span>
            <h2 style={{ marginTop: "var(--space-2)" }}>{progress.idea}</h2>
            <p style={{ color: "var(--text-secondary)" }}>
              Target root: <code>{progress.root}</code>
            </p>
          </div>
          <div style={{ display: "flex", gap: "var(--space-2)" }}>
            <StatusChip
              tone={tone}
              label={progress.readinessStatus}
              size="sm"
            />
            <StatusChip tone="neutral" label={progress.status} size="sm" />
          </div>
        </div>
        <p style={{ marginTop: "var(--space-4)" }}>
          {progress.answeredQuestions} of {progress.totalQuestions} questions
          answered ({progress.progressPercent}%)
        </p>
        <p style={{ color: "var(--text-secondary)" }}>
          Conflicts: {progress.conflictCount} | Findings:{" "}
          {progress.blockingFindings} blocking, {progress.warningFindings}{" "}
          warning
        </p>
      </Card>

      <Card variant="default">
        <h3 style={{ marginBottom: "var(--space-4)" }}>Discovery questions</h3>
        <ul
          style={{
            listStyle: "none",
            margin: 0,
            padding: 0,
            display: "flex",
            flexDirection: "column",
            gap: "var(--space-3)",
          }}
        >
          {progress.questions.map((question) => (
            <li key={question.id}>
              <strong>{question.prompt}</strong>
              <div style={{ color: "var(--text-secondary)" }}>
                {question.answered
                  ? `${question.answerValue} (${question.confidence})`
                  : question.required
                    ? "Required — pending"
                    : "Optional — pending"}
              </div>
            </li>
          ))}
        </ul>
      </Card>

      {progress.readinessFindings.length > 0 ? (
        <Card variant="default">
          <h3 style={{ marginBottom: "var(--space-4)" }}>Readiness findings</h3>
          <ul
            style={{
              listStyle: "none",
              margin: 0,
              padding: 0,
              display: "flex",
              flexDirection: "column",
              gap: "var(--space-3)",
            }}
          >
            {progress.readinessFindings.map((finding) => (
              <li key={finding.id}>
                <strong>
                  [{finding.severity}] {finding.ruleGroup}
                </strong>
                <div style={{ color: "var(--text-secondary)" }}>
                  {finding.message}
                  {finding.resolved ? " (resolved)" : ""}
                </div>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      <div style={{ display: "flex", gap: "var(--space-3)" }}>
        <Button variant="secondary" onClick={onDelete}>
          Delete workshop
        </Button>
        <Button variant="secondary" onClick={onStartNew}>
          Start new workshop
        </Button>
      </div>
    </div>
  );
}
