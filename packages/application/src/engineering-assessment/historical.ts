import type {
  AssessmentHistoricalComparison,
  AssessmentReportModel,
} from "@intentloom/protocol";
import { validateAssessmentHistoricalComparison } from "@intentloom/validator";

export function compareAssessmentReports(
  previousReport: AssessmentReportModel,
  currentReport: AssessmentReportModel,
): AssessmentHistoricalComparison {
  const isCompatible =
    previousReport.schemaVersion === currentReport.schemaVersion &&
    previousReport.envelope.scope.projectId ===
      currentReport.envelope.scope.projectId;

  const prevFindings = previousReport.envelope.findingReferences;
  const currFindings = currentReport.envelope.findingReferences;

  const prevSet = new Set(prevFindings);
  const currSet = new Set(currFindings);

  const newFindingIds = currFindings.filter((id) => !prevSet.has(id));
  const fixedFindingIds = prevFindings.filter((id) => !currSet.has(id));
  const unchangedFindingIds = currFindings.filter((id) => prevSet.has(id));

  const technicalDebtItemDelta =
    currentReport.technicalDebtMap.items.length -
    previousReport.technicalDebtMap.items.length;

  const prevViolations =
    previousReport.envelope.architectureResult?.dependencyEdges.filter(
      (e) => e.isBoundaryViolation,
    ).length ?? 0;
  const currViolations =
    currentReport.envelope.architectureResult?.dependencyEdges.filter(
      (e) => e.isBoundaryViolation,
    ).length ?? 0;
  const architectureDriftDelta = currViolations - prevViolations;

  return validateAssessmentHistoricalComparison({
    previousId: previousReport.envelope.identity.id,
    currentId: currentReport.envelope.identity.id,
    isCompatible,
    newFindingIds,
    fixedFindingIds,
    unchangedFindingIds,
    technicalDebtItemDelta,
    architectureDriftDelta,
  });
}
