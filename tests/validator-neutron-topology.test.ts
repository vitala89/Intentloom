import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { describe, expect, it } from "vitest";

const validatorSrc = join("packages", "validator", "src");
const neutronRoot = resolve(validatorSrc, "neutron");
const TOP_DIRECTORIES = ["graph", "mutation", "runtime", "session"];
const MUTATION_DIRECTORIES = [
  "apply",
  "approval",
  "proposal",
  "review",
  "verification",
];
const MUTATION_ROOT_FILES = [
  "neutron-mutation-canonical.ts",
  "neutron-mutation-digest.ts",
  "neutron-mutation-path-set.ts",
  "neutron-mutation-transaction-record.ts",
  "neutron-mutation.ts",
];
const PRIVATE_IMPLEMENTATION = [
  "mutation/review/neutron-mutation-review-rpc-helpers.ts",
  "runtime/neutron-runtime-helpers.ts",
];
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
const CROSS_SUBFEATURE_IMPORTS = [
  "graph -> runtime/neutron-runtime-helpers.ts",
  "mutation -> runtime/neutron-runtime-helpers.ts",
  "session -> graph/neutron-graph.ts",
  "session -> mutation/neutron-mutation.ts",
  "session -> runtime/neutron-runtime-helpers.ts",
  "session -> runtime/neutron-runtime-n2.ts",
  "session -> runtime/neutron-runtime.ts",
];
const MUTATION_STAGE_IMPORTS = [
  "apply -> mutation/neutron-mutation-canonical.ts",
  "apply -> mutation/verification/neutron-mutation-verification.ts",
  "approval -> mutation/neutron-mutation-canonical.ts",
  "approval -> mutation/neutron-mutation-digest.ts",
  "mutation -> mutation/apply/neutron-mutation-apply.ts",
  "mutation -> mutation/approval/neutron-mutation-approval-intent.ts",
  "mutation -> mutation/approval/neutron-mutation-approval.ts",
  "mutation -> mutation/proposal/neutron-mutation-proposal-candidate.ts",
  "mutation -> mutation/review/neutron-mutation-review-artifact.ts",
  "mutation -> mutation/review/neutron-mutation-review-digest.ts",
  "mutation -> mutation/review/neutron-mutation-review-rpc.ts",
  "mutation -> mutation/verification/neutron-mutation-verification-digest.ts",
  "mutation -> mutation/verification/neutron-mutation-verification.ts",
  "proposal -> mutation/neutron-mutation-canonical.ts",
  "review -> mutation/neutron-mutation-canonical.ts",
  "review -> mutation/neutron-mutation-path-set.ts",
  "verification -> mutation/neutron-mutation-canonical.ts",
];
const PACKAGE_EXPORTS: Readonly<Record<string, string>> = {
  ".": "./src/index.ts",
  "./model-adapter": "./src/model-adapter.ts",
  "./neutron-runtime": "./src/neutron/runtime/neutron-runtime.ts",
  "./neutron-mutation": "./src/neutron/mutation/neutron-mutation.ts",
  "./neutron-session": "./src/neutron/session/neutron-session-rpc.ts",
  "./neutron-graph": "./src/neutron/graph/neutron-graph.ts",
  "./neutron-runtime-n2": "./src/neutron/runtime/neutron-runtime-n2.ts",
  "./neutron-runtime-n3": "./src/neutron/runtime/neutron-runtime-n3.ts",
  "./engineering-assessment": "./src/engineering-assessment.ts",
  "./engineering-quality": "./src/engineering-quality.ts",
};
const EXPORT_SYMBOLS: Readonly<Record<string, string>> = {
  "./neutron-runtime": "validateNeutronRuntimeSession",
  "./neutron-mutation": "validateNeutronMutationProposal",
  "./neutron-session": "validateNeutronSessionViewmodel",
  "./neutron-graph": "validateNeutronGraphSnapshot",
  "./neutron-runtime-n2": "NeutronN2Error",
  "./neutron-runtime-n3": "validateAssembleNeutronContextRequest",
};
const ALLOWED_PACKAGE_SPECIFIERS = new Set([
  "@intentloom/core",
  "@intentloom/protocol",
]);

