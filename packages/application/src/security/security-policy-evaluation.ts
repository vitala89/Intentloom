import {
  validateSecurityBaselineCheckResult,
  type SecurityBaselineCheckResult,
  type SecurityFinding,
} from "@intentloom/protocol";
import { nodeFileSystem, type FileSystem } from "../host-file-system.js";
import { getSecurityBaseline } from "./security-baseline.js";
import { listSecurityFindings } from "./security-finding-store.js";
import { getSecurityPolicy } from "./security-policy.js";

export async function checkSecurityPolicyAndBaseline(
  options: { root: string; projectId: string },
  fs: FileSystem = nodeFileSystem,
): Promise<SecurityBaselineCheckResult> {
  const policy = await getSecurityPolicy(options, fs);
  const baseline = await getSecurityBaseline(options, fs);
  const currentFindings = await listSecurityFindings(
    { root: options.root },
    fs,
  );

  const baselineMap = new Map<string, SecurityFinding>();
  if (baseline) {
    for (const f of baseline.acceptedFindings) {
      baselineMap.set(f.id, f);
    }
  }

  const currentMap = new Map<string, SecurityFinding>();
  for (const f of currentFindings) {
    currentMap.set(f.id, f);
  }

  const newFindings: SecurityFinding[] = [];
  const resolvedFindings: SecurityFinding[] = [];
  const policyViolations: SecurityFinding[] = [];

  for (const f of currentFindings) {
    if (!baselineMap.has(f.id)) {
      newFindings.push(f);
    }
  }

  if (baseline) {
    for (const f of baseline.acceptedFindings) {
      if (!currentMap.has(f.id)) {
        resolvedFindings.push(f);
      }
    }
  }

  let hasFailViolation = false;
  for (const f of currentFindings) {
    if (
      f.state === "dismissed" ||
      f.state === "accepted-risk" ||
      f.state === "remediated"
    ) {
      continue;
    }

    let ruleEnforcement = policy.defaultEnforcement;
    const matchedRule = policy.rules.find(
      (r) =>
        r.target === f.ruleId ||
        r.target === f.category ||
        r.target === f.severity,
    );
    if (matchedRule) {
      ruleEnforcement = matchedRule.enforcement;
    }

    if (
      ruleEnforcement === "fail" ||
      (ruleEnforcement === "warn" && f.severity === "critical")
    ) {
      policyViolations.push(f);
      if (ruleEnforcement === "fail") {
        hasFailViolation = true;
      }
    }
  }

  return validateSecurityBaselineCheckResult({
    schemaVersion: "1",
    projectId: options.projectId,
    newFindings,
    resolvedFindings,
    policyViolations,
    exitCode: hasFailViolation ? 3 : 0,
    checkedAt: new Date().toISOString(),
  });
}
