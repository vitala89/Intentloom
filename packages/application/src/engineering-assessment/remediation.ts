import type {
  AssessmentRemediationProposal,
  AssessmentReportModel,
} from "@intentloom/protocol";
import { validateAssessmentRemediationProposal } from "@intentloom/validator";

export function createRemediationProposal(
  report: AssessmentReportModel,
  findingId: string,
  targetOptionId = "opt-minimal",
): AssessmentRemediationProposal {
  const finding = report.envelope.findingProjections?.find(
    (fp) => fp.id === findingId,
  );

  if (!finding) {
    throw new Error(
      `Finding ${findingId} was not found in assessment envelope ${report.envelope.identity.id}.`,
    );
  }

  const affectedPaths = [finding.scope];
  const policyImpact = `Remediates ${finding.severity.toUpperCase()} finding ${finding.id} under rule ${finding.ruleReference}.`;
  const rollbackStrategy = `Revert changes to ${finding.scope} and rerun assessment verification.`;

  return validateAssessmentRemediationProposal({
    proposalId: `rem-prop-${finding.id}`,
    findingId: finding.id,
    targetOptionId,
    affectedPaths,
    policyImpact,
    rollbackStrategy,
    requiresApproval: true,
  });
}
