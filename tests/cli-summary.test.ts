import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { createMemoryFileSystem } from "@intentloom/application";
import { runCli } from "../packages/cli/src/command.js";
import { runCliEntry } from "../packages/cli/src/cli-entry.js";

const catalogRoot = resolve("catalog");

const taskData = {
  id: "task-summary-cli",
  root: "/project",
  intent: "Summary CLI parity task",
  affectedPaths: ["src/app.ts"],
  validationOutcome: "passed",
  evidenceReferences: [],
  usedSkills: [],
  unresolvedWork: [],
  provenance: "cli-summary-test",
  trustClass: "verified-evidence",
  retentionState: "active",
};

describe("summary CLI extraction", () => {
  it("dispatches summary through runCliEntry", async () => {
    const projectRoot = resolve("summary entry dispatch");
    const fileSystem = createMemoryFileSystem();
    const stdout: string[] = [];

    const exitCode = await runCliEntry(
      [
        "summary",
        "record",
        "--root",
        projectRoot,
        "--json-input",
        JSON.stringify({ ...taskData, id: "task-entry", root: projectRoot }),
        "--json",
      ],
      { catalogRoot, fileSystem },
      { stdout: (message) => stdout.push(message), stderr: () => undefined },
    );

    expect(exitCode).toBe(0);
    expect(JSON.parse(stdout.join("\n")).id).toBe("task-entry");
  });

  it("requires list, get, or record subcommand", async () => {
    const stderr: string[] = [];

    const exitCode = await runCli(
      ["summary"],
      { catalogRoot, fileSystem: createMemoryFileSystem() },
      { stdout: () => undefined, stderr: (message) => stderr.push(message) },
    );

    expect(exitCode).toBe(2);
    expect(stderr.join("\n")).toBe(
      "summary requires list, get, or record subcommand",
    );
  });

  it("rejects unsupported subcommands", async () => {
    const stderr: string[] = [];

    const exitCode = await runCli(
      ["summary", "archive"],
      { catalogRoot, fileSystem: createMemoryFileSystem() },
      { stdout: () => undefined, stderr: (message) => stderr.push(message) },
    );

    expect(exitCode).toBe(2);
    expect(stderr.join("\n")).toBe(
      "summary requires list, get, or record subcommand",
    );
  });

  it("rejects unknown options", async () => {
    const stderr: string[] = [];

    const exitCode = await runCli(
      ["summary", "list", "--unknown"],
      { catalogRoot, fileSystem: createMemoryFileSystem() },
      { stdout: () => undefined, stderr: (message) => stderr.push(message) },
    );

    expect(exitCode).toBe(2);
    expect(stderr.join("\n")).toBe("unknown option: --unknown");
  });

  it("rejects missing option values", async () => {
    const stderr: string[] = [];

    const exitCode = await runCli(
      ["summary", "get", "--id"],
      { catalogRoot, fileSystem: createMemoryFileSystem() },
      { stdout: () => undefined, stderr: (message) => stderr.push(message) },
    );

    expect(exitCode).toBe(2);
    expect(stderr.join("\n")).toBe("missing value for --id");
  });

  it("rejects duplicate --root", async () => {
    const stderr: string[] = [];

    const exitCode = await runCli(
      ["summary", "list", "--root", "/first", "--root", "/second"],
      { catalogRoot, fileSystem: createMemoryFileSystem() },
      { stdout: () => undefined, stderr: (message) => stderr.push(message) },
    );

    expect(exitCode).toBe(2);
    expect(stderr.join("\n")).toBe("project path specified more than once");
  });

  it("rejects unexpected positional arguments", async () => {
    const stderr: string[] = [];

    const exitCode = await runCli(
      ["summary", "list", "extra"],
      { catalogRoot, fileSystem: createMemoryFileSystem() },
      { stdout: () => undefined, stderr: (message) => stderr.push(message) },
    );

    expect(exitCode).toBe(2);
    expect(stderr.join("\n")).toBe("unexpected argument: extra");
  });

  it("rejects --force", async () => {
    const stderr: string[] = [];

    const exitCode = await runCli(
      ["summary", "list", "--force"],
      { catalogRoot, fileSystem: createMemoryFileSystem() },
      { stdout: () => undefined, stderr: (message) => stderr.push(message) },
    );

    expect(exitCode).toBe(2);
    expect(stderr.join("\n")).toBe("--force is only valid with sync");
  });

  it("rejects adoption mapping flags", async () => {
    const stderr: string[] = [];

    const exitCode = await runCli(
      ["summary", "list", "--project-owned-mapping", "src/**"],
      { catalogRoot, fileSystem: createMemoryFileSystem() },
      { stdout: () => undefined, stderr: (message) => stderr.push(message) },
    );

    expect(exitCode).toBe(2);
    expect(stderr.join("\n")).toBe(
      "adoption mappings are only valid with init or adopt",
    );
  });

  it("records, lists, and gets summaries with JSON output", async () => {
    const projectRoot = resolve("summary json parity");
    const fileSystem = createMemoryFileSystem();

    const recordExit = await runCli(
      [
        "summary",
        "record",
        "--root",
        projectRoot,
        "--json-input",
        JSON.stringify({ ...taskData, root: projectRoot }),
        "--json",
      ],
      { catalogRoot, fileSystem },
      { stdout: () => undefined, stderr: () => undefined },
    );
    expect(recordExit).toBe(0);

    const listOutput: string[] = [];
    const listExit = await runCli(
      ["summary", "list", "--root", projectRoot, "--json"],
      { catalogRoot, fileSystem },
      {
        stdout: (message) => listOutput.push(message),
        stderr: () => undefined,
      },
    );
    expect(listExit).toBe(0);
    const list = JSON.parse(listOutput.join("\n"));
    expect(list).toHaveLength(1);
    expect(list[0].id).toBe("task-summary-cli");

    const getOutput: string[] = [];
    const getExit = await runCli(
      [
        "summary",
        "get",
        "--root",
        projectRoot,
        "--id",
        "task-summary-cli",
        "--json",
      ],
      { catalogRoot, fileSystem },
      { stdout: (message) => getOutput.push(message), stderr: () => undefined },
    );
    expect(getExit).toBe(0);
    expect(JSON.parse(getOutput.join("\n")).intent).toBe(
      "Summary CLI parity task",
    );
  });

  it("renders empty list text output", async () => {
    const projectRoot = resolve("summary empty list");
    const stdout: string[] = [];

    const exitCode = await runCli(
      ["summary", "list", "--root", projectRoot],
      { catalogRoot, fileSystem: createMemoryFileSystem() },
      { stdout: (message) => stdout.push(message), stderr: () => undefined },
    );

    expect(exitCode).toBe(0);
    expect(stdout.join("\n")).toBe("No task summaries recorded.");
  });

  it("returns exit 3 when summary is not found", async () => {
    const projectRoot = resolve("summary missing");
    const stderr: string[] = [];

    const exitCode = await runCli(
      ["summary", "get", "--root", projectRoot, "--id", "missing-id"],
      { catalogRoot, fileSystem: createMemoryFileSystem() },
      { stdout: () => undefined, stderr: (message) => stderr.push(message) },
    );

    expect(exitCode).toBe(3);
    expect(stderr.join("\n")).toBe("Summary not found: missing-id\n");
  });

  it("treats the first positional token after get as id fallback", async () => {
    const stderr: string[] = [];

    const exitCode = await runCli(
      ["summary", "get", "--root", "/project"],
      { catalogRoot, fileSystem: createMemoryFileSystem() },
      { stdout: () => undefined, stderr: (message) => stderr.push(message) },
    );

    expect(exitCode).toBe(3);
    expect(stderr.join("\n")).toBe("Summary not found: --root\n");
  });

  it("requires --id for summary get when no positional id token exists", async () => {
    const stderr: string[] = [];

    const exitCode = await runCli(
      ["summary", "get"],
      { catalogRoot, fileSystem: createMemoryFileSystem() },
      { stdout: () => undefined, stderr: (message) => stderr.push(message) },
    );

    expect(exitCode).toBe(2);
    expect(stderr.join("\n")).toBe("summary get requires --id <id>");
  });

  it("requires json input or file for summary record", async () => {
    const stderr: string[] = [];

    const exitCode = await runCli(
      ["summary", "record", "--root", "/project"],
      { catalogRoot, fileSystem: createMemoryFileSystem() },
      { stdout: () => undefined, stderr: (message) => stderr.push(message) },
    );

    expect(exitCode).toBe(2);
    expect(stderr.join("\n")).toBe(
      "summary record requires --json-input <json> or --file <path>",
    );
  });

  it("records summary from --file input", async () => {
    const projectRoot = resolve("summary file input");
    const fileSystem = createMemoryFileSystem({
      [join(projectRoot, "input/summary.json")]: JSON.stringify(taskData),
    });
    const stdout: string[] = [];

    const exitCode = await runCli(
      [
        "summary",
        "record",
        "--root",
        projectRoot,
        "--file",
        "input/summary.json",
        "--json",
      ],
      { catalogRoot, fileSystem },
      { stdout: (message) => stdout.push(message), stderr: () => undefined },
    );

    expect(exitCode).toBe(0);
    expect(JSON.parse(stdout.join("\n")).id).toBe("task-summary-cli");
  });

  it("filters list output by trust-class and retention-state", async () => {
    const projectRoot = resolve("summary filters");
    const fileSystem = createMemoryFileSystem();

    await runCli(
      [
        "summary",
        "record",
        "--root",
        projectRoot,
        "--json-input",
        JSON.stringify({
          ...taskData,
          id: "task-filter-a",
          root: projectRoot,
          trustClass: "verified-evidence",
          retentionState: "active",
        }),
      ],
      { catalogRoot, fileSystem },
      { stdout: () => undefined, stderr: () => undefined },
    );
    await runCli(
      [
        "summary",
        "record",
        "--root",
        projectRoot,
        "--json-input",
        JSON.stringify({
          ...taskData,
          id: "task-filter-b",
          root: projectRoot,
          trustClass: "agent-generated",
          retentionState: "archived",
        }),
      ],
      { catalogRoot, fileSystem },
      { stdout: () => undefined, stderr: () => undefined },
    );

    const stdout: string[] = [];
    const exitCode = await runCli(
      [
        "summary",
        "list",
        "--root",
        projectRoot,
        "--trust-class",
        "verified-evidence",
        "--retention-state",
        "active",
        "--json",
      ],
      { catalogRoot, fileSystem },
      { stdout: (message) => stdout.push(message), stderr: () => undefined },
    );

    expect(exitCode).toBe(0);
    const list = JSON.parse(stdout.join("\n"));
    expect(list).toHaveLength(1);
    expect(list[0].id).toBe("task-filter-a");
  });
});
