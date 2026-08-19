import { resolve, sep } from "node:path";
import { checksum } from "@intentloom/core";
import { canonicalJson } from "./canonical-json.js";
import { ignoredScanPath } from "./project-scan-exclusions.js";
import type { FileSystem } from "./index.js";

function secretLikePath(path: string): boolean {
  return path
    .split("/")
    .some(
      (segment) =>
        segment === ".env" ||
        segment.startsWith(".env.") ||
        /\.(?:key|pem|p12|pfx)$/iu.test(segment),
    );
}

function containedPath(root: string, relativePath: string): string {
  const target = resolve(root, relativePath);
  const canonicalRoot = resolve(root);
  if (
    target !== canonicalRoot &&
    !target.startsWith(`${canonicalRoot}${sep}`)
  ) {
    throw new Error(`path traversal: ${relativePath}`);
  }
  return target;
}

export async function computeExistingProjectAdoptionFingerprint(
  root: string,
  relativePaths: readonly string[],
  fs: FileSystem,
): Promise<string> {
  if (await fs.isSymbolicLink(resolve(root))) {
    throw new Error(
      "adoption fingerprint requires a non-symbolic explicit project root",
    );
  }
  const unique = [...new Set(relativePaths)]
    .filter(
      (path) =>
        path.length > 0 && !ignoredScanPath(path) && !secretLikePath(path),
    )
    .sort((left, right) => left.localeCompare(right));
  const artifacts: { path: string; contentHash: string }[] = [];
  for (const path of unique) {
    const contained = containedPath(root, path);
    if (await fs.isSymbolicLink(contained)) continue;
    if (!(await fs.exists(contained))) {
      artifacts.push({ path, contentHash: "absent" });
      continue;
    }
    try {
      artifacts.push({ path, contentHash: checksum(await fs.read(contained)) });
    } catch {
      artifacts.push({ path, contentHash: "absent" });
    }
  }
  return checksum(canonicalJson(artifacts));
}
