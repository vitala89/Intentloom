import { dirname } from "node:path";
import {
  validateSecurityPolicy,
  type SecurityPolicy,
} from "@intentloom/protocol";
import { nodeFileSystem, type FileSystem } from "../host-file-system.js";
import { inside } from "../project-path.js";

function securityPolicyPath(root: string): string {
  return inside(root, ".aif/security/policy.json");
}

export async function getSecurityPolicy(
  options: { root: string; projectId?: string },
  fs: FileSystem = nodeFileSystem,
): Promise<SecurityPolicy> {
  const path = securityPolicyPath(options.root);
  if (await fs.exists(path)) {
    try {
      const raw = JSON.parse(await fs.read(path));
      return validateSecurityPolicy(raw);
    } catch {
      // fallback to default
    }
  }
  return validateSecurityPolicy({
    schemaVersion: "1",
    projectId: options.projectId ?? "project-local",
    defaultEnforcement: "warn",
    rules: [
      { target: "critical", enforcement: "fail" },
      { target: "high", enforcement: "fail" },
      { target: "medium", enforcement: "warn" },
      { target: "low", enforcement: "ignore" },
    ],
    updatedAt: new Date().toISOString(),
  });
}

export async function writeSecurityPolicy(
  policy: SecurityPolicy,
  options: { root: string },
  fs: FileSystem = nodeFileSystem,
): Promise<SecurityPolicy> {
  const validated = validateSecurityPolicy(policy);
  const path = securityPolicyPath(options.root);
  if (!(await fs.exists(dirname(path)))) {
    await fs.mkdir(dirname(path));
  }
  await fs.write(path, `${JSON.stringify(validated, null, 2)}\n`);
  return validated;
}
