import { cp, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  createMemoryFileSystem,
  initProject,
  listNeutronSubagentTasks,
  spawnNeutronSubagentTask,
} from "@intentloom/application";
import { runCli } from "../packages/cli/src/command.js";
import { runCliEntry } from "../packages/cli/src/cli-entry.js";

const catalogRoot = resolve("catalog");

async function brokenCatalogRoot(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "intentloom-neutron-catalog-"));
  await cp(resolve("catalog"), join(root, "catalog"), { recursive: true });
  await cp(resolve("profiles"), join(root, "profiles"), { recursive: true });
  const schemaPath = join(root, "catalog/schemas/aif-config.schema.json");
  const schema = JSON.parse(await readFile(schemaPath, "utf8"));
  schema.properties.profile = { $ref: "#/$defs/missing" };
  await writeFile(schemaPath, JSON.stringify(schema), "utf8");
  return join(root, "catalog");
}

async function preparedProject(root = "/project") {
  const fs = createMemoryFileSystem();
  await initProject({ root, adapters: ["codex"], catalogRoot }, fs);
  return { fs, root, dependencies: { catalogRoot, fileSystem: fs } };
}

describe("neutron CLI", () => {
  it("dispatches neutron through runCliEntry", async () => {
    const { root, dependencies } = await preparedProject();
    const output: string[] = [];

    const exitCode = await runCliEntry(
      ["neutron", "sync", root, "--json"],
      dependencies,
      { stdout: (message) => output.push(message), stderr: () => undefined },
    );

    expect(exitCode).toBe(0);
    expect(JSON.parse(output.join("\n"))).toMatchObject({
      projectId: "project-local",
    });
  });

  it("routes neutron sync and subagent list subcommands", async () => {
    const { root, dependencies } = await preparedProject();
    const syncOutput: string[] = [];
    const listOutput: string[] = [];

    expect(
      await runCli(["neutron", "sync", root, "--json"], dependencies, {
        stdout: (message) => syncOutput.push(message),
        stderr: () => undefined,
      }),
    ).toBe(0);
    expect(JSON.parse(syncOutput.join("\n"))).toHaveProperty("readiness");

    expect(
      await runCli(
        ["neutron", "subagent", "list", "--root", root, "--json"],
        dependencies,
        {
          stdout: (message) => listOutput.push(message),
          stderr: () => undefined,
        },
      ),
    ).toBe(0);
    expect(Array.isArray(JSON.parse(listOutput.join("\n")))).toBe(true);
  });

  it("rejects missing top-level neutron subcommand", async () => {
    const errors: string[] = [];

    const exitCode = await runCli(
      ["neutron"],
      { catalogRoot },
      {
        stdout: () => undefined,
        stderr: (message) => errors.push(message),
      },
    );

    expect(exitCode).toBe(2);
    expect(errors.join("\n")).toContain(
      "neutron requires subagent or sync subcommand",
    );
  });

  it("rejects unknown top-level neutron subcommand", async () => {
    const errors: string[] = [];

    const exitCode = await runCli(
      ["neutron", "unknown"],
      { catalogRoot },
      {
        stdout: () => undefined,
        stderr: (message) => errors.push(message),
      },
    );

    expect(exitCode).toBe(2);
    expect(errors.join("\n")).toContain(
      "neutron requires subagent or sync subcommand",
    );
  });

  it("renders sync text output with expected structure", async () => {
    const { fs, root, dependencies } = await preparedProject();
    await spawnNeutronSubagentTask(
      {
        root,
        projectId: "p-1",
        role: "research",
        taskInput: "sync text check",
      },
      fs,
    );
    const output: string[] = [];

    const exitCode = await runCli(["neutron", "sync", root], dependencies, {
      stdout: (message) => output.push(message),
      stderr: () => undefined,
    });

    expect(exitCode).toBe(0);
    const text = output.join("\n");
    expect(text).toContain("Neutron Workspace Sync (project-local):");
    expect(text).toContain("Readiness:");
    expect(text).toContain("Findings:");
    expect(text).toContain("Security Score:");
    expect(text).toContain("Active Conversations:");
    expect(text).toContain("Subagent Tasks: 1");
  });

  it("renders sync JSON output", async () => {
    const { root, dependencies } = await preparedProject();
    const output: string[] = [];

    const exitCode = await runCli(
      ["neutron", "sync", root, "--json"],
      dependencies,
      { stdout: (message) => output.push(message), stderr: () => undefined },
    );

    expect(exitCode).toBe(0);
    const data = JSON.parse(output.join("\n"));
    expect(data).toMatchObject({
      projectId: "project-local",
      readiness: expect.any(String),
      subagentTasksCount: expect.any(Number),
    });
  });

  it("accepts sync positional root at argv index 2", async () => {
    const { root, dependencies } = await preparedProject();
    const output: string[] = [];

    const exitCode = await runCli(
      ["neutron", "sync", root, "--json"],
      dependencies,
      { stdout: (message) => output.push(message), stderr: () => undefined },
    );

    expect(exitCode).toBe(0);
    expect(JSON.parse(output.join("\n")).root).toBe(root);
  });

  it("accepts sync --root flag", async () => {
    const { root, dependencies } = await preparedProject();
    const output: string[] = [];

    const exitCode = await runCli(
      ["neutron", "sync", "--root", root, "--json"],
      dependencies,
      { stdout: (message) => output.push(message), stderr: () => undefined },
    );

    expect(exitCode).toBe(0);
    expect(JSON.parse(output.join("\n")).root).toBe(root);
  });

  it("rejects duplicate sync project roots", async () => {
    const { root, dependencies } = await preparedProject();
    const errors: string[] = [];

    const exitCode = await runCli(
      ["neutron", "sync", root, "--root", "/other"],
      dependencies,
      {
        stdout: () => undefined,
        stderr: (message) => errors.push(message),
      },
    );

    expect(exitCode).toBe(2);
    expect(errors.join("\n")).toContain(
      "project path specified more than once",
    );
  });

  it("rejects second sync positional when root is already set", async () => {
    const { root, dependencies } = await preparedProject();
    const errors: string[] = [];

    const exitCode = await runCli(
      ["neutron", "sync", "--root", root, "/other"],
      dependencies,
      {
        stdout: () => undefined,
        stderr: (message) => errors.push(message),
      },
    );

    expect(exitCode).toBe(2);
    expect(errors.join("\n")).toContain("unexpected argument: /other");
  });

  it("renders spawn text output with default research role", async () => {
    const { root, dependencies } = await preparedProject();
    const output: string[] = [];

    const exitCode = await runCli(
      ["neutron", "subagent", "spawn", "--root", root],
      dependencies,
      { stdout: (message) => output.push(message), stderr: () => undefined },
    );

    expect(exitCode).toBe(0);
    expect(output.join("\n")).toMatch(
      /Spawned Neutron subagent task task-.* \(role: research, status: completed\)/,
    );
  });

  it("renders spawn JSON output", async () => {
    const { root, dependencies } = await preparedProject();
    const output: string[] = [];

    const exitCode = await runCli(
      [
        "neutron",
        "subagent",
        "spawn",
        "--role",
        "test-runner",
        "--input",
        "Run tests",
        "--root",
        root,
        "--json",
      ],
      dependencies,
      { stdout: (message) => output.push(message), stderr: () => undefined },
    );

    expect(exitCode).toBe(0);
    expect(JSON.parse(output.join("\n"))).toMatchObject({
      role: "test-runner",
      taskInput: "Run tests",
      status: "completed",
    });
  });

  it("accepts spawn positional root only after nested action at index 3", async () => {
    const { root, dependencies } = await preparedProject();
    const output: string[] = [];

    const exitCode = await runCli(
      ["neutron", "subagent", "spawn", root, "--json"],
      dependencies,
      { stdout: (message) => output.push(message), stderr: () => undefined },
    );

    expect(exitCode).toBe(0);
    expect(JSON.parse(output.join("\n")).role).toBe("research");
  });

  it("does not treat subagent nested action slot as project root", async () => {
    const { root, dependencies } = await preparedProject();
    const errors: string[] = [];

    const exitCode = await runCli(
      ["neutron", "subagent", "spawn", "--root", root, "extra-positional"],
      dependencies,
      {
        stdout: () => undefined,
        stderr: (message) => errors.push(message),
      },
    );

    expect(exitCode).toBe(2);
    expect(errors.join("\n")).toContain(
      "unexpected argument: extra-positional",
    );
  });

  it("prefers --input over --content for spawn task input", async () => {
    const { root, dependencies } = await preparedProject();
    const output: string[] = [];

    const exitCode = await runCli(
      [
        "neutron",
        "subagent",
        "spawn",
        "--input",
        "from-input",
        "--content",
        "from-content",
        "--root",
        root,
        "--json",
      ],
      dependencies,
      { stdout: (message) => output.push(message), stderr: () => undefined },
    );

    expect(exitCode).toBe(0);
    expect(JSON.parse(output.join("\n")).taskInput).toBe("from-input");
  });

  it("falls back to --content when --input is absent", async () => {
    const { root, dependencies } = await preparedProject();
    const output: string[] = [];

    const exitCode = await runCli(
      [
        "neutron",
        "subagent",
        "spawn",
        "--content",
        "from-content",
        "--root",
        root,
        "--json",
      ],
      dependencies,
      { stdout: (message) => output.push(message), stderr: () => undefined },
    );

    expect(exitCode).toBe(0);
    expect(JSON.parse(output.join("\n")).taskInput).toBe("from-content");
  });

  it("falls back to General research task when no task input flags are provided", async () => {
    const { root, dependencies } = await preparedProject();
    const output: string[] = [];

    const exitCode = await runCli(
      ["neutron", "subagent", "spawn", "--root", root, "--json"],
      dependencies,
      { stdout: (message) => output.push(message), stderr: () => undefined },
    );

    expect(exitCode).toBe(0);
    expect(JSON.parse(output.join("\n")).taskInput).toBe(
      "General research task",
    );
  });

  it("forwards conversation-id to spawn", async () => {
    const { root, dependencies } = await preparedProject();
    const output: string[] = [];

    const exitCode = await runCli(
      [
        "neutron",
        "subagent",
        "spawn",
        "--conversation-id",
        "conv-123",
        "--root",
        root,
        "--json",
      ],
      dependencies,
      { stdout: (message) => output.push(message), stderr: () => undefined },
    );

    expect(exitCode).toBe(0);
    expect(JSON.parse(output.join("\n")).conversationId).toBe("conv-123");
  });

  it("accepts --project-id but ignores it for spawn", async () => {
    const { root, dependencies } = await preparedProject();
    const output: string[] = [];

    const exitCode = await runCli(
      [
        "neutron",
        "subagent",
        "spawn",
        "--project-id",
        "ignored-id",
        "--root",
        root,
        "--json",
      ],
      dependencies,
      { stdout: (message) => output.push(message), stderr: () => undefined },
    );

    expect(exitCode).toBe(0);
    expect(JSON.parse(output.join("\n")).projectId).toBe("project-local");
  });

  it("accepts --dry-run but spawn still persists state", async () => {
    const { fs, root, dependencies } = await preparedProject();

    const exitCode = await runCli(
      [
        "neutron",
        "subagent",
        "spawn",
        "--dry-run",
        "--input",
        "dry-run-check",
        "--root",
        root,
        "--json",
      ],
      dependencies,
      { stdout: () => undefined, stderr: () => undefined },
    );

    expect(exitCode).toBe(0);
    const tasks = await listNeutronSubagentTasks({ root }, fs);
    expect(tasks.length).toBe(1);
    expect(tasks[0]?.taskInput).toBe("dry-run-check");
  });

  it("rejects invalid neutron subagent role with exact message", async () => {
    const { root, dependencies } = await preparedProject();
    const errors: string[] = [];

    const exitCode = await runCli(
      [
        "neutron",
        "subagent",
        "spawn",
        "--role",
        "invalid-role",
        "--root",
        root,
      ],
      dependencies,
      {
        stdout: () => undefined,
        stderr: (message) => errors.push(message),
      },
    );

    expect(exitCode).toBe(2);
    expect(errors.join("\n")).toContain(
      "invalid neutron subagent role 'invalid-role'",
    );
  });

  it("gets subagent task by --task-id", async () => {
    const { fs, root, dependencies } = await preparedProject();
    const task = await spawnNeutronSubagentTask(
      {
        root,
        projectId: "project-local",
        role: "research",
        taskInput: "get by task-id",
      },
      fs,
    );
    const output: string[] = [];

    const exitCode = await runCli(
      [
        "neutron",
        "subagent",
        "get",
        "--task-id",
        task.id,
        "--root",
        root,
        "--json",
      ],
      dependencies,
      { stdout: (message) => output.push(message), stderr: () => undefined },
    );

    expect(exitCode).toBe(0);
    expect(JSON.parse(output.join("\n")).id).toBe(task.id);
  });

  it("falls back from --task-id to --id for get", async () => {
    const { fs, root, dependencies } = await preparedProject();
    const task = await spawnNeutronSubagentTask(
      {
        root,
        projectId: "project-local",
        role: "research",
        taskInput: "get by id",
      },
      fs,
    );
    const output: string[] = [];

    const exitCode = await runCli(
      ["neutron", "subagent", "get", "--id", task.id, "--root", root, "--json"],
      dependencies,
      { stdout: (message) => output.push(message), stderr: () => undefined },
    );

    expect(exitCode).toBe(0);
    expect(JSON.parse(output.join("\n")).id).toBe(task.id);
  });

  it("returns not found for get with missing task id", async () => {
    const { root, dependencies } = await preparedProject();
    const errors: string[] = [];

    const exitCode = await runCli(
      ["neutron", "subagent", "get", "--root", root],
      dependencies,
      {
        stdout: () => undefined,
        stderr: (message) => errors.push(message),
      },
    );

    expect(exitCode).toBe(3);
    expect(errors.join("\n")).toContain("Neutron subagent task  not found");
  });

  it("returns stderr and exit 3 for get not found in text mode", async () => {
    const { root, dependencies } = await preparedProject();
    const output: string[] = [];
    const errors: string[] = [];

    const exitCode = await runCli(
      [
        "neutron",
        "subagent",
        "get",
        "--task-id",
        "missing-task",
        "--root",
        root,
      ],
      dependencies,
      {
        stdout: (message) => output.push(message),
        stderr: (message) => errors.push(message),
      },
    );

    expect(exitCode).toBe(3);
    expect(errors.join("\n")).toContain(
      "Neutron subagent task missing-task not found",
    );
    expect(output.join("\n")).toBe("");
  });

  it("returns stderr and empty stdout for get not found in JSON mode", async () => {
    const { root, dependencies } = await preparedProject();
    const output: string[] = [];
    const errors: string[] = [];

    const exitCode = await runCli(
      [
        "neutron",
        "subagent",
        "get",
        "--task-id",
        "missing-task",
        "--root",
        root,
        "--json",
      ],
      dependencies,
      {
        stdout: (message) => output.push(message),
        stderr: (message) => errors.push(message),
      },
    );

    expect(exitCode).toBe(3);
    expect(errors.join("\n")).toContain(
      "Neutron subagent task missing-task not found",
    );
    expect(output.join("\n")).toBe("");
  });

  it("renders list text output", async () => {
    const { fs, root, dependencies } = await preparedProject();
    await spawnNeutronSubagentTask(
      {
        root,
        projectId: "project-local",
        role: "research",
        taskInput: "list text check",
      },
      fs,
    );
    const output: string[] = [];

    const exitCode = await runCli(
      ["neutron", "subagent", "list", "--root", root],
      dependencies,
      { stdout: (message) => output.push(message), stderr: () => undefined },
    );

    expect(exitCode).toBe(0);
    const text = output.join("\n");
    expect(text).toContain("Neutron Subagent Tasks (1):");
    expect(text).toContain("list text check");
  });

  it("renders list JSON output", async () => {
    const { fs, root, dependencies } = await preparedProject();
    await spawnNeutronSubagentTask(
      {
        root,
        projectId: "project-local",
        role: "arch-checker",
        taskInput: "list json check",
      },
      fs,
    );
    const output: string[] = [];

    const exitCode = await runCli(
      ["neutron", "subagent", "list", "--root", root, "--json"],
      dependencies,
      { stdout: (message) => output.push(message), stderr: () => undefined },
    );

    expect(exitCode).toBe(0);
    const data = JSON.parse(output.join("\n"));
    expect(data).toHaveLength(1);
    expect(data[0]).toMatchObject({ role: "arch-checker" });
  });

  it("returns success 0 for empty list", async () => {
    const { root, dependencies } = await preparedProject();
    const output: string[] = [];

    const exitCode = await runCli(
      ["neutron", "subagent", "list", "--root", root, "--json"],
      dependencies,
      { stdout: (message) => output.push(message), stderr: () => undefined },
    );

    expect(exitCode).toBe(0);
    expect(JSON.parse(output.join("\n"))).toEqual([]);
  });

  it("filters list by conversation-id", async () => {
    const { fs, root, dependencies } = await preparedProject();
    await spawnNeutronSubagentTask(
      {
        root,
        projectId: "project-local",
        role: "research",
        taskInput: "matched",
        conversationId: "conv-a",
      },
      fs,
    );
    await spawnNeutronSubagentTask(
      {
        root,
        projectId: "project-local",
        role: "research",
        taskInput: "unmatched",
        conversationId: "conv-b",
      },
      fs,
    );
    const output: string[] = [];

    const exitCode = await runCli(
      [
        "neutron",
        "subagent",
        "list",
        "--conversation-id",
        "conv-a",
        "--root",
        root,
        "--json",
      ],
      dependencies,
      { stdout: (message) => output.push(message), stderr: () => undefined },
    );

    expect(exitCode).toBe(0);
    const data = JSON.parse(output.join("\n"));
    expect(data).toHaveLength(1);
    expect(data[0].conversationId).toBe("conv-a");
  });

  it("returns task identifier is required for missing nested action", async () => {
    const { root, dependencies } = await preparedProject();
    const errors: string[] = [];

    const exitCode = await runCli(
      ["neutron", "subagent", "--root", root],
      dependencies,
      {
        stdout: () => undefined,
        stderr: (message) => errors.push(message),
      },
    );

    expect(exitCode).toBe(2);
    expect(errors.join("\n")).toContain("task identifier is required");
  });

  it("returns task identifier is required for unknown nested action", async () => {
    const { root, dependencies } = await preparedProject();
    const errors: string[] = [];

    const exitCode = await runCli(
      ["neutron", "subagent", "unknown", "--root", root],
      dependencies,
      {
        stdout: () => undefined,
        stderr: (message) => errors.push(message),
      },
    );

    expect(exitCode).toBe(2);
    expect(errors.join("\n")).toContain("task identifier is required");
  });

  it("preserves SchemaCatalogError precedence for missing nested action", async () => {
    const brokenRoot = await brokenCatalogRoot();
    const { fs, root } = await preparedProject();
    const errors: string[] = [];

    const exitCode = await runCli(
      ["neutron", "subagent", "--root", root],
      { catalogRoot: brokenRoot, fileSystem: fs },
      {
        stdout: () => undefined,
        stderr: (message) => errors.push(message),
      },
    );

    expect(exitCode).toBe(3);
    expect(errors.join("\n")).toContain(
      "Intentloom schema catalog validation failed",
    );
    expect(errors.join("\n")).not.toContain("task identifier is required");
  });

  it("preserves SchemaCatalogError precedence for unknown nested action", async () => {
    const brokenRoot = await brokenCatalogRoot();
    const { fs, root } = await preparedProject();
    const errors: string[] = [];

    const exitCode = await runCli(
      ["neutron", "subagent", "unknown", "--root", root],
      { catalogRoot: brokenRoot, fileSystem: fs },
      {
        stdout: () => undefined,
        stderr: (message) => errors.push(message),
      },
    );

    expect(exitCode).toBe(3);
    expect(errors.join("\n")).toContain(
      "Intentloom schema catalog validation failed",
    );
    expect(errors.join("\n")).not.toContain("task identifier is required");
  });

  it("accepts legacy ignored boolean flags such as --dry-run on list", async () => {
    const { root, dependencies } = await preparedProject();
    const output: string[] = [];

    const exitCode = await runCli(
      ["neutron", "subagent", "list", "--root", root, "--dry-run", "--json"],
      dependencies,
      { stdout: (message) => output.push(message), stderr: () => undefined },
    );

    expect(exitCode).toBe(0);
    expect(Array.isArray(JSON.parse(output.join("\n")))).toBe(true);
  });

  it("accepts legacy ignored value flags such as --profile", async () => {
    const { root, dependencies } = await preparedProject();
    const output: string[] = [];

    const exitCode = await runCli(
      [
        "neutron",
        "subagent",
        "list",
        "--root",
        root,
        "--profile",
        "generic",
        "--json",
      ],
      dependencies,
      { stdout: (message) => output.push(message), stderr: () => undefined },
    );

    expect(exitCode).toBe(0);
    expect(Array.isArray(JSON.parse(output.join("\n")))).toBe(true);
  });

  it("rejects --force with the sync-only message", async () => {
    const errors: string[] = [];

    const exitCode = await runCli(
      ["neutron", "sync", "--force"],
      { catalogRoot },
      {
        stdout: () => undefined,
        stderr: (message) => errors.push(message),
      },
    );

    expect(exitCode).toBe(2);
    expect(errors.join("\n")).toContain("--force is only valid with sync");
  });

  it("rejects --cache with the clean-only message", async () => {
    const errors: string[] = [];

    const exitCode = await runCli(
      ["neutron", "sync", "--cache"],
      { catalogRoot },
      {
        stdout: () => undefined,
        stderr: (message) => errors.push(message),
      },
    );

    expect(exitCode).toBe(2);
    expect(errors.join("\n")).toContain("--cache is only valid with clean");
  });

  it("rejects adoption mapping flags", async () => {
    const errors: string[] = [];

    const exitCode = await runCli(
      ["neutron", "sync", "--project-owned-mapping", "src=dest"],
      { catalogRoot },
      {
        stdout: () => undefined,
        stderr: (message) => errors.push(message),
      },
    );

    expect(exitCode).toBe(2);
    expect(errors.join("\n")).toContain(
      "adoption mappings are only valid with init or adopt",
    );
  });

  it("requires daemon endpoint and token file to be paired", async () => {
    const errors: string[] = [];

    const exitCode = await runCli(
      ["neutron", "sync", "--daemon-endpoint", "/tmp/intentloomd.sock"],
      { catalogRoot },
      {
        stdout: () => undefined,
        stderr: (message) => errors.push(message),
      },
    );

    expect(exitCode).toBe(2);
    expect(errors.join("\n")).toContain(
      "--daemon-endpoint and --daemon-token-file must be used together",
    );
  });

  it("rejects paired daemon flags on neutron", async () => {
    const errors: string[] = [];

    const exitCode = await runCli(
      [
        "neutron",
        "sync",
        "--daemon-endpoint",
        "/tmp/intentloomd.sock",
        "--daemon-token-file",
        "/tmp/token",
      ],
      { catalogRoot },
      {
        stdout: () => undefined,
        stderr: (message) => errors.push(message),
      },
    );

    expect(exitCode).toBe(2);
    expect(errors.join("\n")).toContain(
      "daemon mode is only valid with doctor",
    );
  });

  it("rejects unknown options", async () => {
    const errors: string[] = [];

    const exitCode = await runCli(
      ["neutron", "sync", "--unknown-flag"],
      { catalogRoot },
      {
        stdout: () => undefined,
        stderr: (message) => errors.push(message),
      },
    );

    expect(exitCode).toBe(2);
    expect(errors.join("\n")).toContain("unknown option: --unknown-flag");
  });

  it("rejects missing flag values", async () => {
    const errors: string[] = [];

    const exitCode = await runCli(
      ["neutron", "sync", "--root"],
      { catalogRoot },
      {
        stdout: () => undefined,
        stderr: (message) => errors.push(message),
      },
    );

    expect(exitCode).toBe(2);
    expect(errors.join("\n")).toContain("missing value for --root");
  });

  it("reports parser errors before schema catalog bootstrap errors", async () => {
    const brokenRoot = await brokenCatalogRoot();
    const errors: string[] = [];

    const exitCode = await runCli(
      ["neutron", "sync", "--unknown-flag"],
      { catalogRoot: brokenRoot },
      {
        stdout: () => undefined,
        stderr: (message) => errors.push(message),
      },
    );

    expect(exitCode).toBe(2);
    expect(errors.join("\n")).toContain("unknown option: --unknown-flag");
    expect(errors.join("\n")).not.toContain(
      "Intentloom schema catalog validation failed",
    );
  });

  it("returns exit code 3 for a broken schema catalog on stderr", async () => {
    const brokenRoot = await brokenCatalogRoot();
    const { fs, root } = await preparedProject();
    const errors: string[] = [];

    const exitCode = await runCli(
      ["neutron", "sync", "--root", root],
      { catalogRoot: brokenRoot, fileSystem: fs },
      {
        stdout: () => undefined,
        stderr: (message) => errors.push(message),
      },
    );

    expect(exitCode).toBe(3);
    expect(errors.join("\n")).toContain(
      "Intentloom schema catalog validation failed",
    );
    expect(errors.join("\n")).toContain("aif-config.schema.json");
  });

  it("keeps sync read-only", async () => {
    const { fs, root, dependencies } = await preparedProject();
    await spawnNeutronSubagentTask(
      {
        root,
        projectId: "project-local",
        role: "research",
        taskInput: "read-only sync check",
      },
      fs,
    );
    const beforeFiles = new Set(await fs.list(root));

    const exitCode = await runCli(
      ["neutron", "sync", root, "--json"],
      dependencies,
      { stdout: () => undefined, stderr: () => undefined },
    );

    const afterFiles = new Set(await fs.list(root));
    expect(exitCode).toBe(0);
    expect(afterFiles).toEqual(beforeFiles);
  });

  it("persists spawn state unchanged", async () => {
    const { fs, root, dependencies } = await preparedProject();

    const exitCode = await runCli(
      [
        "neutron",
        "subagent",
        "spawn",
        "--input",
        "persistence check",
        "--root",
        root,
        "--json",
      ],
      dependencies,
      { stdout: () => undefined, stderr: () => undefined },
    );

    expect(exitCode).toBe(0);
    const tasks = await listNeutronSubagentTasks({ root }, fs);
    expect(tasks).toHaveLength(1);
    expect(tasks[0]?.taskInput).toBe("persistence check");
    expect(tasks[0]?.projectId).toBe("project-local");
  });
});
