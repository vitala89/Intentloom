import { dirname, join } from "node:path";
import type { EngineeringGraphSnapshot } from "@intentloom/protocol";
import { createGraphSnapshotFromTypeScriptWorkspace } from "./graph-provider.js";
import type { FileSystem } from "../index.js";

interface PackageManifest {
  readonly name?: unknown;
  readonly dependencies?: unknown;
  readonly devDependencies?: unknown;
  readonly peerDependencies?: unknown;
}

function dependencyNames(manifest: PackageManifest): readonly string[] {
  const sections = [
    manifest.dependencies,
    manifest.devDependencies,
    manifest.peerDependencies,
  ];
  return sections.flatMap((section) =>
    section && typeof section === "object" && !Array.isArray(section)
      ? Object.keys(section)
      : [],
  );
}

function isPackageManifest(path: string): boolean {
  return (
    (path === "package.json" || path.endsWith("/package.json")) &&
    !path.split("/").includes("node_modules") &&
    !path.split("/").includes(".git")
  );
}

async function readPackageManifest(
  root: string,
  path: string,
  fs: FileSystem,
): Promise<{
  readonly path: string;
  readonly manifest: PackageManifest;
} | null> {
  try {
    const raw = JSON.parse(await fs.read(join(root, path))) as unknown;
    if (raw === null || typeof raw !== "object" || Array.isArray(raw))
      return null;
    return { path, manifest: raw as PackageManifest };
  } catch {
    return null;
  }
}

export async function loadQualityGraphSnapshot(
  root: string,
  fs: FileSystem,
): Promise<EngineeringGraphSnapshot> {
  const manifests = await Promise.all(
    (await fs.list(root))
      .filter(isPackageManifest)
      .map((path) => readPackageManifest(root, path, fs)),
  );
  const named = manifests.filter(
    (
      entry,
    ): entry is { readonly path: string; readonly manifest: PackageManifest } =>
      entry?.manifest.name !== undefined &&
      typeof entry.manifest.name === "string" &&
      entry.manifest.name.length > 0,
  );
  const packageNames = new Set(
    named.map((entry) => entry.manifest.name as string),
  );
  const packages = named.map((entry) => ({
    name: entry.manifest.name as string,
    path: dirname(entry.path) === "." ? "." : dirname(entry.path),
    dependencies: dependencyNames(entry.manifest).filter((name) =>
      packageNames.has(name),
    ),
  }));
  return createGraphSnapshotFromTypeScriptWorkspace({
    projectRoot: root,
    packages,
  });
}
