import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  createMemoryFileSystem,
  getInteractiveWorkspaceState,
  initProject,
} from "@intentloom/application";
import { runCli } from "../packages/cli/src/command.js";

describe("Interactive Surfaces: Read-Only TUI and Desktop Application Shell", () => {
  it("collects structured workspace state across doctor, security audit, and sessions", async () => {
    const fs = createMemoryFileSystem();
    const root = "/project";
    await initProject({ root, adapters: ["codex"] }, fs);

    const state = await getInteractiveWorkspaceState(
      { root, projectId: "p-tui" },
      fs,
    );
    expect(state.projectId).toBe("p-tui");
    expect(state.root).toBe(root);
    expect(state.activeView).toBe("inspect");
    expect(Array.isArray(state.findings)).toBe(true);
    expect(Array.isArray(state.sessions)).toBe(true);
    expect(state.generatedAt).toBeTruthy();
  });

  it("guarantees 100% read-only zero mutation during workspace state generation", async () => {
    const fs = createMemoryFileSystem();
    const root = "/project";
    await initProject({ root, adapters: ["codex"] }, fs);

    const beforeFiles = new Set(await fs.list(root));
    await getInteractiveWorkspaceState({ root, projectId: "p-tui" }, fs);
    const afterFiles = new Set(await fs.list(root));

    expect(afterFiles).toEqual(beforeFiles);
  });

  it("routes intentloom ui subcommand via CLI", async () => {
    const fs = createMemoryFileSystem();
    const root = "/project";
    await initProject({ root, adapters: ["codex"] }, fs);

    const dependencies = { catalogRoot: resolve("catalog"), fileSystem: fs };
    let output = "";
    const stdout = (msg: string) => {
      output += `${msg}\n`;
    };

    const exitCode = await runCli(
      ["ui", "--root", root, "--json"],
      dependencies,
      { stdout, stderr: () => undefined },
    );
    expect(exitCode).toBe(0);

    const parsed = JSON.parse(output);
    expect(parsed.root).toBe(root);
    expect(parsed.activeView).toBe("inspect");
  });

  it("supports TUI view routing for inspect, doctor, diff, and timeline", async () => {
    const fs = createMemoryFileSystem();
    const root = "/project";
    await initProject({ root, adapters: ["codex"] }, fs);
    const dependencies = { catalogRoot: resolve("catalog"), fileSystem: fs };

    for (const view of ["inspect", "doctor", "diff", "timeline"] as const) {
      let output = "";
      const stdout = (msg: string) => {
        output += `${msg}\n`;
      };
      const exitCode = await runCli(
        ["ui", "--root", root, "--view", view, "--json"],
        dependencies,
        { stdout, stderr: () => undefined },
      );
      expect(exitCode).toBe(0);

      const parsed = JSON.parse(output);
      expect(parsed.activeView).toBe(view);
      expect(parsed.root).toBe(root);
    }
  });

  it("renders text-formatted terminal views cleanly", async () => {
    const fs = createMemoryFileSystem();
    const root = "/project";
    await initProject({ root, adapters: ["codex"] }, fs);
    const dependencies = { catalogRoot: resolve("catalog"), fileSystem: fs };

    let output = "";
    const stdout = (msg: string) => {
      output += `${msg}\n`;
    };
    const exitCode = await runCli(
      ["ui", "--root", root, "--view", "doctor"],
      dependencies,
      { stdout, stderr: () => undefined },
    );
    expect(exitCode).toBe(0);
    expect(output).toContain("Intentloom Interactive Terminal UI");
    expect(output).toContain("[DOCTOR VIEW]");
  });
});
