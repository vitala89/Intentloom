import { parseDocument } from "yaml";
import type {
  ExtensionLockfile,
  ExtensionUpdateCandidate,
  ExtensionUpdateDiscoveryReport,
} from "@intentloom/protocol";
import {
  discoverExtensionUpdatePlans,
  type InspectionEnvironment,
} from "@intentloom/validator";
import type { FileSystem } from "./propose-and-apply-extension-adoption.js";

export interface DiscoverExtensionUpdatesOptions {
  readonly root: string;
  readonly candidates: readonly ExtensionUpdateCandidate[];
  readonly lockfilePath?: string | undefined;
  readonly environment?: InspectionEnvironment | undefined;
}

export async function discoverExtensionUpdates(
  options: DiscoverExtensionUpdatesOptions,
  fs: FileSystem,
): Promise<ExtensionUpdateDiscoveryReport> {
  const lockfilePath =
    options.lockfilePath ?? `${options.root}/.aif/extension-lock.json`;
  const content = await fs.read(lockfilePath);
  const lockfile = parseDocument(content).toJS() as ExtensionLockfile;
  return discoverExtensionUpdatePlans(
    lockfile,
    options.candidates,
    options.environment,
  );
}

export * from "./apply-extension-update.js";
