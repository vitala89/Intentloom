import { relative, resolve, sep } from "node:path";
import { projectRelativePaths as relativeProjectPaths } from "./project-scan-exclusions.js";

export function secretLikePath(path: string): boolean {
  return path
    .split("/")
    .some(
      (segment) =>
        segment === ".env" ||
        segment.startsWith(".env.") ||
        /\.(?:key|pem|p12|pfx)$/iu.test(segment),
    );
}

export function projectRelativePaths(
  root: string,
  entries: readonly string[],
): string[] {
  return relativeProjectPaths(root, entries, resolve, relative);
}

export function inside(root: string, path: string): string {
  const target = resolve(root, path);
  if (target !== resolve(root) && !target.startsWith(`${resolve(root)}${sep}`))
    throw new Error(`path traversal: ${path}`);
  return target;
}
