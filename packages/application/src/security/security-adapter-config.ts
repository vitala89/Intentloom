import {
  validateSecurityFinding,
  type SecurityFinding,
} from "@intentloom/protocol";
import type { FileSystem } from "../host-file-system.js";

export async function scanConfigCategory(
  root: string,
  now: string,
  nextFindingId: () => string,
  fs: FileSystem,
): Promise<SecurityFinding[]> {
  const rawFindings: SecurityFinding[] = [];
  const files = await fs.list(root);
  const hasAif = files.some((f) => f.includes(".aif/"));
  const hasPolicy = files.some((f) => f.includes(".aif/policy"));
  if (hasAif && !hasPolicy) {
    rawFindings.push(
      validateSecurityFinding({
        schemaVersion: "1",
        id: nextFindingId(),
        ruleId: "config/missing-security-policy",
        title: "No explicit security policy declared in .aif/",
        severity: "low",
        state: "open",
        category: "config",
        description:
          "Project .aif directory exists without an explicit security policy",
        scanner: "built-in:config-adapter",
        evidence: [{ path: ".aif" }],
        trustClass: "verified-evidence",
        createdAt: now,
        updatedAt: now,
      }),
    );
  }
  return rawFindings;
}
