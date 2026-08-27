import { cp, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { createMemoryFileSystem } from "@intentloom/application";
import { runCli } from "../packages/cli/src/command.js";
import { runCliEntry } from "../packages/cli/src/cli-entry.js";

const catalogRoot = resolve("catalog");

async function brokenCatalogRoot(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "intentloom-update-catalog-"));
  await cp(resolve("catalog"), join(root, "catalog"), { recursive: true });
  await cp(resolve("profiles"), join(root, "profiles"), { recursive: true });
  const schemaPath = join(root, "catalog/schemas/aif-config.schema.json");
  const schema = JSON.parse(await readFile(schemaPath, "utf8"));
  schema.properties.profile = { $ref: "#/$defs/missing" };
  await writeFile(schemaPath, JSON.stringify(schema), "utf8");
  return join(root, "catalog");
}

function dutyWatchProject(root: string) {
  return createMemoryFileSystem({
    [join(root, "docs/product/CURRENT_STATE.md")]: "current focus",
    [join(root, "AGENT_START_HERE.md")]: "start here",
    [join(root, "DUTY_WATCH.md")]: "duty watch log",
    [join(root, "AGENTS.md")]: "working agreements",
    [join(root, "ROADMAP.md")]: "roadmap milestones",
    [join(root, "CHANGELOG.md")]: "changelog entries",
    [join(root, "SECURITY.md")]: "security policy",
    [join(root, ".claude/CLAUDE.md")]: "claude instructions",
  });
}

