import { cp, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { createMemoryFileSystem } from "@intentloom/application";
import { runCli } from "../packages/cli/src/command.js";
import { runCliEntry } from "../packages/cli/src/cli-entry.js";

const catalogRoot = resolve("catalog");

async function brokenCatalogRoot(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "intentloom-sync-catalog-"));
  await cp(resolve("catalog"), join(root, "catalog"), { recursive: true });
  await cp(resolve("profiles"), join(root, "profiles"), { recursive: true });
  const schemaPath = join(root, "catalog/schemas/aif-config.schema.json");
  const schema = JSON.parse(await readFile(schemaPath, "utf8"));
  schema.properties.profile = { $ref: "#/$defs/missing" };
  await writeFile(schemaPath, JSON.stringify(schema), "utf8");
  return join(root, "catalog");
}

async function initializedProject(name: string) {
  const projectRoot = resolve(name);
  const fileSystem = createMemoryFileSystem({
    [join(projectRoot, "README.md")]: "project\n",
  });
  const exitCode = await runCli(
    ["init", "--root", projectRoot, "--adapters", "codex"],
    { catalogRoot, fileSystem },
    { stdout: () => undefined, stderr: () => undefined },
  );
  if (exitCode !== 0) throw new Error(`init failed with exit ${exitCode}`);
  return { projectRoot, fileSystem };
}

