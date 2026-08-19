import { lstat, realpath } from "node:fs/promises";
import { isAbsolute } from "node:path";
import { withCanonicalProjectRootLock } from "@intentloom/application";

export class DaemonRootError extends Error {
  constructor(
    readonly clientErrorCode: "invalid_root" | "stale_root",
    message: string,
  ) {
    super(message);
    this.name = "DaemonRootError";
  }
}

export async function canonicalProjectRoot(root: string): Promise<string> {
  if (!isAbsolute(root))
    throw new DaemonRootError(
      "invalid_root",
      "project root must be an absolute path",
    );
  let metadata;
  try {
    metadata = await lstat(root);
  } catch {
    throw new DaemonRootError("invalid_root", "project root does not exist");
  }
  if (metadata.isSymbolicLink())
    throw new DaemonRootError(
      "stale_root",
      "project root is a symbolic link and is not stable",
    );
  if (!metadata.isDirectory())
    throw new DaemonRootError(
      "invalid_root",
      "project root is not a directory",
    );
  try {
    return await realpath(root);
  } catch {
    throw new DaemonRootError(
      "stale_root",
      "project root could not be resolved",
    );
  }
}

export async function runWithProjectRootLock<T>(
  root: string,
  enforceCanonicalRoots: boolean | undefined,
  resolveRoot: (root: string) => Promise<string>,
  operation: (root: string) => Promise<T>,
): Promise<T> {
  const resolved = enforceCanonicalRoots ? await resolveRoot(root) : root;
  return withCanonicalProjectRootLock(resolved, () => operation(resolved));
}
