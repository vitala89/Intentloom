const ignoredScanSegments = new Set([
  ".git",
  ".cache",
  ".next",
  ".turbo",
  "build",
  "coverage",
  "dist",
  "node_modules",
  "out",
  "target",
  "vendor",
]);

const ignoredNxGeneratedSegments = new Set([
  "cache",
  "workspace-data",
  "installation",
]);

export const inspectionExclusions = [
  ".git",
  ".cache",
  ".next",
  ".turbo",
  ".nx/cache",
  ".nx/workspace-data",
  ".nx/installation",
  "build",
  "coverage",
  "dist",
  "node_modules",
  "out",
  "target",
  "vendor",
  "symbolic links",
  "secret-like paths",
] as const;

export function ignoredScanDirectoryName(name: string): boolean {
  return ignoredScanSegments.has(name);
}

export function ignoredScanPath(path: string): boolean {
  const segments = path.replaceAll("\\", "/").split("/").filter(Boolean);
  if (segments.some((segment) => ignoredScanSegments.has(segment))) return true;
  return (
    segments[0] === ".nx" && ignoredNxGeneratedSegments.has(segments[1] ?? "")
  );
}

export function projectRelativePaths(
  root: string,
  entries: readonly string[],
  resolvePath: (root: string, entry: string) => string,
  relativePath: (root: string, absolute: string) => string,
): string[] {
  const normalizedRoot = resolvePath(root, ".");
  return [
    ...new Set(
      entries.flatMap((entry) => {
        const normalizedEntry = entry.replaceAll("\\", "/");
        const absolute = normalizedEntry.startsWith("/")
          ? resolvePath(normalizedEntry, ".")
          : resolvePath(normalizedRoot, normalizedEntry);
        const path = relativePath(normalizedRoot, absolute).replaceAll(
          "\\",
          "/",
        );
        if (path === "" || path === ".." || path.startsWith("../")) return [];
        if (ignoredScanPath(path)) return [];
        return [path];
      }),
    ),
  ].sort();
}
