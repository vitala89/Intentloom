import { Card } from "../design/components/layout/Card.js";
import { Button } from "../design/components/core/Button.js";
import { StatusChip } from "../design/components/status/StatusChip.js";
import type { FoundationDiscoveryTurnViewModel } from "./foundation-discovery-view-helpers.js";

export interface FoundationDiscoveryPanelProps {
  readonly discovery: FoundationDiscoveryTurnViewModel | null;
  readonly effort: "low" | "medium" | "high";
  readonly loading: boolean;
  readonly errorMessage: string | null;
  readonly onEffortChange: (effort: "low" | "medium" | "high") => void;
  readonly onRunDiscovery: () => void;
}

function agentStatusTone(
  status: string,
): "success" | "warning" | "error" | "neutral" {
  if (status === "completed") return "success";
  if (status === "cancelled") return "warning";
  if (status === "error" || status === "unsupported") return "error";
  return "neutral";
}

export function FoundationDiscoveryPanel({
  discovery,
  effort,
  loading,
  errorMessage,
  onEffortChange,
  onRunDiscovery,
}: FoundationDiscoveryPanelProps) {
  return (
    <Card variant="default">
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: "var(--space-4)",
          alignItems: "flex-start",
          marginBottom: "var(--space-4)",
        }}
      >
        <div>
          <h3>Neutron discovery</h3>
          <p style={{ color: "var(--text-secondary)" }}>
            Provider-neutral adaptive questions. Proposals require human review
            before recording answers.
          </p>
        </div>
        <StatusChip
          tone={discovery ? agentStatusTone(discovery.agentStatus) : "neutral"}
          label={discovery?.agentStatus ?? "idle"}
          size="sm"
        />
      </div>

      <div
        style={{
          display: "flex",
          gap: "var(--space-3)",
          alignItems: "center",
          flexWrap: "wrap",
          marginBottom: "var(--space-4)",
        }}
      >
        <label
          style={{
            display: "flex",
            gap: "var(--space-2)",
            alignItems: "center",
          }}
        >
          Effort
          <select
            value={effort}
            disabled={loading}
            onChange={(event) =>
              onEffortChange(event.target.value as "low" | "medium" | "high")
            }
          >
            <option value="low">low</option>
            <option value="medium">medium</option>
            <option value="high">high</option>
          </select>
        </label>
        <Button variant="primary" disabled={loading} onClick={onRunDiscovery}>
          {loading ? "Running discovery…" : "Run discovery turn"}
        </Button>
      </div>

      {errorMessage ? (
        <p role="alert" style={{ color: "var(--status-danger)" }}>
          {errorMessage}
        </p>
      ) : null}

      {discovery ? (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "var(--space-4)",
          }}
        >
          <div style={{ color: "var(--text-secondary)" }}>
            <div>
              Provider: {discovery.visibility.provider} (
              {discovery.visibility.adapterId})
            </div>
            <div>Model: {discovery.visibility.model}</div>
            <div>
              Network: {discovery.visibility.networkMode} | Credentials:{" "}
              {discovery.visibility.credentialSource} | Retention:{" "}
              {discovery.visibility.retention}
            </div>
            <div>
              Completeness:{" "}
              {discovery.completeness.isComplete ? "complete" : "incomplete"} (
              {discovery.completeness.remainingRequiredCount} required
              remaining)
            </div>
            <div>Workshop unchanged: yes</div>
          </div>

          {discovery.proposedQuestions.length > 0 ? (
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
              {discovery.proposedQuestions.map((question) => (
                <li key={question.id}>
                  <strong>{question.prompt}</strong>
                  <div style={{ color: "var(--text-secondary)" }}>
                    {question.required
                      ? "Required proposal"
                      : "Optional proposal"}{" "}
                    · {question.source} · {question.category}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p style={{ color: "var(--text-secondary)" }}>
              No additional adaptive questions proposed for this effort level.
            </p>
          )}
        </div>
      ) : null}
    </Card>
  );
}