describe("sync CLI", () => {
  it("dispatches sync through runCliEntry", async () => {
    const { projectRoot, fileSystem } = await initializedProject(
      "sync entry dispatch",
    );
    const stdout: string[] = [];

    const exitCode = await runCliEntry(
      ["sync", "--root", projectRoot, "--json"],
      { catalogRoot, fileSystem },
      { stdout: (message) => stdout.push(message), stderr: () => undefined },
    );

    expect(exitCode).toBe(0);
    expect(JSON.parse(stdout.join("\n"))).toMatchObject({
      status: "success",
      dryRun: false,
    });
  });

  it("accepts positional PROJECT_PATH", async () => {
    const { projectRoot, fileSystem } = await initializedProject(
      "sync positional project",
    );
    const stdout: string[] = [];
    const stderr: string[] = [];

    const exitCode = await runCli(
      ["sync", projectRoot, "--json"],
      { catalogRoot, fileSystem },
      {
        stdout: (message) => stdout.push(message),
        stderr: (message) => stderr.push(message),
      },
    );

    expect(exitCode).toBe(0);
    expect(stderr.join("\n")).not.toContain("unexpected argument");
    expect(JSON.parse(stdout.join("\n"))).toMatchObject({ status: "success" });
  });

  it("accepts --root for project path", async () => {
    const { projectRoot, fileSystem } =
      await initializedProject("sync root project");
    const stdout: string[] = [];

    const exitCode = await runCli(
      ["sync", "--root", projectRoot, "--json"],
      { catalogRoot, fileSystem },
      { stdout: (message) => stdout.push(message), stderr: () => undefined },
    );

    expect(exitCode).toBe(0);
    expect(JSON.parse(stdout.join("\n"))).toMatchObject({ status: "success" });
  });

  it("rejects duplicate positional project path combined with --root", async () => {
    const stderr: string[] = [];

    const exitCode = await runCli(
      ["sync", "/first", "--root", "/second"],
      { catalogRoot, fileSystem: createMemoryFileSystem() },
      { stdout: () => undefined, stderr: (message) => stderr.push(message) },
    );

    expect(exitCode).toBe(2);
    expect(stderr).toEqual(["project path specified more than once"]);
  });

  it("rejects a second positional path when root is already set", async () => {
    const stderr: string[] = [];

    const exitCode = await runCli(
      ["sync", "--root", "/first", "/second"],
      { catalogRoot, fileSystem: createMemoryFileSystem() },
      { stdout: () => undefined, stderr: (message) => stderr.push(message) },
    );

    expect(exitCode).toBe(2);
    expect(stderr.join("\n")).toBe("unexpected argument: /second");
  });

  it("rejects missing option values", async () => {
    const stderr: string[] = [];

    const exitCode = await runCli(
      ["sync", "--profile"],
      { catalogRoot },
      { stdout: () => undefined, stderr: (message) => stderr.push(message) },
    );

    expect(exitCode).toBe(2);
    expect(stderr.join("\n")).toContain("missing value for --profile");
  });

  it("rejects unknown options", async () => {
    const stderr: string[] = [];

    const exitCode = await runCli(
      ["sync", "--unknown-flag"],
      { catalogRoot },
      { stdout: () => undefined, stderr: (message) => stderr.push(message) },
    );

    expect(exitCode).toBe(2);
    expect(stderr.join("\n")).toContain("unknown option: --unknown-flag");
  });

  it("accepts duplicate boolean flags such as --json", async () => {
    const { projectRoot, fileSystem } = await initializedProject(
      "sync duplicate json",
    );
    const stdout: string[] = [];

    const exitCode = await runCli(
      ["sync", "--root", projectRoot, "--json", "--json"],
      { catalogRoot, fileSystem },
      { stdout: (message) => stdout.push(message), stderr: () => undefined },
    );

    expect(exitCode).toBe(0);
    expect(JSON.parse(stdout.join("\n"))).toMatchObject({ status: "success" });
  });

  it("accepts --dry-run without writing files", async () => {
    const { projectRoot, fileSystem } =
      await initializedProject("sync dry run");
    const before = [
      await fileSystem.exists(join(projectRoot, "AGENTS.md")),
      await fileSystem.read(join(projectRoot, "AGENTS.md")),
    ];
    const stdout: string[] = [];

    const exitCode = await runCli(
      ["sync", "--root", projectRoot, "--dry-run", "--json"],
      { catalogRoot, fileSystem },
      { stdout: (message) => stdout.push(message), stderr: () => undefined },
    );

    expect(exitCode).toBe(0);
    expect(JSON.parse(stdout.join("\n"))).toMatchObject({
      status: "success",
      dryRun: true,
    });
    expect(await fileSystem.exists(join(projectRoot, "AGENTS.md"))).toBe(
      before[0],
    );
    expect(await fileSystem.read(join(projectRoot, "AGENTS.md"))).toBe(
      before[1],
    );
  });

  it("accepts --strict as a legacy ignored boolean flag", async () => {
    const { projectRoot, fileSystem } = await initializedProject(
      "sync ignored strict",
    );

    const exitCode = await runCli(
      ["sync", "--root", projectRoot, "--strict", "--json"],
      { catalogRoot, fileSystem },
      { stdout: () => undefined, stderr: () => undefined },
    );

    expect(exitCode).toBe(0);
  });

  it("accepts --profile override", async () => {
    const { projectRoot, fileSystem } = await initializedProject(
      "sync profile override",
    );

    const exitCode = await runCli(
      ["sync", "--root", projectRoot, "--profile", "generic", "--json"],
      { catalogRoot, fileSystem },
      { stdout: () => undefined, stderr: () => undefined },
    );

    expect(exitCode).toBe(0);
  });

  it("accepts --adapters override", async () => {
    const { projectRoot, fileSystem } = await initializedProject(
      "sync adapters override",
    );

    const exitCode = await runCli(
      ["sync", "--root", projectRoot, "--adapters", "codex", "--json"],
      { catalogRoot, fileSystem },
      { stdout: () => undefined, stderr: () => undefined },
    );

    expect(exitCode).toBe(0);
  });

  it("rejects invalid --adapters values", async () => {
    const { projectRoot, fileSystem } = await initializedProject(
      "sync invalid adapters",
    );
    const stderr: string[] = [];

    const exitCode = await runCli(
      ["sync", "--root", projectRoot, "--adapters", "not-an-adapter"],
      { catalogRoot, fileSystem },
      { stdout: () => undefined, stderr: (message) => stderr.push(message) },
    );

    expect(exitCode).toBe(2);
    expect(stderr.join("\n")).toContain("invalid --adapters value");
  });

  it("accepts sync-specific --force without changing usage", async () => {
    const { projectRoot, fileSystem } = await initializedProject(
      "sync force accepted",
    );
    const stdout: string[] = [];
    const stderr: string[] = [];

    const exitCode = await runCli(
      ["sync", "--root", projectRoot, "--force", "--json"],
      { catalogRoot, fileSystem },
      {
        stdout: (message) => stdout.push(message),
        stderr: (message) => stderr.push(message),
      },
    );

    expect(exitCode).toBe(0);
    expect(stderr.join("\n")).not.toContain("--force is only valid with sync");
    expect(JSON.parse(stdout.join("\n"))).toMatchObject({ status: "success" });
  });

  it("does not let --force overwrite project-owned conflicts", async () => {
    const { projectRoot, fileSystem } = await initializedProject(
      "sync force conflict",
    );
    await fileSystem.write(join(projectRoot, "AGENTS.md"), "project-owned\n");
    const stdout: string[] = [];

    const exitCode = await runCli(
      ["sync", "--root", projectRoot, "--force", "--json"],
      { catalogRoot, fileSystem },
      { stdout: (message) => stdout.push(message), stderr: () => undefined },
    );

    expect(exitCode).toBe(3);
    expect(JSON.parse(stdout.join("\n"))).toMatchObject({
      status: "conflict",
      conflicts: ["AGENTS.md"],
    });
    expect(await fileSystem.read(join(projectRoot, "AGENTS.md"))).toBe(
      "project-owned\n",
    );
  });

  it("rejects --force on adopt with the sync-only message", async () => {
    const stderr: string[] = [];

    const exitCode = await runCli(
      ["adopt", "--force"],
      { catalogRoot },
      { stdout: () => undefined, stderr: (message) => stderr.push(message) },
    );

    expect(exitCode).toBe(2);
    expect(stderr.join("\n")).toContain("--force is only valid with sync");
  });

  it("rejects --force on update with the sync-only message", async () => {
    const stderr: string[] = [];

    const exitCode = await runCli(
      ["update", "--force"],
      { catalogRoot },
      { stdout: () => undefined, stderr: (message) => stderr.push(message) },
    );

    expect(exitCode).toBe(2);
    expect(stderr.join("\n")).toContain("--force is only valid with sync");
  });

  it("rejects --force on init with the sync-only message", async () => {
    const stderr: string[] = [];

    const exitCode = await runCli(
      ["init", "--force"],
      { catalogRoot },
      { stdout: () => undefined, stderr: (message) => stderr.push(message) },
    );

    expect(exitCode).toBe(2);
    expect(stderr.join("\n")).toContain("--force is only valid with sync");
  });

  it("rejects --cache with the clean-only message", async () => {
    const stderr: string[] = [];

    const exitCode = await runCli(
      ["sync", "--cache"],
      { catalogRoot },
      { stdout: () => undefined, stderr: (message) => stderr.push(message) },
    );

    expect(exitCode).toBe(2);
    expect(stderr.join("\n")).toContain("--cache is only valid with clean");
  });

  it("rejects adoption mapping flags", async () => {
    const stderr: string[] = [];

    const exitCode = await runCli(
      ["sync", "--project-owned-mapping", "src=dest"],
      { catalogRoot },
      { stdout: () => undefined, stderr: (message) => stderr.push(message) },
    );

    expect(exitCode).toBe(2);
    expect(stderr.join("\n")).toContain(
      "adoption mappings are only valid with init or adopt",
    );
  });

  it("rejects documentation mapping flags", async () => {
    const stderr: string[] = [];

    const exitCode = await runCli(
      ["sync", "--documentation-mapping", "src=dest"],
      { catalogRoot },
      { stdout: () => undefined, stderr: (message) => stderr.push(message) },
    );

    expect(exitCode).toBe(2);
    expect(stderr.join("\n")).toContain(
      "adoption mappings are only valid with init or adopt",
    );
  });

  it("requires daemon endpoint and token file to be paired", async () => {
    const stderr: string[] = [];

    const exitCode = await runCli(
      ["sync", "--daemon-endpoint", "/tmp/intentloomd.sock"],
      { catalogRoot },
      { stdout: () => undefined, stderr: (message) => stderr.push(message) },
    );

    expect(exitCode).toBe(2);
    expect(stderr.join("\n")).toContain(
      "--daemon-endpoint and --daemon-token-file must be used together",
    );
  });

  it("rejects paired daemon flags on sync", async () => {
    const stderr: string[] = [];

    const exitCode = await runCli(
      [
        "sync",
        "--daemon-endpoint",
        "/tmp/intentloomd.sock",
        "--daemon-token-file",
        "/tmp/token",
      ],
      { catalogRoot },
      { stdout: () => undefined, stderr: (message) => stderr.push(message) },
    );

    expect(exitCode).toBe(2);
    expect(stderr.join("\n")).toContain(
      "daemon mode is only valid with doctor",
    );
  });

  it("requires .aif/config.yaml and returns exit code 2", async () => {
    const projectRoot = resolve("sync missing config");
    const fileSystem = createMemoryFileSystem({
      [join(projectRoot, "README.md")]: "project\n",
    });
    const stderr: string[] = [];

    const exitCode = await runCli(
      ["sync", "--root", projectRoot],
      { catalogRoot, fileSystem },
      { stdout: () => undefined, stderr: (message) => stderr.push(message) },
    );

    expect(exitCode).toBe(2);
    expect(stderr.join("\n")).toBe(
      "sync requires an initialized project with .aif/config.yaml",
    );
  });

  it("reports parser errors before schema catalog bootstrap errors", async () => {
    const brokenRoot = await brokenCatalogRoot();
    const stderr: string[] = [];

    const exitCode = await runCli(
      ["sync", "--unknown-flag"],
      { catalogRoot: brokenRoot },
      { stdout: () => undefined, stderr: (message) => stderr.push(message) },
    );

    expect(exitCode).toBe(2);
    expect(stderr.join("\n")).toContain("unknown option: --unknown-flag");
    expect(stderr.join("\n")).not.toContain(
      "Intentloom schema catalog validation failed",
    );
  });

  it("returns exit code 3 for broken catalog bootstrap", async () => {
    const brokenRoot = await brokenCatalogRoot();
    const stderr: string[] = [];

    const exitCode = await runCli(
      ["sync", "--root", "/project"],
      { catalogRoot: brokenRoot },
      { stdout: () => undefined, stderr: (message) => stderr.push(message) },
    );

    expect(exitCode).toBe(3);
    expect(stderr.join("\n")).toContain(
      "Intentloom schema catalog validation failed",
    );
  });

  it("returns JSON schema catalog errors on stderr when --json is set", async () => {
    const brokenRoot = await brokenCatalogRoot();
    const stderr: string[] = [];

    const exitCode = await runCli(
      ["sync", "--root", "/project", "--json"],
      { catalogRoot: brokenRoot },
      { stdout: () => undefined, stderr: (message) => stderr.push(message) },
    );

    expect(exitCode).toBe(3);
    const payload = JSON.parse(stderr.join("\n")) as {
      status: string;
      errorCode: string;
    };
    expect(payload.status).toBe("invalid");
    expect(payload.errorCode).toBeTruthy();
  });

  it("returns exit code 3 for invalid metadata on stderr", async () => {
    const { projectRoot, fileSystem } = await initializedProject(
      "sync invalid metadata",
    );
    await fileSystem.write(join(projectRoot, ".aif/source-map.json"), "null");
    const stdout: string[] = [];
    const stderr: string[] = [];

    const exitCode = await runCli(
      ["sync", "--root", projectRoot],
      { catalogRoot, fileSystem },
      {
        stdout: (message) => stdout.push(message),
        stderr: (message) => stderr.push(message),
      },
    );

    expect(exitCode).toBe(3);
    expect(stdout.join("\n")).toBe("");
    expect(stderr.join("\n")).toContain(
      "Intentloom project artifact validation failed",
    );
  });

  it("prints human-readable text without --json", async () => {
    const { projectRoot, fileSystem } =
      await initializedProject("sync text output");
    const stdout: string[] = [];

    const exitCode = await runCli(
      ["sync", "--root", projectRoot],
      { catalogRoot, fileSystem },
      { stdout: (message) => stdout.push(message), stderr: () => undefined },
    );

    expect(exitCode).toBe(0);
    expect(stdout.join("\n")).toContain("Intentloom sync completed.");
    expect(stdout.join("\n")).not.toMatch(/^\{/);
  });

  it("second sync is a JSON no-op", async () => {
    const { projectRoot, fileSystem } = await initializedProject("sync noop");
    const first = await runCli(
      ["sync", "--root", projectRoot, "--json"],
      { catalogRoot, fileSystem },
      { stdout: () => undefined, stderr: () => undefined },
    );
    const stdout: string[] = [];
    const second = await runCli(
      ["sync", "--root", projectRoot, "--json"],
      { catalogRoot, fileSystem },
      { stdout: (message) => stdout.push(message), stderr: () => undefined },
    );

    expect(first).toBe(0);
    expect(second).toBe(0);
    expect(JSON.parse(stdout.join("\n"))).toMatchObject({
      status: "success",
      created: [],
      updated: [],
    });
  });

  it("recreates a missing generated file", async () => {
    const { projectRoot, fileSystem } = await initializedProject(
      "sync generated update",
    );
    await fileSystem.remove(join(projectRoot, "AGENTS.md"));

    const exitCode = await runCli(
      ["sync", "--root", projectRoot],
      { catalogRoot, fileSystem },
      { stdout: () => undefined, stderr: () => undefined },
    );

    expect(exitCode).toBe(0);
    expect(await fileSystem.exists(join(projectRoot, "AGENTS.md"))).toBe(true);
  });

  it("protects project-owned generated files", async () => {
    const { projectRoot, fileSystem } =
      await initializedProject("sync owned protect");
    await fileSystem.write(join(projectRoot, "AGENTS.md"), "owned\n");
    const stdout: string[] = [];

    const exitCode = await runCli(
      ["sync", "--root", projectRoot, "--json"],
      { catalogRoot, fileSystem },
      { stdout: (message) => stdout.push(message), stderr: () => undefined },
    );

    expect(exitCode).toBe(3);
    expect(JSON.parse(stdout.join("\n"))).toMatchObject({
      status: "conflict",
      conflicts: ["AGENTS.md"],
    });
    expect(await fileSystem.read(join(projectRoot, "AGENTS.md"))).toBe(
      "owned\n",
    );
  });

  it("does not mutate files on dry-run conflict", async () => {
    const { projectRoot, fileSystem } = await initializedProject(
      "sync dry-run conflict",
    );
    await fileSystem.write(join(projectRoot, "AGENTS.md"), "owned\n");
    const stdout: string[] = [];

    const exitCode = await runCli(
      ["sync", "--root", projectRoot, "--dry-run", "--json"],
      { catalogRoot, fileSystem },
      { stdout: (message) => stdout.push(message), stderr: () => undefined },
    );

    expect(exitCode).toBe(3);
    expect(JSON.parse(stdout.join("\n"))).toMatchObject({
      status: "conflict",
      dryRun: true,
    });
    expect(await fileSystem.read(join(projectRoot, "AGENTS.md"))).toBe(
      "owned\n",
    );
  });

  it("preserves init early dispatch after sync extraction", async () => {
    const projectRoot = resolve("sync leaves init");
    const fileSystem = createMemoryFileSystem({
      [join(projectRoot, "README.md")]: "project\n",
    });

    const exitCode = await runCli(
      ["init", "--root", projectRoot, "--adapters", "codex", "--dry-run"],
      { catalogRoot, fileSystem },
      { stdout: () => undefined, stderr: () => undefined },
    );

    expect(exitCode).toBe(0);
  });

  it("preserves plan early dispatch after sync extraction", async () => {
    const stdout: string[] = [];

    const exitCode = await runCli(
      ["plan", "--task", "sync-extraction-plan"],
      { catalogRoot },
      { stdout: (message) => stdout.push(message), stderr: () => undefined },
    );

    expect(exitCode).toBe(0);
    expect(JSON.parse(stdout.join("\n"))).toHaveProperty("featureBrief");
  });

  it("preserves diff early dispatch after sync extraction", async () => {
    const { projectRoot, fileSystem } =
      await initializedProject("sync leaves diff");
    const stdout: string[] = [];

    const exitCode = await runCli(
      ["diff", "--root", projectRoot, "--json"],
      { catalogRoot, fileSystem },
      { stdout: (message) => stdout.push(message), stderr: () => undefined },
    );

    expect(exitCode).toBe(0);
    expect(JSON.parse(stdout.join("\n"))).toHaveProperty("changes");
  });

  it("leaves adopt on its current path", async () => {
    const stderr: string[] = [];

    const exitCode = await runCli(
      ["adopt", "./repo"],
      { catalogRoot, fileSystem: createMemoryFileSystem() },
      { stdout: () => undefined, stderr: (message) => stderr.push(message) },
    );

    expect(exitCode).not.toBe(2);
    expect(stderr.join("\n")).not.toContain("unexpected argument");
  });

  it("preserves bare update legacy fallthrough to planFeature", async () => {
    const stderr: string[] = [];

    const exitCode = await runCli(
      ["update"],
      { catalogRoot },
      { stdout: () => undefined, stderr: (message) => stderr.push(message) },
    );

    expect(exitCode).toBe(2);
    expect(stderr.join("\n")).toBe("task identifier is required");
  });

  it("leaves adopt mapping flags functional after sync parser extraction", async () => {
    const fileSystem = createMemoryFileSystem({
      "/project/docs/product/CURRENT_STATE.md": "current focus",
      "/project/AGENT_START_HERE.md": "start here",
      "/project/DUTY_WATCH.md": "duty watch log",
      "/project/AGENTS.md": "working agreements",
      "/project/ROADMAP.md": "roadmap milestones",
      "/project/CHANGELOG.md": "changelog entries",
      "/project/SECURITY.md": "security policy",
      "/project/.claude/CLAUDE.md": "claude instructions",
    });

    const exitCode = await runCli(
      [
        "adopt",
        "--plan",
        "/project",
        "--project-owned-mapping",
        "src/a.ts=docs/a.md",
      ],
      { catalogRoot, fileSystem },
      { stdout: () => undefined, stderr: () => undefined },
    );

    expect(exitCode).toBe(0);
  });
});
