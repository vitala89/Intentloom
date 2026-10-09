import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { describe, expect, it } from "vitest";

const desktopSrc = join("apps", "desktop", "src");

/** Root files allowed to remain in views/ after Desktop Architecture R1. */
const PERMITTED_VIEW_ROOT_FILES = [
  "BoundedExecutionResultCards.tsx",
  "BoundedExecutionView.tsx",
  "CommandPaletteModal.tsx",
  "ContinuousLoopResultCards.tsx",
  "ContinuousLoopView.tsx",
  "DiffView.tsx",
  "DoctorView.tsx",
  "FeatureIntentView.tsx",
  "InspectView.tsx",
  "NewProjectView.tsx",
  "OpenExistingProjectView.tsx",
  "OverviewView.tsx",
  "SettingsView.tsx",
  "TimelineView.tsx",
  "bounded-execution-view-helpers.ts",
  "command-registry.ts",
  "continuous-loop-view-helpers.ts",
  "extension-settings.ts",
  "panel-registry.ts",
  "view-sandbox-protocol.ts",
];

/** Neutron subfeatures are ratcheted in desktop-neutron-boundaries.test.ts. */
const FEATURE_ROOTS = [
  "features/adoption/",
  "features/foundation/",
  "features/external-specialized-pack/",
] as const;

const FORBIDDEN_FEATURE_PACKAGES = [
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

const SHELL_FEATURE_ENTRYPOINTS = new Set([
  "features/adoption/AdoptionPreviewPage",
  "features/foundation/workshop/FoundationWorkshopView",
  "features/external-specialized-pack/ExternalSpecializedPackPreviewPage",
]);

/** Narrow, domain-named modules that outside code may import. */
const FEATURE_INTEGRATION_SURFACES = new Set([
  "features/external-specialized-pack/external-specialized-pack-doctor-integration",
]);

const PUBLIC_FEATURE_SURFACES = new Set([
  ...SHELL_FEATURE_ENTRYPOINTS,
  ...FEATURE_INTEGRATION_SURFACES,
]);

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
  const base = stem(join(dirname(fromFile), specifier));
  return sources.get(base) ?? null;
}

function featureRoot(relativePath: string): string | null {
  return FEATURE_ROOTS.find((root) => relativePath.startsWith(root)) ?? null;
}

describe("desktop feature boundaries", () => {
  it("keeps new feature files out of the views root", () => {
    const entries = readdirSync(join(desktopSrc, "views"));
    const files = entries.filter((name) =>
      statSync(join(desktopSrc, "views", name)).isFile(),
    );
    const directories = entries.filter((name) =>
      statSync(join(desktopSrc, "views", name)).isDirectory(),
    );
    expect(directories).toEqual([]);
    expect([...files].sort()).toEqual([...PERMITTED_VIEW_ROOT_FILES].sort());
  });

  it("has no cycles inside feature modules", () => {
    const files = walkSources(desktopSrc);
    expect(collectFeatureCycles(files)).toEqual([]);
  });

  it("keeps feature imports on the desktop client boundary", () => {
    const files = walkSources(desktopSrc);
    const sources = sourceIndex(files);
    const violations: string[] = [];
    for (const file of files) {
      const relativePath = desktopRelative(file);
      const owner = featureRoot(relativePath);
      if (!owner) continue;
      for (const specifier of importedSpecifiers(readFileSync(file, "utf8"))) {
        recordFeatureImportViolation(
          relativePath,
          owner,
          specifier,
          resolveRelative(file, specifier, sources),
          violations,
        );
      }
    }
    expect(violations).toEqual([]);
  });

  it("keeps design, clients, and unrelated views out of feature internals", () => {
    const files = walkSources(desktopSrc);
    const sources = sourceIndex(files);
    const violations: string[] = [];
    for (const file of files) {
      const relativePath = desktopRelative(file);
      if (featureRoot(relativePath)) continue;
      for (const specifier of importedSpecifiers(readFileSync(file, "utf8"))) {
        const resolved = resolveRelative(file, specifier, sources);
        if (!resolved) continue;
        recordOutsideImportViolation(
          relativePath,
          desktopRelative(resolved),
          violations,
        );
      }
    }
    expect(violations).toEqual([]);
  });
});

function collectFeatureCycles(files: readonly string[]): string[] {
  const sources = sourceIndex(files);
  const graph = new Map<string, string[]>();
  for (const file of files) {
    if (!featureRoot(desktopRelative(file))) continue;
    graph.set(
      file,
      importedSpecifiers(readFileSync(file, "utf8"))
        .map((specifier) => resolveRelative(file, specifier, sources))
        .filter((resolved): resolved is string => resolved !== null)
        .filter((resolved) => featureRoot(desktopRelative(resolved)) !== null),
    );
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

function recordFeatureImportViolation(
  relativePath: string,
  owner: string,
  specifier: string,
  resolved: string | null,
  violations: string[],
): void {
  if (FORBIDDEN_FEATURE_PACKAGES.some((pkg) => specifier.startsWith(pkg))) {
    violations.push(`${relativePath} imports ${specifier}`);
  }
  if (!resolved) return;
  const target = desktopRelative(resolved);
  const targetFeature = featureRoot(target);
  if (targetFeature && targetFeature !== owner) {
    violations.push(`${relativePath} imports ${target}`);
  }
  if (target.startsWith("views/") || target.startsWith("neutron/")) {
    violations.push(`${relativePath} imports ${target}`);
  }
  if (SHELL_FILES.has(target)) {
    violations.push(`${relativePath} imports shell ${target}`);
  }
}

function recordOutsideImportViolation(
  relativePath: string,
  target: string,
  violations: string[],
): void {
  if (!featureRoot(target)) return;
  if (relativePath.startsWith("design/")) {
    violations.push(`${relativePath} imports ${target}`);
    return;
  }
  if (relativePath.startsWith("desktop-client")) {
    violations.push(`${relativePath} imports ${target}`);
    return;
  }
  if (PUBLIC_FEATURE_SURFACES.has(stem(target))) return;
  violations.push(`${relativePath} imports ${target}`);
}
