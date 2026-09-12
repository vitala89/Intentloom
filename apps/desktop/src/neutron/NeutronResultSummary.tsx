import { StatusChip } from "../design/components/status/StatusChip.js";
import {
  modelProseClaimsSuccess,
  outcomeStatusLabel,
} from "./neutron-evidence-outcome.js";
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

export function NeutronResultSummary({
  evidence,
  responseText,
}: NeutronResultSummaryProps) {
  const proseClaimsSuccess = modelProseClaimsSuccess(responseText);
  const showProseMismatch =
    proseClaimsSuccess &&
    (evidence.outcome.accepted !== true ||
      evidence.outcome.kind === "stale" ||
      evidence.outcome.budgetExceeded);
  return (
    <section aria-label="Authoritative outcome">
      <h3 className="neutron-evidence-heading">Outcome</h3>
      <StatusChip
        label={outcomeStatusLabel(evidence.outcome)}
        tone={outcomeTone(evidence)}
      />
      {evidence.outcome.accepted === true ? (
        <p>Runtime accepted this result.</p>
      ) : evidence.outcome.accepted === false ? (
        <p role="status">Runtime did not accept this result.</p>
      ) : (
        <p>Acceptance applies after a completed graph or turn.</p>
      )}
      {evidence.outcome.partial ? (
        <p role="status">Graph outcome is partial (observational).</p>
      ) : null}
      {evidence.outcome.staleKinds.length > 0 ? (
        <p role="alert">
          Stale kinds: {evidence.outcome.staleKinds.join(", ")}. Rerun was not
          attempted.
        </p>
      ) : null}
      {showProseMismatch ? (
        <p role="note">
          Model response text is shown separately and does not set runtime
          status.
        </p>
      ) : null}
    </section>
  );
}
