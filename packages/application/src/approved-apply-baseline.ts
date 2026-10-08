import { dirname, relative, resolve } from "node:path";
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

/**
 * Rechecks the captured baseline on the filesystem sync is about to use.
 * A mismatch throws before `FileSystem.write`.
 */
export function filesystemGuardingBaseline(
  fs: FileSystem,
  root: string,
  baseline: readonly ApprovedApplyRollbackFile[],
): FileSystem {
  const expected = new Map(
    baseline.map((file) => [file.path, file.previousContent] as const),
  );
  const released = new Set<string>();
  const projectPath = (path: string) =>
    relative(resolve(root), path).replaceAll("\\", "/");
  return {
    ...fs,
    exists: (path) =>
      guardedExists(fs, expected, released, projectPath(path), path),
    read: (path) =>
      guardedRead(fs, expected, released, projectPath(path), path),
    write: (path, content) =>
      guardedWrite(fs, expected, released, projectPath(path), path, content),
  };
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

async function guardedExists(
  fs: FileSystem,
  expected: ReadonlyMap<string, string | null>,
  released: ReadonlySet<string>,
  projectPath: string,
  path: string,
): Promise<boolean> {
  const exists = await fs.exists(path);
  if (!expected.has(projectPath) || released.has(projectPath)) return exists;
  const prior = expected.get(projectPath) ?? null;
  if (prior === null ? exists : !exists) throw changed();
  return exists;
}

async function guardedRead(
  fs: FileSystem,
  expected: ReadonlyMap<string, string | null>,
  released: ReadonlySet<string>,
  projectPath: string,
  path: string,
): Promise<string> {
  if (
    expected.has(projectPath) &&
    !released.has(projectPath) &&
    (await fs.isSymbolicLink(path))
  ) {
    throw changed();
  }
  const text = await fs.read(path);
  if (
    expected.has(projectPath) &&
    !released.has(projectPath) &&
    text !== expected.get(projectPath)
  ) {
    throw changed();
  }
  return text;
}

async function guardedWrite(
  fs: FileSystem,
  expected: ReadonlyMap<string, string | null>,
  released: Set<string>,
  projectPath: string,
  path: string,
  content: string,
): Promise<void> {
  if (expected.has(projectPath) && !released.has(projectPath)) {
    if (await fs.isSymbolicLink(path)) throw changed();
    const exists = await fs.exists(path);
    const prior = expected.get(projectPath) ?? null;
    const actual = exists ? await fs.read(path) : null;
    if (actual !== prior) throw changed();
  }
  await fs.write(path, content);
  if (expected.has(projectPath)) released.add(projectPath);
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
