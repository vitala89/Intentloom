import { cp, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { createMemoryFileSystem } from "@intentloom/application";
import { runCli } from "../packages/cli/src/command.js";
import { runCliEntry } from "../packages/cli/src/cli-entry.js";

const catalogRoot = resolve("catalog");

async function brokenCatalogRoot(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "intentloom-init-catalog-"));
  await cp(resolve("catalog"), join(root, "catalog"), { recursive: true });
  await cp(resolve("profiles"), join(root, "profiles"), { recursive: true });
  const schemaPath = join(root, "catalog/schemas/aif-config.schema.json");
  const schema = JSON.parse(await readFile(schemaPath, "utf8"));
  schema.properties.profile = { $ref: "#/$defs/missing" };
  await writeFile(schemaPath, JSON.stringify(schema), "utf8");
  return join(root, "catalog");
}

describe("init CLI", () => {
  it("dispatches init through runCliEntry", async () => {
    const projectRoot = resolve("init entry dispatch");
    const fs = createMemoryFileSystem({
      [join(projectRoot, "README.md")]: "project\n",
    });
    const stdout: string[] = [];

    const exitCode = await runCliEntry(
      ["init", "--root", projectRoot, "--dry-run", "--json"],
      { catalogRoot, fileSystem: fs },
      { stdout: (message) => stdout.push(message), stderr: () => undefined },
    );

    expect(exitCode).toBe(0);
    expect(JSON.parse(stdout.join("\n"))).toHaveProperty("changes");
  });

  it("runs bare init against cwd", async () => {
    const projectRoot = resolve("init bare cwd");
    const fs = createMemoryFileSystem({
      [join(projectRoot, "README.md")]: "project\n",
    });
    const stdout: string[] = [];

    const exitCode = await runCli(
      ["init", "--root", projectRoot, "--dry-run", "--json"],
      { catalogRoot, fileSystem: fs },
      { stdout: (message) => stdout.push(message), stderr: () => undefined },
    );

    expect(exitCode).toBe(0);
    expect(JSON.parse(stdout.join("\n"))).toHaveProperty("changes");
  });

  it("accepts --root for project path", async () => {
    const projectRoot = resolve("init root project");
    const fs = createMemoryFileSystem({
      [join(projectRoot, "README.md")]: "project\n",
    });
    const stdout: string[] = [];

    const exitCode = await runCli(
      ["init", "--root", projectRoot, "--dry-run", "--json"],
      { catalogRoot, fileSystem: fs },
      { stdout: (message) => stdout.push(message), stderr: () => undefined },
    );

    expect(exitCode).toBe(0);
    expect(JSON.parse(stdout.join("\n"))).toHaveProperty("changes");
  });

  it("rejects positional project path", async () => {
    const stderr: string[] = [];

    const exitCode = await runCli(
      ["init", "./repo"],
      { catalogRoot },
      { stdout: () => undefined, stderr: (message) => stderr.push(message) },
    );

    expect(exitCode).toBe(2);
    expect(stderr.join("\n")).toBe("unexpected argument: ./repo");
  });

  it("plans without writes in --dry-run mode", async () => {
    const projectRoot = resolve("init dry run");
    const fs = createMemoryFileSystem({
      [join(projectRoot, "README.md")]: "project\n",
    });
    const before = [...fs.files.keys()];

    const exitCode = await runCli(
      ["init", "--root", projectRoot, "--dry-run", "--json"],
      { catalogRoot, fileSystem: fs },
      { stdout: () => undefined, stderr: () => undefined },
    );

    expect(exitCode).toBe(0);
    expect([...fs.files.keys()].sort()).toEqual(before.sort());
  });

  it("writes expected artifacts on normal init", async () => {
    const projectRoot = resolve("init writes artifacts");
    const fs = createMemoryFileSystem({
      [join(projectRoot, "README.md")]: "project\n",
    });

    const exitCode = await runCli(
      ["init", "--root", projectRoot, "--adapters", "codex", "--json"],
      { catalogRoot, fileSystem: fs },
      { stdout: () => undefined, stderr: () => undefined },
    );

    expect(exitCode).toBe(0);
    expect(fs.files.has(join(projectRoot, ".aif/config.yaml"))).toBe(true);
    expect(fs.files.has(join(projectRoot, "AGENTS.md"))).toBe(true);
  });

  it("returns JSON plan objects with --json", async () => {
    const projectRoot = resolve("init json output");
    const fs = createMemoryFileSystem({
      [join(projectRoot, "README.md")]: "project\n",
    });
    const stdout: string[] = [];

    const exitCode = await runCli(
      ["init", "--root", projectRoot, "--dry-run", "--json"],
      { catalogRoot, fileSystem: fs },
      { stdout: (message) => stdout.push(message), stderr: () => undefined },
    );

    expect(exitCode).toBe(0);
    const payload = JSON.parse(stdout.join("\n")) as {
      changes: unknown[];
    };
    expect(Array.isArray(payload.changes)).toBe(true);
    expect(payload.changes.length).toBeGreaterThan(0);
  });

  it("accepts --profile override", async () => {
    const projectRoot = resolve("init profile override");
    const fs = createMemoryFileSystem({
      [join(projectRoot, "README.md")]: "project\n",
    });

    const exitCode = await runCli(
      [
        "init",
        "--root",
        projectRoot,
        "--profile",
        "generic",
        "--dry-run",
        "--json",
      ],
      { catalogRoot, fileSystem: fs },
      { stdout: () => undefined, stderr: () => undefined },
    );

    expect(exitCode).toBe(0);
  });

  it("accepts --adapters override", async () => {
    const projectRoot = resolve("init adapters override");
    const fs = createMemoryFileSystem({
      [join(projectRoot, "README.md")]: "project\n",
    });

    const exitCode = await runCli(
      [
        "init",
        "--root",
        projectRoot,
        "--adapters",
        "cursor",
        "--dry-run",
        "--json",
      ],
      { catalogRoot, fileSystem: fs },
      { stdout: () => undefined, stderr: () => undefined },
    );

    expect(exitCode).toBe(0);
  });

  it("uses generic default profile when --profile is omitted", async () => {
    const projectRoot = resolve("init default profile");
    const fs = createMemoryFileSystem({
      [join(projectRoot, "README.md")]: "project\n",
    });

    const exitCode = await runCli(
      ["init", "--root", projectRoot, "--adapters", "codex", "--json"],
      { catalogRoot, fileSystem: fs },
      { stdout: () => undefined, stderr: () => undefined },
    );

    expect(exitCode).toBe(0);
    expect(fs.files.get(join(projectRoot, ".aif/config.yaml"))).toContain(
      "profile: generic",
    );
  });

  it("uses init default adapters when --adapters is omitted", async () => {
    const projectRoot = resolve("init default adapters");
    const fs = createMemoryFileSystem({
      [join(projectRoot, "README.md")]: "project\n",
    });

    const exitCode = await runCli(
      ["init", "--root", projectRoot, "--json"],
      { catalogRoot, fileSystem: fs },
      { stdout: () => undefined, stderr: () => undefined },
    );

    expect(exitCode).toBe(0);
    expect(fs.files.get(join(projectRoot, ".aif/config.yaml"))).toContain(
      "adapters:",
    );
    expect(fs.files.get(join(projectRoot, ".aif/config.yaml"))).toContain(
      "- claude",
    );
    expect(fs.files.get(join(projectRoot, ".aif/config.yaml"))).toContain(
      "- codex",
    );
    expect(fs.files.get(join(projectRoot, ".aif/config.yaml"))).toContain(
      "- cursor",
    );
    expect(fs.files.get(join(projectRoot, ".aif/config.yaml"))).toContain(
      "- copilot",
    );
  });

  it("accepts --project-owned-mapping", async () => {
    const projectRoot = resolve("init project owned mapping");
    const fs = createMemoryFileSystem({
      [join(projectRoot, "README.md")]: "project\n",
    });

    const exitCode = await runCli(
      [
        "init",
        "--root",
        projectRoot,
        "--adapters",
        "codex",
        "--project-owned-mapping",
        "src/project.ts=docs/project.md",
        "--dry-run",
        "--json",
      ],
      { catalogRoot, fileSystem: fs },
      { stdout: () => undefined, stderr: () => undefined },
    );

    expect(exitCode).toBe(0);
  });

  it("accepts --documentation-mapping", async () => {
    const projectRoot = resolve("init documentation mapping");
    const fs = createMemoryFileSystem({
      [join(projectRoot, "README.md")]: "project\n",
    });

    const exitCode = await runCli(
      [
        "init",
        "--root",
        projectRoot,
        "--adapters",
        "codex",
        "--documentation-mapping",
        "README.md=docs/readme.md",
        "--dry-run",
        "--json",
      ],
      { catalogRoot, fileSystem: fs },
      { stdout: () => undefined, stderr: () => undefined },
    );

    expect(exitCode).toBe(0);
  });

  it("accepts multiple mapping flags", async () => {
    const projectRoot = resolve("init multiple mappings");
    const fs = createMemoryFileSystem({
      [join(projectRoot, "README.md")]: "project\n",
    });

    const exitCode = await runCli(
      [
        "init",
        "--root",
        projectRoot,
        "--adapters",
        "codex",
        "--project-owned-mapping",
        "src/a.ts=docs/a.md",
        "--project-owned-mapping",
        "src/b.ts=docs/b.md",
        "--dry-run",
        "--json",
      ],
      { catalogRoot, fileSystem: fs },
      { stdout: () => undefined, stderr: () => undefined },
    );

    expect(exitCode).toBe(0);
  });

  it("rejects malformed mapping syntax", async () => {
    const stderr: string[] = [];

    const exitCode = await runCli(
      [
        "init",
        "--root",
        "/project",
        "--project-owned-mapping",
        "missing-separator",
      ],
      { catalogRoot },
      { stdout: () => undefined, stderr: (message) => stderr.push(message) },
    );

    expect(exitCode).toBe(2);
    expect(stderr.join("\n")).toContain("mapping must use SOURCE=DESTINATION");
  });

  it("rejects non-normalized mapping paths", async () => {
    const stderr: string[] = [];

    const exitCode = await runCli(
      [
        "init",
        "--root",
        "/project",
        "--project-owned-mapping",
        "./src/a.ts=docs/a.md",
      ],
      { catalogRoot },
      { stdout: () => undefined, stderr: (message) => stderr.push(message) },
    );

    expect(exitCode).toBe(2);
    expect(stderr.join("\n")).toContain(
      "mapping paths must be normalized and project-relative",
    );
  });

  it("deduplicates identical mapping entries", async () => {
    const projectRoot = resolve("init duplicate mappings");
    const fs = createMemoryFileSystem({
      [join(projectRoot, "README.md")]: "project\n",
    });

    const exitCode = await runCli(
      [
        "init",
        "--root",
        projectRoot,
        "--adapters",
        "codex",
        "--project-owned-mapping",
        "src/a.ts=docs/a.md",
        "--project-owned-mapping",
        "src/a.ts=docs/a.md",
        "--dry-run",
        "--json",
      ],
      { catalogRoot, fileSystem: fs },
      { stdout: () => undefined, stderr: () => undefined },
    );

    expect(exitCode).toBe(0);
  });

  it("rejects --force with the sync-only message", async () => {
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
      ["init", "--cache"],
      { catalogRoot },
      { stdout: () => undefined, stderr: (message) => stderr.push(message) },
    );

    expect(exitCode).toBe(2);
    expect(stderr.join("\n")).toContain("--cache is only valid with clean");
  });

  it("rejects paired daemon flags on init", async () => {
    const stderr: string[] = [];

    const exitCode = await runCli(
      [
        "init",
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

  it("rejects unknown options", async () => {
    const stderr: string[] = [];

    const exitCode = await runCli(
      ["init", "--unknown-flag"],
      { catalogRoot },
      { stdout: () => undefined, stderr: (message) => stderr.push(message) },
    );

    expect(exitCode).toBe(2);
    expect(stderr.join("\n")).toContain("unknown option: --unknown-flag");
  });

  it("rejects missing option values", async () => {
    const stderr: string[] = [];

    const exitCode = await runCli(
      ["init", "--profile"],
      { catalogRoot },
      { stdout: () => undefined, stderr: (message) => stderr.push(message) },
    );

    expect(exitCode).toBe(2);
    expect(stderr.join("\n")).toContain("missing value for --profile");
  });

  it("accepts legacy ignored boolean flags such as --strict", async () => {
    const projectRoot = resolve("init ignored strict");
    const fs = createMemoryFileSystem({
      [join(projectRoot, "README.md")]: "project\n",
    });

    const exitCode = await runCli(
      ["init", "--root", projectRoot, "--strict", "--dry-run", "--json"],
      { catalogRoot, fileSystem: fs },
      { stdout: () => undefined, stderr: () => undefined },
    );

    expect(exitCode).toBe(0);
  });

  it("reports parser errors before schema catalog bootstrap errors", async () => {
    const brokenRoot = await brokenCatalogRoot();
    const stderr: string[] = [];

    const exitCode = await runCli(
      ["init", "--unknown-flag"],
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
      ["init", "--root", "/project", "--adapters", "codex"],
      { catalogRoot: brokenRoot },
      { stdout: () => undefined, stderr: (message) => stderr.push(message) },
    );

    expect(exitCode).toBe(3);
    expect(stderr.join("\n")).toContain(
      "Intentloom schema catalog validation failed",
    );
  });

  it("does not require existing stored config", async () => {
    const projectRoot = resolve("init without config");
    const fs = createMemoryFileSystem({
      [join(projectRoot, "README.md")]: "project\n",
    });

    const exitCode = await runCli(
      ["init", "--root", projectRoot, "--adapters", "codex", "--dry-run"],
      { catalogRoot, fileSystem: fs },
      { stdout: () => undefined, stderr: () => undefined },
    );

    expect(exitCode).toBe(0);
  });

  it("does not block init through project metadata loader", async () => {
    const projectRoot = resolve("init invalid metadata");
    const fs = createMemoryFileSystem({
      [join(projectRoot, ".aif/config.yaml")]:
        "profile: generic\nadapters:\n  - cursor\n",
      [join(projectRoot, ".aif/source-map.json")]: "null",
      [join(projectRoot, "README.md")]: "project\n",
    });
    const stdout: string[] = [];
    const stderr: string[] = [];

    const exitCode = await runCli(
      [
        "init",
        "--root",
        projectRoot,
        "--adapters",
        "codex",
        "--dry-run",
        "--json",
      ],
      { catalogRoot, fileSystem: fs },
      {
        stdout: (message) => stdout.push(message),
        stderr: (message) => stderr.push(message),
      },
    );

    const result = JSON.parse(stdout.join("\n")) as {
      changes: Array<{ kind: string; path: string }>;
      diagnostics: string[];
    };

    expect(exitCode).toBe(3);
    expect(stderr.join("\n")).not.toContain(
      "Intentloom project artifact validation failed",
    );
    expect(result.diagnostics).toContain("invalid source-map");
    expect(
      result.changes.some(
        (change) =>
          change.kind === "conflict" && change.path === ".aif/source-map.json",
      ),
    ).toBe(true);
  });

  it("returns exit code 3 for conflicting owned files", async () => {
    const projectRoot = resolve("init conflict project");
    const fs = createMemoryFileSystem({
      [join(projectRoot, "AGENTS.md")]: "project-owned\n",
    });
    const stdout: string[] = [];

    const exitCode = await runCli(
      ["init", "--root", projectRoot, "--adapters", "codex", "--json"],
      { catalogRoot, fileSystem: fs },
      {
        stdout: (message) => stdout.push(message),
        stderr: () => undefined,
      },
    );

    expect(exitCode).toBe(3);
    const payload = JSON.parse(stdout.join("\n")) as {
      changes: { kind: string; path: string }[];
    };
    expect(payload.changes.some((change) => change.kind === "conflict")).toBe(
      true,
    );
  });

  it("returns exit code 0 for a clean init", async () => {
    const projectRoot = resolve("init clean project");
    const fs = createMemoryFileSystem({
      [join(projectRoot, "README.md")]: "project\n",
    });

    const exitCode = await runCli(
      ["init", "--root", projectRoot, "--adapters", "codex"],
      { catalogRoot, fileSystem: fs },
      { stdout: () => undefined, stderr: () => undefined },
    );

    expect(exitCode).toBe(0);
  });

  it("prints human-readable plan text without --json", async () => {
    const projectRoot = resolve("init text output");
    const fs = createMemoryFileSystem({
      [join(projectRoot, "README.md")]: "project\n",
    });
    const stdout: string[] = [];

    const exitCode = await runCli(
      ["init", "--root", projectRoot, "--adapters", "codex", "--dry-run"],
      { catalogRoot, fileSystem: fs },
      { stdout: (message) => stdout.push(message), stderr: () => undefined },
    );

    expect(exitCode).toBe(0);
    expect(stdout.join("\n")).toContain("create");
    expect(stdout.join("\n")).not.toMatch(/^\{/);
  });

  it("does not use sync transaction exit codes 4 or 5", async () => {
    const projectRoot = resolve("init exit codes");
    const fs = createMemoryFileSystem({
      [join(projectRoot, "README.md")]: "project\n",
    });

    const successExit = await runCli(
      ["init", "--root", projectRoot, "--adapters", "codex"],
      { catalogRoot, fileSystem: fs },
      { stdout: () => undefined, stderr: () => undefined },
    );
    const conflictExit = await runCli(
      ["init", "--root", projectRoot, "--adapters", "codex"],
      { catalogRoot, fileSystem: fs },
      { stdout: () => undefined, stderr: () => undefined },
    );

    expect(successExit).toBe(0);
    expect(conflictExit).toBe(0);
    expect([successExit, conflictExit]).not.toContain(4);
    expect([successExit, conflictExit]).not.toContain(5);
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

  it("leaves adopt mapping flags functional after init parser extraction", async () => {
    const fs = createMemoryFileSystem({
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
      { catalogRoot, fileSystem: fs },
      { stdout: () => undefined, stderr: () => undefined },
    );

    expect(exitCode).toBe(0);
  });

  it("rejects adoption mapping flags on diff after init parser extraction", async () => {
    const stderr: string[] = [];

    const exitCode = await runCli(
      ["diff", "--project-owned-mapping", "src=dest"],
      { catalogRoot },
      { stdout: () => undefined, stderr: (message) => stderr.push(message) },
    );

    expect(exitCode).toBe(2);
    expect(stderr.join("\n")).toContain(
      "adoption mappings are only valid with init or adopt",
    );
  });
});
