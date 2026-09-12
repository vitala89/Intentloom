import type { NeutronSessionViewmodel } from "@intentloom/protocol";
import {
  modelProseClaimsSuccess,
  outcomeStatusLabel,
} from "./neutron-evidence-outcome.js";
import { projectNeutronEvidence } from "./neutron-evidence-projection.js";

export function evidencePanelLines(
  viewmodel: NeutronSessionViewmodel,
): string[] {
  const evidence = projectNeutronEvidence(viewmodel);
  if (evidence === null) return [];
  const lines = [
    outcomeStatusLabel(evidence.outcome),
    evidence.outcome.accepted === true
      ? "Runtime accepted this result."
      : evidence.outcome.accepted === false
        ? "Runtime did not accept this result."
        : "Acceptance applies after a completed graph or turn.",
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
