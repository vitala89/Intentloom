import {
  validateSecurityCoverageReport,
  type SecurityCoverageReport,
  type SecurityFindingSeverity,
  type SecurityFindingState,
} from "@intentloom/protocol";
import { nodeFileSystem, type FileSystem } from "../host-file-system.js";
import { listSecurityFindings } from "./security-finding-store.js";

export async function getSecurityCoverageReport(
  options: { root: string; projectId: string },
  fs: FileSystem = nodeFileSystem,
): Promise<SecurityCoverageReport> {
  const findings = await listSecurityFindings({ root: options.root }, fs);

  const findingsBySeverity: Record<SecurityFindingSeverity, number> = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    info: 0,
  };
  const findingsByState: Record<SecurityFindingState, number> = {
    open: 0,
    verified: 0,
    dismissed: 0,
    "accepted-risk": 0,
    remediated: 0,
  };

  const scannerSet = new Set<string>();

  for (const f of findings) {
    findingsBySeverity[f.severity] = (findingsBySeverity[f.severity] ?? 0) + 1;
    findingsByState[f.state] = (findingsByState[f.state] ?? 0) + 1;
    if (f.scanner) scannerSet.add(f.scanner);
  }

  return validateSecurityCoverageReport({
    schemaVersion: "1",
    projectId: options.projectId,
    totalFindings: findings.length,
    findingsBySeverity,
    findingsByState,
    scanners: [...scannerSet].sort(),
    reportedAt: new Date().toISOString(),
  });
}