describe("validator Neutron topology", () => {
  it("keeps Neutron validation in semantic directories", () => {
    const entries = listEntries(neutronRoot);
    expect(entries.directories).toEqual(TOP_DIRECTORIES);
    expect(entries.files).toEqual([]);
    expect(flatNeutronFiles()).toEqual([]);
    expect(listEntries(join(neutronRoot, "runtime")).files).toEqual([
      "neutron-runtime-helpers.ts",
      "neutron-runtime-n2.ts",
      "neutron-runtime-n3.ts",
      "neutron-runtime-records.ts",
      "neutron-runtime.ts",
    ]);
    expect(listEntries(join(neutronRoot, "session")).files).toEqual([
      "neutron-session-activity.ts",
      "neutron-session-rpc.ts",
    ]);
    expect(listEntries(join(neutronRoot, "graph")).files).toEqual([
      "neutron-graph-fields.ts",
      "neutron-graph.ts",
    ]);
  });

  it("keeps mutation lifecycle stages explicit", () => {
    const mutation = listEntries(join(neutronRoot, "mutation"));
    expect(mutation.directories).toEqual(MUTATION_DIRECTORIES);
    expect(mutation.files).toEqual(MUTATION_ROOT_FILES);
    expect(
      listEntries(join(neutronRoot, "mutation", "proposal")).files,
    ).toEqual(["neutron-mutation-proposal-candidate.ts"]);
    expect(
      listEntries(join(neutronRoot, "mutation", "approval")).files,
    ).toEqual([
      "neutron-mutation-approval-intent.ts",
      "neutron-mutation-approval.ts",
    ]);
    expect(listEntries(join(neutronRoot, "mutation", "apply")).files).toEqual([
      "neutron-mutation-apply.ts",
    ]);
    expect(
      listEntries(join(neutronRoot, "mutation", "verification")).files,
    ).toEqual([
      "neutron-mutation-verification-digest.ts",
      "neutron-mutation-verification.ts",
    ]);
    for (const stage of MUTATION_DIRECTORIES) {
      expect(
        listEntries(join(neutronRoot, "mutation", stage)).directories,
      ).toEqual([]);
    }
  });

  it("has no dumping-ground module or barrel", () => {
    const names = walkSources(neutronRoot).map((file) =>
      file.slice(file.lastIndexOf(sep) + 1),
    );
    expect(names.filter((name) => DUMPING_GROUND_NAMES.has(name))).toEqual([]);
    expect(names.filter((name) => name === "index.ts")).toEqual([]);
    expect(
      walkSources(neutronRoot)
        .map((file) => neutronRelative(file))
        .filter((file) => file.split("/").pop()?.includes("helpers"))
        .toSorted(),
    ).toEqual(PRIVATE_IMPLEMENTATION);
  });

  it("allows only recorded cross-subfeature imports", () => {
    expect(crossSubfeatureEdges()).toEqual(CROSS_SUBFEATURE_IMPORTS);
  });

  it("allows only recorded mutation-stage imports", () => {
    expect(mutationStageEdges()).toEqual(MUTATION_STAGE_IMPORTS);
  });

  it("has no cycles among Neutron subfeatures or files", () => {
    expect(subfeatureCycles(crossSubfeatureEdges())).toEqual([]);
    expect(fileCycles()).toEqual([]);
  });

  it("keeps runtime free of session, graph, and mutation imports", () => {
    const runtimeImports = walkSources(join(neutronRoot, "runtime")).flatMap(
      (file) => neutronImports(file),
    );
    expect(
      runtimeImports.every((target) => target.startsWith("runtime/")),
    ).toBe(true);
  });

  it("keeps Neutron validation on core and protocol only", () => {
    expect(dependencyViolations()).toEqual([]);
  });

  it("normalizes architecture ids to POSIX paths", () => {
    expect(toPosix("mutation\\approval\\neutron-mutation-approval.ts")).toBe(
      "mutation/approval/neutron-mutation-approval.ts",
    );
    const nested = join(
      neutronRoot,
      "mutation",
      "approval",
      "neutron-mutation-approval.ts",
    );
    const rel = relative(neutronRoot, nested);
    expect(rel === ".." || rel.startsWith(`..${sep}`)).toBe(false);
    expect(toPosix(rel)).toBe("mutation/approval/neutron-mutation-approval.ts");
    expect(
      walkSources(neutronRoot).every(
        (file) => !neutronRelative(file).includes("\\"),
      ),
    ).toBe(true);
    expect(isInsideNeutron(resolve(validatorSrc, "index.ts"))).toBe(false);
  });

  it("keeps public package subpath names and targets", () => {
    const manifest = JSON.parse(
      readFileSync(join("packages", "validator", "package.json"), "utf8"),
    ) as { exports: Record<string, string> };
    expect(manifest.exports).toEqual(PACKAGE_EXPORTS);
    for (const [subpath, symbol] of Object.entries(EXPORT_SYMBOLS)) {
      const target = manifest.exports[subpath] ?? "";
      const file = nativePathFromPosix("packages/validator", target.slice(2));
      expect(existsSync(file)).toBe(true);
      expect(readFileSync(file, "utf8")).toContain(symbol);
    }
    const index = readFileSync(join(validatorSrc, "index.ts"), "utf8");
    expect(index.includes('from "./neutron')).toBe(false);
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
  return readdirSync(validatorSrc)
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
    for (const specifier of importedSpecifiers(readFileSync(file, "utf8"))) {
      const resolved = resolveSpecifier(file, specifier);
      if (resolved !== null && isInsideNeutron(resolved)) continue;
      if (isAllowedOutside(specifier, resolved)) continue;
      violations.push(`${neutronRelative(file)} imports ${specifier}`);
    }
  }
  return violations.toSorted();
}

function isAllowedOutside(specifier: string, resolved: string | null): boolean {
  if (isForbiddenSpecifier(specifier)) return false;
  if (ALLOWED_PACKAGE_SPECIFIERS.has(specifier)) return true;
  if (resolved === null) return false;
  const target = repoRelative(resolved);
  if (target.startsWith("packages/protocol/")) return true;
  return (
    target === "packages/validator/src/approved-apply.ts" ||
    target === "packages/validator/src/engineering-assessment/common.ts"
  );
}

function isForbiddenSpecifier(specifier: string): boolean {
  if (specifier === "fs" || specifier === "node:fs") return true;
  if (specifier === "node:fs/promises" || specifier.startsWith("node:fs/")) {
    return true;
  }
  if (
    specifier === "node:net" ||
    specifier === "node:http" ||
    specifier === "node:https"
  ) {
    return true;
  }
  if (specifier === "react" || specifier.startsWith("react/")) return true;
  if (specifier === "react-dom" || specifier.startsWith("react-dom/")) {
    return true;
  }
  if (specifier.startsWith("@tauri-apps/")) return true;
  if (specifier.startsWith("@intentloom/application")) return true;
  if (specifier.startsWith("@intentloom/cli")) return true;
  if (specifier.startsWith("@intentloom/daemon")) return true;
  return (
    specifier.includes("/packages/cli/") ||
    specifier.includes("/packages/daemon/") ||
    specifier.includes("/packages/application/") ||
    specifier.includes("/apps/desktop/")
  );
}
