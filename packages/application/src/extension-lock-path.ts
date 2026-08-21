import { dirname, relative, resolve } from "node:path";
import type { ExtensionLockfile } from "@intentloom/protocol";
import type { FileSystem } from "./propose-and-apply-extension-adoption.js";

export function extensionLockRelativePath(
  root: string,
  lockfilePath: string,
): string {
  const relativePath = relative(resolve(root), resolve(lockfilePath));
  if (
    relativePath === ".." ||
    relativePath.startsWith("../") ||
    relativePath.startsWith("..\\")
  ) {
    throw new Error("extension-lock-path-outside-root");
  }
  return relativePath.replaceAll("\\", "/");
}

export function defaultExtensionLockfile(timestamp: string): ExtensionLockfile {
  return { lockVersion: 1, updatedAt: timestamp, extensions: {} };
}

export function formatExtensionLockfile(lockfile: ExtensionLockfile): string {
  const extensions = Object.fromEntries(
    Object.entries(lockfile.extensions).sort(([left], [right]) =>
      left.localeCompare(right),
    ),
  );
  return `${JSON.stringify({ ...lockfile, extensions }, null, 2)}\n`;
}

export async function safeExtensionLockPath(
  root: string,
  lockfilePath: string,
  fs: FileSystem,
): Promise<string> {
  const absoluteRoot = resolve(root);
  const absolutePath = resolve(lockfilePath);
  if (!fs.realpath || !fs.isSymbolicLink) {
    throw new Error("filesystem-path-safety-unavailable");
  }
  let resolvedRoot = absoluteRoot;
  if (await fs.exists(absoluteRoot)) {
    resolvedRoot = await fs.realpath(absoluteRoot);
  }
  let current = absolutePath;
  while (true) {
    if (await fs.isSymbolicLink(current)) {
      throw new Error("extension-lock-path-symbolic-link");
    }
    if (await fs.exists(current)) {
      const resolvedCurrent = await fs.realpath(current);
      const relativePath = relative(resolvedRoot, resolvedCurrent);
      if (
        relativePath === ".." ||
        relativePath.startsWith("../") ||
        relativePath.startsWith("..\\")
      ) {
        throw new Error("extension-lock-path-outside-root");
      }
    }
    if (current === absoluteRoot) break;
    current = dirname(current);
  }
  return absolutePath;
}

export async function readExtensionLockfile(
  lockfilePath: string,
  fs: FileSystem,
): Promise<{ lockfile: ExtensionLockfile; content: string } | null> {
  if (!(await fs.exists(lockfilePath))) return null;
  const content = await fs.read(lockfilePath);
  let parsed: unknown;
  try {
    parsed = JSON.parse(content) as unknown;
  } catch {
    throw new Error("extension-lock-malformed");
  }
  const lockfile = parsed as ExtensionLockfile;
  if (
    typeof lockfile.lockVersion !== "number" ||
    typeof lockfile.updatedAt !== "string" ||
    !lockfile.extensions ||
    typeof lockfile.extensions !== "object"
  ) {
    throw new Error("extension-lock-malformed");
  }
  return { lockfile, content };
}
