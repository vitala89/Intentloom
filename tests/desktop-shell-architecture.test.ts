import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { DesktopBridgeError } from "../apps/desktop/src/desktop-client.js";
import { measureProductionSource } from "../scripts/production-file-metrics.mjs";
import { buildWorkspaceCommandOptions } from "../apps/desktop/src/workspace-command-options.js";
import { workspaceViewRenderers } from "../apps/desktop/src/workspace-view-registry.js";
import {
  deriveLoadedWorkspaceViews,
  resetWorkspaceForNewRoot,
  selectDesktopProjectRoot,
} from "../apps/desktop/src/use-project-selection.js";
import { cancelWorkspaceOperation } from "../apps/desktop/src/use-workspace-operation.js";
import { resetRootBoundReads } from "../apps/desktop/src/use-workspace-project-reads.js";
import {
  workspaceCommandEntries,
  workspaceFooterViews,
  workspaceNavigation,
  workspaceViews,
} from "../apps/desktop/src/workspace-navigation.js";

const desktopSrc = join("apps", "desktop", "src");

const SHELL_UI = [
  "App.tsx",
  "DesktopShell.tsx",
  "WorkspaceContent.tsx",
  "WorkspaceSidebar.tsx",
  "WorkspaceTopbar.tsx",
] as const;

const PUBLIC_FEATURE_ENTRYPOINTS = new Set([
  "features/adoption/AdoptionPreviewPage",
  "features/foundation/workshop/FoundationWorkshopView",
  "features/external-specialized-pack/ExternalSpecializedPackPreviewPage",
]);

