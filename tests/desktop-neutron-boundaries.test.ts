import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { describe, expect, it } from "vitest";

const desktopSrc = join("apps", "desktop", "src");
const neutronRoot = join(desktopSrc, "neutron");

const NEUTRON_ROOT_FILES = [
  "NeutronWorkspace.tsx",
  "neutron-digest-display.ts",
];

const TOP_DIRECTORIES = ["activity", "graph", "mutation", "result", "session"];
const MUTATION_DIRECTORIES = ["proposal", "recovery", "review"];
const MUTATION_ROOT_FILES = [
  "neutron-mutation-review-copy.ts",
  "neutron-mutation-review-state.ts",
];

const SUBFEATURES = [
  "mutation/proposal",
  "mutation/recovery",
  "mutation/review",
  "activity",
  "graph",
  "result",
  "session",
];

const WORKSPACE_SURFACES = [
  "activity/NeutronActivityPanel.tsx",
  "graph/NeutronTaskGraphPanel.tsx",
  "graph/neutron-graph-viewmodel.ts",
  "mutation/proposal/NeutronMutationProposalPanel.tsx",
  "mutation/review/NeutronMutationReviewPanel.tsx",
  "result/NeutronResult.tsx",
  "session/NeutronComposer.tsx",
  "session/NeutronSessionHeader.tsx",
  "session/neutron-session-viewmodel.ts",
  "session/use-neutron-session.ts",
];

const CROSS_SUBFEATURE_IMPORTS = [
  "mutation/review -> mutation/recovery/NeutronApproveApplyControl.tsx",
  "mutation/review -> mutation/recovery/use-neutron-mutation-recovery.ts",
  "result -> session/neutron-session-viewmodel.ts",
  "session -> activity/neutron-activity-viewmodel.ts",
  "session -> graph/neutron-graph-input.ts",
  "session -> graph/neutron-graph-viewmodel.ts",
  "session -> mutation/proposal/neutron-mutation-proposal-binding.ts",
  "session -> mutation/proposal/neutron-mutation-proposal-viewmodel.ts",
];

const CLIENT_INTEGRATION =
  "neutron/mutation/recovery/neutron-mutation-recovery-controller";

const FORBIDDEN_PACKAGES = [
  "@intentloom/application",
  "@intentloom/core",
  "@intentloom/daemon",
];

const SHELL_FILES = new Set([
  "App.tsx",
  "DesktopShell.tsx",
  "WorkspaceContent.tsx",
  "WorkspaceSidebar.tsx",
  "WorkspaceTopbar.tsx",
  "main.tsx",
  "use-project-selection.ts",
  "use-workspace-daemon-session.ts",
  "use-workspace-operation.ts",
  "use-workspace-project-reads.ts",
  "use-workspace-status.ts",
  "workspace-command-options.ts",
  "workspace-composition.ts",
  "workspace-view-registry.tsx",
]);
const SHARED_ROOT_MODULES = new Set(["neutron-digest-display.ts"]);
const DUMPING_GROUND_NAMES = new Set([
  "helpers.ts",
  "index.ts",
  "index.tsx",
  "shared.ts",
  "utils.ts",
]);

