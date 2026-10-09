import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import {
  basename,
  dirname,
  isAbsolute,
  join,
  relative,
  resolve,
  sep,
} from "node:path";
import { describe, expect, it } from "vitest";

const applicationSrc = join("packages", "application", "src");
const neutronRoot = resolve(applicationSrc, "neutron");

const TOP_DIRECTORIES = [
  "context",
  "graph",
  "mutation",
  "scheduler",
  "session",
  "tools",
];
const ROOT_FILES = [
  "neutron-graph-mutation.ts",
  "neutron-n2-loop.ts",
  "neutron-runtime-contracts.ts",
  "neutron-scheduler.ts",
  "neutron-session-fingerprint.ts",
];
const MUTATION_DIRECTORIES = [
  "apply",
  "approval",
  "proposal",
  "review",
  "status",
  "undo",
  "verification",
];
const SHARED_ROOT_MODULES = new Set([
  "neutron-n2-loop.ts",
  "neutron-session-fingerprint.ts",
]);
const COMPOSITION_BARRELS = new Set([
  "neutron-graph-mutation.ts",
  "neutron-scheduler.ts",
]);
const DUMPING_GROUND_NAMES = new Set([
  "common.ts",
  "handlers.ts",
  "helpers.ts",
  "index.ts",
  "managers.ts",
  "misc.ts",
  "processors.ts",
  "services.ts",
  "shared.ts",
  "utils.ts",
]);
const FILE_CYCLE = [
  "mutation/apply/neutron-mutation-apply-durable-record.ts",
  "mutation/apply/neutron-mutation-apply-store.ts",
  "mutation/verification/neutron-mutation-verification-retry-eligibility.ts",
];
const CROSS_SUBFEATURE_IMPORTS = [
  "graph -> mutation/apply/neutron-graph-mutation-evidence.ts",
  "graph -> mutation/proposal/neutron-mutation-proposal-capability.ts",
  "graph -> mutation/review/neutron-graph-mutation-current.ts",
  "graph -> mutation/review/neutron-graph-mutation-store.ts",
  "graph -> scheduler/neutron-scheduler-attempt.ts",
  "graph -> scheduler/neutron-scheduler-graph-result.ts",
  "graph -> scheduler/neutron-scheduler-provenance.ts",
  "graph -> scheduler/neutron-scheduler-select.ts",
  "graph -> scheduler/neutron-scheduler-sort.ts",
  "graph -> scheduler/neutron-scheduler-stale.ts",
  "graph -> scheduler/neutron-scheduler-wave-types.ts",
  "graph -> scheduler/node/neutron-node-execution.ts",
  "graph -> scheduler/node/neutron-node-result.ts",
  "mutation -> context/neutron-context-secret-paths.ts",
  "mutation -> scheduler/neutron-scheduler-sort.ts",
  "mutation -> scheduler/neutron-scheduler-stale.ts",
  "scheduler -> context/neutron-context-assembly.ts",
  "scheduler -> tools/neutron-tool-router.ts",
  "session -> context/neutron-context-assembly.ts",
  "session -> graph/neutron-graph-mutation-attach.ts",
  "session -> graph/neutron-graph-mutation-collect.ts",
  "session -> graph/neutron-graph-mutation-materialize.ts",
  "session -> graph/neutron-graph-projection.ts",
  "session -> mutation/approval/neutron-mutation-approval-issue.ts",
  "session -> mutation/approval/neutron-mutation-approve-apply-public.ts",
  "session -> mutation/approval/neutron-mutation-approve-apply.ts",
  "session -> mutation/proposal/neutron-mutation-proposal-capability.ts",
  "session -> mutation/review/neutron-graph-mutation-current.ts",
  "session -> mutation/review/neutron-graph-mutation-store.ts",
  "session -> mutation/review/neutron-mutation-review-project.ts",
  "session -> mutation/status/neutron-mutation-status-read.ts",
  "session -> mutation/verification/neutron-mutation-verification-retry-run.ts",
  "session -> scheduler/neutron-scheduler-aggregate.ts",
  "session -> scheduler/neutron-scheduler-batch.ts",
  "session -> scheduler/neutron-scheduler-errors.ts",
  "session -> scheduler/neutron-scheduler-graph-result.ts",
  "session -> scheduler/neutron-scheduler-select.ts",
  "session -> scheduler/neutron-scheduler-stale.ts",
  "session -> scheduler/neutron-scheduler-wave-types.ts",
  "session -> tools/neutron-tool-registry.ts",
  "session -> tools/neutron-tool-router.ts",
];
const PACKAGE_EXPORTS: Readonly<Record<string, string>> = {
  "./neutron-context-assembly": "assembleNeutronContext",
  "./neutron-graph-mutation": "applyApprovedNeutronGraphMutation",
  "./neutron-n2": "runNeutronN2ReadOnlyLoop",
  "./neutron-n4": "routeNeutronToolInvocation",
  "./neutron-runtime": "prepareNeutronRuntimeContractSnapshot",
  "./neutron-scheduler": "approveAndApplyNeutronGraphMutation",
  "./neutron-session": "createNeutronSessionRuntime",
};

