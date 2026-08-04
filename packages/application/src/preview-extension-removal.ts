import { parseDocument } from "yaml";
import type {
  ExtensionLockfile,
  ExtensionRemovalConfigurationChange,
  ExtensionRemovalFileTarget,
  ExtensionRemovalPlan,
} from "@intentloom/protocol";
import type { FileSystem } from "./propose-and-apply-extension-adoption.js";
import { prepareRemovalFiles } from "./extension-removal-files.js";

export interface PreviewExtensionRemovalOptions {
  readonly root: string;
  readonly extensionId: string;
  readonly lockfilePath?: string | undefined;
  readonly filesToRemove?: readonly ExtensionRemovalFileTarget[] | undefined;
  readonly configurationChanges?:
    readonly ExtensionRemovalConfigurationChange[] | undefined;
  readonly processesToStop?: readonly string[] | undefined;
  readonly projectOwnedPaths?: readonly string[] | undefined;
  readonly retainedPaths?: readonly string[] | undefined;
  readonly noticePaths?: readonly string[] | undefined;
}

function rejectedPlan(
  options: PreviewExtensionRemovalOptions,
  lockfilePath: string,
  diagnostic: string,
  currentLockEntry?: ExtensionRemovalPlan["currentLockEntry"],
): ExtensionRemovalPlan {
  return {
    status: "rejected",
    extensionId: options.extensionId,
    lockfilePath,
    ...(currentLockEntry ? { currentLockEntry } : {}),
    filesToRemove: options.filesToRemove ?? [],
    configurationChanges: options.configurationChanges ?? [],
    processesToStop: options.processesToStop ?? [],
    projectOwnedPaths: options.projectOwnedPaths ?? [],
    retainedPaths: options.retainedPaths ?? [],
    noticePaths: options.noticePaths ?? [],
    requiresApproval: true,
    diagnostics: [diagnostic],
  };
}

function validatePreviewInputs(
  options: PreviewExtensionRemovalOptions,
): string | undefined {
  const files = options.filesToRemove ?? [];
  const changes = options.configurationChanges ?? [];
  const targets = [
    ...files.map((file) => file.path),
    ...changes.map((file) => file.path),
  ];
  if (new Set(targets).size !== targets.length)
    return "removal-targets-not-unique";
  if (targets.includes(".aif/extension-lock.json"))
    return "removal-targets-extension-lockfile";
  const retained = new Set(options.retainedPaths ?? []);
  for (const noticePath of options.noticePaths ?? []) {
    if (!retained.has(noticePath))
      return `removal-notice-not-retained:${noticePath}`;
  }
  const projectOwned = new Set(options.projectOwnedPaths ?? []);
  for (const target of targets)
    if (projectOwned.has(target))
      return `removal-targets-project-owned:${target}`;
  return undefined;
}

export async function previewExtensionRemoval(
  options: PreviewExtensionRemovalOptions,
  fs: FileSystem,
): Promise<ExtensionRemovalPlan> {
  const lockfilePath =
    options.lockfilePath ?? `${options.root}/.aif/extension-lock.json`;
  const inputError = validatePreviewInputs(options);
  if (inputError) return rejectedPlan(options, lockfilePath, inputError);

  let lockfile: ExtensionLockfile;
  try {
    lockfile = parseDocument(
      await fs.read(lockfilePath),
    ).toJS() as ExtensionLockfile;
    if (!lockfile?.extensions) throw new Error("lockfile-structure-invalid");
  } catch {
    return rejectedPlan(
      options,
      lockfilePath,
      `extension-removal-lock-unreadable:${options.extensionId}`,
    );
  }
  const currentLockEntry = lockfile.extensions[options.extensionId];
  if (!currentLockEntry)
    return rejectedPlan(
      options,
      lockfilePath,
      `extension-removal-not-installed:${options.extensionId}`,
    );
  try {
    await prepareRemovalFiles(
      options.root,
      options.filesToRemove ?? [],
      options.configurationChanges ?? [],
      fs,
    );
  } catch (error) {
    return rejectedPlan(
      options,
      lockfilePath,
      error instanceof Error ? error.message : String(error),
      currentLockEntry,
    );
  }
  return {
    status: "requires-approval",
    extensionId: options.extensionId,
    lockfilePath,
    currentLockEntry,
    filesToRemove: options.filesToRemove ?? [],
    configurationChanges: options.configurationChanges ?? [],
    processesToStop: [...new Set(options.processesToStop ?? [])].sort(),
    projectOwnedPaths: [...new Set(options.projectOwnedPaths ?? [])].sort(),
    retainedPaths: [...new Set(options.retainedPaths ?? [])].sort(),
    noticePaths: [...new Set(options.noticePaths ?? [])].sort(),
    requiresApproval: true,
    diagnostics: [],
  };
}
