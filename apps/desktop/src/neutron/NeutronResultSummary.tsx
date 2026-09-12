import { StatusChip } from "../design/components/status/StatusChip.js";
import { outcomeStatusLabel } from "./neutron-evidence-outcome.js";
import type { NeutronEvidenceProjection } from "./neutron-evidence-projection.js";

export interface NeutronResultSummaryProps {
  readonly evidence: NeutronEvidenceProjection;
  readonly responseText: string | null;
}

function outcomeTone(
  evidence: NeutronEvidenceProjection,
): "success" | "warning" | "error" | "neutral" {
  const { outcome } = evidence;
  if (outcome.kind === "stale" || outcome.accepted === false) return "warning";
  if (
    outcome.kind === "failed" ||
    outcome.kind === "session-failed" ||
    outcome.kind === "timed-out" ||
    outcome.kind === "session-timed-out"
  ) {
    return "error";
  }
  if (outcome.kind === "cancelled" || outcome.kind === "session-cancelled") {
    return "neutral";
  }
  if (outcome.accepted === true) return "success";
  return "neutral";
}

function acceptanceCopy(outcome: NeutronEvidenceProjection["outcome"]): string {
  if (outcome.accepted === true) {
    return "Runtime accepted this result.";
  }
  if (outcome.accepted === false) {
    return "Runtime did not accept this result.";
  }
  if (outcome.kind === "session-completed") {
    return "Runtime acceptance is unavailable for this session-only turn.";
  }
  return "Runtime acceptance requires a canonical graph result.";
}

export function NeutronResultSummary({
  evidence,
  responseText,
}: NeutronResultSummaryProps) {
  return (
    <section aria-label="Authoritative outcome">
      <h3 className="neutron-evidence-heading">Outcome</h3>
      <StatusChip
        label={outcomeStatusLabel(evidence.outcome)}
        tone={outcomeTone(evidence)}
      />
      <p role="status">{acceptanceCopy(evidence.outcome)}</p>
      {evidence.outcome.partial ? (
        <p role="status">Graph outcome is partial (observational).</p>
      ) : null}
      {evidence.outcome.staleKinds.length > 0 ? (
        <p role="alert">
          Stale kinds: {evidence.outcome.staleKinds.join(", ")}. Rerun was not
          attempted.
        </p>
      ) : null}
      {responseText !== null && responseText.trim().length > 0 ? (
        <p role="note">
          Model response text is shown separately and does not set runtime
          status, acceptance, or mutation evidence.
        </p>
      ) : null}
    </section>
  );
}