describe("desktop Neutron boundaries", () => {
  it("keeps the Neutron root to composition and shared presentation", () => {
    const entries = listEntries(neutronRoot);
    expect(entries.files).toEqual(NEUTRON_ROOT_FILES);
    expect(entries.directories).toEqual(TOP_DIRECTORIES);
  });

  it("keeps mutation subfeatures and their shared contracts explicit", () => {
    const entries = listEntries(join(neutronRoot, "mutation"));
    expect(entries.directories).toEqual(MUTATION_DIRECTORIES);
    expect(entries.files).toEqual(MUTATION_ROOT_FILES);
  });

  it("has the semantic Neutron subfeatures and no dumping-ground modules", () => {
    for (const id of SUBFEATURES) {
      expect(statSync(join(neutronRoot, id)).isDirectory()).toBe(true);
    }
    const dumped = walkSources(neutronRoot)
      .map((file) => file.slice(file.lastIndexOf("/") + 1))
      .filter((name) => DUMPING_GROUND_NAMES.has(name));
    expect(dumped).toEqual([]);
  });

  it("limits Workspace to explicit subfeature public surfaces", () => {
    const workspace = join(neutronRoot, "NeutronWorkspace.tsx");
    const sources = sourceIndex(walkSources(desktopSrc));
    const imported = neutronImports(workspace, sources).sort();
    expect(imported).toEqual([...WORKSPACE_SURFACES].sort());
  });

  it("allows only recorded cross-subfeature imports", () => {
    expect(crossSubfeatureEdges()).toEqual(CROSS_SUBFEATURE_IMPORTS);
  });

  it("has no cycles among Neutron subfeatures", () => {
    expect(subfeatureCycles(crossSubfeatureEdges())).toEqual([]);
  });

  it("keeps Neutron off shell, forbidden packages, and other features", () => {
    const sources = sourceIndex(walkSources(desktopSrc));
    const violations: string[] = [];
    for (const file of walkSources(neutronRoot)) {
      recordNeutronImportViolations(file, sources, violations);
    }
    expect(violations).toEqual([]);
  });

  it("keeps design and client layers off Neutron internals", () => {
    const sources = sourceIndex(walkSources(desktopSrc));
    const violations: string[] = [];
    for (const file of walkSources(desktopSrc)) {
      const relativePath = desktopRelative(file);
      if (relativePath.startsWith("neutron/")) continue;
      recordOutsideNeutronViolation(file, relativePath, sources, violations);
    }
    expect(violations).toEqual([]);
  });
});

function listEntries(directory: string): {
  files: string[];
  directories: string[];
} {
  const files: string[] = [];
  const directories: string[] = [];
  for (const name of readdirSync(directory).sort()) {
    const path = join(directory, name);
    if (statSync(path).isDirectory()) directories.push(name);
    else files.push(name);
  }
  return { files, directories };
}

function toPosix(path: string): string {
  return path.split("\\").join("/");
}

function walkSources(directory: string, files: string[] = []): string[] {
  for (const name of readdirSync(directory)) {
    const path = join(directory, name);
    if (statSync(path).isDirectory()) walkSources(path, files);
    else if (name.endsWith(".ts") || name.endsWith(".tsx")) files.push(path);
  }
  return files;
}

function stem(path: string): string {
  return toPosix(path).replace(/\.(tsx?|js)$/, "");
}

function desktopRelative(path: string): string {
  return toPosix(relative(desktopSrc, path));
}

function neutronRelative(path: string): string {
  return toPosix(relative(neutronRoot, path));
}

function sourceIndex(files: readonly string[]): Map<string, string> {
  return new Map(files.map((file) => [stem(file), file]));
}

