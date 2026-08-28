import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { createMemoryFileSystem } from "@intentloom/application";
import { runCli } from "../packages/cli/src/command.js";
import { runCliEntry } from "../packages/cli/src/cli-entry.js";

const catalogRoot = resolve("catalog");

function profileProject(name: string): string {
  return `/project/profile-${name}`;
}

describe("profile CLI extraction", () => {
  it("dispatches profile through runCliEntry", async () => {
    const projectRoot = profileProject("entry-dispatch");
    const fileSystem = createMemoryFileSystem();
    const stdout: string[] = [];

    const exitCode = await runCliEntry(
      [
        "profile",
        "create",
        "--root",
        projectRoot,
        "--name",
        "entry-profile",
        "--json",
      ],
      { catalogRoot, fileSystem },
      { stdout: (message) => stdout.push(message), stderr: () => undefined },
    );

    expect(exitCode).toBe(0);
    expect(JSON.parse(stdout.join("\n")).name).toBe("entry-profile");
  });

  it("requires create, get, or list subcommand", async () => {
    const stderr: string[] = [];

    const exitCode = await runCli(
      ["profile"],
      { catalogRoot, fileSystem: createMemoryFileSystem() },
      { stdout: () => undefined, stderr: (message) => stderr.push(message) },
    );

    expect(exitCode).toBe(2);
    expect(stderr.join("\n")).toBe(
      "profile requires create, get, or list subcommand",
    );
  });

  it("rejects unsupported subcommands", async () => {
    const stderr: string[] = [];

    const exitCode = await runCli(
      ["profile", "delete"],
      { catalogRoot, fileSystem: createMemoryFileSystem() },
      { stdout: () => undefined, stderr: (message) => stderr.push(message) },
    );

    expect(exitCode).toBe(2);
    expect(stderr.join("\n")).toBe(
      "profile requires create, get, or list subcommand",
    );
  });

  it("rejects unknown options", async () => {
    const stderr: string[] = [];

    const exitCode = await runCli(
      ["profile", "list", "--unknown"],
      { catalogRoot, fileSystem: createMemoryFileSystem() },
      { stdout: () => undefined, stderr: (message) => stderr.push(message) },
    );

    expect(exitCode).toBe(2);
    expect(stderr.join("\n")).toBe("unknown option: --unknown");
  });

  it("rejects missing option values", async () => {
    const stderr: string[] = [];

    const exitCode = await runCli(
      ["profile", "create", "--name"],
      { catalogRoot, fileSystem: createMemoryFileSystem() },
      { stdout: () => undefined, stderr: (message) => stderr.push(message) },
    );

    expect(exitCode).toBe(2);
    expect(stderr.join("\n")).toBe("missing value for --name");
  });

  it("rejects duplicate --root", async () => {
    const stderr: string[] = [];

    const exitCode = await runCli(
      ["profile", "list", "--root", "/first", "--root", "/second"],
      { catalogRoot, fileSystem: createMemoryFileSystem() },
      { stdout: () => undefined, stderr: (message) => stderr.push(message) },
    );

    expect(exitCode).toBe(2);
    expect(stderr.join("\n")).toBe("project path specified more than once");
  });

  it("rejects unexpected positional arguments", async () => {
    const stderr: string[] = [];

    const exitCode = await runCli(
      ["profile", "list", "extra"],
      { catalogRoot, fileSystem: createMemoryFileSystem() },
      { stdout: () => undefined, stderr: (message) => stderr.push(message) },
    );

    expect(exitCode).toBe(2);
    expect(stderr.join("\n")).toBe("unexpected argument: extra");
  });

  it("rejects --force", async () => {
    const stderr: string[] = [];

    const exitCode = await runCli(
      ["profile", "list", "--force"],
      { catalogRoot, fileSystem: createMemoryFileSystem() },
      { stdout: () => undefined, stderr: (message) => stderr.push(message) },
    );

    expect(exitCode).toBe(2);
    expect(stderr.join("\n")).toBe("--force is only valid with sync");
  });

  it("rejects adoption mapping flags", async () => {
    const stderr: string[] = [];

    const exitCode = await runCli(
      ["profile", "list", "--project-owned-mapping", "src/**"],
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
      ["profile", "list", "--cache"],
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
        "profile",
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

  it("creates a profile with JSON output", async () => {
    const projectRoot = profileProject("create-json");
    const fileSystem = createMemoryFileSystem();
    const stdout: string[] = [];

    const exitCode = await runCli(
      [
        "profile",
        "create",
        "--root",
        projectRoot,
        "--name",
        "cli-profile",
        "--json",
      ],
      { catalogRoot, fileSystem },
      { stdout: (message) => stdout.push(message), stderr: () => undefined },
    );

    expect(exitCode).toBe(0);
    const created = JSON.parse(stdout.join("\n"));
    expect(created.name).toBe("cli-profile");
    expect(created.activeRoles).toContain("context-scout");
  });

  it("creates a profile with human output", async () => {
    const projectRoot = profileProject("create-text");
    const fileSystem = createMemoryFileSystem();
    const stdout: string[] = [];

    const exitCode = await runCli(
      ["profile", "create", "--root", projectRoot, "--name", "human-profile"],
      { catalogRoot, fileSystem },
      { stdout: (message) => stdout.push(message), stderr: () => undefined },
    );

    expect(exitCode).toBe(0);
    expect(stdout.join("\n")).toBe("Created profile [human-profile]");
  });

  it("requires --name for profile create when no positional name", async () => {
    const stderr: string[] = [];

    const exitCode = await runCli(
      ["profile", "create"],
      { catalogRoot, fileSystem: createMemoryFileSystem() },
      { stdout: () => undefined, stderr: (message) => stderr.push(message) },
    );

    expect(exitCode).toBe(2);
    expect(stderr.join("\n")).toBe("profile create requires --name <name>");
  });

  it("rejects positional name at parser index 2 (legacy fallback unreachable)", async () => {
    const stderr: string[] = [];

    const exitCode = await runCli(
      ["profile", "create", "positional-name", "--root", "/project"],
      { catalogRoot, fileSystem: createMemoryFileSystem() },
      { stdout: () => undefined, stderr: (message) => stderr.push(message) },
    );

    expect(exitCode).toBe(2);
    expect(stderr.join("\n")).toBe("unexpected argument: positional-name");
  });

  it("gets a profile with JSON output", async () => {
    const projectRoot = profileProject("get-json");
    const fileSystem = createMemoryFileSystem();
    await runCli(
      ["profile", "create", "--root", projectRoot, "--name", "stored-profile"],
      { catalogRoot, fileSystem },
      { stdout: () => undefined, stderr: () => undefined },
    );

    const stdout: string[] = [];
    const exitCode = await runCli(
      [
        "profile",
        "get",
        "--root",
        projectRoot,
        "--name",
        "stored-profile",
        "--json",
      ],
      { catalogRoot, fileSystem },
      { stdout: (message) => stdout.push(message), stderr: () => undefined },
    );

    expect(exitCode).toBe(0);
    expect(JSON.parse(stdout.join("\n")).name).toBe("stored-profile");
  });

  it("gets a profile with human output", async () => {
    const projectRoot = profileProject("get-text");
    const fileSystem = createMemoryFileSystem();
    await runCli(
      ["profile", "create", "--root", projectRoot, "--name", "text-profile"],
      { catalogRoot, fileSystem },
      { stdout: () => undefined, stderr: () => undefined },
    );

    const stdout: string[] = [];
    const exitCode = await runCli(
      ["profile", "get", "--root", projectRoot, "--name", "text-profile"],
      { catalogRoot, fileSystem },
      { stdout: (message) => stdout.push(message), stderr: () => undefined },
    );

    expect(exitCode).toBe(0);
    expect(stdout.join("\n")).toBe(
      "Profile [text-profile]: context-scout, feature-builder, test-engineer, reviewer, release-analyst",
    );
  });

  it("requires --name for profile get when no positional name", async () => {
    const stderr: string[] = [];

    const exitCode = await runCli(
      ["profile", "get"],
      { catalogRoot, fileSystem: createMemoryFileSystem() },
      { stdout: () => undefined, stderr: (message) => stderr.push(message) },
    );

    expect(exitCode).toBe(2);
    expect(stderr.join("\n")).toBe("profile get requires --name <name>");
  });

  it("returns exit 2 when profile is not found", async () => {
    const projectRoot = profileProject("missing-profile");
    const stderr: string[] = [];

    const exitCode = await runCli(
      ["profile", "get", "--root", projectRoot, "--name", "missing-profile"],
      { catalogRoot, fileSystem: createMemoryFileSystem() },
      { stdout: () => undefined, stderr: (message) => stderr.push(message) },
    );

    expect(exitCode).toBe(2);
    expect(stderr.join("\n")).toBe("Profile not found: missing-profile");
  });

  it("lists profiles with JSON output", async () => {
    const projectRoot = profileProject("list-json");
    const fileSystem = createMemoryFileSystem();
    await runCli(
      ["profile", "create", "--root", projectRoot, "--name", "listed-profile"],
      { catalogRoot, fileSystem },
      { stdout: () => undefined, stderr: () => undefined },
    );

    const stdout: string[] = [];
    const exitCode = await runCli(
      ["profile", "list", "--root", projectRoot, "--json"],
      { catalogRoot, fileSystem },
      { stdout: (message) => stdout.push(message), stderr: () => undefined },
    );

    expect(exitCode).toBe(0);
    const profiles = JSON.parse(stdout.join("\n"));
    expect(profiles).toHaveLength(1);
    expect(profiles[0].name).toBe("listed-profile");
  });

  it("lists profiles with human output", async () => {
    const projectRoot = profileProject("list-text");
    const fileSystem = createMemoryFileSystem();
    await runCli(
      [
        "profile",
        "create",
        "--root",
        projectRoot,
        "--name",
        "list-text-profile",
      ],
      { catalogRoot, fileSystem },
      { stdout: () => undefined, stderr: () => undefined },
    );

    const stdout: string[] = [];
    const exitCode = await runCli(
      ["profile", "list", "--root", projectRoot],
      { catalogRoot, fileSystem },
      { stdout: (message) => stdout.push(message), stderr: () => undefined },
    );

    expect(exitCode).toBe(0);
    expect(stdout.join("\n")).toBe(
      "- [list-text-profile] roles=context-scout,feature-builder,test-engineer,reviewer,release-analyst",
    );
  });

  it("renders empty list text output", async () => {
    const projectRoot = profileProject("empty-list");
    const stdout: string[] = [];

    const exitCode = await runCli(
      ["profile", "list", "--root", projectRoot],
      { catalogRoot, fileSystem: createMemoryFileSystem() },
      { stdout: (message) => stdout.push(message), stderr: () => undefined },
    );

    expect(exitCode).toBe(0);
    expect(stdout.join("\n")).toBe("");
  });
});
