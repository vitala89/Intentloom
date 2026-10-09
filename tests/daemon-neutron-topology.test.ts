import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { describe, expect, it } from "vitest";

const daemonSrc = join("packages", "daemon", "src");
const neutronRoot = resolve(daemonSrc, "neutron");
const TOP_DIRECTORIES = ["graph", "mutation", "session"];
const MUTATION_DIRECTORIES = ["approval", "review", "status", "verification"];
const CROSS_SUBFEATURE_IMPORTS = [
  "session -> graph/neutron-graph-handlers.ts",
  "session -> mutation/approval/neutron-mutation-approve-apply-handlers.ts",
  "session -> mutation/review/neutron-mutation-review-handlers.ts",
  "session -> mutation/status/neutron-mutation-status-handlers.ts",
  "session -> mutation/verification/neutron-mutation-verification-retry-handlers.ts",
];
const DISPATCH_IMPORTS = [
  "mutation/approval/neutron-mutation-approve-apply-handlers.ts",
  "mutation/review/neutron-mutation-review-handlers.ts",
  "mutation/status/neutron-mutation-status-handlers.ts",
  "mutation/verification/neutron-mutation-verification-retry-handlers.ts",
  "session/neutron-session-handlers.ts",
];
const HOST_RUNTIME =
  "packages/application/src/neutron/session/neutron-session-runtime.ts";
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