describe("desktop shell architecture", () => {
  it("keeps App and WorkspaceContent inside the post-R3 budgets", () => {
    const app = metrics("App.tsx");
    const content = metrics("WorkspaceContent.tsx");
    expect(app.effectiveCodeLines).toBeLessThanOrEqual(250);
    expect(content.effectiveCodeLines).toBeLessThanOrEqual(80);
    expect(app.effectiveCodeLines).toBeLessThan(422);
    expect(content.effectiveCodeLines).toBeLessThan(268);
  });

  it("keeps shell UI free of feature, client, and framework imports", () => {
    const violations: string[] = [];
    for (const name of SHELL_UI) {
      for (const specifier of importedSpecifiers(read(name))) {
        if (specifier.includes("features/") || specifier.includes("neutron/")) {
          violations.push(`${name} imports ${specifier}`);
        }
        if (specifier.includes("desktop-client")) {
          violations.push(`${name} imports ${specifier}`);
        }
        if (isForbiddenShellFramework(specifier)) {
          violations.push(`${name} imports ${specifier}`);
        }
      }
    }
    expect(violations).toEqual([]);
  });

  it("lets the view registry import only public feature and Neutron surfaces", () => {
    const violations: string[] = [];
    for (const specifier of importedSpecifiers(
      read("workspace-view-registry.tsx"),
    )) {
      const normalized = specifier.replace(/^\.\//, "").replace(/\.js$/, "");
      if (
        normalized.startsWith("features/") &&
        !PUBLIC_FEATURE_ENTRYPOINTS.has(normalized)
      ) {
        violations.push(normalized);
      }
      if (
        normalized.startsWith("neutron/") &&
        normalized !== "neutron/NeutronWorkspace"
      ) {
        violations.push(normalized);
      }
    }
    expect(violations).toEqual([]);
  });

  it("dispatches every workspace view exactly once", () => {
    const ids = workspaceNavigation.map((entry) => entry.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(Object.keys(workspaceViewRenderers).toSorted()).toEqual(
      [...ids].toSorted(),
    );
    const dispatch = read("workspace-view-registry.tsx");
    expect(dispatch).toContain(
      "return workspaceViewRenderers[view](model, actions)",
    );
    expect(dispatch).not.toContain('activeView === "Overview"');
  });

  it("keeps sidebar, footer, and command metadata on one catalog", () => {
    expect(workspaceViews.map((view) => view.label)).toEqual([
      "Overview",
      "Open existing project",
      "Adoption preview",
      "Feature intent",
      "Bounded execution",
      "Continuous loop",
      "Neutron",
      "New project",
      "Foundation workshop",
      "Inspect",
      "Doctor",
      "Diff review",
      "Timeline",
    ]);
    expect(workspaceFooterViews.map((view) => view.label)).toEqual([
      "Settings",
    ]);
    expect(workspaceViews.map((view) => view.label)).not.toContain(
      "External specialized pack review",
    );
    const commands = workspaceCommandEntries();
    const orders = commands.map((entry) => entry.order);
    expect(new Set(orders).size).toBe(orders.length);
    expect(commands.map((entry) => entry.view)).not.toContain(
      "Foundation workshop",
    );
    expect(commands.map((entry) => entry.commandId)).toContain(
      "action-external-specialized-pack-preview",
    );
  });

  it("derives command palette navigation without changing action commands", () => {
    const options = buildWorkspaceCommandOptions(commandDeps());
    expect(options.map((option) => option.id)).toEqual([
      "nav-overview",
      "nav-new-project",
      "nav-open-existing",
      "nav-adoption-preview",
      "nav-feature-intent",
      "nav-bounded-execution",
      "nav-continuous-loop",
      "nav-neutron",
      "nav-inspect",
      "nav-doctor",
      "nav-diff",
      "nav-timeline",
      "nav-settings",
      "action-external-specialized-pack-preview",
      "action-select-root",
      "action-reconnect",
      "action-load-diff",
      "action-load-timeline",
      "action-toggle-theme",
    ]);
    expect(options.find((option) => option.id === "nav-diff")?.label).toBe(
      "Go to Diff Review",
    );
    expect(options.find((option) => option.id === "nav-settings")?.label).toBe(
      "Go to Settings & Diagnostics",
    );
    expect(options.find((option) => option.id === "nav-doctor")?.shortcut).toBe(
      "3",
    );
    expect(
      options.find((option) => option.id === "nav-inspect")?.shortcut,
    ).toBe("3");
  });

  it("derives loaded views and resets the same root-bound state", () => {
    expect(
      deriveLoadedWorkspaceViews({
        inspect: null,
        doctor: null,
        diffStatus: "idle",
        timelineStatus: "idle",
      }),
    ).toEqual([]);
    expect(
      deriveLoadedWorkspaceViews({
        inspect: { version: 1 } as never,
        doctor: { version: 1 } as never,
        diffStatus: "ready",
        timelineStatus: "empty",
      }),
    ).toEqual(["Inspect", "Doctor", "Diff Review", "Timeline"]);
    const reads = {
      setInspect: vi.fn<() => void>(),
      setInspectStatus: vi.fn<() => void>(),
      setInspectError: vi.fn<() => void>(),
      setDiff: vi.fn<() => void>(),
      setDiffStatus: vi.fn<() => void>(),
      setDiffError: vi.fn<() => void>(),
      setTimeline: vi.fn<() => void>(),
      setTimelineStatus: vi.fn<() => void>(),
      setTimelineError: vi.fn<() => void>(),
    };
    resetRootBoundReads(reads);
    expect(reads.setInspect).toHaveBeenCalledWith(null);
    expect(reads.setInspectStatus).toHaveBeenCalledWith("idle");
    expect(reads.setDiffStatus).toHaveBeenCalledWith("idle");
    expect(reads.setTimelineStatus).toHaveBeenCalledWith("idle");
    const rootReset = {
      setConnection: vi.fn<() => void>(),
      setDaemonInfo: vi.fn<() => void>(),
      resetReads: vi.fn<() => void>(),
      resetDoctor: vi.fn<() => void>(),
    };
    resetWorkspaceForNewRoot(rootReset);
    expect(rootReset.setConnection).toHaveBeenCalledWith("Not connected");
    expect(rootReset.setDaemonInfo).toHaveBeenCalledWith(null);
    expect(rootReset.resetReads).toHaveBeenCalledOnce();
    expect(rootReset.resetDoctor).toHaveBeenCalledOnce();
  });

  it("selects a project root only after abort, and keeps the previous root on failure", async () => {
    const success = selectionDeps(async () => "/work/demo");
    await selectDesktopProjectRoot(success);
    expect(success.abortCurrentOperation).toHaveBeenCalledOnce();
    expect(success.setRoot).toHaveBeenCalledWith("/work/demo");
    expect(success.resetRootBoundState).toHaveBeenCalledOnce();

    const empty = selectionDeps(async () => null);
    await selectDesktopProjectRoot(empty);
    expect(empty.setRoot).not.toHaveBeenCalled();
    expect(empty.resetRootBoundState).not.toHaveBeenCalled();

    const failed = selectionDeps(async () => {
      throw new DesktopBridgeError(
        "picker failed",
        "native_bridge_unavailable",
      );
    });
    await selectDesktopProjectRoot(failed);
    expect(failed.setRoot).not.toHaveBeenCalled();
    expect(failed.resetRootBoundState).not.toHaveBeenCalled();
    expect(failed.setInspectStatus).toHaveBeenCalledWith("error");
    expect(failed.setMessage).toHaveBeenCalledWith("picker failed");

    const unknown = selectionDeps(async () => {
      throw new Error("disk");
    });
    await selectDesktopProjectRoot(unknown);
    expect(unknown.setMessage).toHaveBeenCalledWith(
      "The project directory could not be selected.",
    );
  });

  it("cancels only the loading operation flags", () => {
    const input = {
      abortCurrentOperation: vi.fn<() => void>(),
      setIsConnecting: vi.fn<() => void>(),
      root: "/work/demo",
      inspectStatus: "loading" as const,
      setInspectStatus: vi.fn<() => void>(),
      doctorStatus: "ready" as const,
      setDoctorStatus: vi.fn<() => void>(),
      diffStatus: "loading" as const,
      setDiffStatus: vi.fn<() => void>(),
      timelineStatus: "idle" as const,
      setTimelineStatus: vi.fn<() => void>(),
      setConnection: vi.fn<() => void>(),
      setMessage: vi.fn<() => void>(),
    };
    cancelWorkspaceOperation(input);
    expect(input.abortCurrentOperation).toHaveBeenCalledOnce();
    expect(input.setIsConnecting).toHaveBeenCalledWith(false);
    expect(input.setInspectStatus).toHaveBeenCalledWith("idle");
    expect(input.setDoctorStatus).not.toHaveBeenCalled();
    expect(input.setDiffStatus).toHaveBeenCalledWith("idle");
    expect(input.setTimelineStatus).not.toHaveBeenCalled();
    expect(input.setConnection).toHaveBeenCalledWith("Cancelled");
    expect(input.setMessage).toHaveBeenCalledWith("Operation cancelled.");
  });

  it("has no import cycles among shell composition modules", () => {
    expect(shellCycles()).toEqual([]);
  });

  it("keeps design and desktop client adapters from importing shell UI", () => {
    const violations: string[] = [];
    for (const file of walk(desktopSrc)) {
      const relativePath = toPosix(relative(desktopSrc, file));
      const outside =
        relativePath.startsWith("design/") ||
        relativePath.startsWith("desktop-client");
      if (!outside) continue;
      for (const specifier of importedSpecifiers(readFileSync(file, "utf8"))) {
        const base = specifier.split("/").at(-1)?.replace(/\.js$/, "");
        if (base && SHELL_UI.includes(base as (typeof SHELL_UI)[number])) {
          violations.push(`${relativePath} imports ${specifier}`);
        }
      }
    }
    expect(violations).toEqual([]);
  });
});

function metrics(name: string) {
  const path = join(desktopSrc, name);
  return measureProductionSource(readFileSync(path, "utf8"), path);
}

function read(name: string): string {
  return readFileSync(join(desktopSrc, name), "utf8");
}

function importedSpecifiers(source: string): string[] {
  return [...source.matchAll(/(?:from|import)\s*(?:\(\s*)?["']([^"']+)["']/g)]
    .map((match) => match[1])
    .filter((specifier): specifier is string => specifier !== undefined);
}

function isForbiddenShellFramework(specifier: string): boolean {
  return [
    "react-router",
    "@tanstack/react-router",
    "zustand",
    "redux",
    "@reduxjs/toolkit",
    "mobx",
    "@tanstack/react-query",
    "xstate",
    "jotai",
    "recoil",
  ].some((name) => specifier === name || specifier.startsWith(`${name}/`));
}

function commandDeps() {
  return {
    theme: "dark" as const,
    setActiveView: () => undefined,
    requestProjectSelect: () => undefined,
    connectDaemon: () => undefined,
    loadDiff: () => undefined,
    loadTimeline: () => undefined,
    setTheme: () => undefined,
  };
}

function selectionDeps(selectProjectRoot: () => Promise<string | null>) {
  return {
    selectProjectRoot,
    abortCurrentOperation: vi.fn<() => void>(),
    setMessage: vi.fn<() => void>(),
    setRoot: vi.fn<() => void>(),
    resetRootBoundState: vi.fn<() => void>(),
    setInspectError: vi.fn<() => void>(),
    setInspectStatus: vi.fn<() => void>(),
  };
}

function shellCycles(): string[] {
  const names = new Set(
    readdirSync(desktopSrc).filter((name) =>
      /^(App|DesktopShell|Workspace|workspace-|use-workspace-|use-project-selection)/.test(
        name,
      ),
    ),
  );
  const graph = new Map<string, string[]>();
  for (const name of names) {
    const next = importedSpecifiers(read(name))
      .filter((specifier) => specifier.startsWith("."))
      .map((specifier) => specifier.replace(/^\.\//, "").replace(/\.js$/, ""))
      .flatMap((stem) => {
        const match = [...names].find(
          (candidate) => candidate.replace(/\.(tsx|ts)$/, "") === stem,
        );
        return match ? [match] : [];
      });
    graph.set(name, next);
  }
  return findCycles(graph);
}

function findCycles(graph: Map<string, string[]>): string[] {
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

function walk(directory: string, files: string[] = []): string[] {
  for (const name of readdirSync(directory)) {
    const path = join(directory, name);
    if (statSync(path).isDirectory()) walk(path, files);
    else if (name.endsWith(".ts") || name.endsWith(".tsx")) files.push(path);
  }
  return files;
}

function toPosix(path: string): string {
  return path.split("\\").join("/");
}
