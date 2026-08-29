import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { createMemoryFileSystem } from "@intentloom/application";
import { runCli } from "../packages/cli/src/command.js";

const catalogRoot = resolve("catalog");
const fooRoot = resolve("foo");

describe("rank CLI", () => {
  it("rejects missing query", async () => {
    const stderr: string[] = [];
    const code = await runCli(
      ["rank"],
      { catalogRoot },
      {
        stdout: () => {},
        stderr: (msg) => stderr.push(msg),
      },
    );
    expect(code).toBe(2);
    expect(stderr.join("\n")).toMatch(
      /rank requires a query string or 'config' subcommand/,
    );
  });

  it("rejects unknown option", async () => {
    const stderr: string[] = [];
    const code = await runCli(
      ["rank", "test query", "--unknown-flag", "val"],
      { catalogRoot },
      {
        stdout: () => {},
        stderr: (msg) => stderr.push(msg),
      },
    );
    expect(code).toBe(2);
    expect(stderr.join("\n")).toMatch(/unknown option: --unknown-flag/);
  });

  it("rejects missing value for known option", async () => {
    const stderr: string[] = [];
    const code = await runCli(
      ["rank", "test query", "--root"],
      { catalogRoot },
      {
        stdout: () => {},
        stderr: (msg) => stderr.push(msg),
      },
    );
    expect(code).toBe(2);
    expect(stderr.join("\n")).toMatch(/missing value for --root/);
  });

  it("handles duplicate root option", async () => {
    const stderr: string[] = [];
    const code = await runCli(
      ["rank", "test query", "--root", "dir1", "--root", "dir2"],
      { catalogRoot },
      {
        stdout: () => {},
        stderr: (msg) => stderr.push(msg),
      },
    );
    expect(code).toBe(2);
    expect(stderr.join("\n")).toMatch(/project path specified more than once/);
  });

  it("fails when force flag is provided", async () => {
    const stderr: string[] = [];
    const code = await runCli(
      ["rank", "test query", "--force"],
      { catalogRoot },
      {
        stdout: () => {},
        stderr: (msg) => stderr.push(msg),
      },
    );
    expect(code).toBe(2);
    expect(stderr.join("\n")).toMatch(/--force is only valid with sync/);
  });

  it("fails when cache flag is provided", async () => {
    const stderr: string[] = [];
    const code = await runCli(
      ["rank", "test query", "--cache"],
      { catalogRoot },
      {
        stdout: () => {},
        stderr: (msg) => stderr.push(msg),
      },
    );
    expect(code).toBe(2);
    expect(stderr.join("\n")).toMatch(/--cache is only valid with clean/);
  });

  it("rejects mapping values", async () => {
    const stderr: string[] = [];
    const code = await runCli(
      ["rank", "query", "--project-owned-mapping", "foo"],
      { catalogRoot },
      {
        stdout: () => {},
        stderr: (msg) => stderr.push(msg),
      },
    );
    expect(code).toBe(2);
    expect(stderr.join("\n")).toMatch(
      /adoption mappings are only valid with init or adopt/,
    );
  });

  it("rejects daemon endpoints", async () => {
    const stderr: string[] = [];
    const code = await runCli(
      [
        "rank",
        "query",
        "--daemon-endpoint",
        "http://localhost:123",
        "--daemon-token-file",
        "foo",
      ],
      { catalogRoot },
      {
        stdout: () => {},
        stderr: (msg) => stderr.push(msg),
      },
    );
    expect(code).toBe(2);
    expect(stderr.join("\n")).toMatch(/daemon mode is only valid with doctor/);
  });

  it("dispatches config read successfully", async () => {
    const stdout: string[] = [];
    const fileSystem = createMemoryFileSystem();
    await fileSystem.mkdir(join(fooRoot, ".aif"));
    await fileSystem.mkdir(join(fooRoot, ".aif", "memory"));
    await fileSystem.write(
      join(fooRoot, ".aif", "memory", "semantic_config.json"),
      JSON.stringify({ enabled: false, provider: "local-tf-idf" }),
    );
    const code = await runCli(
      ["rank", "config", "--root", fooRoot],
      { catalogRoot, fileSystem },
      {
        stdout: (msg) => stdout.push(msg),
        stderr: () => {},
      },
    );
    expect(code).toBe(0);
    expect(stdout.join("\n")).toContain(
      "Semantic ranking config: enabled=false, provider=local-tf-idf",
    );
  });

  it("dispatches config write successfully", async () => {
    const stdout: string[] = [];
    const fileSystem = createMemoryFileSystem();
    await fileSystem.mkdir(fooRoot);
    await fileSystem.mkdir(join(fooRoot, ".aif"));
    await fileSystem.mkdir(join(fooRoot, ".aif", "memory"));
    const code = await runCli(
      [
        "rank",
        "config",
        "--enable",
        "--provider",
        "local-embeddings",
        "--root",
        fooRoot,
      ],
      { catalogRoot, fileSystem },
      {
        stdout: (msg) => stdout.push(msg),
        stderr: (msg) => console.error(msg),
      },
    );
    expect(code).toBe(0);
    expect(stdout.join("\n")).toContain(
      "Updated semantic ranking config: enabled=true, provider=local-embeddings",
    );
    const contents = await fileSystem.read(
      join(fooRoot, ".aif", "memory", "semantic_config.json"),
    );
    expect(contents).toBeTruthy();
  });

  it("dispatches query to rankProceduralMemory successfully", async () => {
    const stdout: string[] = [];
    const fileSystem = createMemoryFileSystem();
    const code = await runCli(
      ["rank", "test query", "--root", fooRoot],
      { catalogRoot, fileSystem },
      {
        stdout: (msg) => stdout.push(msg),
        stderr: () => {},
      },
    );
    expect(code).toBe(0);
    expect(stdout.join("\n")).toContain(
      'Semantic Rank Results for: "test query"',
    );
  });

  it("dispatches query with JSON output successfully", async () => {
    const stdout: string[] = [];
    const fileSystem = createMemoryFileSystem();
    const code = await runCli(
      ["rank", "test query", "--root", fooRoot, "--json"],
      { catalogRoot, fileSystem },
      {
        stdout: (msg) => stdout.push(msg),
        stderr: () => {},
      },
    );
    expect(code).toBe(0);
    const parsed = JSON.parse(stdout.join("\n"));
    expect(parsed.query).toBe("test query");
    expect(Array.isArray(parsed.items)).toBe(true);
  });
});
