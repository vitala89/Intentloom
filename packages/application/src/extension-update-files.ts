import { createHash } from "node:crypto";
import {
  dirname,
  isAbsolute,
  posix,
  relative,
  resolve,
  win32,
} from "node:path";
import type {
  ExtensionLockEntry,
  ExtensionUpdatePlan,
} from "@intentloom/protocol";
import type { FileSystem } from "./propose-and-apply-extension-adoption.js";

export interface ExtensionUpdateMigrationStep {
  readonly id: string;
  readonly path: string;
  readonly nextContent: string;
}

export interface ExtensionUpdateFileSnapshot {
  readonly path: string;
  readonly existed: boolean;
  readonly content?: string | undefined;
}

function digest(content: string): string {
  return `sha256:${createHash("sha256").update(content).digest("hex")}`;
}

export function extensionLockEntryFingerprint(
  entry: ExtensionLockEntry | undefined,
) {
  return JSON.stringify({
    resolvedVersion: entry?.resolvedVersion,
    integrity: entry?.integrity,
    configDigest: entry?.configDigest,
    source: entry?.source,
    publisher: entry?.publisher,
    license: entry?.license,
    grantedCapabilities: entry?.grantedCapabilities,
    pendingMigration: entry?.pendingMigration,
  });
}

export function projectExtensionUpdatePath(root: string, path: string): string {
  const normalizedPath = path.replaceAll("\\", "/");
  if (
    normalizedPath === "" ||
    normalizedPath === "." ||
    isAbsolute(path) ||
    posix.isAbsolute(normalizedPath) ||
    win32.isAbsolute(path) ||
    normalizedPath.split("/").includes("..")
  )
    throw new Error(`migration-path-outside-root:${path}`);
  if (
    !normalizedPath.startsWith(".aif/extensions/") &&
    !normalizedPath.startsWith(".aif/extension-state/")
  )
    throw new Error(`migration-path-not-extension-owned:${path}`);
  const absolute = resolve(root, normalizedPath);
  const projectRelative = relative(resolve(root), absolute);
  if (projectRelative === ".." || projectRelative.startsWith("../"))
    throw new Error(`migration-path-outside-root:${path}`);
  return absolute;
}

export async function safeExtensionUpdatePath(
  root: string,
  path: string,
  fs: FileSystem,
): Promise<string> {
  const absoluteRoot = resolve(root);
  const absolutePath = projectExtensionUpdatePath(root, path);
  if (!fs.realpath || !fs.isSymbolicLink)
    throw new Error("filesystem-path-safety-unavailable");
  let resolvedRoot = absoluteRoot;
  if (await fs.exists(absoluteRoot))
    resolvedRoot = await fs.realpath(absoluteRoot);

  let current = absolutePath;
  while (true) {
    if (await fs.isSymbolicLink(current))
      throw new Error(`migration-path-symbolic-link:${path}`);
    if (await fs.exists(current)) {
      const resolvedCurrent = await fs.realpath(current);
      const relativePath = relative(resolvedRoot, resolvedCurrent);
      if (
        relativePath === ".." ||
        relativePath.startsWith("../") ||
        relativePath.startsWith("..\\")
      )
        throw new Error(`migration-path-outside-root:${path}`);
    }
    if (current === absoluteRoot) break;
    current = dirname(current);
  }
  return absolutePath;
}

async function snapshot(
  path: string,
  fs: FileSystem,
): Promise<ExtensionUpdateFileSnapshot> {
  const existed = await fs.exists(path);
  return existed
    ? { path, existed, content: await fs.read(path) }
    : { path, existed };
}

export async function validateExtensionUpdateMigrationSteps(
  root: string,
  plan: ExtensionUpdatePlan,
  steps: readonly ExtensionUpdateMigrationStep[],
  fs: FileSystem,
): Promise<readonly ExtensionUpdateFileSnapshot[]> {
  if (steps.length !== plan.migrations.length)
    throw new Error("migration-step-count-mismatch");
  const migrationIds = new Set(
    plan.migrations.map((migration) => migration.id),
  );
  const migrationPaths = new Set(
    plan.migrations.map((migration) => migration.path),
  );
  const stepIds = new Set(steps.map((step) => step.id));
  if (
    migrationIds.size !== plan.migrations.length ||
    migrationPaths.size !== plan.migrations.length ||
    stepIds.size !== steps.length
  )
    throw new Error("migration-targets-not-unique");

  const snapshots: ExtensionUpdateFileSnapshot[] = [];
  for (const migration of plan.migrations) {
    const step = steps.find((candidate) => candidate.id === migration.id);
    if (!step || step.path !== migration.path)
      throw new Error(`migration-step-mismatch:${migration.id}`);
    if (digest(step.nextContent) !== migration.afterDigest)
      throw new Error(`migration-next-digest-mismatch:${migration.id}`);

    const absolutePath = await safeExtensionUpdatePath(root, step.path, fs);
    const fileSnapshot = await snapshot(absolutePath, fs);
    if (migration.action === "create" && fileSnapshot.existed)
      throw new Error(`migration-create-target-exists:${migration.id}`);
    if (
      migration.action === "update" &&
      (!fileSnapshot.existed ||
        digest(fileSnapshot.content ?? "") !== migration.beforeDigest)
    )
      throw new Error(`migration-current-digest-mismatch:${migration.id}`);
    snapshots.push(fileSnapshot);
  }
  return snapshots;
}

export async function restoreExtensionUpdateSnapshots(
  snapshots: readonly ExtensionUpdateFileSnapshot[],
  fs: FileSystem,
): Promise<string[]> {
  const failures: string[] = [];
  for (const entry of [...snapshots].reverse()) {
    try {
      if (entry.existed) await fs.write(entry.path, entry.content ?? "");
      else if (fs.remove) await fs.remove(entry.path);
      else throw new Error("filesystem-remove-unavailable");
    } catch {
      failures.push(entry.path);
    }
  }
  return failures.sort();
}
