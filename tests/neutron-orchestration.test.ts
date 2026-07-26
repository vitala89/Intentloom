import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  createMemoryFileSystem,
  getNeutronSubagentTask,
  initProject,
  listNeutronSubagentTasks,
  spawnNeutronSubagentTask,
  syncLocalWorkspaceState,
} from "@intentloom/application";
import { runCli } from "../packages/cli/src/command.js";

describe("Neutron Autonomous Subagent Orchestration & Local Workspace Sync Engine", () => {
  it("spawns, retrieves, and lists subagent tasks", async () => {
    const fs = createMemoryFileSystem();
    const root = "/project";
    await initProject({ root, adapters: ["codex"] }, fs);

    const task1 = await spawnNeutronSubagentTask(
      {
        root,
        projectId: "p-1",
        role: "research",
        taskInput: "Inspect API routing patterns",
      },
      fs,
    );

    expect(task1.schemaVersion).toBe("1");
    expect(task1.role).toBe("research");
    expect(task1.status).toBe("completed");
    expect(task1.resultOutput).toContain("research");

    const fetched = await getNeutronSubagentTask(
      { root, taskId: task1.id },
      fs,
    );
    expect(fetched?.id).toBe(task1.id);
    expect(fetched?.taskInput).toBe("Inspect API routing patterns");

    const tasks = await listNeutronSubagentTasks({ root }, fs);
    expect(tasks.length).toBe(1);
    expect(tasks[0]?.id).toBe(task1.id);
  });

  it("synchronizes local workspace state without codebase mutation", async () => {
    const fs = createMemoryFileSystem();
    const root = "/project";
    await initProject({ root, adapters: ["codex"] }, fs);

    await spawnNeutronSubagentTask(
      {
        root,
        projectId: "p-1",
        role: "arch-checker",
        taskInput: "Verify ADR-0036 boundaries",
      },
      fs,
    );

    const beforeFiles = new Set(await fs.list(root));
    const syncState = await syncLocalWorkspaceState(
      { root, projectId: "p-1" },
      fs,
    );
    const afterFiles = new Set(await fs.list(root));

    expect(syncState.projectId).toBe("p-1");
    expect(syncState.subagentTasksCount).toBe(1);
    expect(syncState.readiness).toBe("ready");
    expect(afterFiles).toEqual(beforeFiles);
  });

  it("routes neutron subagent and sync subcommands via CLI", async () => {
    const fs = createMemoryFileSystem();
    const root = "/project";
    await initProject({ root, adapters: ["codex"] }, fs);

    const dependencies = { catalogRoot: resolve("catalog"), fileSystem: fs };

    let spawnOut = "";
    const exitCodeSpawn = await runCli(
      [
        "neutron",
        "subagent",
        "spawn",
        "--role",
        "test-runner",
        "--input",
        "Verify Vitest suite performance",
        "--root",
        root,
        "--json",
      ],
      dependencies,
      { stdout: (m) => (spawnOut += `${m}\n`), stderr: () => undefined },
    );
    expect(exitCodeSpawn).toBe(0);

    const taskData = JSON.parse(spawnOut);
    expect(taskData.role).toBe("test-runner");
    expect(taskData.status).toBe("completed");

    let listOut = "";
    const exitCodeList = await runCli(
      ["neutron", "subagent", "list", "--root", root, "--json"],
      dependencies,
      { stdout: (m) => (listOut += `${m}\n`), stderr: () => undefined },
    );
    expect(exitCodeList).toBe(0);
    const listData = JSON.parse(listOut);
    expect(listData.length).toBe(1);

    let syncOut = "";
    const exitCodeSync = await runCli(
      ["neutron", "sync", root, "--json"],
      dependencies,
      { stdout: (m) => (syncOut += `${m}\n`), stderr: () => undefined },
    );
    expect(exitCodeSync).toBe(0);
    const syncData = JSON.parse(syncOut);
    expect(syncData.subagentTasksCount).toBe(1);
  });
});