describe("application Neutron topology", () => {
  it("keeps Neutron root to entrypoints and Neutron-wide modules", () => {
    const entries = listEntries(neutronRoot);
    expect(entries.directories).toEqual(TOP_DIRECTORIES);
    expect(entries.files).toEqual(ROOT_FILES);
    expect(flatNeutronFiles()).toEqual([]);
  });

  it("keeps mutation stages and scheduler node explicit", () => {
    const mutation = listEntries(join(neutronRoot, "mutation"));
    expect(mutation.directories).toEqual(MUTATION_DIRECTORIES);
    expect(mutation.files).toEqual([]);
    const scheduler = listEntries(join(neutronRoot, "scheduler"));
    expect(scheduler.directories).toEqual(["node"]);
    expect(
      scheduler.files.every((name) => name.startsWith("neutron-scheduler-")),
    ).toBe(true);
    const node = listEntries(join(neutronRoot, "scheduler", "node"));
    expect(node.directories).toEqual([]);
    expect(node.files.every((name) => name.startsWith("neutron-node-"))).toBe(
      true,
    );
  });

  it("has no dumping-ground module names", () => {
    const dumped = walkSources(neutronRoot)
      .map((file) => basename(file))
      .filter((name) => DUMPING_GROUND_NAMES.has(name));
    expect(dumped).toEqual([]);
  });

  it("allows only recorded cross-subfeature imports", () => {
    expect(crossSubfeatureEdges()).toEqual(CROSS_SUBFEATURE_IMPORTS);
  });

  it("has no cycles among Neutron subfeatures", () => {
    expect(subfeatureCycles(crossSubfeatureEdges())).toEqual([]);
  });

  it("keeps the only file-level cycle inside mutation", () => {
    expect(fileCycles()).toEqual([FILE_CYCLE]);
  });

  it("lets subfeatures import shared root modules only", () => {
    expect(subfeatureRootImports().toSorted()).toEqual(
      [
        "mutation/apply/neutron-mutation-apply-after-claim.ts => neutron-session-fingerprint.ts",
        "mutation/verification/neutron-mutation-verification-state.ts => neutron-session-fingerprint.ts",
        "scheduler/node/neutron-node-execution.ts => neutron-n2-loop.ts",
        "scheduler/node/neutron-node-result.ts => neutron-n2-loop.ts",
        "scheduler/node/neutron-node-run.ts => neutron-n2-loop.ts",
        "session/neutron-session-runtime.ts => neutron-session-fingerprint.ts",
        "session/neutron-session-turn.ts => neutron-n2-loop.ts",
      ].toSorted(),
    );
  });

  it("keeps shared root modules from importing higher Neutron areas", () => {
    expect(neutronImports(join(neutronRoot, "neutron-n2-loop.ts"))).toEqual([
      "context/neutron-context-assembly.ts",
      "context/neutron-n2-context-hook.ts",
      "tools/neutron-tool-registry.ts",
    ]);
    expect(
      neutronImports(join(neutronRoot, "neutron-session-fingerprint.ts")),
    ).toEqual([]);
    expect(
      neutronImports(join(neutronRoot, "neutron-runtime-contracts.ts")),
    ).toEqual([]);
  });

  it("keeps Neutron off CLI, daemon, Desktop, React, and Tauri", () => {
    const violations: string[] = [];
    for (const file of walkSources(neutronRoot)) {
      for (const specifier of importedSpecifiers(readFileSync(file, "utf8"))) {
        if (isForbiddenSpecifier(specifier)) {
          violations.push(`${neutronRelative(file)} imports ${specifier}`);
        }
      }
    }
    expect(violations).toEqual([]);
    expect(
      [...COMPOSITION_BARRELS].every((name) =>
        existsSync(join(neutronRoot, name)),
      ),
    ).toBe(true);
  });

  it("keeps the package Neutron subpaths on the moved entrypoints", () => {
    const manifest = JSON.parse(
      readFileSync(join("packages", "application", "package.json"), "utf8"),
    ) as { exports: Record<string, string> };
    for (const [subpath, symbol] of Object.entries(PACKAGE_EXPORTS)) {
      const target = manifest.exports[subpath] ?? "";
      expect(target.endsWith(".ts")).toBe(true);
      const file = nativePathFromPosix(
        "packages/application",
        target.slice("./".length),
      );
      expect(existsSync(file)).toBe(true);
      expect(readFileSync(file, "utf8")).toContain(symbol);
    }
  });
});

