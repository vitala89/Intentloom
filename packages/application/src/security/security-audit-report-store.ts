import { dirname } from "node:path";
import {
  validateContinuousSecurityAuditReport,
  type ContinuousSecurityAuditReport,
} from "@intentloom/protocol";
import { nodeFileSystem, type FileSystem } from "../host-file-system.js";
import { inside } from "../project-path.js";

function securityAuditReportPath(root: string): string {
  return inside(root, ".aif/security/audit-report.json");
}

export async function getSecurityAuditReport(
  options: { root: string },
  fs: FileSystem = nodeFileSystem,
): Promise<ContinuousSecurityAuditReport | null> {
  const path = securityAuditReportPath(options.root);
  if (!(await fs.exists(path))) return null;
  try {
    const raw = JSON.parse(await fs.read(path));
    return validateContinuousSecurityAuditReport(raw);
  } catch {
    return null;
  }
}

export async function writeSecurityAuditReport(
  report: ContinuousSecurityAuditReport,
  options: { root: string },
  fs: FileSystem = nodeFileSystem,
): Promise<void> {
  const path = securityAuditReportPath(options.root);
  if (!(await fs.exists(dirname(path)))) {
    await fs.mkdir(dirname(path));
  }
  await fs.write(path, `${JSON.stringify(report, null, 2)}\n`);
}
