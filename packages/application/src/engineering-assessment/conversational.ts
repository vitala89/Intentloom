import type { AssessmentReportModel } from "@intentloom/protocol";

export function explainAssessmentFinding(
  report: AssessmentReportModel,
  findingId: string,
): string {
  const finding = report.envelope.findingProjections?.find(
    (fp) => fp.id === findingId,
  );
  if (!finding) {
    return `Finding ${findingId} was not found in assessment envelope ${report.envelope.identity.id}.`;
  }
  const evidenceList = finding.evidenceReferences.join(", ");
  return `Finding ${finding.id} [${finding.severity.toUpperCase()}]: ${finding.impactSummary} (Category: ${finding.category}, Scope: ${finding.scope}, Rule: ${finding.ruleReference}, Evidence: ${evidenceList}).`;
}

export function explainAssessmentEvidence(
  report: AssessmentReportModel,
  evidenceId: string,
): string {
  const evidence = report.envelope.evidenceReferences.find(
    (ev) => ev.id === evidenceId,
  );
  if (!evidence) {
    return `Evidence ${evidenceId} was not found in assessment envelope ${report.envelope.identity.id}.`;
  }
  return `Evidence ${evidence.id} [${evidence.kind}/${evidence.status}]: ${evidence.description} (Source: ${evidence.sourceId}, Tool: ${evidence.toolName} v${evidence.toolVersion}).`;
}

export function compareTargetStateOptions(
  report: AssessmentReportModel,
): string {
  const options = report.envelope.targetStateOptions;
  if (!options || options.length === 0) {
    return "No target-state options available in current assessment report.";
  }
  return options
    .map(
      (opt) =>
        `Option [${opt.optionId}] ${opt.title} (${opt.recommendationLevel.toUpperCase()}, Complexity: ${opt.complexity}): ${opt.description} (Risks: ${opt.risks.join("; ")})`,
    )
    .join("\n");
}

export function explainRemediationRoadmap(
  report: AssessmentReportModel,
): string {
  const roadmap = report.envelope.remediationRoadmap;
  if (!roadmap) {
    return "No remediation roadmap available in current assessment report.";
  }
  const phaseSummaries = roadmap.phases
    .map(
      (phase) =>
        `Phase ${phase.phaseName}: ${phase.items.length > 0 ? phase.items.join(", ") : "None"}`,
    )
    .join(" | ");
  return `Remediation Roadmap for Target Option [${roadmap.targetStateOptionId}]: ${phaseSummaries}`;
}