describe("daemon Neutron topology", () => {
  it("keeps Neutron handlers in semantic directories", () => {
    const entries = listEntries(neutronRoot);
    expect(entries.directories).toEqual(TOP_DIRECTORIES);
    expect(entries.files).toEqual(["neutron-workspace-dispatch.ts"]);
    expect(flatNeutronFiles()).toEqual([]);
    expect(listEntries(join(neutronRoot, "session")).files).toEqual([
      "neutron-session-handlers.ts",
    ]);
    expect(listEntries(join(neutronRoot, "graph")).files).toEqual([
      "neutron-graph-handlers.ts",
    ]);
  });

  it("keeps mutation handler families separate", () => {
    const mutation = listEntries(join(neutronRoot, "mutation"));
    expect(mutation.directories).toEqual(MUTATION_DIRECTORIES);
    expect(mutation.files).toEqual([]);
    expect(
      listEntries(join(neutronRoot, "mutation", "approval")).files,
    ).toEqual(["neutron-mutation-approve-apply-handlers.ts"]);
    expect(listEntries(join(neutronRoot, "mutation", "review")).files).toEqual([
      "neutron-mutation-review-handlers.ts",
    ]);
    expect(listEntries(join(neutronRoot, "mutation", "status")).files).toEqual([
      "neutron-mutation-status-handlers.ts",
    ]);
    expect(
      listEntries(join(neutronRoot, "mutation", "verification")).files,
    ).toEqual(["neutron-mutation-verification-retry-handlers.ts"]);
    expect(mutationStageEdges()).toEqual([]);
  });

  it("has no dumping-ground module or barrel", () => {
    const names = walkSources(neutronRoot).map((file) =>
      file.slice(file.lastIndexOf(sep) + 1),
    );
    expect(names.filter((name) => DUMPING_GROUND_NAMES.has(name))).toEqual([]);
    expect(names.filter((name) => name === "index.ts")).toEqual([]);
  });

  it("composes handlers from the workspace dispatcher", () => {
    expect(
      neutronImports(join(neutronRoot, "neutron-workspace-dispatch.ts")),
    ).toEqual(DISPATCH_IMPORTS);
    const importers = walkSources(neutronRoot)
      .filter((file) =>
        neutronImports(file).includes("neutron-workspace-dispatch.ts"),
      )
      .map((file) => neutronRelative(file));
    expect(importers).toEqual([]);
  });

  it("allows only recorded cross-subfeature imports", () => {
    expect(crossSubfeatureEdges()).toEqual(CROSS_SUBFEATURE_IMPORTS);
  });

  it("has no cycles among Neutron subfeatures or files", () => {
    expect(subfeatureCycles(crossSubfeatureEdges())).toEqual([]);
    expect(fileCycles()).toEqual([]);
  });

  it("binds handlers only to protocol and the host session runtime", () => {
    expect(dependencyViolations()).toEqual([]);
  });

  it("normalizes architecture ids to POSIX paths", () => {
    expect(
      toPosix("mutation\\approval\\neutron-mutation-approve-apply-handlers.ts"),
    ).toBe("mutation/approval/neutron-mutation-approve-apply-handlers.ts");
    const nested = join(
      neutronRoot,
      "mutation",
      "approval",
      "neutron-mutation-approve-apply-handlers.ts",
    );
    const rel = relative(neutronRoot, nested);
    expect(rel === ".." || rel.startsWith(`..${sep}`)).toBe(false);
    expect(toPosix(rel)).toBe(
      "mutation/approval/neutron-mutation-approve-apply-handlers.ts",
    );
    expect(
      walkSources(neutronRoot).every(
        (file) => !neutronRelative(file).includes("\\"),
      ),
    ).toBe(true);
    expect(isInsideNeutron(resolve(daemonSrc, "index.ts"))).toBe(false);
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
  return readdirSync(daemonSrc)
    .filter((name) => name.startsWith("neutron-"))
    .toSorted();
}

function toPosix(filePath: string): string {
  return filePath.split(sep).join("/").split("\\").join("/");
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

function repoRelative(path: string): string {
  return toPosix(relative(resolve("."), path));
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
  const top = relativePath.split("/")[0] ?? "";
  return TOP_DIRECTORIES.includes(top) ? top : null;
}

function mutationStageOf(relativePath: string): string | null {
  if (!relativePath.startsWith("mutation/")) return null;
  const parts = relativePath.split("/");
  return parts.length >= 3 ? (parts[1] ?? null) : "mutation";
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

function mutationStageEdges(): string[] {
  const edges = new Set<string>();
  for (const file of walkSources(neutronRoot)) {
    const owner = mutationStageOf(neutronRelative(file));
    if (!owner) continue;
    for (const target of neutronImports(file)) {
      const other = mutationStageOf(target);
      if (other && other !== owner) edges.add(`${owner} -> ${target}`);
    }
  }
  return [...edges].toSorted();
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

function dependencyViolations(): string[] {
  const violations: string[] = [];
  for (const file of walkSources(neutronRoot)) {
    const owner = neutronRelative(file);
    for (const specifier of importedSpecifiers(readFileSync(file, "utf8"))) {
      const resolved = resolveSpecifier(file, specifier);
      if (resolved !== null && isInsideNeutron(resolved)) continue;
      if (isAllowedOutside(owner, specifier, resolved)) continue;
      violations.push(`${owner} imports ${specifier}`);
    }
  }
  return violations.toSorted();
}

function isAllowedOutside(
  owner: string,
  specifier: string,
  resolved: string | null,
): boolean {
  if (isForbiddenSpecifier(specifier)) return false;
  if (specifier === "@intentloom/protocol") return true;
  if (specifier === "node:net")
    return owner === "neutron-workspace-dispatch.ts";
  if (resolved === null) return false;
  const target = repoRelative(resolved);
  if (target === HOST_RUNTIME) return true;
  return (
    owner === "neutron-workspace-dispatch.ts" &&
    target === "packages/daemon/src/daemon-canonical-root.ts"
  );
}

function isForbiddenSpecifier(specifier: string): boolean {
  if (specifier === "fs" || specifier === "node:fs") return true;
  if (specifier === "node:fs/promises" || specifier.startsWith("node:fs/")) {
    return true;
  }
  if (specifier === "node:http" || specifier === "node:https") return true;
  if (specifier === "react" || specifier.startsWith("react/")) return true;
  if (specifier === "react-dom" || specifier.startsWith("react-dom/")) {
    return true;
  }
  if (specifier.startsWith("@tauri-apps/")) return true;
  if (specifier.startsWith("@intentloom/validator")) return true;
  if (specifier.startsWith("@intentloom/cli")) return true;
  return (
    specifier.includes("/packages/cli/") ||
    specifier.includes("/packages/validator/") ||
    specifier.includes("/apps/desktop/")
  );
}