function listEntries(directory: string): {
  files: string[];
  directories: string[];
} {
  const files: string[] = [];
  const directories: string[] = [];
  for (const name of readdirSync(directory).toSorted()) {
    const path = join(directory, name);
    if (statSync(path).isDirectory()) directories.push(name);
    else files.push(name);
  }
  return { files, directories };
}

function flatNeutronFiles(): string[] {
  return readdirSync(applicationSrc)
    .filter((name) => name.startsWith("neutron-"))
    .toSorted();
}

function toPosix(filePath: string): string {
  return filePath.split(sep).join("/").split("\\").join("/");
}

function nativePathFromPosix(...posixSegments: readonly string[]): string {
  const parts = posixSegments.flatMap((segment) => segment.split("/"));
  return join(...parts.filter((part) => part.length > 0 && part !== "."));
}

function isInsideNeutron(candidate: string): boolean {
  const rel = relative(neutronRoot, candidate);
  if (rel === "" || isAbsolute(rel)) return false;
  return rel !== ".." && !rel.startsWith(`..${sep}`);
}

function walkSources(directory: string, files: string[] = []): string[] {
  for (const name of readdirSync(directory)) {
    const path = join(directory, name);
    if (statSync(path).isDirectory()) walkSources(path, files);
    else if (name.endsWith(".ts") || name.endsWith(".tsx")) files.push(path);
  }
  return files;
}

function neutronRelative(path: string): string {
  return toPosix(relative(neutronRoot, path));
}

