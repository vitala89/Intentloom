import { dirname } from "node:path";
import { parseDocument } from "yaml";
import type {
  ExtensionLockfile,
  ExtensionUpdateApplicationResult,
  ExtensionUpdateApproval,
  ExtensionUpdatePlan,
} from "@intentloom/protocol";
import type { FileSystem } from "./propose-and-apply-extension-adoption.js";
import {
  extensionLockEntryFingerprint,
  restoreExtensionUpdateSnapshots,
  safeExtensionUpdatePath,
  validateExtensionUpdateMigrationSteps,
  type ExtensionUpdateFileSnapshot,
  type ExtensionUpdateMigrationStep,
} from "./extension-update-files.js";

export type { ExtensionUpdateMigrationStep } from "./extension-update-files.js";

export interface ExtensionUpdateRuntime {
  stage(plan: ExtensionUpdatePlan): Promise<void>;
  verifyIntegrity(plan: ExtensionUpdatePlan): Promise<boolean>;
  healthCheck(plan: ExtensionUpdatePlan): Promise<{
    readonly healthy: boolean;
    readonly diagnostics?: readonly string[];
  }>;
  commit(plan: ExtensionUpdatePlan): Promise<void>;
  rollback(plan: ExtensionUpdatePlan): Promise<void>;
}

export interface ApplyExtensionUpdateOptions {
  readonly root: string;
  readonly plan: ExtensionUpdatePlan;
  readonly approval?: ExtensionUpdateApproval | undefined;
  readonly migrations?: readonly ExtensionUpdateMigrationStep[] | undefined;
  readonly lockfilePath?: string | undefined;
}

interface PreparedUpdate {
  readonly lockfilePath: string;
  readonly lockfileContent: string;
  readonly lockfile: ExtensionLockfile;
  readonly migrationSnapshots: readonly ExtensionUpdateFileSnapshot[];
}

