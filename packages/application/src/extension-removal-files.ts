import { createHash } from "node:crypto";
import { dirname, isAbsolute, relative, resolve } from "node:path";
import type {
  ExtensionRemovalConfigurationChange,
  ExtensionRemovalFileTarget,
} from "@intentloom/protocol";
import type { FileSystem } from "./propose-and-apply-extension-adoption.js";
import {
  restoreExtensionUpdateSnapshots,
  type ExtensionUpdateFileSnapshot,
} from "./extension-update-files.js";

export function removalDigest(content: string): string {
  return `sha256:${createHash("sha256").update(content).digest("hex")}`;
}

function normalizedRemovalPath(path: string): string {
  const normalized = path.replaceAll("\\", "/");
  if (
    normalized === "" ||
    normalized === "." ||
    isAbsolute(path) ||
    normalized.startsWith("/") ||
    normalized.split("/").includes("..") ||
    !normalized.startsWith(".aif/")
  )
    throw new Error(`removal-path-outside-aif:${path}`);
  return normalized;
}

function assertSafeTargetKind(path: string, kind: "owned" | "config") {
  const extensionOwned =
    path.startsWith(".aif/extensions/") ||
    path.startsWith(".aif/extension-state/");
  if (kind === "owned" && !extensionOwned)
    throw new Error(`removal-path-not-extension-owned:${path}`);
  if (kind === "config" && extensionOwned)
    throw new Error(`removal-config-path-extension-owned:${path}`);
  if (path === ".aif/extension-lock.json")
    throw new Error("removal-targets-extension-lockfile");
}

async function safeRemovalPath(
  root: string,
  path: string,
  kind: "owned" | "config",
  fs: FileSystem,
): Promise<string> {
  const normalized = normalizedRemovalPath(path);
  assertSafeTargetKind(normalized, kind);
  if (!fs.realpath || !fs.isSymbolicLink)
    throw new Error("filesystem-path-safety-unavailable");
  const absoluteRoot = resolve(root);
  let resolvedRoot = absoluteRoot;
  if (await fs.exists(absoluteRoot))
    resolvedRoot = await fs.realpath(absoluteRoot);
  const absolutePath = resolve(root, normalized);
  let current = absolutePath;
  while (true) {
    if (await fs.isSymbolicLink(current))
      throw new Error(`removal-path-symbolic-link:${path}`);
    if (await fs.exists(current)) {
      const resolvedCurrent = await fs.realpath(current);
      const relativePath = relative(resolvedRoot, resolvedCurrent);
      if (
        relativePath === ".." ||
        relativePath.startsWith("../") ||
        relativePath.startsWith("..\\")
      )
        throw new Error(`removal-path-outside-root:${path}`);
    }
    if (current === absoluteRoot) break;
    current = dirname(current);
  }
  return absolutePath;
}

export interface PreparedRemovalFiles {
  readonly snapshots: readonly ExtensionUpdateFileSnapshot[];
  readonly absoluteTargets: readonly string[];
}

export async function prepareRemovalFiles(
  root: string,
  filesToRemove: readonly ExtensionRemovalFileTarget[],
  configurationChanges: readonly ExtensionRemovalConfigurationChange[],
  fs: FileSystem,
): Promise<PreparedRemovalFiles> {
  const snapshots: ExtensionUpdateFileSnapshot[] = [];
  const absoluteTargets: string[] = [];
  const paths = new Set<string>();
  for (const target of filesToRemove) {
    const absolute = await safeRemovalPath(root, target.path, "owned", fs);
    if (paths.has(absolute))
      throw new Error(`removal-target-duplicate:${target.path}`);
    paths.add(absolute);
    if (!(await fs.exists(absolute)))
      throw new Error(`removal-target-missing:${target.path}`);
    const content = await fs.read(absolute);
    if (removalDigest(content) !== target.beforeDigest)
      throw new Error(`removal-target-digest-mismatch:${target.path}`);
    snapshots.push({ path: absolute, existed: true, content });
    absoluteTargets.push(absolute);
  }
  for (const change of configurationChanges) {
    const absolute = await safeRemovalPath(root, change.path, "config", fs);
    if (paths.has(absolute))
      throw new Error(`removal-target-duplicate:${change.path}`);
    paths.add(absolute);
    if (!(await fs.exists(absolute)))
      throw new Error(`removal-config-missing:${change.path}`);
    const content = await fs.read(absolute);
    if (removalDigest(content) !== change.beforeDigest)
      throw new Error(`removal-config-digest-mismatch:${change.path}`);
    if (removalDigest(change.afterContent) !== change.afterDigest)
      throw new Error(`removal-config-after-digest-mismatch:${change.path}`);
    snapshots.push({ path: absolute, existed: true, content });
    absoluteTargets.push(absolute);
  }
  return { snapshots, absoluteTargets };
}

export async function applyRemovalFiles(
  root: string,
  filesToRemove: readonly ExtensionRemovalFileTarget[],
  configurationChanges: readonly ExtensionRemovalConfigurationChange[],
  fs: FileSystem,
): Promise<void> {
  for (const target of filesToRemove) {
    const absolute = await safeRemovalPath(root, target.path, "owned", fs);
    if (!fs.remove) throw new Error("filesystem-remove-unavailable");
    if (!(await fs.exists(absolute)))
      throw new Error(`removal-target-missing:${target.path}`);
    if (removalDigest(await fs.read(absolute)) !== target.beforeDigest)
      throw new Error(`removal-target-digest-mismatch:${target.path}`);
    await fs.remove(absolute);
  }
  for (const change of configurationChanges) {
    const absolute = await safeRemovalPath(root, change.path, "config", fs);
    if (!(await fs.exists(absolute)))
      throw new Error(`removal-config-missing:${change.path}`);
    if (removalDigest(await fs.read(absolute)) !== change.beforeDigest)
      throw new Error(`removal-config-digest-mismatch:${change.path}`);
    await fs.write(absolute, change.afterContent);
  }
}

export { restoreExtensionUpdateSnapshots };
