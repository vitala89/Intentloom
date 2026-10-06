import { dirname, resolve } from "node:path";
import type { ApprovedApplyRollbackFile } from "../../protocol/src/approved-apply.js";
import type { FileSystem } from "./index.js";

/**
 * Raised after a trusted baseline was captured and before `synchronizeGeneratedFiles`.
 * Callers must record a before-write failure and must not start a second rollback.
 */
export class ApplyBlockedBeforeWrite extends Error {
  readonly failureCode: "project-stale" | "restoration-snapshot-failed";

  constructor(
    failureCode: "project-stale" | "restoration-snapshot-failed",
    diagnostic: string,
  ) {
    super(diagnostic);
    this.name = "ApplyBlockedBeforeWrite";
    this.failureCode = failureCode;
  }
}

/**
 * Legacy Approved Apply capture. Read errors become prior absence so existing
 * rollback evidence stays unchanged. Undo snapshots must not use this mode.
 */
export async function captureApprovedApplyBaseline(
  root: string,
  paths: readonly string[],
  fs: FileSystem,
): Promise<ApprovedApplyRollbackFile[]> {
  const rollbackFiles: ApprovedApplyRollbackFile[] = [];
  for (const path of paths) {
    rollbackFiles.push(await readLegacyBaselineFile(root, path, fs));
  }
  return rollbackFiles;
}

/** Byte and symlink recheck immediately before the first project write. */
export async function assertApprovedApplyBaselineCurrent(
  root: string,
  baseline: readonly ApprovedApplyRollbackFile[],
  fs: FileSystem,
): Promise<void> {
  for (const file of baseline) {
    if (await ancestorIsSymlink(root, file.path, fs)) {
      throw new ApplyBlockedBeforeWrite(
        "project-stale",
        "restoration-baseline-changed",
      );
    }
    await assertFileMatchesBaseline(root, file, fs);
  }
}

async function readLegacyBaselineFile(
  root: string,
  path: string,
  fs: FileSystem,
): Promise<ApprovedApplyRollbackFile> {
  const fullPath = `${root}/${path}`;
  try {
    if (await fs.exists(fullPath)) {
      return { path, previousContent: await fs.read(fullPath) };
    }
  } catch {
    return { path, previousContent: null };
  }
  return { path, previousContent: null };
}

async function assertFileMatchesBaseline(
  root: string,
  file: ApprovedApplyRollbackFile,
  fs: FileSystem,
): Promise<void> {
  const fullPath = `${root}/${file.path}`;
  let exists = false;
  try {
    exists = await fs.exists(fullPath);
  } catch {
    throw changed();
  }
  if (file.previousContent === null) {
    if (exists) throw changed();
    return;
  }
  if (!exists) throw changed();
  try {
    if ((await fs.read(fullPath)) !== file.previousContent) throw changed();
  } catch (error) {
    if (error instanceof ApplyBlockedBeforeWrite) throw error;
    throw changed();
  }
}

export async function approvedApplyPathHasSymlink(
  root: string,
  relativePath: string,
  fs: FileSystem,
): Promise<boolean> {
  return ancestorIsSymlink(root, relativePath, fs);
}

async function ancestorIsSymlink(
  root: string,
  relativePath: string,
  fs: FileSystem,
): Promise<boolean> {
  let current = resolve(root, relativePath);
  const stop = resolve(root);
  for (let depth = 0; depth < 256; depth += 1) {
    if (current === stop) return false;
    if (await fs.isSymbolicLink(current)) return true;
    const parent = dirname(current);
    if (parent === current) return true;
    current = parent;
  }
  return true;
}

function changed(): ApplyBlockedBeforeWrite {
  return new ApplyBlockedBeforeWrite(
    "project-stale",
    "restoration-baseline-changed",
  );
}
