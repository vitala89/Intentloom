import { createHash } from "node:crypto";
import {
  validateContinuousSecurityAuditReport,
  type ContinuousSecurityAuditReport,
} from "@intentloom/protocol";
import { nodeFileSystem, type FileSystem } from "../host-file-system.js";
import { getSandboxCapabilityPolicy } from "./sandbox-capability-policy.js";
import { buildSecurityInvariantChecks } from "./security-audit-invariants.js";
import { writeSecurityAuditReport } from "./security-audit-report-store.js";
import { getSecurityBaseline } from "./security-baseline.js";
import { checkSecurityPolicyAndBaseline } from "./security-policy-evaluation.js";
import { getSecurityPolicy } from "./security-policy.js";

export async function runContinuousSecurityAudit(
  options: { root: string; projectId: string },
  fs: FileSystem = nodeFileSystem,
): Promise<ContinuousSecurityAuditReport> {
  const policy = await getSecurityPolicy(options, fs);
  const baseline = await getSecurityBaseline(options, fs);
  const sandbox = await getSandboxCapabilityPolicy(options, fs);
  const baselineCheck = await checkSecurityPolicyAndBaseline(options, fs);
  const checks = buildSecurityInvariantChecks({
    allowNetwork: sandbox.allowNetwork,
    policyViolationCount: baselineCheck.policyViolations.length,
    defaultEnforcement: policy.defaultEnforcement,
    baselinePresent: baseline !== null,
    sandboxMode: sandbox.mode,
    pathRuleCount: sandbox.pathRules.length,
  });
  const passedCount = checks.filter(
    (check) => check.status === "passed",
  ).length;
  const healthScore = Math.round((passedCount / checks.length) * 100);
  const now = new Date().toISOString();
  const sorted = [...checks].sort((a, b) => a.invariantId - b.invariantId);
  const rawData = JSON.stringify(sorted);
  const auditHash = createHash("sha256").update(rawData).digest("hex");
  const report = validateContinuousSecurityAuditReport({
    schemaVersion: "1",
    projectId: options.projectId,
    healthScore,
    invariantChecks: sorted,
    auditHash,
    auditedAt: now,
  });
  await writeSecurityAuditReport(report, options, fs);
  return report;
}
