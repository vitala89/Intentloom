import { cp, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  createMemoryFileSystem,
  initProject,
  promoteWorkspaceConversationToProposal,
  startWorkspaceConversation,
  writeSandboxCapabilityPolicy,
} from "@intentloom/application";
import { runCli } from "../packages/cli/src/command.js";
import { runCliEntry } from "../packages/cli/src/cli-entry.js";

const catalogRoot = resolve("catalog");

async function brokenCatalogRoot(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "intentloom-workspace-catalog-"));
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

describe("workspace CLI", () => {
  it("dispatches workspace through runCliEntry", async () => {
    const { root, dependencies } = await preparedProject();
    const output: string[] = [];

    const exitCode = await runCliEntry(
      ["workspace", "start", "--root", root, "--json"],
      dependencies,
      { stdout: (message) => output.push(message), stderr: () => undefined },
    );

    expect(exitCode).toBe(0);
    expect(JSON.parse(output.join("\n"))).toMatchObject({
      mode: "discuss",
      projectId: "project-local",
    });
  });

  it.each([
    ["start", 0],
    ["list", 0],
    ["get", 3],
  ] as const)(
    "routes workspace %s subcommand",
    async (subcommand, expectedExit) => {
      const { root, dependencies } = await preparedProject();
      const output: string[] = [];
      const errors: string[] = [];

      const baseArgs = ["workspace", subcommand, "--root", root, "--json"];
      if (subcommand === "get") {
        baseArgs.push("--conversation-id", "conv-route-check");
      }

      const exitCode = await runCli(baseArgs, dependencies, {
        stdout: (message) => output.push(message),
        stderr: (message) => errors.push(message),
      });

      expect(exitCode).toBe(expectedExit);
      expect(output.length + errors.length).toBeGreaterThan(0);
    },
  );

  it("routes workspace append and promote subcommands", async () => {
    const { fs, root, dependencies } = await preparedProject();
    const conv = await startWorkspaceConversation(
      { root, projectId: "project-local", mode: "discuss" },
      fs,
    );
    const output: string[] = [];

    expect(
      await runCli(
        [
          "workspace",
          "append",
          "--conversation-id",
          conv.id,
          "--content",
          "route-check",
          "--root",
          root,
          "--json",
        ],
        dependencies,
        {
          stdout: (message) => output.push(message),
          stderr: () => undefined,
        },
      ),
    ).toBe(0);

    expect(
      await runCli(
        [
          "workspace",
          "promote",
          "--conversation-id",
          conv.id,
          "--proposal-id",
          "prop-route",
          "--root",
          root,
          "--json",
        ],
        dependencies,
        {
          stdout: (message) => output.push(message),
          stderr: () => undefined,
        },
      ),
    ).toBe(0);
  });

  it("routes workspace review and apply subcommands", async () => {
    const { fs, root, dependencies } = await preparedProject();
    await writeSandboxCapabilityPolicy(
      {
        schemaVersion: "1",
        projectId: "project-local",
        mode: "mutating",
        pathRules: [{ pathPrefix: "*", allowWrite: true, allowDelete: true }],
        commandRules: [],
        allowNetwork: true,
        updatedAt: new Date().toISOString(),
      },
      { root },
      fs,
    );
    const conv = await startWorkspaceConversation(
      { root, projectId: "project-local", mode: "plan" },
      fs,
    );
    await promoteWorkspaceConversationToProposal(
      { root, conversationId: conv.id, proposalId: "prop-route-full" },
      fs,
    );

    expect(
      await runCli(
        [
          "workspace",
          "review",
          "--proposal-id",
          "prop-route-full",
          "--root",
          root,
          "--json",
        ],
        dependencies,
        { stdout: () => undefined, stderr: () => undefined },
      ),
    ).toBe(0);

    expect(
      await runCli(
        [
          "workspace",
          "apply",
          "--proposal-id",
          "prop-route-full",
          "--plan-file",
          ".aif/proposals/prop-route-full.json",
          "--approved-by",
          "reviewer",
          "--dry-run",
          "--root",
          root,
          "--json",
        ],
        dependencies,
        { stdout: () => undefined, stderr: () => undefined },
      ),
    ).toBe(0);
  });

  it("rejects missing workspace subcommand with the exact message", async () => {
    const errors: string[] = [];

    const exitCode = await runCli(
      ["workspace"],
      { catalogRoot },
      {
        stdout: () => undefined,
        stderr: (message) => errors.push(message),
      },
    );

    expect(exitCode).toBe(2);
    expect(errors.join("\n")).toContain(
      "workspace requires start, get, list, append, promote, review, or apply subcommand",
    );
  });

  it("rejects unknown workspace subcommand with the exact message", async () => {
    const errors: string[] = [];

    const exitCode = await runCli(
      ["workspace", "unknown"],
      { catalogRoot },
      {
        stdout: () => undefined,
        stderr: (message) => errors.push(message),
      },
    );

    expect(exitCode).toBe(2);
    expect(errors.join("\n")).toContain(
      "workspace requires start, get, list, append, promote, review, or apply subcommand",
    );
  });

  it("rejects flags before subcommand with the subcommand validation message", async () => {
    const errors: string[] = [];

    const exitCode = await runCli(
      ["workspace", "--json", "list"],
      { catalogRoot },
      {
        stdout: () => undefined,
        stderr: (message) => errors.push(message),
      },
    );

    expect(exitCode).toBe(2);
    expect(errors.join("\n")).toContain(
      "workspace requires start, get, list, append, promote, review, or apply subcommand",
    );
  });

  it("rejects positional project paths", async () => {
    const { root, dependencies } = await preparedProject();
    const errors: string[] = [];

    const exitCode = await runCli(["workspace", "list", root], dependencies, {
      stdout: () => undefined,
      stderr: (message) => errors.push(message),
    });

    expect(exitCode).toBe(2);
    expect(errors.join("\n")).toContain(`unexpected argument: ${root}`);
  });

  it("uses --root when provided explicitly", async () => {
    const { root, dependencies } = await preparedProject("/explicit");
    const output: string[] = [];

    const exitCode = await runCli(
      ["workspace", "start", "--root", root, "--json"],
      dependencies,
      { stdout: (message) => output.push(message), stderr: () => undefined },
    );

    expect(exitCode).toBe(0);
    expect(JSON.parse(output.join("\n")).id).toMatch(/^conv-/);
  });

  it("defaults root to cwd when --root is omitted", async () => {
    const fs = createMemoryFileSystem();
    const root = process.cwd();
    await initProject({ root, adapters: ["codex"], catalogRoot }, fs);
    const output: string[] = [];

    const exitCode = await runCli(
      ["workspace", "start", "--json"],
      { catalogRoot, fileSystem: fs },
      { stdout: (message) => output.push(message), stderr: () => undefined },
    );

    expect(exitCode).toBe(0);
    expect(JSON.parse(output.join("\n")).id).toMatch(/^conv-/);
  });

  it("rejects unknown options with exit code 2", async () => {
    const errors: string[] = [];

    const exitCode = await runCli(
      ["workspace", "list", "--not-a-real-flag"],
      { catalogRoot },
      {
        stdout: () => undefined,
        stderr: (message) => errors.push(message),
      },
    );

    expect(exitCode).toBe(2);
    expect(errors.join("\n")).toContain("unknown option: --not-a-real-flag");
  });

  it("rejects missing option values with exit code 2", async () => {
    const errors: string[] = [];

    const exitCode = await runCli(
      ["workspace", "start", "--mode"],
      { catalogRoot },
      {
        stdout: () => undefined,
        stderr: (message) => errors.push(message),
      },
    );

    expect(exitCode).toBe(2);
    expect(errors.join("\n")).toContain("missing value for --mode");
  });

  it("rejects duplicate --root specifications", async () => {
    const errors: string[] = [];

    const exitCode = await runCli(
      ["workspace", "list", "--root", "/one", "--root", "/two"],
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

  it("uses last-wins behavior for duplicate non-root value flags", async () => {
    const { root, dependencies } = await preparedProject();
    const output: string[] = [];

    const exitCode = await runCli(
      [
        "workspace",
        "start",
        "--project-id",
        "first-id",
        "--project-id",
        "second-id",
        "--root",
        root,
        "--json",
      ],
      dependencies,
      { stdout: (message) => output.push(message), stderr: () => undefined },
    );

    expect(exitCode).toBe(0);
    expect(JSON.parse(output.join("\n")).projectId).toBe("second-id");
  });

  it("accepts legacy ignored boolean flags such as --dry-run", async () => {
    const { root, dependencies } = await preparedProject();
    const output: string[] = [];

    const exitCode = await runCli(
      ["workspace", "list", "--root", root, "--dry-run", "--json"],
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
      ["workspace", "list", "--root", root, "--profile", "generic", "--json"],
      dependencies,
      { stdout: (message) => output.push(message), stderr: () => undefined },
    );

    expect(exitCode).toBe(0);
    expect(Array.isArray(JSON.parse(output.join("\n")))).toBe(true);
  });

  it("rejects --force with the sync-only message", async () => {
    const errors: string[] = [];

    const exitCode = await runCli(
      ["workspace", "list", "--force"],
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
      ["workspace", "list", "--cache"],
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
      ["workspace", "list", "--project-owned-mapping", "src=dest"],
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
      ["workspace", "list", "--daemon-endpoint", "/tmp/intentloomd.sock"],
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

  it("rejects paired daemon flags on workspace", async () => {
    const errors: string[] = [];

    const exitCode = await runCli(
      [
        "workspace",
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
    const { fs, root } = await preparedProject();
    const errors: string[] = [];

    const exitCode = await runCli(
      ["workspace", "list", "--root", root],
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
      ["workspace", "list", "--unknown-flag"],
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

  it("starts workspace conversations with default discuss mode", async () => {
    const { root, dependencies } = await preparedProject();
    const output: string[] = [];

    const exitCode = await runCli(
      ["workspace", "start", "--root", root, "--json"],
      dependencies,
      { stdout: (message) => output.push(message), stderr: () => undefined },
    );

    expect(exitCode).toBe(0);
    expect(JSON.parse(output.join("\n"))).toMatchObject({ mode: "discuss" });
  });

  it("returns exit code 2 for invalid --mode values", async () => {
    const { root, dependencies } = await preparedProject();
    const errors: string[] = [];

    const exitCode = await runCli(
      ["workspace", "start", "--mode", "bad", "--root", root],
      dependencies,
      {
        stdout: () => undefined,
        stderr: (message) => errors.push(message),
      },
    );

    expect(exitCode).toBe(2);
    expect(errors.join("\n")).toContain("invalid workspace mode 'bad'");
  });

  it("returns stderr and exit 3 when get cannot find a conversation in text mode", async () => {
    const { root, dependencies } = await preparedProject();
    const errors: string[] = [];

    const exitCode = await runCli(
      ["workspace", "get", "--conversation-id", "conv-missing", "--root", root],
      dependencies,
      {
        stdout: () => undefined,
        stderr: (message) => errors.push(message),
      },
    );

    expect(exitCode).toBe(3);
    expect(errors.join("\n")).toContain(
      "Workspace conversation conv-missing not found",
    );
  });

  it("returns JSON on stdout and exit 3 when get cannot find a conversation in JSON mode", async () => {
    const { root, dependencies } = await preparedProject();
    const output: string[] = [];

    const exitCode = await runCli(
      [
        "workspace",
        "get",
        "--conversation-id",
        "conv-missing",
        "--root",
        root,
        "--json",
      ],
      dependencies,
      {
        stdout: (message) => output.push(message),
        stderr: () => undefined,
      },
    );

    expect(exitCode).toBe(3);
    expect(JSON.parse(output.join("\n"))).toEqual({
      error: "Workspace conversation conv-missing not found",
    });
  });

  it("returns stderr and exit 2 when append targets a missing conversation", async () => {
    const { root, dependencies } = await preparedProject();
    const errors: string[] = [];

    const exitCode = await runCli(
      [
        "workspace",
        "append",
        "--conversation-id",
        "conv-missing",
        "--content",
        "hello",
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
    expect(errors.join("\n")).toContain("Conversation conv-missing not found");
  });

  it("returns stderr and exit 2 when promote targets a missing conversation", async () => {
    const { root, dependencies } = await preparedProject();
    const errors: string[] = [];

    const exitCode = await runCli(
      [
        "workspace",
        "promote",
        "--conversation-id",
        "conv-missing",
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
      "Workspace conversation conv-missing not found",
    );
  });

  it("returns exit 0 when review reports readyToApply", async () => {
    const { fs, root, dependencies } = await preparedProject();
    await writeSandboxCapabilityPolicy(
      {
        schemaVersion: "1",
        projectId: "project-local",
        mode: "mutating",
        pathRules: [{ pathPrefix: "*", allowWrite: true, allowDelete: true }],
        commandRules: [],
        allowNetwork: true,
        updatedAt: new Date().toISOString(),
      },
      { root },
      fs,
    );
    const conv = await startWorkspaceConversation(
      { root, projectId: "project-local", mode: "plan" },
      fs,
    );
    await promoteWorkspaceConversationToProposal(
      { root, conversationId: conv.id, proposalId: "prop-ready" },
      fs,
    );
    const output: string[] = [];

    const exitCode = await runCli(
      [
        "workspace",
        "review",
        "--proposal-id",
        "prop-ready",
        "--root",
        root,
        "--json",
      ],
      dependencies,
      { stdout: (message) => output.push(message), stderr: () => undefined },
    );

    expect(exitCode).toBe(0);
    expect(JSON.parse(output.join("\n")).readyToApply).toBe(true);
  });

  it("returns exit 3 when review is blocked by sandbox policy", async () => {
    const { fs, root, dependencies } = await preparedProject();
    await writeSandboxCapabilityPolicy(
      {
        schemaVersion: "1",
        projectId: "project-local",
        mode: "read-only",
        pathRules: [],
        commandRules: [],
        allowNetwork: false,
        updatedAt: new Date().toISOString(),
      },
      { root },
      fs,
    );
    const conv = await startWorkspaceConversation(
      { root, projectId: "project-local", mode: "plan" },
      fs,
    );
    await promoteWorkspaceConversationToProposal(
      { root, conversationId: conv.id, proposalId: "prop-blocked" },
      fs,
    );
    const output: string[] = [];

    const exitCode = await runCli(
      ["workspace", "review", "--proposal-id", "prop-blocked", "--root", root],
      dependencies,
      { stdout: (message) => output.push(message), stderr: () => undefined },
    );

    expect(exitCode).toBe(3);
    expect(output.join("\n")).toContain("Ready To Apply: false");
    expect(output.join("\n")).toContain("BLOCKED");
  });

  it("requires human approval for workspace apply", async () => {
    const { root, dependencies } = await preparedProject();
    const errors: string[] = [];

    const exitCode = await runCli(
      ["workspace", "apply", "--proposal-id", "prop-1", "--root", root],
      dependencies,
      {
        stdout: () => undefined,
        stderr: (message) => errors.push(message),
      },
    );

    expect(exitCode).toBe(2);
    expect(errors.join("\n")).toContain(
      "human approval required (--approved-by USER)",
    );
  });

  it("preserves workspace apply dry-run output and exit code", async () => {
    const { fs, root, dependencies } = await preparedProject();
    await writeSandboxCapabilityPolicy(
      {
        schemaVersion: "1",
        projectId: "project-local",
        mode: "mutating",
        pathRules: [{ pathPrefix: "*", allowWrite: true, allowDelete: true }],
        commandRules: [],
        allowNetwork: true,
        updatedAt: new Date().toISOString(),
      },
      { root },
      fs,
    );
    const conv = await startWorkspaceConversation(
      { root, projectId: "project-local", mode: "plan" },
      fs,
    );
    await promoteWorkspaceConversationToProposal(
      {
        root,
        conversationId: conv.id,
        proposalId: "prop-dry",
      },
      fs,
    );
    const output: string[] = [];

    const exitCode = await runCli(
      [
        "workspace",
        "apply",
        "--proposal-id",
        "prop-dry",
        "--plan-file",
        ".aif/proposals/prop-dry.json",
        "--approved-by",
        "lead-engineer",
        "--dry-run",
        "--root",
        root,
        "--json",
      ],
      dependencies,
      { stdout: (message) => output.push(message), stderr: () => undefined },
    );

    expect(exitCode).toBe(0);
    expect(JSON.parse(output.join("\n")).kind).toBe("adoption-proposal");
  });

  it("renders representative text output for all workspace subcommands", async () => {
    const { fs, root, dependencies } = await preparedProject();
    await writeSandboxCapabilityPolicy(
      {
        schemaVersion: "1",
        projectId: "project-local",
        mode: "mutating",
        pathRules: [{ pathPrefix: "*", allowWrite: true, allowDelete: true }],
        commandRules: [],
        allowNetwork: true,
        updatedAt: new Date().toISOString(),
      },
      { root },
      fs,
    );

    let startOut = "";
    const startExit = await runCli(
      ["workspace", "start", "--root", root],
      dependencies,
      {
        stdout: (message) => (startOut += `${message}\n`),
        stderr: () => undefined,
      },
    );
    expect(startExit).toBe(0);
    expect(startOut).toContain("Started workspace conversation:");

    const conv = await startWorkspaceConversation(
      { root, projectId: "project-local", mode: "discuss" },
      fs,
    );
    await appendViaCli(fs, root, dependencies, conv.id);

    let listOut = "";
    expect(
      await runCli(["workspace", "list", "--root", root], dependencies, {
        stdout: (message) => (listOut += `${message}\n`),
        stderr: () => undefined,
      }),
    ).toBe(0);
    expect(listOut).toContain("Workspace Conversations (");

    let getOut = "";
    expect(
      await runCli(
        ["workspace", "get", "--conversation-id", conv.id, "--root", root],
        dependencies,
        {
          stdout: (message) => (getOut += `${message}\n`),
          stderr: () => undefined,
        },
      ),
    ).toBe(0);
    expect(getOut).toContain(`Conversation: ${conv.id}`);

    let appendOut = "";
    expect(
      await runCli(
        [
          "workspace",
          "append",
          "--conversation-id",
          conv.id,
          "--content",
          "more",
          "--root",
          root,
        ],
        dependencies,
        {
          stdout: (message) => (appendOut += `${message}\n`),
          stderr: () => undefined,
        },
      ),
    ).toBe(0);
    expect(appendOut).toContain("Appended message to conversation");

    let promoteOut = "";
    expect(
      await runCli(
        [
          "workspace",
          "promote",
          "--conversation-id",
          conv.id,
          "--proposal-id",
          "prop-text",
          "--root",
          root,
        ],
        dependencies,
        {
          stdout: (message) => (promoteOut += `${message}\n`),
          stderr: () => undefined,
        },
      ),
    ).toBe(0);
    expect(promoteOut).toContain("Promoted conversation");

    let reviewOut = "";
    expect(
      await runCli(
        ["workspace", "review", "--proposal-id", "prop-text", "--root", root],
        dependencies,
        {
          stdout: (message) => (reviewOut += `${message}\n`),
          stderr: () => undefined,
        },
      ),
    ).toBe(0);
    expect(reviewOut).toContain("Workspace Proposal Review");

    let applyOut = "";
    expect(
      await runCli(
        [
          "workspace",
          "apply",
          "--proposal-id",
          "prop-text",
          "--plan-file",
          ".aif/proposals/prop-text.json",
          "--approved-by",
          "lead-engineer",
          "--dry-run",
          "--root",
          root,
        ],
        dependencies,
        {
          stdout: (message) => (applyOut += `${message}\n`),
          stderr: () => undefined,
        },
      ),
    ).toBe(0);
    expect(applyOut).toContain("Applied workspace proposal prop-text");
  });

  it("renders representative JSON output for all workspace subcommands", async () => {
    const { fs, root, dependencies } = await preparedProject();
    await writeSandboxCapabilityPolicy(
      {
        schemaVersion: "1",
        projectId: "project-local",
        mode: "mutating",
        pathRules: [{ pathPrefix: "*", allowWrite: true, allowDelete: true }],
        commandRules: [],
        allowNetwork: true,
        updatedAt: new Date().toISOString(),
      },
      { root },
      fs,
    );

    let startJson = "";
    expect(
      await runCli(
        ["workspace", "start", "--root", root, "--json"],
        dependencies,
        {
          stdout: (message) => (startJson += message),
          stderr: () => undefined,
        },
      ),
    ).toBe(0);
    const started = JSON.parse(startJson);
    expect(started.id).toMatch(/^conv-/);

    let listJson = "";
    expect(
      await runCli(
        ["workspace", "list", "--root", root, "--json"],
        dependencies,
        {
          stdout: (message) => (listJson += message),
          stderr: () => undefined,
        },
      ),
    ).toBe(0);
    expect(Array.isArray(JSON.parse(listJson))).toBe(true);

    let getJson = "";
    expect(
      await runCli(
        [
          "workspace",
          "get",
          "--conversation-id",
          started.id,
          "--root",
          root,
          "--json",
        ],
        dependencies,
        {
          stdout: (message) => (getJson += message),
          stderr: () => undefined,
        },
      ),
    ).toBe(0);
    expect(JSON.parse(getJson).id).toBe(started.id);

    let appendJson = "";
    expect(
      await runCli(
        [
          "workspace",
          "append",
          "--conversation-id",
          started.id,
          "--content",
          "json-msg",
          "--root",
          root,
          "--json",
        ],
        dependencies,
        {
          stdout: (message) => (appendJson += message),
          stderr: () => undefined,
        },
      ),
    ).toBe(0);
    expect(JSON.parse(appendJson).messages.length).toBeGreaterThan(0);

    let promoteJson = "";
    expect(
      await runCli(
        [
          "workspace",
          "promote",
          "--conversation-id",
          started.id,
          "--proposal-id",
          "prop-json",
          "--root",
          root,
          "--json",
        ],
        dependencies,
        {
          stdout: (message) => (promoteJson += message),
          stderr: () => undefined,
        },
      ),
    ).toBe(0);
    expect(JSON.parse(promoteJson).kind).toBe("adoption-proposal");

    let reviewJson = "";
    expect(
      await runCli(
        [
          "workspace",
          "review",
          "--proposal-id",
          "prop-json",
          "--root",
          root,
          "--json",
        ],
        dependencies,
        {
          stdout: (message) => (reviewJson += message),
          stderr: () => undefined,
        },
      ),
    ).toBe(0);
    expect(JSON.parse(reviewJson).proposalId).toBe("prop-json");

    let applyJson = "";
    expect(
      await runCli(
        [
          "workspace",
          "apply",
          "--proposal-id",
          "prop-json",
          "--plan-file",
          ".aif/proposals/prop-json.json",
          "--approved-by",
          "lead-engineer",
          "--dry-run",
          "--root",
          root,
          "--json",
        ],
        dependencies,
        {
          stdout: (message) => (applyJson += message),
          stderr: () => undefined,
        },
      ),
    ).toBe(0);
    expect(JSON.parse(applyJson).kind).toBe("adoption-proposal");
  });
});

async function appendViaCli(
  fs: ReturnType<typeof createMemoryFileSystem>,
  root: string,
  dependencies: { catalogRoot: string; fileSystem: typeof fs },
  conversationId: string,
): Promise<void> {
  await runCli(
    [
      "workspace",
      "append",
      "--conversation-id",
      conversationId,
      "--content",
      "hello",
      "--root",
      root,
    ],
    dependencies,
    { stdout: () => undefined, stderr: () => undefined },
  );
}
