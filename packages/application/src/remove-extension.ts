import { dirname } from "node:path";
import { parseDocument } from "yaml";
import type {
  ExtensionLockfile,
  ExtensionRemovalApplicationResult,
  ExtensionRemovalApproval,
  ExtensionRemovalPlan,
} from "@intentloom/protocol";
import type { FileSystem } from "./propose-and-apply-extension-adoption.js";
import { extensionLockEntryFingerprint } from "./extension-update-files.js";
import {
  applyRemovalFiles,
  prepareRemovalFiles,
  restoreExtensionUpdateSnapshots,
  type PreparedRemovalFiles,
} from "./extension-removal-files.js";

export interface ExtensionRemovalRuntime {
  stop(plan: ExtensionRemovalPlan): Promise<void>;
  remove(plan: ExtensionRemovalPlan): Promise<void>;
  rollback(plan: ExtensionRemovalPlan): Promise<void>;
}

export interface RemoveExtensionOptions {
  readonly root: string;
  readonly plan: ExtensionRemovalPlan;
  readonly approval?: ExtensionRemovalApproval | undefined;
  readonly lockfilePath?: string | undefined;
}
export { previewExtensionRemoval } from "./preview-extension-removal.js";
export type { PreviewExtensionRemovalOptions } from "./preview-extension-removal.js";

function approvalDiagnostic(
  options: RemoveExtensionOptions,
): string | undefined {
  if (options.plan.status === "rejected")
    return `cannot-remove-rejected-extension:${options.plan.extensionId}`;
  if (!options.approval)
    return `extension-removal-approval-required:${options.plan.extensionId}`;
  if (
    options.approval.approvedBy.trim() === "" ||
    options.approval.approvedAt.trim() === ""
  )
    return `extension-removal-approval-invalid:${options.plan.extensionId}`;
  return undefined;
}

interface PreparedRemoval {
  readonly lockfilePath: string;
  readonly lockfileContent: string;
  readonly lockfile: ExtensionLockfile;
  readonly files: PreparedRemovalFiles;
}

async function prepareRemoval(
  options: RemoveExtensionOptions,
  fs: FileSystem,
): Promise<PreparedRemoval | ExtensionRemovalApplicationResult> {
  const diagnostic = approvalDiagnostic(options);
  if (diagnostic) return unchanged(diagnostic);
  const lockfilePath = options.lockfilePath ?? options.plan.lockfilePath;
  let lockfileContent: string;
  let lockfile: ExtensionLockfile;
  try {
    lockfileContent = await fs.read(lockfilePath);
    lockfile = parseDocument(lockfileContent).toJS() as ExtensionLockfile;
    if (!lockfile?.extensions) throw new Error("lockfile-structure-invalid");
  } catch {
    return unchanged(
      `extension-removal-lock-unreadable:${options.plan.extensionId}`,
    );
  }
  const current = lockfile.extensions[options.plan.extensionId];
  if (
    !current ||
    !options.plan.currentLockEntry ||
    extensionLockEntryFingerprint(current) !==
      extensionLockEntryFingerprint(options.plan.currentLockEntry)
  )
    return unchanged(
      `extension-removal-lock-stale:${options.plan.extensionId}`,
    );
  try {
    const files = await prepareRemovalFiles(
      options.root,
      options.plan.filesToRemove,
      options.plan.configurationChanges,
      fs,
    );
    return { lockfilePath, lockfileContent, lockfile, files };
  } catch (error) {
    return unchanged(error instanceof Error ? error.message : String(error));
  }
}

function unchanged(diagnostic: string): ExtensionRemovalApplicationResult {
  return {
    status: "unchanged",
    lockfileUpdated: false,
    failedStage: "preflight",
    diagnostics: [diagnostic],
    rollbackAttempted: false,
    rollbackCompleted: true,
    rollbackFailures: [],
  };
}

async function rollbackRemoval(
  options: RemoveExtensionOptions,
  prepared: PreparedRemoval,
  fs: FileSystem,
  runtime: ExtensionRemovalRuntime,
  stage: NonNullable<ExtensionRemovalApplicationResult["failedStage"]>,
  error: unknown,
): Promise<ExtensionRemovalApplicationResult> {
  const lockSnapshot = {
    path: prepared.lockfilePath,
    existed: true,
    content: prepared.lockfileContent,
  };
  const snapshots =
    stage === "commit" || stage === "remove"
      ? [lockSnapshot, ...prepared.files.snapshots]
      : stage === "stop"
        ? []
        : [];
  const rollbackFailures = await restoreExtensionUpdateSnapshots(snapshots, fs);
  try {
    await runtime.rollback(options.plan);
  } catch {
    rollbackFailures.push(`runtime:${options.plan.extensionId}`);
  }
  const diagnostics = [error instanceof Error ? error.message : String(error)];
  if (rollbackFailures.length > 0)
    diagnostics.push("extension-removal-rollback-incomplete");
  return {
    status: "failed",
    lockfileUpdated: false,
    failedStage: stage,
    diagnostics,
    rollbackAttempted: true,
    rollbackCompleted: rollbackFailures.length === 0,
    rollbackFailures: rollbackFailures.sort(),
  };
}

export async function removeExtension(
  options: RemoveExtensionOptions,
  fs: FileSystem,
  runtime: ExtensionRemovalRuntime,
): Promise<ExtensionRemovalApplicationResult> {
  const prepared = await prepareRemoval(options, fs);
  if ("status" in prepared) return prepared;
  let stage: NonNullable<ExtensionRemovalApplicationResult["failedStage"]> =
    "stop";
  try {
    await runtime.stop(options.plan);
    stage = "remove";
    await applyRemovalFiles(
      options.root,
      options.plan.filesToRemove,
      options.plan.configurationChanges,
      fs,
    );
    await runtime.remove(options.plan);
    stage = "commit";
    const approval = options.approval!;
    const updatedLockfile: ExtensionLockfile = {
      ...prepared.lockfile,
      updatedAt: approval.approvedAt,
      extensions: Object.fromEntries(
        Object.entries(prepared.lockfile.extensions).filter(
          ([extensionId]) => extensionId !== options.plan.extensionId,
        ),
      ),
    };
    await fs.mkdir?.(dirname(prepared.lockfilePath));
    await fs.write(
      prepared.lockfilePath,
      `${JSON.stringify(updatedLockfile, null, 2)}\n`,
    );
    return {
      status: "removed",
      lockfileUpdated: true,
      diagnostics: [],
      rollbackAttempted: false,
      rollbackCompleted: true,
      rollbackFailures: [],
    };
  } catch (error) {
    return rollbackRemoval(options, prepared, fs, runtime, stage, error);
  }
}