function importedSpecifiers(source: string): string[] {
  return [...source.matchAll(/(?:from|import)\s*(?:\(\s*)?["']([^"']+)["']/g)]
    .map((match) => match[1])
    .filter((specifier): specifier is string => specifier !== undefined);
}

function resolveRelative(
  fromFile: string,
  specifier: string,
  sources: Map<string, string>,
): string | null {
  if (!specifier.startsWith(".")) return null;
  return sources.get(stem(join(dirname(fromFile), specifier))) ?? null;
}

function subfeatureOf(relativePath: string): string | null {
  return SUBFEATURES.find((id) => relativePath.startsWith(`${id}/`)) ?? null;
}

function neutronImports(file: string, sources: Map<string, string>): string[] {
  const imported: string[] = [];
  for (const specifier of importedSpecifiers(readFileSync(file, "utf8"))) {
    const resolved = resolveRelative(file, specifier, sources);
    if (!resolved) continue;
    const target = desktopRelative(resolved);
    if (target.startsWith("neutron/")) imported.push(neutronRelative(resolved));
  }
  return imported;
}

function crossSubfeatureEdges(): string[] {
  const sources = sourceIndex(walkSources(desktopSrc));
  const edges = new Set<string>();
  for (const file of walkSources(neutronRoot)) {
    const owner = subfeatureOf(neutronRelative(file));
    if (!owner) continue;
    for (const target of neutronImports(file, sources)) {
      const other = subfeatureOf(target);
      if (other && other !== owner) edges.add(`${owner} -> ${target}`);
    }
  }
  return [...edges].sort();
}

function subfeatureCycles(edges: readonly string[]): string[] {
  const graph = new Map<string, string[]>();
  for (const edge of edges) {
    const [from, target] = edge.split(" -> ");
    const to = target ? subfeatureOf(target) : null;
    if (!from || !to) continue;
    graph.set(from, [...(graph.get(from) ?? []), to]);
  }
  const color = new Map<string, number>();
  const cycles: string[] = [];
  const visit = (node: string, stack: string[]): void => {
    color.set(node, 1);
    stack.push(node);
    for (const next of graph.get(node) ?? []) {
      const state = color.get(next) ?? 0;
      if (state === 1) {
        cycles.push(stack.slice(stack.indexOf(next)).concat(next).join(" -> "));
      } else if (state === 0) visit(next, stack);
    }
    stack.pop();
    color.set(node, 2);
  };
  for (const node of graph.keys()) {
    if ((color.get(node) ?? 0) === 0) visit(node, []);
  }
  return cycles;
}

function recordNeutronImportViolations(
  file: string,
  sources: Map<string, string>,
  violations: string[],
): void {
  const relativePath = neutronRelative(file);
  const owner = subfeatureOf(relativePath);
  for (const specifier of importedSpecifiers(readFileSync(file, "utf8"))) {
    if (FORBIDDEN_PACKAGES.some((pkg) => specifier.startsWith(pkg))) {
      violations.push(`${relativePath} imports ${specifier}`);
    }
    const resolved = resolveRelative(file, specifier, sources);
    if (!resolved) continue;
    recordResolvedNeutronImport(relativePath, owner, resolved, violations);
  }
}

function recordResolvedNeutronImport(
  relativePath: string,
  owner: string | null,
  resolved: string,
  violations: string[],
): void {
  const target = desktopRelative(resolved);
  const base = target.slice(target.lastIndexOf("/") + 1);
  if (SHELL_FILES.has(base) || SHELL_FILES.has(target)) {
    violations.push(`${relativePath} imports shell ${target}`);
  }
  if (target.startsWith("features/") || target.startsWith("views/")) {
    violations.push(`${relativePath} imports ${target}`);
  }
  if (!target.startsWith("neutron/")) return;
  const neutronTarget = neutronRelative(resolved);
  if (!owner) {
    if (
      relativePath !== "NeutronWorkspace.tsx" &&
      subfeatureOf(neutronTarget)
    ) {
      violations.push(`${relativePath} imports ${neutronTarget}`);
    }
    return;
  }
  if (isAllowedNeutronTarget(owner, neutronTarget)) return;
  violations.push(`${relativePath} imports ${neutronTarget}`);
}

function isAllowedNeutronTarget(owner: string, target: string): boolean {
  if (target === "NeutronWorkspace.tsx") return false;
  if (subfeatureOf(target) === owner) return true;
  if (subfeatureOf(target) === null && isAncestorModule(owner, target)) {
    return true;
  }
  if (SHARED_ROOT_MODULES.has(target)) return true;
  return CROSS_SUBFEATURE_IMPORTS.includes(`${owner} -> ${target}`);
}

function isAncestorModule(owner: string, target: string): boolean {
  const slash = target.lastIndexOf("/");
  const targetDir = slash === -1 ? "" : target.slice(0, slash);
  return targetDir.length > 0 && owner.startsWith(`${targetDir}/`);
}

function recordOutsideNeutronViolation(
  file: string,
  relativePath: string,
  sources: Map<string, string>,
  violations: string[],
): void {
  for (const specifier of importedSpecifiers(readFileSync(file, "utf8"))) {
    const resolved = resolveRelative(file, specifier, sources);
    if (!resolved) continue;
    const target = desktopRelative(resolved);
    if (!target.startsWith("neutron/")) continue;
    if (relativePath.startsWith("design/")) {
      violations.push(`${relativePath} imports ${target}`);
      continue;
    }
    if (relativePath.startsWith("desktop-client")) {
      if (stem(target) !== CLIENT_INTEGRATION) {
        violations.push(`${relativePath} imports ${target}`);
      }
      continue;
    }
    if (target !== "neutron/NeutronWorkspace.tsx") {
      violations.push(`${relativePath} imports ${target}`);
    }
  }
}
