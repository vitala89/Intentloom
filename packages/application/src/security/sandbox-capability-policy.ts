import { dirname } from "node:path";
import {
  validateSandboxCapabilityPolicy,
  type SandboxCapabilityPolicy,
} from "@intentloom/protocol";
import { nodeFileSystem, type FileSystem } from "../host-file-system.js";
import { inside } from "../project-path.js";

function sandboxCapabilityPolicyPath(root: string): string {
  return inside(root, ".aif/security/sandbox.json");
}

export async function getSandboxCapabilityPolicy(
  options: { root: string; projectId?: string },
  fs: FileSystem = nodeFileSystem,
): Promise<SandboxCapabilityPolicy> {
  const path = sandboxCapabilityPolicyPath(options.root);
  if (await fs.exists(path)) {
    try {
      const raw = JSON.parse(await fs.read(path));
      return validateSandboxCapabilityPolicy(raw);
    } catch {
      // fallback to default
    }
  }
  return validateSandboxCapabilityPolicy({
    schemaVersion: "1",
    projectId: options.projectId ?? "project-local",
    mode: "proposal-only",
    pathRules: [
      { pathPrefix: "src/", allowWrite: true, allowDelete: false },
      { pathPrefix: ".aif/", allowWrite: true, allowDelete: false },
    ],
    commandRules: [
      { commandPrefix: "pnpm test" },
      { commandPrefix: "pnpm lint" },
      { commandPrefix: "git diff" },
    ],
    allowNetwork: false,
    updatedAt: new Date().toISOString(),
  });
}

export async function writeSandboxCapabilityPolicy(
  policy: SandboxCapabilityPolicy,
  options: { root: string },
  fs: FileSystem = nodeFileSystem,
): Promise<SandboxCapabilityPolicy> {
  const validated = validateSandboxCapabilityPolicy(policy);
  const path = sandboxCapabilityPolicyPath(options.root);
  if (!(await fs.exists(dirname(path)))) {
    await fs.mkdir(dirname(path));
  }
  await fs.write(path, `${JSON.stringify(validated, null, 2)}\n`);
  return validated;
}
