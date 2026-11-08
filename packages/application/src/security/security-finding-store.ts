import { relative } from "node:path";
import {
  validateSecurityFinding,
  type AcceptedSecurityRisk,
  type SecurityFinding,
  type SecurityFindingSeverity,
  type SecurityFindingState,
} from "@intentloom/protocol";
import { nodeFileSystem, type FileSystem } from "../host-file-system.js";
import { inside } from "../project-path.js";

export function securityFindingPath(root: string, id: string): string {
  return inside(root, `.aif/security/findings/${id}.json`);
}

export async function getSecurityFinding(
  id: string,
  options: { root: string },
  fs: FileSystem = nodeFileSystem,
): Promise<SecurityFinding | null> {
  const path = securityFindingPath(options.root, id);
  if (!(await fs.exists(path))) return null;
  try {
    const raw = JSON.parse(await fs.read(path));
    return validateSecurityFinding(raw);
  } catch {
    return null;
  }
}

export async function listSecurityFindings(
  options: {
    root: string;
    severity?: SecurityFindingSeverity;
    state?: SecurityFindingState;
  },
  fs: FileSystem = nodeFileSystem,
): Promise<readonly SecurityFinding[]> {
  const findings: SecurityFinding[] = [];
  for (const rawPath of await fs.list(options.root)) {
    const normalized = (
      rawPath.startsWith(options.root)
        ? relative(options.root, rawPath)
        : rawPath
    ).replaceAll("\\", "/");
    if (
      !normalized.startsWith(".aif/security/findings/") ||
      !normalized.endsWith(".json")
    )
      continue;
    const id = normalized
      .replace(/^\.aif\/security\/findings\//u, "")
      .replace(/\.json$/u, "");
    const finding = await getSecurityFinding(id, options, fs);
    if (finding) {
      if (
        (!options.severity || finding.severity === options.severity) &&
        (!options.state || finding.state === options.state)
      ) {
        findings.push(finding);
      }
    }
  }
  return findings.sort((a, b) => a.id.localeCompare(b.id));
}

export async function dismissSecurityFinding(
  id: string,
  options: { root: string; reason: string },
  fs: FileSystem = nodeFileSystem,
): Promise<SecurityFinding> {
  const existing = await getSecurityFinding(id, options, fs);
  if (!existing) {
    throw new Error(`security finding not found: ${id}`);
  }
  const now = new Date().toISOString();
  const updated = validateSecurityFinding({
    ...existing,
    state: "dismissed",
    dismissalReason: options.reason,
    updatedAt: now,
  });
  const path = securityFindingPath(options.root, id);
  await fs.write(path, `${JSON.stringify(updated, null, 2)}\n`);
  return updated;
}

export async function acceptSecurityRisk(
  id: string,
  options: {
    root: string;
    approvedBy: string;
    reason: string;
    expiresAt?: string;
  },
  fs: FileSystem = nodeFileSystem,
): Promise<SecurityFinding> {
  const existing = await getSecurityFinding(id, options, fs);
  if (!existing) {
    throw new Error(`security finding not found: ${id}`);
  }
  const now = new Date().toISOString();
  const acceptedRisk: AcceptedSecurityRisk = {
    approvedBy: options.approvedBy,
    reason: options.reason,
    approvedAt: now,
    ...(options.expiresAt ? { expiresAt: options.expiresAt } : {}),
  };
  const updated = validateSecurityFinding({
    ...existing,
    state: "accepted-risk",
    acceptedRisk,
    updatedAt: now,
  });
  const path = securityFindingPath(options.root, id);
  await fs.write(path, `${JSON.stringify(updated, null, 2)}\n`);
  return updated;
}
