import { dirname, relative, resolve, sep } from "node:path";
import { normalizeStoredPath, type GeneratedFile } from "@intentloom/core";
import { findDestinationCollisions } from "../destination-collisions.js";
import type { FileSystem } from "../host-file-system.js";
import type { Plan } from "../project-change.js";

export function collisionPlan(files: readonly GeneratedFile[]): Plan | null {
  const collisions = findDestinationCollisions(files);
  if (collisions.length === 0) return null;
  return {
    changes: collisions.map((collision) => ({
      path: collision.paths.join(", "),
      kind: "conflict" as const,
      reason: JSON.stringify(collision),
    })),
    diagnostics: ["destination-collision"],
  };
}

export function noncanonicalPathPlan(
  files: readonly GeneratedFile[],
): Plan | null {
  const invalidPaths = files
    .map((file) => file.path)
    .filter((path) => {
      try {
        return normalizeStoredPath(path) !== path;
      } catch {
        return true;
      }
    })
    .sort();
  if (invalidPaths.length === 0) return null;
  return {
    changes: invalidPaths.map((path) => ({
      path,
      kind: "security-error" as const,
      reason: "generated destination is not a canonical stored path",
    })),
    diagnostics: ["invalid-stored-path"],
  };
}

export async function safeDestination(
  root: string,
  path: string,
  fs: FileSystem,
): Promise<void> {
  let rootResolved = resolve(root);
  try {
    rootResolved = await fs.realpath(rootResolved);
  } catch {
    /* a new project root has no link to resolve yet */
  }
  let current = path;
  while (true) {
    if (await fs.isSymbolicLink(current))
      throw new Error(
        `security-error: ${relative(resolve(root), path).replaceAll("\\", "/")}`,
      );
    if (await fs.exists(current)) {
      const resolved = await fs.realpath(current);
      if (
        resolved !== rootResolved &&
        !resolved.startsWith(`${rootResolved}${sep}`)
      )
        throw new Error(
          `security-error: ${relative(resolve(root), path).replaceAll("\\", "/")}`,
        );
    }
    if (current === resolve(root)) return;
    current = dirname(current);
  }
}