function unchanged(diagnostic: string): ExtensionUpdateApplicationResult {
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

function approvalDiagnostic(options: ApplyExtensionUpdateOptions) {
  if (!options.approval)
    return `extension-update-approval-required:${options.plan.extensionId}`;
  if (
    options.approval.approvedBy.trim() === "" ||
    options.approval.approvedAt.trim() === ""
  )
    return `extension-update-approval-invalid:${options.plan.extensionId}`;
  return undefined;
}

async function prepareExtensionUpdate(
  options: ApplyExtensionUpdateOptions,
  fs: FileSystem,
): Promise<PreparedUpdate | ExtensionUpdateApplicationResult> {
  if (options.plan.status === "rejected")
    return unchanged(
      `cannot-apply-rejected-update:${options.plan.extensionId}`,
    );
  const approvalError = approvalDiagnostic(options);
  if (approvalError) return unchanged(approvalError);

  const lockfilePath =
    options.lockfilePath ?? `${options.root}/.aif/extension-lock.json`;
  let lockfileContent: string;
  let lockfile: ExtensionLockfile;
  try {
    lockfileContent = await fs.read(lockfilePath);
    lockfile = parseDocument(lockfileContent).toJS() as ExtensionLockfile;
    if (!lockfile?.extensions) throw new Error("lockfile-structure-invalid");
  } catch {
    return unchanged(
      `extension-update-lock-unreadable:${options.plan.extensionId}`,
    );
  }
  const current = lockfile.extensions[options.plan.extensionId];
  if (
    !current ||
    extensionLockEntryFingerprint(current) !==
      extensionLockEntryFingerprint(options.plan.currentLockEntry)
  )
    return unchanged(`extension-update-lock-stale:${options.plan.extensionId}`);

  try {
    const migrationSnapshots = await validateExtensionUpdateMigrationSteps(
      options.root,
      options.plan,
      options.migrations ?? [],
      fs,
    );
    if (migrationSnapshots.some((entry) => entry.path === lockfilePath))
      return unchanged("migration-targets-extension-lockfile");
    return { lockfilePath, lockfileContent, lockfile, migrationSnapshots };
  } catch (error) {
    return unchanged(error instanceof Error ? error.message : String(error));
  }
}

async function applyMigrationFiles(
  options: ApplyExtensionUpdateOptions,
  fs: FileSystem,
) {
  for (const migration of options.migrations ?? []) {
    const path = await safeExtensionUpdatePath(
      options.root,
      migration.path,
      fs,
    );
    await fs.mkdir?.(dirname(path));
    await fs.write(path, migration.nextContent);
  }
}

async function commitExtensionUpdate(
  options: ApplyExtensionUpdateOptions,
  prepared: PreparedUpdate,
  fs: FileSystem,
) {
  const approval = options.approval!;
  const updatedLockfile: ExtensionLockfile = {
    ...prepared.lockfile,
    updatedAt: approval.approvedAt,
    extensions: {
      ...prepared.lockfile.extensions,
      [options.plan.extensionId]: {
        ...options.plan.proposedLockEntry,
        approvedBy: approval.approvedBy,
        approvedAt: approval.approvedAt,
        lastHealthCheck: approval.approvedAt,
        pendingMigration: false,
      },
    },
  };
  await fs.mkdir?.(dirname(prepared.lockfilePath));
  await fs.write(
    prepared.lockfilePath,
    `${JSON.stringify(updatedLockfile, null, 2)}\n`,
  );
}

async function rollbackFailedUpdate(
  options: ApplyExtensionUpdateOptions,
  prepared: PreparedUpdate,
  fs: FileSystem,
  runtime: ExtensionUpdateRuntime,
  stage: NonNullable<ExtensionUpdateApplicationResult["failedStage"]>,
  error: unknown,
): Promise<ExtensionUpdateApplicationResult> {
  const lockfileSnapshot: ExtensionUpdateFileSnapshot = {
    path: prepared.lockfilePath,
    existed: true,
    content: prepared.lockfileContent,
  };
  const fileSnapshots =
    stage === "commit"
      ? [lockfileSnapshot, ...prepared.migrationSnapshots]
      : stage === "migration" || stage === "health-check"
        ? prepared.migrationSnapshots
        : [];
  const rollbackFailures = await restoreExtensionUpdateSnapshots(
    fileSnapshots,
    fs,
  );
  try {
    await runtime.rollback(options.plan);
  } catch {
    rollbackFailures.push(`runtime:${options.plan.extensionId}`);
  }
  const diagnostics = [error instanceof Error ? error.message : String(error)];
  if (rollbackFailures.length > 0)
    diagnostics.push("extension-update-rollback-incomplete");
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

async function executeExtensionUpdate(
  options: ApplyExtensionUpdateOptions,
  prepared: PreparedUpdate,
  fs: FileSystem,
  runtime: ExtensionUpdateRuntime,
): Promise<ExtensionUpdateApplicationResult> {
  let stage: NonNullable<ExtensionUpdateApplicationResult["failedStage"]> =
    "stage";
  try {
    await runtime.stage(options.plan);
    stage = "integrity";
    if (!(await runtime.verifyIntegrity(options.plan)))
      throw new Error("extension-update-integrity-verification-failed");
    stage = "migration";
    await applyMigrationFiles(options, fs);
    stage = "health-check";
    const health = await runtime.healthCheck(options.plan);
    if (!health.healthy)
      throw new Error(
        health.diagnostics?.join(";") || "extension-update-health-check-failed",
      );
    stage = "commit";
    await commitExtensionUpdate(options, prepared, fs);
    await runtime.commit(options.plan);
    return {
      status: "updated",
      lockfileUpdated: true,
      diagnostics: [],
      rollbackAttempted: false,
      rollbackCompleted: true,
      rollbackFailures: [],
    };
  } catch (error) {
    return rollbackFailedUpdate(options, prepared, fs, runtime, stage, error);
  }
}

export async function applyExtensionUpdate(
  options: ApplyExtensionUpdateOptions,
  fs: FileSystem,
  runtime: ExtensionUpdateRuntime,
): Promise<ExtensionUpdateApplicationResult> {
  const prepared = await prepareExtensionUpdate(options, fs);
  if ("status" in prepared) return prepared;
  return executeExtensionUpdate(options, prepared, fs, runtime);
}
