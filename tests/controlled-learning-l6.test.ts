import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  cancelTask,
  createMemoryFileSystem,
  createTaskCheckpoint,
  getTaskCheckpoint,
  listTaskCheckpoints,
  pauseTask,
  redirectTask,
  resumeTask,
} from "@intentloom/application";
import {
  validateTaskCheckpoint,
  type TaskCheckpoint,
} from "@intentloom/protocol";
import { runCli } from "../packages/cli/src/command.js";

describe("Controlled Agent Learning Candidate L6 — Pause, Redirect, Checkpoint, and Resume", () => {
  it("validates task checkpoint schema", () => {
    const valid: TaskCheckpoint = {
      schemaVersion: "1",
      id: "chk-task-101-1",
      taskId: "task-101",
      state: "active",
      completedSteps: ["Step 1"],
      unresolvedWork: ["Step 2"],
      createdSnapshotChecksum: "abcdef123456",
      invalidatedPlans: [],
      createdAt: "2026-07-26T00:00:00.000Z",
      updatedAt: "2026-07-26T00:00:00.000Z",
    };

    const validated = validateTaskCheckpoint(valid);
    expect(validated.id).toBe("chk-task-101-1");
    expect(validated.state).toBe("active");
  });

  it("creates a task checkpoint stored under .aif/memory/checkpoints/", async () => {
    const fs = createMemoryFileSystem();
    const created = await createTaskCheckpoint(
      "task-201",
      {
        root: "/project",
        completedSteps: ["Init"],
        unresolvedWork: ["Build"],
      },
      fs,
    );

    expect(created.taskId).toBe("task-201");
    expect(created.state).toBe("active");

    const saved = await getTaskCheckpoint(created.id, { root: "/project" }, fs);
    expect(saved).not.toBeNull();
    expect(saved?.id).toBe(created.id);
  });

  it("pauses and cancels task checkpoints safely preserving files", async () => {
    const fs = createMemoryFileSystem();
    await fs.write("/project/src/index.ts", "console.log('hello');");
    const initialContent = await fs.read("/project/src/index.ts");

    const created = await createTaskCheckpoint(
      "task-202",
      { root: "/project" },
      fs,
    );

    const paused = await pauseTask(created.id, { root: "/project" }, fs);
    expect(paused.state).toBe("paused");
    expect(await fs.read("/project/src/index.ts")).toBe(initialContent);

    const cancelled = await cancelTask(created.id, { root: "/project" }, fs);
    expect(cancelled.state).toBe("cancelled");
    expect(await fs.read("/project/src/index.ts")).toBe(initialContent);
  });

  it("redirects and resumes task checkpoints, invalidating stale plans", async () => {
    const fs = createMemoryFileSystem();
    const created = await createTaskCheckpoint(
      "task-203",
      { root: "/project" },
      fs,
    );

    const redirected = await redirectTask(
      created.id,
      "Refactor UI layout using modern CSS",
      { root: "/project" },
      fs,
    );

    expect(redirected.state).toBe("redirected");
    expect(redirected.invalidatedPlans.length).toBe(1);

    const resumed = await resumeTask(created.id, { root: "/project" }, fs);
    expect(resumed.valid).toBe(true);
    expect(resumed.invalidatedCount).toBe(1);

    const afterResume = await getTaskCheckpoint(
      created.id,
      { root: "/project" },
      fs,
    );
    expect(afterResume?.state).toBe("resumed");
  });

  it("executes CLI intentloom checkpoint commands", async () => {
    const fs = createMemoryFileSystem();

    const createOutput: string[] = [];
    const createExit = await runCli(
      [
        "checkpoint",
        "create",
        "--root",
        "/project",
        "--task-id",
        "task-301",
        "--json",
      ],
      { catalogRoot: resolve("catalog"), fileSystem: fs },
      { stdout: (msg) => createOutput.push(msg), stderr: () => undefined },
    );

    expect(createExit).toBe(0);
    const created = JSON.parse(createOutput.join("\n"));
    expect(created.taskId).toBe("task-301");

    const redirectOutput: string[] = [];
    const redirectExit = await runCli(
      [
        "checkpoint",
        "redirect",
        "--root",
        "/project",
        "--id",
        created.id,
        "--new-intent",
        "Switch to REST API",
        "--json",
      ],
      { catalogRoot: resolve("catalog"), fileSystem: fs },
      { stdout: (msg) => redirectOutput.push(msg), stderr: () => undefined },
    );

    expect(redirectExit).toBe(0);
    const redirected = JSON.parse(redirectOutput.join("\n"));
    expect(redirected.state).toBe("redirected");

    const resumeOutput: string[] = [];
    const resumeExit = await runCli(
      [
        "checkpoint",
        "resume",
        "--root",
        "/project",
        "--id",
        created.id,
        "--json",
      ],
      { catalogRoot: resolve("catalog"), fileSystem: fs },
      { stdout: (msg) => resumeOutput.push(msg), stderr: () => undefined },
    );

    expect(resumeExit).toBe(0);
    const resumed = JSON.parse(resumeOutput.join("\n"));
    expect(resumed.valid).toBe(true);
  });
});