describe("update CLI extraction", () => {
  it("dispatches update through runCliEntry", async () => {
    const projectRoot = resolve("update entry dispatch");
    const fileSystem = dutyWatchProject(projectRoot);
    const stdout: string[] = [];

    const exitCode = await runCliEntry(
      ["update", "--plan", projectRoot],
      { catalogRoot, fileSystem },
      { stdout: (message) => stdout.push(message), stderr: () => undefined },
    );

    expect(exitCode).toBe(0);
    expect(stdout.join("\n")).toContain("Adoption Plan: duty-watch");
  });

  it("accepts positional PROJECT_PATH", async () => {
    const projectRoot = resolve("update positional project");
    const fileSystem = dutyWatchProject(projectRoot);
    const stderr: string[] = [];

    const exitCode = await runCli(
      ["update", "--plan", projectRoot],
      { catalogRoot, fileSystem },
      {
        stdout: () => undefined,
        stderr: (message) => stderr.push(message),
      },
    );

    expect(exitCode).toBe(0);
    expect(stderr.join("\n")).not.toContain("unexpected argument");
  });

  it("accepts --root for project path", async () => {
    const projectRoot = resolve("update root project");
    const fileSystem = dutyWatchProject(projectRoot);

    const exitCode = await runCli(
      ["update", "--plan", "--root", projectRoot],
      { catalogRoot, fileSystem },
      { stdout: () => undefined, stderr: () => undefined },
    );

    expect(exitCode).toBe(0);
  });

  it("rejects duplicate positional project path combined with --root", async () => {
    const stderr: string[] = [];

    const exitCode = await runCli(
      ["update", "--plan", "/first", "--root", "/second"],
      { catalogRoot, fileSystem: createMemoryFileSystem() },
      { stdout: () => undefined, stderr: (message) => stderr.push(message) },
    );

    expect(exitCode).toBe(2);
    expect(stderr).toEqual(["project path specified more than once"]);
  });

  it("rejects a second positional path when root is already set", async () => {
    const stderr: string[] = [];

    const exitCode = await runCli(
      ["update", "--plan", "--root", "/first", "/second"],
      { catalogRoot, fileSystem: createMemoryFileSystem() },
      { stdout: () => undefined, stderr: (message) => stderr.push(message) },
    );

    expect(exitCode).toBe(2);
    expect(stderr.join("\n")).toBe("unexpected argument: /second");
  });

  it("rejects missing option values", async () => {
    const stderr: string[] = [];

    const exitCode = await runCli(
      ["update", "--profile"],
      { catalogRoot },
      { stdout: () => undefined, stderr: (message) => stderr.push(message) },
    );

    expect(exitCode).toBe(2);
    expect(stderr.join("\n")).toContain("missing value for --profile");
  });

  it("rejects unknown options", async () => {
    const stderr: string[] = [];

    const exitCode = await runCli(
      ["update", "--unknown-flag"],
      { catalogRoot },
      { stdout: () => undefined, stderr: (message) => stderr.push(message) },
    );

    expect(exitCode).toBe(2);
    expect(stderr.join("\n")).toContain("unknown option: --unknown-flag");
  });

  it("rejects --force with the sync-only message", async () => {
    const stderr: string[] = [];

    const exitCode = await runCli(
      ["update", "--force"],
      { catalogRoot },
      { stdout: () => undefined, stderr: (message) => stderr.push(message) },
    );

    expect(exitCode).toBe(2);
    expect(stderr.join("\n")).toContain("--force is only valid with sync");
  });

  it("rejects adoption mapping flags", async () => {
    const stderr: string[] = [];

    const exitCode = await runCli(
      [
        "update",
        "--plan",
        "/project",
        "--project-owned-mapping",
        "src/a.ts=docs/a.md",
      ],
      { catalogRoot, fileSystem: createMemoryFileSystem() },
      { stdout: () => undefined, stderr: (message) => stderr.push(message) },
    );

    expect(exitCode).toBe(2);
    expect(stderr.join("\n")).toContain(
      "adoption mappings are only valid with init or adopt",
    );
  });

  it("rejects --cache with the clean-only message", async () => {
    const stderr: string[] = [];

    const exitCode = await runCli(
      ["update", "--cache"],
      { catalogRoot },
      { stdout: () => undefined, stderr: (message) => stderr.push(message) },
    );

    expect(exitCode).toBe(2);
    expect(stderr.join("\n")).toContain("--cache is only valid with clean");
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

  it("routes update --plan --json via early dispatch", async () => {
    const projectRoot = resolve("update plan json");
    const fileSystem = dutyWatchProject(projectRoot);
    const stdout: string[] = [];

    const exitCode = await runCli(
      ["update", "--plan", projectRoot, "--json"],
      { catalogRoot, fileSystem },
      { stdout: (message) => stdout.push(message), stderr: () => undefined },
    );

    expect(exitCode).toBe(0);
    const plan = JSON.parse(stdout.join("\n")) as Record<string, unknown>;
    expect(plan).toMatchObject({
      packId: "duty-watch",
      packVersion: "1.1.0",
      schemaVersion: 1,
    });
  });

  it("reports schema catalog failures on stderr with exit 3", async () => {
    const brokenRoot = await brokenCatalogRoot();
    const stderr: string[] = [];

    const exitCode = await runCli(
      ["update", "--plan", "/project"],
      { catalogRoot: brokenRoot },
      { stdout: () => undefined, stderr: (message) => stderr.push(message) },
    );

    expect(exitCode).toBe(3);
    expect(stderr.join("\n")).toContain(
      "Intentloom schema catalog validation failed",
    );
  });

  it("leaves sync --force functional after update extraction", async () => {
    const stderr: string[] = [];

    await runCli(
      ["sync", "--force", "--root", "/project"],
      { catalogRoot, fileSystem: createMemoryFileSystem() },
      { stdout: () => undefined, stderr: (message) => stderr.push(message) },
    );

    expect(stderr.join("\n")).not.toContain("--force is only valid with sync");
  });

  it("leaves adopt mapping flags functional after update extraction", async () => {
    const projectRoot = resolve("update adopt mapping parity");
    const fileSystem = dutyWatchProject(projectRoot);

    const exitCode = await runCli(
      [
        "adopt",
        "--plan",
        projectRoot,
        "--project-owned-mapping",
        "src/a.ts=docs/a.md",
      ],
      { catalogRoot, fileSystem },
      { stdout: () => undefined, stderr: () => undefined },
    );

    expect(exitCode).toBe(0);
  });
});
