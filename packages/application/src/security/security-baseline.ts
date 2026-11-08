import { createHash } from "node:crypto";
import { dirname } from "node:path";
import {
  validateSecurityBaseline,
  type SecurityBaseline,
} from "@intentloom/protocol";
import { nodeFileSystem, type FileSystem } from "../host-file-system.js";
import { inside } from "../project-path.js";
import { listSecurityFindings } from "./security-finding-store.js";

function securityBaselinePath(root: string): string {
  return inside(root, ".aif/security/baseline.json");
}

export async function getSecurityBaseline(
  options: { root: string },
  fs: FileSystem = nodeFileSystem,
): Promise<SecurityBaseline | null> {
  const path = securityBaselinePath(options.root);
  if (!(await fs.exists(path))) return null;
  try {
    const raw = JSON.parse(await fs.read(path));
    return validateSecurityBaseline(raw);
  } catch {
    return null;
  }
}

export async function updateSecurityBaseline(
  options: { root: string; projectId: string },
  fs: FileSystem = nodeFileSystem,
): Promise<SecurityBaseline> {
  const findings = await listSecurityFindings({ root: options.root }, fs);
  const now = new Date().toISOString();
  const sorted = [...findings].sort((a, b) => a.id.localeCompare(b.id));
  const rawData = JSON.stringify(sorted);
  const baselineHash = createHash("sha256").update(rawData).digest("hex");

  const baseline = validateSecurityBaseline({
    schemaVersion: "1",
    projectId: options.projectId,
    acceptedFindings: sorted,
    baselineHash,
    createdAt: now,
    updatedAt: now,
  });

  const path = securityBaselinePath(options.root);
  if (!(await fs.exists(dirname(path)))) {
    await fs.mkdir(dirname(path));
  }
  await fs.write(path, `${JSON.stringify(baseline, null, 2)}\n`);
  return baseline;
}
