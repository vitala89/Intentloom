import type { AdoptionPlan } from "@intentloom/core/adoption";

export function formatGovernanceAdoptionPlan(plan: AdoptionPlan): string {
  const lines: string[] = [
    `Adoption Plan: ${plan.packId} (v${plan.packVersion})`,
    `Project ID: ${plan.projectId}`,
    `Repository Hash: ${plan.repositoryHash}`,
    `Automatic Apply Allowed: ${plan.automaticApplyAllowed ? "yes" : "no"}`,
    "",
    "Role Mappings:",
  ];
  if (plan.mappings.length === 0) {
    lines.push("  (none)");
  } else {
    for (const mapping of plan.mappings) {
      lines.push(
        `  ${mapping.role.padEnd(30)} -> ${mapping.path} (${mapping.ownership})`,
      );
    }
  }
  lines.push("", "Findings:");
  if (plan.findings.length === 0) {
    lines.push("  (none)");
  } else {
    for (const finding of plan.findings) {
      lines.push(
        `  [${finding.status}] ${finding.code}: ${finding.summary} (${finding.paths.join(", ")})`,
      );
    }
  }
  lines.push("", "Operations:");
  if (plan.operations.length === 0) {
    lines.push("  (none)");
  } else {
    for (const op of plan.operations) {
      const target = op.path ?? op.role ?? "workspace";
      lines.push(`  [${op.kind}] ${target} (${op.approval}) — ${op.reason}`);
    }
  }
  return lines.join("\n");
}
