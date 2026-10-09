import type { NeutronSessionViewmodel } from "@intentloom/protocol";
import {
  authoritativeNeutronOutcome,
  modelProseClaimsSuccess,
  outcomeStatusLabel,
} from "./neutron-evidence-outcome.js";
import { projectNeutronEvidence } from "./neutron-evidence-projection.js";

function acceptanceLine(
  outcome: NonNullable<ReturnType<typeof authoritativeNeutronOutcome>>,
): string {
  if (outcome.accepted === true) return "Runtime accepted this result.";
  if (outcome.accepted === false) {
    return "Runtime did not accept this result.";
  }
  if (outcome.kind === "session-completed") {
    return "Runtime acceptance is unavailable for this session-only turn.";
  }
  return "Runtime acceptance requires a canonical graph result.";
}

export function evidencePanelLines(
  viewmodel: NeutronSessionViewmodel,
): string[] {
  const evidence = projectNeutronEvidence(viewmodel);
  if (evidence === null) return [];
  const lines = [
    outcomeStatusLabel(evidence.outcome),
    acceptanceLine(evidence.outcome),
    `Mutation attempted: false`,
    ...evidence.warnings,
  ];
  if (modelProseClaimsSuccess(viewmodel.responseText)) {
    lines.push("model-prose-claims-success");
  }
  if (
    modelProseClaimsSuccess(viewmodel.responseText) &&
    evidence.outcome.accepted !== true
  ) {
    lines.push("model-prose-ignored-for-status");
  }
  return lines;
}
