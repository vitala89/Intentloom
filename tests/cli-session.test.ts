import { cp, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  createMemoryFileSystem,
  getAgentSession,
  startAgentSession,
} from "@intentloom/application";
import { runCli } from "../packages/cli/src/command.js";
import { runCliEntry } from "../packages/cli/src/cli-entry.js";

const catalogRoot = resolve("catalog");

async function brokenCatalogRoot(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "intentloom-session-catalog-"));
  await cp(resolve("catalog"), join(root, "catalog"), { recursive: true });
  await cp(resolve("profiles"), join(root, "profiles"), { recursive: true });
  const schemaPath = join(root, "catalog/schemas/aif-config.schema.json");
  const schema = JSON.parse(await readFile(schemaPath, "utf8"));
  schema.properties.profile = { $ref: "#/$defs/missing" };
  await writeFile(schemaPath, JSON.stringify(schema), "utf8");
  return join(root, "catalog");
}

function preparedSessionRoot(root = "/project") {
  const fs = createMemoryFileSystem();
  return { fs, root, dependencies: { catalogRoot, fileSystem: fs } };
}

describe("session CLI", () => {
  it("dispatches session through runCliEntry", async () => {
    const { root, dependencies } = preparedSessionRoot();
    const output: string[] = [];

    const exitCode = await runCliEntry(
      ["session", "list", "--root", root, "--json"],
      dependencies,
      { stdout: (message) => output.push(message), stderr: () => undefined },
    );

    expect(exitCode).toBe(0);
    expect(Array.isArray(JSON.parse(output.join("\n")))).toBe(true);
  });

  it.each([
    ["start", 0],
    ["close", 2],
    ["list", 0],
    ["get", 2],
    ["delete", 2],
    ["export", 2],
  ] as const)(
    "recognizes session %s subcommand routing",
    async (subcommand, expectedExit) => {
      const { root, dependencies } = preparedSessionRoot();
      const errors: string[] = [];
      const base = ["session", subcommand, "--root", root];

      const exitCode = await runCli(base, dependencies, {
        stdout: () => undefined,
        stderr: (message) => errors.push(message),
      });

      expect(exitCode).toBe(expectedExit);
      expect(errors.join("\n")).not.toContain(
        "session requires start, close, list, get, delete, or export subcommand",
      );
    },
  );

  it("rejects missing session subcommand with exact message", async () => {
    const errors: string[] = [];

    const exitCode = await runCli(
      ["session"],
      { catalogRoot },
      {
        stdout: () => undefined,
        stderr: (message) => errors.push(message),
      },
    );

    expect(exitCode).toBe(2);
    expect(errors.join("\n")).toContain(
      "session requires start, close, list, get, delete, or export subcommand",
    );
  });

  it("rejects unknown session subcommand with exact message", async () => {
    const errors: string[] = [];

    const exitCode = await runCli(
      ["session", "archive"],
      { catalogRoot },
      {
        stdout: () => undefined,
        stderr: (message) => errors.push(message),
      },
    );

    expect(exitCode).toBe(2);
    expect(errors.join("\n")).toContain(
      "session requires start, close, list, get, delete, or export subcommand",
    );
  });

  it("parses options starting after the subcommand", async () => {
    const { root, dependencies } = preparedSessionRoot();
    const output: string[] = [];

    const exitCode = await runCli(
      ["session", "list", "--root", root, "--json"],
      dependencies,
      { stdout: (message) => output.push(message), stderr: () => undefined },
    );

    expect(exitCode).toBe(0);
    expect(Array.isArray(JSON.parse(output.join("\n")))).toBe(true);
  });

  it.each([
    ["get", "ITEM_ID"],
    ["close", "ITEM_ID"],
    ["delete", "ITEM_ID"],
    ["export", "ITEM_ID"],
  ] as const)(
    "rejects bare positional session ID for session %s",
    async (subcommand, sessionId) => {
      const { root, dependencies } = preparedSessionRoot();
      const errors: string[] = [];

      const exitCode = await runCli(
        ["session", subcommand, sessionId, "--root", root],
        dependencies,
        {
          stdout: () => undefined,
          stderr: (message) => errors.push(message),
        },
      );

      expect(exitCode).toBe(2);
      expect(errors.join("\n")).toContain(`unexpected argument: ${sessionId}`);
    },
  );

  it("accepts --root for project path", async () => {
    const { root, dependencies } = preparedSessionRoot();
    const output: string[] = [];

    const exitCode = await runCli(
      ["session", "list", "--root", root, "--json"],
      dependencies,
      { stdout: (message) => output.push(message), stderr: () => undefined },
    );

    expect(exitCode).toBe(0);
    expect(Array.isArray(JSON.parse(output.join("\n")))).toBe(true);
  });

  it("rejects duplicate --root", async () => {
    const errors: string[] = [];

    const exitCode = await runCli(
      ["session", "list", "--root", "/a", "--root", "/b"],
      { catalogRoot },
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

  it("rejects unknown options", async () => {
    const errors: string[] = [];

    const exitCode = await runCli(
      ["session", "list", "--unknown-flag"],
      { catalogRoot },
      {
        stdout: () => undefined,
        stderr: (message) => errors.push(message),
      },
    );

    expect(exitCode).toBe(2);
    expect(errors.join("\n")).toContain("unknown option: --unknown-flag");
  });

  it("rejects missing option values", async () => {
    const errors: string[] = [];

    const exitCode = await runCli(
      ["session", "get", "--id"],
      { catalogRoot },
      {
        stdout: () => undefined,
        stderr: (message) => errors.push(message),
      },
    );

    expect(exitCode).toBe(2);
    expect(errors.join("\n")).toContain("missing value for --id");
  });

  it("accepts legacy ignored boolean flags such as --dry-run", async () => {
    const { root, dependencies } = preparedSessionRoot();
    const output: string[] = [];

    const exitCode = await runCli(
      ["session", "list", "--root", root, "--dry-run", "--json"],
      dependencies,
      { stdout: (message) => output.push(message), stderr: () => undefined },
    );

    expect(exitCode).toBe(0);
    expect(Array.isArray(JSON.parse(output.join("\n")))).toBe(true);
  });

  it("accepts legacy ignored value flags such as --profile", async () => {
    const { root, dependencies } = preparedSessionRoot();
    const output: string[] = [];

    const exitCode = await runCli(
      ["session", "list", "--root", root, "--profile", "generic", "--json"],
      dependencies,
      { stdout: (message) => output.push(message), stderr: () => undefined },
    );

    expect(exitCode).toBe(0);
    expect(Array.isArray(JSON.parse(output.join("\n")))).toBe(true);
  });

  it("rejects --force with the sync-only message", async () => {
    const errors: string[] = [];

    const exitCode = await runCli(
      ["session", "list", "--force"],
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
      ["session", "list", "--cache"],
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
      ["session", "list", "--project-owned-mapping", "src=dest"],
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
      ["session", "list", "--daemon-endpoint", "/tmp/intentloomd.sock"],
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

  it("rejects paired daemon flags on session", async () => {
    const errors: string[] = [];

    const exitCode = await runCli(
      [
        "session",
        "list",
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

  it("returns exit code 3 for a broken schema catalog on stderr", async () => {
    const brokenRoot = await brokenCatalogRoot();
    const { fs, root } = preparedSessionRoot();
    const errors: string[] = [];

    const exitCode = await runCli(
      ["session", "list", "--root", root],
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

  it("reports parser errors before schema catalog bootstrap errors", async () => {
    const brokenRoot = await brokenCatalogRoot();
    const errors: string[] = [];

    const exitCode = await runCli(
      ["session", "list", "--unknown-flag"],
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

  it("routes async application errors through outer catch", async () => {
    const { root, dependencies } = preparedSessionRoot();
    const errors: string[] = [];

    const exitCode = await runCli(
      ["session", "get", "--root", root, "--id", "missing-session"],
      dependencies,
      {
        stdout: () => undefined,
        stderr: (message) => errors.push(message),
      },
    );

    expect(exitCode).toBe(2);
    expect(errors.join("\n")).toContain(
      "agent session not found: missing-session",
    );
  });

  it("starts a session with text output", async () => {
    const { root, dependencies } = preparedSessionRoot();
    const output: string[] = [];

    const exitCode = await runCli(
      [
        "session",
        "start",
        "--id",
        "sess-text",
        "--task",
        "text task",
        "--root",
        root,
      ],
      dependencies,
      { stdout: (message) => output.push(message), stderr: () => undefined },
    );

    expect(exitCode).toBe(0);
    expect(output.join("\n")).toContain(
      "Started agent session sess-text [active] for task: text task",
    );
  });

  it("starts a session with JSON output", async () => {
    const { root, dependencies } = preparedSessionRoot();
    const output: string[] = [];

    const exitCode = await runCli(
      [
        "session",
        "start",
        "--id",
        "sess-json",
        "--task",
        "json task",
        "--root",
        root,
        "--json",
      ],
      dependencies,
      { stdout: (message) => output.push(message), stderr: () => undefined },
    );

    expect(exitCode).toBe(0);
    const parsed = JSON.parse(output.join("\n"));
    expect(parsed.sessionId).toBe("sess-json");
    expect(parsed.state).toBe("active");
    expect(parsed.activeTask).toBe("json task");
  });

  it("defaults projectId to project-local on start", async () => {
    const { root, fs, dependencies } = preparedSessionRoot();

    await runCli(
      ["session", "start", "--id", "sess-default-project", "--root", root],
      dependencies,
      { stdout: () => undefined, stderr: () => undefined },
    );

    const session = await getAgentSession("sess-default-project", { root }, fs);
    expect(session?.projectId).toBe("project-local");
  });

  it("defaults activeTask to unspecified-task on start", async () => {
    const { root, fs, dependencies } = preparedSessionRoot();

    await runCli(
      ["session", "start", "--id", "sess-default-task", "--root", root],
      dependencies,
      { stdout: () => undefined, stderr: () => undefined },
    );

    const session = await getAgentSession("sess-default-task", { root }, fs);
    expect(session?.activeTask).toBe("unspecified-task");
  });

  it("generates a session ID when --id is omitted", async () => {
    const { root, fs, dependencies } = preparedSessionRoot();
    const output: string[] = [];

    const exitCode = await runCli(
      ["session", "start", "--root", root, "--json"],
      dependencies,
      { stdout: (message) => output.push(message), stderr: () => undefined },
    );

    expect(exitCode).toBe(0);
    const parsed = JSON.parse(output.join("\n"));
    expect(parsed.sessionId).toMatch(/^session-/);
    expect(
      await getAgentSession(parsed.sessionId, { root }, fs),
    ).not.toBeNull();
  });

  it("accepts an explicit session ID on start", async () => {
    const { root, fs, dependencies } = preparedSessionRoot();

    await runCli(
      ["session", "start", "--id", "sess-explicit", "--root", root],
      dependencies,
      { stdout: () => undefined, stderr: () => undefined },
    );

    expect(await getAgentSession("sess-explicit", { root }, fs)).not.toBeNull();
  });

  it("returns exit 2 for duplicate start with exact message", async () => {
    const { root, dependencies } = preparedSessionRoot();
    const errors: string[] = [];

    await runCli(
      ["session", "start", "--id", "sess-dup", "--root", root],
      dependencies,
      { stdout: () => undefined, stderr: () => undefined },
    );

    const exitCode = await runCli(
      ["session", "start", "--id", "sess-dup", "--root", root],
      dependencies,
      {
        stdout: () => undefined,
        stderr: (message) => errors.push(message),
      },
    );

    expect(exitCode).toBe(2);
    expect(errors.join("\n")).toContain(
      "agent session already exists: sess-dup",
    );
  });

  it("closes a session with text output", async () => {
    const { root, fs, dependencies } = preparedSessionRoot();
    await startAgentSession(
      { root, projectId: "p", sessionId: "sess-close", activeTask: "t" },
      fs,
    );
    const output: string[] = [];

    const exitCode = await runCli(
      ["session", "close", "--id", "sess-close", "--root", root],
      dependencies,
      { stdout: (message) => output.push(message), stderr: () => undefined },
    );

    expect(exitCode).toBe(0);
    expect(output.join("\n")).toContain(
      "Closed agent session sess-close [closed]",
    );
  });

  it("closes a session with JSON output", async () => {
    const { root, fs, dependencies } = preparedSessionRoot();
    await startAgentSession(
      { root, projectId: "p", sessionId: "sess-close-json", activeTask: "t" },
      fs,
    );
    const output: string[] = [];

    const exitCode = await runCli(
      ["session", "close", "--id", "sess-close-json", "--root", root, "--json"],
      dependencies,
      { stdout: (message) => output.push(message), stderr: () => undefined },
    );

    expect(exitCode).toBe(0);
    const parsed = JSON.parse(output.join("\n"));
    expect(parsed.sessionId).toBe("sess-close-json");
    expect(parsed.state).toBe("closed");
  });

  it("requires session ID for close", async () => {
    const { root, dependencies } = preparedSessionRoot();
    const errors: string[] = [];

    const exitCode = await runCli(
      ["session", "close", "--root", root],
      dependencies,
      {
        stdout: () => undefined,
        stderr: (message) => errors.push(message),
      },
    );

    expect(exitCode).toBe(2);
    expect(errors.join("\n")).toContain(
      "session close requires session ID (--id or positional argument)",
    );
  });

  it("returns exit 2 when closing a missing session", async () => {
    const { root, dependencies } = preparedSessionRoot();
    const errors: string[] = [];

    const exitCode = await runCli(
      ["session", "close", "--id", "missing-close", "--root", root],
      dependencies,
      {
        stdout: () => undefined,
        stderr: (message) => errors.push(message),
      },
    );

    expect(exitCode).toBe(2);
    expect(errors.join("\n")).toContain(
      "agent session not found: missing-close",
    );
  });

  it("allows closing an already closed session", async () => {
    const { root, fs, dependencies } = preparedSessionRoot();
    await startAgentSession(
      { root, projectId: "p", sessionId: "sess-reclose", activeTask: "t" },
      fs,
    );
    await runCli(
      ["session", "close", "--id", "sess-reclose", "--root", root],
      dependencies,
      { stdout: () => undefined, stderr: () => undefined },
    );

    const exitCode = await runCli(
      ["session", "close", "--id", "sess-reclose", "--root", root],
      dependencies,
      { stdout: () => undefined, stderr: () => undefined },
    );

    expect(exitCode).toBe(0);
    const session = await getAgentSession("sess-reclose", { root }, fs);
    expect(session?.state).toBe("closed");
  });

  it("lists sessions with text output", async () => {
    const { root, fs, dependencies } = preparedSessionRoot();
    await startAgentSession(
      { root, projectId: "p", sessionId: "sess-list", activeTask: "list task" },
      fs,
    );
    const output: string[] = [];

    const exitCode = await runCli(
      ["session", "list", "--root", root],
      dependencies,
      { stdout: (message) => output.push(message), stderr: () => undefined },
    );

    expect(exitCode).toBe(0);
    const text = output.join("\n");
    expect(text).toContain("Agent Sessions (1):");
    expect(text).toContain("- sess-list [active] (list task)");
  });

  it("lists sessions with JSON output", async () => {
    const { root, fs, dependencies } = preparedSessionRoot();
    await startAgentSession(
      { root, projectId: "p", sessionId: "sess-list-json", activeTask: "t" },
      fs,
    );
    const output: string[] = [];

    const exitCode = await runCli(
      ["session", "list", "--root", root, "--json"],
      dependencies,
      { stdout: (message) => output.push(message), stderr: () => undefined },
    );

    expect(exitCode).toBe(0);
    const parsed = JSON.parse(output.join("\n"));
    expect(parsed).toHaveLength(1);
    expect(parsed[0].sessionId).toBe("sess-list-json");
  });

  it("returns an empty list successfully", async () => {
    const { root, dependencies } = preparedSessionRoot();
    const output: string[] = [];

    const exitCode = await runCli(
      ["session", "list", "--root", root],
      dependencies,
      { stdout: (message) => output.push(message), stderr: () => undefined },
    );

    expect(exitCode).toBe(0);
    expect(output.join("\n")).toContain("Agent Sessions (0):");
  });

  it("filters sessions by state", async () => {
    const { root, fs, dependencies } = preparedSessionRoot();
    await startAgentSession(
      { root, projectId: "p", sessionId: "sess-active", activeTask: "t" },
      fs,
    );
    await startAgentSession(
      { root, projectId: "p", sessionId: "sess-closed", activeTask: "t" },
      fs,
    );
    await runCli(
      ["session", "close", "--id", "sess-closed", "--root", root],
      dependencies,
      { stdout: () => undefined, stderr: () => undefined },
    );
    const output: string[] = [];

    const exitCode = await runCli(
      ["session", "list", "--root", root, "--state", "closed", "--json"],
      dependencies,
      { stdout: (message) => output.push(message), stderr: () => undefined },
    );

    expect(exitCode).toBe(0);
    const parsed = JSON.parse(output.join("\n"));
    expect(parsed).toHaveLength(1);
    expect(parsed[0].sessionId).toBe("sess-closed");
  });

  it("returns empty results for invalid list state filter", async () => {
    const { root, fs, dependencies } = preparedSessionRoot();
    await startAgentSession(
      {
        root,
        projectId: "p",
        sessionId: "sess-invalid-state",
        activeTask: "t",
      },
      fs,
    );
    const output: string[] = [];

    const exitCode = await runCli(
      ["session", "list", "--root", root, "--state", "not-a-state", "--json"],
      dependencies,
      { stdout: (message) => output.push(message), stderr: () => undefined },
    );

    expect(exitCode).toBe(0);
    expect(JSON.parse(output.join("\n"))).toEqual([]);
  });

  it("gets a session with text output", async () => {
    const { root, fs, dependencies } = preparedSessionRoot();
    await startAgentSession(
      { root, projectId: "p", sessionId: "sess-get", activeTask: "get task" },
      fs,
    );
    const output: string[] = [];

    const exitCode = await runCli(
      ["session", "get", "--id", "sess-get", "--root", root],
      dependencies,
      { stdout: (message) => output.push(message), stderr: () => undefined },
    );

    expect(exitCode).toBe(0);
    const text = output.join("\n");
    expect(text).toContain("Agent Session: sess-get");
    expect(text).toContain("State: active");
    expect(text).toContain("Task: get task");
  });

  it("gets a session with JSON output", async () => {
    const { root, fs, dependencies } = preparedSessionRoot();
    await startAgentSession(
      { root, projectId: "p", sessionId: "sess-get-json", activeTask: "t" },
      fs,
    );
    const output: string[] = [];

    const exitCode = await runCli(
      ["session", "get", "--id", "sess-get-json", "--root", root, "--json"],
      dependencies,
      { stdout: (message) => output.push(message), stderr: () => undefined },
    );

    expect(exitCode).toBe(0);
    const parsed = JSON.parse(output.join("\n"));
    expect(parsed.sessionId).toBe("sess-get-json");
  });

  it("requires session ID for get", async () => {
    const { root, dependencies } = preparedSessionRoot();
    const errors: string[] = [];

    const exitCode = await runCli(
      ["session", "get", "--root", root],
      dependencies,
      {
        stdout: () => undefined,
        stderr: (message) => errors.push(message),
      },
    );

    expect(exitCode).toBe(2);
    expect(errors.join("\n")).toContain(
      "session get requires session ID (--id or positional argument)",
    );
  });

  it("returns exit 2 for get not found on stderr", async () => {
    const { root, dependencies } = preparedSessionRoot();
    const errors: string[] = [];

    const exitCode = await runCli(
      ["session", "get", "--id", "missing-get", "--root", root],
      dependencies,
      {
        stdout: () => undefined,
        stderr: (message) => errors.push(message),
      },
    );

    expect(exitCode).toBe(2);
    expect(errors.join("\n")).toContain("agent session not found: missing-get");
  });

  it("returns plain stderr error for get not found with --json", async () => {
    const { root, dependencies } = preparedSessionRoot();
    const errors: string[] = [];
    const output: string[] = [];

    const exitCode = await runCli(
      ["session", "get", "--id", "missing-get-json", "--root", root, "--json"],
      dependencies,
      {
        stdout: (message) => output.push(message),
        stderr: (message) => errors.push(message),
      },
    );

    expect(exitCode).toBe(2);
    expect(errors.join("\n")).toContain(
      "agent session not found: missing-get-json",
    );
    expect(output).toHaveLength(0);
  });

  it("deletes an existing session with text output", async () => {
    const { root, fs, dependencies } = preparedSessionRoot();
    await startAgentSession(
      { root, projectId: "p", sessionId: "sess-delete", activeTask: "t" },
      fs,
    );
    const output: string[] = [];

    const exitCode = await runCli(
      ["session", "delete", "--id", "sess-delete", "--root", root],
      dependencies,
      { stdout: (message) => output.push(message), stderr: () => undefined },
    );

    expect(exitCode).toBe(0);
    expect(output.join("\n")).toContain("Deleted agent session: sess-delete");
    expect(await getAgentSession("sess-delete", { root }, fs)).toBeNull();
  });

  it("deletes an existing session with JSON output", async () => {
    const { root, fs, dependencies } = preparedSessionRoot();
    await startAgentSession(
      { root, projectId: "p", sessionId: "sess-delete-json", activeTask: "t" },
      fs,
    );
    const output: string[] = [];

    const exitCode = await runCli(
      [
        "session",
        "delete",
        "--id",
        "sess-delete-json",
        "--root",
        root,
        "--json",
      ],
      dependencies,
      { stdout: (message) => output.push(message), stderr: () => undefined },
    );

    expect(exitCode).toBe(0);
    expect(JSON.parse(output.join("\n"))).toEqual({
      status: "deleted",
      sessionId: "sess-delete-json",
    });
    expect(await getAgentSession("sess-delete-json", { root }, fs)).toBeNull();
  });

  it("treats deleting a missing session as success", async () => {
    const { root, dependencies } = preparedSessionRoot();
    const output: string[] = [];

    const exitCode = await runCli(
      ["session", "delete", "--id", "missing-delete", "--root", root],
      dependencies,
      { stdout: (message) => output.push(message), stderr: () => undefined },
    );

    expect(exitCode).toBe(0);
    expect(output.join("\n")).toContain(
      "Deleted agent session: missing-delete",
    );
  });

  it("exports a session with text output", async () => {
    const { root, fs, dependencies } = preparedSessionRoot();
    await startAgentSession(
      { root, projectId: "p", sessionId: "sess-export", activeTask: "t" },
      fs,
    );
    const output: string[] = [];

    const exitCode = await runCli(
      ["session", "export", "--id", "sess-export", "--root", root],
      dependencies,
      { stdout: (message) => output.push(message), stderr: () => undefined },
    );

    expect(exitCode).toBe(0);
    expect(output.join("\n")).toContain(
      "Exported agent session sess-export for project project-local",
    );
  });

  it("exports a session with JSON output", async () => {
    const { root, fs, dependencies } = preparedSessionRoot();
    await startAgentSession(
      { root, projectId: "p", sessionId: "sess-export-json", activeTask: "t" },
      fs,
    );
    const output: string[] = [];

    const exitCode = await runCli(
      [
        "session",
        "export",
        "--id",
        "sess-export-json",
        "--root",
        root,
        "--json",
      ],
      dependencies,
      { stdout: (message) => output.push(message), stderr: () => undefined },
    );

    expect(exitCode).toBe(0);
    const parsed = JSON.parse(output.join("\n"));
    expect(parsed.session.sessionId).toBe("sess-export-json");
    expect(parsed.projectId).toBe("project-local");
  });

  it("defaults projectId to project-local on export", async () => {
    const { root, fs, dependencies } = preparedSessionRoot();
    await startAgentSession(
      {
        root,
        projectId: "p",
        sessionId: "sess-export-default",
        activeTask: "t",
      },
      fs,
    );
    const output: string[] = [];

    const exitCode = await runCli(
      [
        "session",
        "export",
        "--id",
        "sess-export-default",
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

  it("accepts explicit projectId on export", async () => {
    const { root, fs, dependencies } = preparedSessionRoot();
    await startAgentSession(
      {
        root,
        projectId: "p",
        sessionId: "sess-export-project",
        activeTask: "t",
      },
      fs,
    );
    const output: string[] = [];

    const exitCode = await runCli(
      [
        "session",
        "export",
        "--id",
        "sess-export-project",
        "--project-id",
        "custom-project",
        "--root",
        root,
        "--json",
      ],
      dependencies,
      { stdout: (message) => output.push(message), stderr: () => undefined },
    );

    expect(exitCode).toBe(0);
    expect(JSON.parse(output.join("\n")).projectId).toBe("custom-project");
  });

  it("writes export output to the requested path", async () => {
    const { root, fs, dependencies } = preparedSessionRoot();
    await startAgentSession(
      { root, projectId: "p", sessionId: "sess-export-file", activeTask: "t" },
      fs,
    );

    const exitCode = await runCli(
      [
        "session",
        "export",
        "--id",
        "sess-export-file",
        "--output",
        "exports/session.json",
        "--root",
        root,
      ],
      dependencies,
      { stdout: () => undefined, stderr: () => undefined },
    );

    expect(exitCode).toBe(0);
    expect(await fs.exists(`${root}/exports/session.json`)).toBe(true);
  });

  it("requires session ID for export", async () => {
    const { root, dependencies } = preparedSessionRoot();
    const errors: string[] = [];

    const exitCode = await runCli(
      ["session", "export", "--root", root],
      dependencies,
      {
        stdout: () => undefined,
        stderr: (message) => errors.push(message),
      },
    );

    expect(exitCode).toBe(2);
    expect(errors.join("\n")).toContain(
      "session export requires session ID (--id or positional argument)",
    );
  });

  it("returns exit 2 for export not found", async () => {
    const { root, dependencies } = preparedSessionRoot();
    const errors: string[] = [];

    const exitCode = await runCli(
      ["session", "export", "--id", "missing-export", "--root", root],
      dependencies,
      {
        stdout: () => undefined,
        stderr: (message) => errors.push(message),
      },
    );

    expect(exitCode).toBe(2);
    expect(errors.join("\n")).toContain(
      "agent session not found: missing-export",
    );
  });
});
