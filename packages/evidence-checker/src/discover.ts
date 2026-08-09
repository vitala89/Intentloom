import { readFile, realpath, stat } from "node:fs/promises";
import { relative, resolve } from "node:path";
import type { ProjectPinnedCheckerCandidate } from "@intentloom/protocol";

export interface CheckerDiscoveryResult {
  readonly status: "available" | "unavailable";
  readonly candidate?: ProjectPinnedCheckerCandidate;
  readonly diagnostics: readonly string[];
}

async function readVersion(
  packageJsonPath: string,
): Promise<string | undefined> {
  try {
    const raw = await readFile(packageJsonPath, "utf8");
    const value: unknown = JSON.parse(raw);
    if (
      typeof value === "object" &&
      value !== null &&
      !Array.isArray(value) &&
      typeof (value as { version?: unknown }).version === "string"
    ) {
      return (value as { version: string }).version;
    }
  } catch {
    return undefined;
  }
  return undefined;
}

export async function discoverProjectPinnedEslint(
  projectRoot: string,
): Promise<CheckerDiscoveryResult> {
  const root = resolve(projectRoot);
  const entry = "node_modules/eslint/bin/eslint.js";
  const entryPath = resolve(root, entry);
  try {
    const [rootRealPath, entryRealPath] = await Promise.all([
      realpath(root),
      realpath(entryPath),
    ]);
    const outsideRoot = relative(rootRealPath, entryRealPath);
    if (
      outsideRoot === ".." ||
      outsideRoot.startsWith(`..${entryRealPath.includes("\\") ? "\\" : "/"}`)
    ) {
      return {
        status: "unavailable",
        diagnostics: ["eslint-entry-escapes-root"],
      };
    }
    if (!(await stat(entryRealPath)).isFile()) {
      return { status: "unavailable", diagnostics: ["eslint-entry-not-file"] };
    }
    const version = await readVersion(
      resolve(root, "node_modules/eslint/package.json"),
    );
    if (!version) {
      return {
        status: "unavailable",
        diagnostics: ["eslint-version-unavailable"],
      };
    }
    return {
      status: "available",
      candidate: {
        source: "project-local",
        tool: "eslint",
        relativeEntryPath: entry,
        version,
      },
      diagnostics: [],
    };
  } catch {
    return { status: "unavailable", diagnostics: ["eslint-entry-unavailable"] };
  }
}