function importedSpecifiers(source: string): string[] {
  return [...source.matchAll(/(?:from|import)\s*(?:\(\s*)?["']([^"']+)["']/g)]
    .map((match) => match[1])
    .filter((specifier): specifier is string => specifier !== undefined);
}

function resolveSpecifier(fromFile: string, specifier: string): string | null {
  if (!specifier.startsWith(".")) return null;
  const lexical = resolve(dirname(fromFile), specifier);
  const candidates = [lexical];
  if (lexical.endsWith(".js")) {
    const stem = lexical.slice(0, -3);
    candidates.push(`${stem}.ts`, `${stem}.tsx`);
  }
  return candidates.find((candidate) => existsSync(candidate)) ?? null;
}

function subfeatureOf(relativePath: string): string | null {
  if (!relativePath.includes("/")) return null;
  if (relativePath.startsWith("scheduler/")) return "scheduler";
  const top = relativePath.split("/")[0] ?? "";
  return TOP_DIRECTORIES.includes(top) ? top : null;
}

function neutronImports(file: string): string[] {
  const imported: string[] = [];
  for (const specifier of importedSpecifiers(readFileSync(file, "utf8"))) {
    const resolved = resolveSpecifier(file, specifier);
    if (resolved === null || !isInsideNeutron(resolved)) continue;
    imported.push(neutronRelative(resolved));
  }
  return imported.toSorted();
}

function isArchitectureRootModule(architectureId: string): boolean {
  return basename(architectureId) === architectureId;
}

function crossSubfeatureEdges(): string[] {
  const edges = new Set<string>();
  for (const file of walkSources(neutronRoot)) {
    const owner = subfeatureOf(neutronRelative(file));
    if (!owner) continue;
    for (const target of neutronImports(file)) {
      const other = subfeatureOf(target);
      if (other && other !== owner) edges.add(`${owner} -> ${target}`);
    }
  }
  return [...edges].toSorted();
}

function subfeatureRootImports(): string[] {
  const imports: string[] = [];
  for (const file of walkSources(neutronRoot)) {
    const relativePath = neutronRelative(file);
    if (!subfeatureOf(relativePath)) continue;
    for (const target of neutronImports(file)) {
      if (!isArchitectureRootModule(target)) continue;
      if (!SHARED_ROOT_MODULES.has(target)) {
        imports.push(`FORBIDDEN ${relativePath} => ${target}`);
      } else {
        imports.push(`${relativePath} => ${target}`);
      }
    }
  }
  return imports;
}

function subfeatureCycles(edges: readonly string[]): string[] {
  const graph = new Map<string, string[]>();
  for (const edge of edges) {
    const [from, target] = edge.split(" -> ");
    const to = target ? subfeatureOf(target) : null;
    if (!from || !to) continue;
    graph.set(from, [...(graph.get(from) ?? []), to]);
  }
  return directedCycles([...graph.keys()], (node) => graph.get(node) ?? []);
}

function neutronSourcePath(architectureId: string): string {
  return join(neutronRoot, ...architectureId.split("/"));
}

function fileCycles(): string[][] {
  const files = walkSources(neutronRoot).map((file) => neutronRelative(file));
  const known = new Set(files);
  const imports = new Map<string, string[]>();
  for (const architectureId of files) {
    imports.set(
      architectureId,
      neutronImports(neutronSourcePath(architectureId)).filter((dep) =>
        known.has(dep),
      ),
    );
  }
  return stronglyConnectedComponents(files, (node) => imports.get(node) ?? []);
}

function stronglyConnectedComponents(
  nodes: readonly string[],
  dependencies: (node: string) => readonly string[],
): string[][] {
  const index = new Map<string, number>();
  const low = new Map<string, number>();
  const stack: string[] = [];
  const onStack = new Set<string>();
  const components: string[][] = [];
  let next = 0;
  const strong = (node: string): void => {
    index.set(node, next);
    low.set(node, next);
    next += 1;
    stack.push(node);
    onStack.add(node);
    for (const dependency of dependencies(node)) {
      if (!index.has(dependency)) {
        strong(dependency);
        low.set(node, Math.min(low.get(node) ?? 0, low.get(dependency) ?? 0));
      } else if (onStack.has(dependency)) {
        low.set(node, Math.min(low.get(node) ?? 0, index.get(dependency) ?? 0));
      }
    }
    collectFinishedComponent(node, index, low, stack, onStack, components);
  };
  for (const node of nodes) {
    if (!index.has(node)) strong(node);
  }
  return components.toSorted((left, right) =>
    left.join().localeCompare(right.join()),
  );
}

function collectFinishedComponent(
  node: string,
  index: ReadonlyMap<string, number>,
  low: ReadonlyMap<string, number>,
  stack: string[],
  onStack: Set<string>,
  components: string[][],
): void {
  if (low.get(node) !== index.get(node)) return;
  const component: string[] = [];
  let cursor = "";
  do {
    cursor = stack.pop() ?? "";
    onStack.delete(cursor);
    component.push(cursor);
  } while (cursor !== node);
  if (component.length > 1) components.push(component.toSorted());
}

function directedCycles(
  nodes: readonly string[],
  nextNodes: (node: string) => readonly string[],
): string[] {
  const color = new Map<string, number>();
  const cycles: string[] = [];
  const visit = (node: string, stack: string[]): void => {
    color.set(node, 1);
    stack.push(node);
    for (const next of nextNodes(node)) {
      const state = color.get(next) ?? 0;
      if (state === 1) {
        cycles.push(stack.slice(stack.indexOf(next)).concat(next).join(" -> "));
      } else if (state === 0) visit(next, stack);
    }
    stack.pop();
    color.set(node, 2);
  };
  for (const node of nodes) {
    if ((color.get(node) ?? 0) === 0) visit(node, []);
  }
  return cycles;
}

function isForbiddenSpecifier(specifier: string): boolean {
  if (specifier === "react" || specifier.startsWith("react/")) return true;
  if (specifier === "react-dom" || specifier.startsWith("react-dom/"))
    return true;
  if (specifier.startsWith("@tauri-apps/")) return true;
  if (specifier.startsWith("@intentloom/cli")) return true;
  if (specifier.startsWith("@intentloom/daemon")) return true;
  return (
    specifier.includes("/packages/cli/") ||
    specifier.includes("/packages/daemon/") ||
    specifier.includes("/apps/desktop/")
  );
}
