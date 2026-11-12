import type { AdapterName } from "@intentloom/core";
import type { FileSystem } from "../host-file-system.js";
import { inside } from "../project-path.js";
import { adapterForDoctorPath } from "./doctor-drift.js";
import type {
  DoctorFinding,
  InitOptions,
} from "./project-lifecycle-contracts.js";

export function portableGlob(pattern: string): boolean {
  return (
    pattern.length > 0 &&
    !pattern.includes("\\") &&
    !pattern.includes("\0") &&
    !/^(?:[A-Za-z]:|\/)/u.test(pattern) &&
    !pattern.split("/").some((segment) => segment === ".." || segment === "")
  );
}

export async function invalidPathScopedRuleFindings(
  options: InitOptions,
  fs: FileSystem,
  scanned: ReadonlySet<string>,
  desiredPaths: ReadonlySet<string>,
  selectedAdapters: readonly AdapterName[],
): Promise<DoctorFinding[]> {
  const findings: DoctorFinding[] = [];
  for (const path of desiredPaths) {
    if (!scanned.has(path) || !pathScopedRulePath(path)) continue;
    const source = await fs.read(inside(options.root, path));
    if (pathScopedRuleValid(path, source)) continue;
    findings.push({
      code: "path-scoped-rule-invalid",
      severity: "error",
      category: "adapter",
      path,
      message: "path-scoped adapter output has invalid frontmatter",
      remediation: ["Restore or transactionally regenerate the scoped rule."],
      readOnly: true,
      adapter: adapterForDoctorPath(path, selectedAdapters),
      profile: options.profile,
    });
  }
  return findings;
}

function pathScopedRulePath(path: string): boolean {
  return (
    /^\.cursor\/rules\/.*\.mdc$/u.test(path) ||
    /^\.github\/instructions\/.*\.instructions\.md$/u.test(path)
  );
}

function pathScopedRuleValid(path: string, source: string): boolean {
  const key = path.startsWith(".cursor/") ? "globs" : "applyTo";
  const frontmatter = source.match(/^---\n([\s\S]*?)\n---\n/u)?.[1] ?? "";
  const value = frontmatter
    .match(new RegExp(`^${key}:\\s*(.+)$`, "mu"))?.[1]
    ?.trim()
    .replace(/^(?:"([\s\S]*)"|'([\s\S]*)')$/u, "$1$2");
  const globalCursorRule =
    path.startsWith(".cursor/") && /^alwaysApply:\s*true$/mu.test(frontmatter);
  return (
    globalCursorRule ||
    (typeof value === "string" && value.split(",").every(portableGlob))
  );
}
