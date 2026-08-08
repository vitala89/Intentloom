import type {
  ApprovedApplyRequest,
  ApprovedApplyResult,
} from "@intentloom/protocol";
import {
  validateApprovedApplyRequest,
  validateApprovedApplyResult,
} from "@intentloom/validator";

export function evaluateApprovedApplyPlan(
  request: ApprovedApplyRequest,
  options: {
    readonly now?: () => number;
    readonly currentProjectStateDigest?: string;
  } = {},
): ApprovedApplyResult {
  const validated = validateApprovedApplyRequest(request);
  const currentTime = options.now?.() ?? Date.now();
  const diagnostics: string[] = [];

  // Check expiration
  if (
    validated.plan.expiresAt !== undefined &&
    currentTime > validated.plan.expiresAt
  ) {
    diagnostics.push(
      `approved-apply-plan-expired:${validated.plan.planDigest}`,
    );
  }

  // Check state digest divergence
  if (
    options.currentProjectStateDigest !== undefined &&
    options.currentProjectStateDigest !== validated.plan.projectStateDigest
  ) {
    diagnostics.push(
      `project-state-diverged:expected=${validated.plan.projectStateDigest}:actual=${options.currentProjectStateDigest}`,
    );
  }

  // Check required approvals for mutation
  // Explicitly require atomic-commit-approval to perform an apply
  if (!validated.grantedApprovals.includes("atomic-commit-approval")) {
    diagnostics.push("missing-required-approval:atomic-commit-approval");
  }

  const passed = diagnostics.length === 0;

  return validateApprovedApplyResult({
    schemaVersion: 1,
    targetResourceId: validated.targetResourceId,
    passed,
    diagnostics,
    safeNextAction: passed
      ? `grant requested action for ${validated.targetResourceId}`
      : "fail closed: obtain required capability grants or refresh plan",
  });
}
