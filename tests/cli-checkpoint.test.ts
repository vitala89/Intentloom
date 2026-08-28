import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  createMemoryFileSystem,
  createTaskCheckpoint,
} from "@intentloom/application";
import { runCli } from "../packages/cli/src/command.js";
import { runCliEntry } from "../packages/cli/src/cli-entry.js";

const catalogRoot = resolve("catalog");

function checkpointProject(name: string): string {
  return `/project/checkpoint-${name}`;
}

describe("checkpoint CLI extraction", () => {
  it("dispatches checkpoint through runCliEntry", async () => {
    const projectRoot = checkpointProject("entry-dispatch");
    const fileSystem = createMemoryFileSystem();
    const stdout: string[] = [];

    const exitCode = await runCliEntry(
      [
        "checkpoint",
        "create",
        "--root",
        projectRoot,
        "--task-id",
        "task-entry",
        "--json",
      ],
      { catalogRoot, fileSystem },
      { stdout: (message) => stdout.push(message), stderr: () => undefined },
    );

    expect(exitCode).toBe(0);
    expect(JSON.parse(stdout.join("\n")).taskId).toBe("task-entry");
  });

  it("requires a supported subcommand", async () => {
    const stderr: string[] = [];

    const exitCode = await runCli(
      ["checkpoint"],
      { catalogRoot, fileSystem: createMemoryFileSystem() },
      { stdout: () => undefined, stderr: (message) => stderr.push(message) },
    );

    expect(exitCode).toBe(2);
    expect(stderr.join("\n")).toBe(
      "checkpoint requires create, pause, cancel, redirect, resume, list, or delete subcommand",
    );
  });

  it("rejects unsupported subcommands", async () => {
    const stderr: string[] = [];

    const exitCode = await runCli(
      ["checkpoint", "get"],
      { catalogRoot, fileSystem: createMemoryFileSystem() },
      { stdout: () => undefined, stderr: (message) => stderr.push(message) },
    );

    expect(exitCode).toBe(2);
    expect(stderr.join("\n")).toBe(
      "checkpoint requires create, pause, cancel, redirect, resume, list, or delete subcommand",
    );
  });

  it("rejects unknown options", async () => {
    const stderr: string[] = [];

    const exitCode = await runCli(
      ["checkpoint", "list", "--unknown"],
      { catalogRoot, fileSystem: createMemoryFileSystem() },
      { stdout: () => undefined, stderr: (message) => stderr.push(message) },
    );

    expect(exitCode).toBe(2);
    expect(stderr.join("\n")).toBe("unknown option: --unknown");
  });

  it("rejects missing option values", async () => {
    const stderr: string[] = [];

    const exitCode = await runCli(
      ["checkpoint", "create", "--task-id"],
      { catalogRoot, fileSystem: createMemoryFileSystem() },
      { stdout: () => undefined, stderr: (message) => stderr.push(message) },
    );

    expect(exitCode).toBe(2);
    expect(stderr.join("\n")).toBe("missing value for --task-id");
  });

  it("rejects duplicate --root", async () => {
    const stderr: string[] = [];

    const exitCode = await runCli(
      ["checkpoint", "list", "--root", "/first", "--root", "/second"],
      { catalogRoot, fileSystem: createMemoryFileSystem() },
      { stdout: () => undefined, stderr: (message) => stderr.push(message) },
    );

    expect(exitCode).toBe(2);
    expect(stderr.join("\n")).toBe("project path specified more than once");
  });

  it("rejects unexpected positional arguments", async () => {
    const stderr: string[] = [];

    const exitCode = await runCli(
      ["checkpoint", "list", "extra"],
      { catalogRoot, fileSystem: createMemoryFileSystem() },
      { stdout: () => undefined, stderr: (message) => stderr.push(message) },
    );

    expect(exitCode).toBe(2);
    expect(stderr.join("\n")).toBe("unexpected argument: extra");
  });

  it("rejects --force", async () => {
    const stderr: string[] = [];

    const exitCode = await runCli(
      ["checkpoint", "list", "--force"],
      { catalogRoot, fileSystem: createMemoryFileSystem() },
      { stdout: () => undefined, stderr: (message) => stderr.push(message) },
    );

    expect(exitCode).toBe(2);
    expect(stderr.join("\n")).toBe("--force is only valid with sync");
  });

  it("rejects adoption mapping flags", async () => {
    const stderr: string[] = [];

    const exitCode = await runCli(
      ["checkpoint", "list", "--project-owned-mapping", "src/**"],
      { catalogRoot, fileSystem: createMemoryFileSystem() },
      { stdout: () => undefined, stderr: (message) => stderr.push(message) },
    );

    expect(exitCode).toBe(2);
    expect(stderr.join("\n")).toBe(
      "adoption mappings are only valid with init or adopt",
    );
  });

  it("rejects --cache", async () => {
    const stderr: string[] = [];

    const exitCode = await runCli(
      ["checkpoint", "list", "--cache"],
      { catalogRoot, fileSystem: createMemoryFileSystem() },
      { stdout: () => undefined, stderr: (message) => stderr.push(message) },
    );

    expect(exitCode).toBe(2);
    expect(stderr.join("\n")).toBe("--cache is only valid with clean");
  });

  it("rejects daemon flags", async () => {
    const stderr: string[] = [];

    const exitCode = await runCli(
      [
        "checkpoint",
        "list",
        "--daemon-endpoint",
        "http://127.0.0.1:9000",
        "--daemon-token-file",
        "/tmp/token",
      ],
      { catalogRoot, fileSystem: createMemoryFileSystem() },
      { stdout: () => undefined, stderr: (message) => stderr.push(message) },
    );

    expect(exitCode).toBe(2);
    expect(stderr.join("\n")).toBe("daemon mode is only valid with doctor");
  });

  it("creates a checkpoint with JSON output", async () => {
    const projectRoot = checkpointProject("create-json");
    const fileSystem = createMemoryFileSystem();
    const stdout: string[] = [];

    const exitCode = await runCli(
      [
        "checkpoint",
        "create",
        "--root",
        projectRoot,
        "--task-id",
        "task-101",
        "--json",
      ],
      { catalogRoot, fileSystem },
      { stdout: (message) => stdout.push(message), stderr: () => undefined },
    );

    expect(exitCode).toBe(0);
    const created = JSON.parse(stdout.join("\n"));
    expect(created.taskId).toBe("task-101");
    expect(created.state).toBe("active");
    expect(created.id).toMatch(/^chk-task-101-\d+$/);
  });

  it("creates a checkpoint with human output", async () => {
    const projectRoot = checkpointProject("create-text");
    const fileSystem = createMemoryFileSystem();
    const stdout: string[] = [];

    const exitCode = await runCli(
      ["checkpoint", "create", "--root", projectRoot, "--task-id", "task-102"],
      { catalogRoot, fileSystem },
      { stdout: (message) => stdout.push(message), stderr: () => undefined },
    );

    expect(exitCode).toBe(0);
    expect(stdout.join("\n")).toMatch(
      /^Created task checkpoint \[chk-task-102-\d+\] for task \[task-102\]$/,
    );
  });

  it("requires --task-id for create when no positional id", async () => {
    const stderr: string[] = [];

    const exitCode = await runCli(
      ["checkpoint", "create"],
      { catalogRoot, fileSystem: createMemoryFileSystem() },
      { stdout: () => undefined, stderr: (message) => stderr.push(message) },
    );

    expect(exitCode).toBe(2);
    expect(stderr.join("\n")).toBe("checkpoint create requires --task-id <id>");
  });

  it("rejects positional task id at parser index 2 (legacy fallback unreachable)", async () => {
    const stderr: string[] = [];

    const exitCode = await runCli(
      ["checkpoint", "create", "task-positional", "--root", "/project"],
      { catalogRoot, fileSystem: createMemoryFileSystem() },
      { stdout: () => undefined, stderr: (message) => stderr.push(message) },
    );

    expect(exitCode).toBe(2);
    expect(stderr.join("\n")).toBe("unexpected argument: task-positional");
  });

  it("pauses a checkpoint", async () => {
    const projectRoot = checkpointProject("pause");
    const fileSystem = createMemoryFileSystem();
    const created = await createTaskCheckpoint(
      "task-pause",
      { root: projectRoot },
      fileSystem,
    );
    const stdout: string[] = [];

    const exitCode = await runCli(
      [
        "checkpoint",
        "pause",
        "--root",
        projectRoot,
        "--id",
        created.id,
        "--json",
      ],
      { catalogRoot, fileSystem },
      { stdout: (message) => stdout.push(message), stderr: () => undefined },
    );

    expect(exitCode).toBe(0);
    expect(JSON.parse(stdout.join("\n")).state).toBe("paused");
  });

  it("returns exit 2 when pause target is missing", async () => {
    const projectRoot = checkpointProject("pause-missing");
    const stderr: string[] = [];

    const exitCode = await runCli(
      [
        "checkpoint",
        "pause",
        "--root",
        projectRoot,
        "--id",
        "missing-checkpoint",
      ],
      { catalogRoot, fileSystem: createMemoryFileSystem() },
      { stdout: () => undefined, stderr: (message) => stderr.push(message) },
    );

    expect(exitCode).toBe(2);
    expect(stderr.join("\n")).toBe(
      "Task checkpoint not found: missing-checkpoint",
    );
  });

  it("cancels a checkpoint", async () => {
    const projectRoot = checkpointProject("cancel");
    const fileSystem = createMemoryFileSystem();
    const created = await createTaskCheckpoint(
      "task-cancel",
      { root: projectRoot },
      fileSystem,
    );
    const stdout: string[] = [];

    const exitCode = await runCli(
      [
        "checkpoint",
        "cancel",
        "--root",
        projectRoot,
        "--id",
        created.id,
        "--json",
      ],
      { catalogRoot, fileSystem },
      { stdout: (message) => stdout.push(message), stderr: () => undefined },
    );

    expect(exitCode).toBe(0);
    expect(JSON.parse(stdout.join("\n")).state).toBe("cancelled");
  });

  it("redirects a checkpoint and persists new intent history", async () => {
    const projectRoot = checkpointProject("redirect");
    const fileSystem = createMemoryFileSystem();
    const created = await createTaskCheckpoint(
      "task-redirect",
      { root: projectRoot },
      fileSystem,
    );
    const stdout: string[] = [];

    const exitCode = await runCli(
      [
        "checkpoint",
        "redirect",
        "--root",
        projectRoot,
        "--id",
        created.id,
        "--new-intent",
        "Switch to REST API",
        "--json",
      ],
      { catalogRoot, fileSystem },
      { stdout: (message) => stdout.push(message), stderr: () => undefined },
    );

    expect(exitCode).toBe(0);
    const redirected = JSON.parse(stdout.join("\n"));
    expect(redirected.state).toBe("redirected");
    expect(redirected.unresolvedWork).toContain(
      "Redirected: Switch to REST API",
    );
    expect(redirected.invalidatedPlans.length).toBe(1);
  });

  it("requires --new-intent for redirect", async () => {
    const stderr: string[] = [];

    const exitCode = await runCli(
      ["checkpoint", "redirect", "--id", "chk-1"],
      { catalogRoot, fileSystem: createMemoryFileSystem() },
      { stdout: () => undefined, stderr: (message) => stderr.push(message) },
    );

    expect(exitCode).toBe(2);
    expect(stderr.join("\n")).toBe(
      "checkpoint redirect requires --id <id> and --new-intent <intent>",
    );
  });

  it("resumes a checkpoint", async () => {
    const projectRoot = checkpointProject("resume");
    const fileSystem = createMemoryFileSystem();
    const created = await createTaskCheckpoint(
      "task-resume",
      { root: projectRoot },
      fileSystem,
    );
    await runCli(
      [
        "checkpoint",
        "redirect",
        "--root",
        projectRoot,
        "--id",
        created.id,
        "--new-intent",
        "New direction",
      ],
      { catalogRoot, fileSystem },
      { stdout: () => undefined, stderr: () => undefined },
    );

    const stdout: string[] = [];
    const exitCode = await runCli(
      [
        "checkpoint",
        "resume",
        "--root",
        projectRoot,
        "--id",
        created.id,
        "--json",
      ],
      { catalogRoot, fileSystem },
      { stdout: (message) => stdout.push(message), stderr: () => undefined },
    );

    expect(exitCode).toBe(0);
    const resumed = JSON.parse(stdout.join("\n"));
    expect(resumed.valid).toBe(true);
    expect(resumed.invalidatedCount).toBe(1);
  });

  it("returns exit 2 when resuming a cancelled checkpoint", async () => {
    const projectRoot = checkpointProject("resume-cancelled");
    const fileSystem = createMemoryFileSystem();
    const created = await createTaskCheckpoint(
      "task-resume-cancel",
      { root: projectRoot },
      fileSystem,
    );
    await runCli(
      ["checkpoint", "cancel", "--root", projectRoot, "--id", created.id],
      { catalogRoot, fileSystem },
      { stdout: () => undefined, stderr: () => undefined },
    );

    const stderr: string[] = [];
    const exitCode = await runCli(
      ["checkpoint", "resume", "--root", projectRoot, "--id", created.id],
      { catalogRoot, fileSystem },
      { stdout: () => undefined, stderr: (message) => stderr.push(message) },
    );

    expect(exitCode).toBe(2);
    expect(stderr.join("\n")).toBe(
      `Cannot resume cancelled task checkpoint: ${created.id}`,
    );
  });

  it("lists checkpoints with JSON output", async () => {
    const projectRoot = checkpointProject("list-json");
    const fileSystem = createMemoryFileSystem();
    await createTaskCheckpoint("task-list", { root: projectRoot }, fileSystem);
    const stdout: string[] = [];

    const exitCode = await runCli(
      ["checkpoint", "list", "--root", projectRoot, "--json"],
      { catalogRoot, fileSystem },
      { stdout: (message) => stdout.push(message), stderr: () => undefined },
    );

    expect(exitCode).toBe(0);
    expect(JSON.parse(stdout.join("\n"))).toHaveLength(1);
  });

  it("lists checkpoints with human output", async () => {
    const projectRoot = checkpointProject("list-text");
    const fileSystem = createMemoryFileSystem();
    const created = await createTaskCheckpoint(
      "task-list-text",
      { root: projectRoot },
      fileSystem,
    );
    const stdout: string[] = [];

    const exitCode = await runCli(
      ["checkpoint", "list", "--root", projectRoot],
      { catalogRoot, fileSystem },
      { stdout: (message) => stdout.push(message), stderr: () => undefined },
    );

    expect(exitCode).toBe(0);
    expect(stdout.join("\n")).toBe(
      `- [${created.id}] task=task-list-text state=active`,
    );
  });

  it("filters list output by --task-id", async () => {
    const projectRoot = checkpointProject("list-filter");
    const fileSystem = createMemoryFileSystem();
    await createTaskCheckpoint("task-a", { root: projectRoot }, fileSystem);
    await createTaskCheckpoint("task-b", { root: projectRoot }, fileSystem);
    const stdout: string[] = [];

    const exitCode = await runCli(
      [
        "checkpoint",
        "list",
        "--root",
        projectRoot,
        "--task-id",
        "task-a",
        "--json",
      ],
      { catalogRoot, fileSystem },
      { stdout: (message) => stdout.push(message), stderr: () => undefined },
    );

    expect(exitCode).toBe(0);
    const listed = JSON.parse(stdout.join("\n"));
    expect(listed).toHaveLength(1);
    expect(listed[0].taskId).toBe("task-a");
  });

  it("deletes an existing checkpoint", async () => {
    const projectRoot = checkpointProject("delete");
    const fileSystem = createMemoryFileSystem();
    const created = await createTaskCheckpoint(
      "task-delete",
      { root: projectRoot },
      fileSystem,
    );
    const stdout: string[] = [];

    const exitCode = await runCli(
      [
        "checkpoint",
        "delete",
        "--root",
        projectRoot,
        "--id",
        created.id,
        "--json",
      ],
      { catalogRoot, fileSystem },
      { stdout: (message) => stdout.push(message), stderr: () => undefined },
    );

    expect(exitCode).toBe(0);
    expect(JSON.parse(stdout.join("\n"))).toEqual({
      id: created.id,
      deleted: true,
    });
  });

  it("returns deleted=false for missing checkpoint delete", async () => {
    const projectRoot = checkpointProject("delete-missing");
    const stdout: string[] = [];

    const exitCode = await runCli(
      [
        "checkpoint",
        "delete",
        "--root",
        projectRoot,
        "--id",
        "missing-id",
        "--json",
      ],
      { catalogRoot, fileSystem: createMemoryFileSystem() },
      { stdout: (message) => stdout.push(message), stderr: () => undefined },
    );

    expect(exitCode).toBe(0);
    expect(JSON.parse(stdout.join("\n"))).toEqual({
      id: "missing-id",
      deleted: false,
    });
  });
});
