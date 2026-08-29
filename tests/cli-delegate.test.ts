import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { createMemoryFileSystem } from "@intentloom/application";
import { runCli } from "../packages/cli/src/command.js";
import { runCliEntry } from "../packages/cli/src/cli-entry.js";

const catalogRoot = resolve("catalog");

function delegateProject(name: string): string {
  return `/project/delegate-${name}`;
}

describe("delegate CLI extraction", () => {
  it("dispatches delegate through runCliEntry", async () => {
    const projectRoot = delegateProject("entry-dispatch");
    const fileSystem = createMemoryFileSystem();
    await runCli(
      ["profile", "create", "--root", projectRoot, "--name", "entry-profile"],
      { catalogRoot, fileSystem },
      { stdout: () => undefined, stderr: () => undefined },
    );

    const stdout: string[] = [];
    const exitCode = await runCliEntry(
      [
        "delegate",
        "--root",
        projectRoot,
        "--profile",
        "entry-profile",
        "--role",
        "context-scout",
        "--task-id",
        "task-entry",
        "--json",
      ],
      { catalogRoot, fileSystem },
      { stdout: (message) => stdout.push(message), stderr: () => undefined },
    );

    expect(exitCode).toBe(0);
    expect(JSON.parse(stdout.join("\n")).grantedRole).toBe("context-scout");
  });

  it("requires --profile, --role, and --task-id", async () => {
    const stderr: string[] = [];

    const exitCode = await runCli(
      ["delegate"],
      { catalogRoot, fileSystem: createMemoryFileSystem() },
      { stdout: () => undefined, stderr: (message) => stderr.push(message) },
    );

    expect(exitCode).toBe(2);
    expect(stderr.join("\n")).toBe(
      "delegate requires --profile <name>, --role <role>, and --task-id <id>",
    );
  });

  it("rejects unknown options", async () => {
    const stderr: string[] = [];

    const exitCode = await runCli(
      ["delegate", "--unknown"],
      { catalogRoot, fileSystem: createMemoryFileSystem() },
      { stdout: () => undefined, stderr: (message) => stderr.push(message) },
    );

    expect(exitCode).toBe(2);
    expect(stderr.join("\n")).toBe("unknown option: --unknown");
  });

  it("rejects missing option values", async () => {
    const stderr: string[] = [];

    const exitCode = await runCli(
      ["delegate", "--profile"],
      { catalogRoot, fileSystem: createMemoryFileSystem() },
      { stdout: () => undefined, stderr: (message) => stderr.push(message) },
    );

    expect(exitCode).toBe(2);
    expect(stderr.join("\n")).toBe("missing value for --profile");
  });

  it("rejects duplicate --root", async () => {
    const stderr: string[] = [];

    const exitCode = await runCli(
      [
        "delegate",
        "--root",
        "/first",
        "--root",
        "/second",
        "--profile",
        "p",
        "--role",
        "context-scout",
        "--task-id",
        "t1",
      ],
      { catalogRoot, fileSystem: createMemoryFileSystem() },
      { stdout: () => undefined, stderr: (message) => stderr.push(message) },
    );

    expect(exitCode).toBe(2);
    expect(stderr.join("\n")).toBe("project path specified more than once");
  });

  it("rejects unexpected positional arguments", async () => {
    const stderr: string[] = [];

    const exitCode = await runCli(
      ["delegate", "extra"],
      { catalogRoot, fileSystem: createMemoryFileSystem() },
      { stdout: () => undefined, stderr: (message) => stderr.push(message) },
    );

    expect(exitCode).toBe(2);
    expect(stderr.join("\n")).toBe("unexpected argument: extra");
  });

  it("rejects --force", async () => {
    const stderr: string[] = [];

    const exitCode = await runCli(
      ["delegate", "--force"],
      { catalogRoot, fileSystem: createMemoryFileSystem() },
      { stdout: () => undefined, stderr: (message) => stderr.push(message) },
    );

    expect(exitCode).toBe(2);
    expect(stderr.join("\n")).toBe("--force is only valid with sync");
  });

  it("rejects adoption mapping flags", async () => {
    const stderr: string[] = [];

    const exitCode = await runCli(
      ["delegate", "--project-owned-mapping", "src/**"],
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
      ["delegate", "--cache"],
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
        "delegate",
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

  it("delegates a role with JSON output", async () => {
    const projectRoot = delegateProject("json");
    const fileSystem = createMemoryFileSystem();
    await runCli(
      ["profile", "create", "--root", projectRoot, "--name", "cli-profile"],
      { catalogRoot, fileSystem },
      { stdout: () => undefined, stderr: () => undefined },
    );

    const stdout: string[] = [];
    const exitCode = await runCli(
      [
        "delegate",
        "--root",
        projectRoot,
        "--profile",
        "cli-profile",
        "--role",
        "context-scout",
        "--task-id",
        "task-601",
        "--json",
      ],
      { catalogRoot, fileSystem },
      { stdout: (message) => stdout.push(message), stderr: () => undefined },
    );

    expect(exitCode).toBe(0);
    const delegation = JSON.parse(stdout.join("\n"));
    expect(delegation.grantedRole).toBe("context-scout");
    expect(delegation.effectiveCapabilities.readOnly).toBe(true);
  });

  it("delegates a role with human output", async () => {
    const projectRoot = delegateProject("text");
    const fileSystem = createMemoryFileSystem();
    await runCli(
      ["profile", "create", "--root", projectRoot, "--name", "text-profile"],
      { catalogRoot, fileSystem },
      { stdout: () => undefined, stderr: () => undefined },
    );

    const stdout: string[] = [];
    const exitCode = await runCli(
      [
        "delegate",
        "--root",
        projectRoot,
        "--profile",
        "text-profile",
        "--role",
        "reviewer",
        "--task-id",
        "task-602",
      ],
      { catalogRoot, fileSystem },
      { stdout: (message) => stdout.push(message), stderr: () => undefined },
    );

    expect(exitCode).toBe(0);
    expect(stdout.join("\n")).toMatch(
      /^Delegated role \[reviewer\] under profile \[text-profile\] \(ID: .+\)$/,
    );
  });

  it("reports missing profile through application error", async () => {
    const stderr: string[] = [];

    const exitCode = await runCli(
      [
        "delegate",
        "--root",
        delegateProject("missing-profile"),
        "--profile",
        "missing",
        "--role",
        "context-scout",
        "--task-id",
        "task-603",
      ],
      { catalogRoot, fileSystem: createMemoryFileSystem() },
      { stdout: () => undefined, stderr: (message) => stderr.push(message) },
    );

    expect(exitCode).toBe(2);
    expect(stderr.join("\n")).toBe("Profile not found: missing");
  });
});
