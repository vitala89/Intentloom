import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { createMemoryFileSystem } from "@intentloom/application";
import { runCli } from "../packages/cli/src/command.js";

const catalogRoot = resolve("catalog");
const projectRoot = "/test-project";

describe("context CLI", () => {
  it("rejects context command with no subcommand", async () => {
    const stderr: string[] = [];
    const code = await runCli(
      ["context"],
      { catalogRoot },
      {
        stdout: () => {},
        stderr: (msg) => stderr.push(msg),
      },
    );
    expect(code).toBe(2);
    expect(stderr.join("\n")).toMatch(/context requires get subcommand/);
  });

  it("rejects unsupported subcommand", async () => {
    const stderr: string[] = [];
    const code = await runCli(
      ["context", "foo"],
      { catalogRoot },
      {
        stdout: () => {},
        stderr: (msg) => stderr.push(msg),
      },
    );
    expect(code).toBe(2);
    expect(stderr.join("\n")).toMatch(/context requires get subcommand/);
  });

  it("rejects unknown option", async () => {
    const stderr: string[] = [];
    const code = await runCli(
      ["context", "get", "--unknown-flag", "val"],
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
      ["context", "get", "--root"],
      { catalogRoot },
      {
        stdout: () => {},
        stderr: (msg) => stderr.push(msg),
      },
    );
    expect(code).toBe(2);
    expect(stderr.join("\n")).toMatch(/missing value for --root/);
  });

  it("rejects unexpected positional arguments after subcommand", async () => {
    const stderr: string[] = [];
    const code = await runCli(
      ["context", "get", "unexpected-arg"],
      { catalogRoot },
      {
        stdout: () => {},
        stderr: (msg) => stderr.push(msg),
      },
    );
    expect(code).toBe(2);
    expect(stderr.join("\n")).toMatch(/unexpected argument: unexpected-arg/);
  });

  it("handles duplicate root option", async () => {
    const stderr: string[] = [];
    const code = await runCli(
      ["context", "get", "--root", "dir1", "--root", "dir2"],
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
      ["context", "get", "--force"],
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
      ["context", "get", "--cache"],
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
      ["context", "get", "--project-owned-mapping", "foo"],
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
        "context",
        "get",
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

  it("executes context get with text output format parity", async () => {
    const stdout: string[] = [];
    const fileSystem = createMemoryFileSystem();
    await fileSystem.mkdir(`${projectRoot}/docs/specs`);
    await fileSystem.write(
      `${projectRoot}/docs/specs/spec.md`,
      "# Specification\nCore architectural intent.",
    );

    const code = await runCli(
      ["context", "get", "--root", projectRoot],
      { catalogRoot, fileSystem },
      {
        stdout: (msg) => stdout.push(msg),
        stderr: () => {},
      },
    );
    expect(code).toBe(0);
    const output = stdout.join("\n");
    expect(output).toMatch(
      /^Bounded Project Context \(Root: .*, Tokens: \d+, Excluded: \d+\)/,
    );
    expect(output).toContain(
      "- [canonical-policy] [intent] docs/specs/spec.md",
    );
  });

  it("executes context get with JSON output format and field parity", async () => {
    const stdout: string[] = [];
    const fileSystem = createMemoryFileSystem();
    await fileSystem.mkdir(`${projectRoot}/docs/specs`);
    await fileSystem.write(
      `${projectRoot}/docs/specs/spec.md`,
      "# Specification\nCore architectural intent.",
    );

    const code = await runCli(
      ["context", "get", "--root", projectRoot, "--json"],
      { catalogRoot, fileSystem },
      {
        stdout: (msg) => stdout.push(msg),
        stderr: () => {},
      },
    );
    expect(code).toBe(0);
    const parsed = JSON.parse(stdout.join("\n"));
    expect(parsed.schemaVersion).toBe("1");
    expect(parsed.root).toBe(projectRoot);
    expect(typeof parsed.totalTokens).toBe("number");
    expect(typeof parsed.excludedPathsCount).toBe("number");
    expect(Array.isArray(parsed.items)).toBe(true);
    expect(parsed.items).toHaveLength(1);
    expect(parsed.items[0].path).toBe("docs/specs/spec.md");
    expect(parsed.items[0].type).toBe("intent");
    expect(parsed.items[0].trustClass).toBe("canonical-policy");
  });

  it("passes --query, --max-tokens, and --max-items correctly to application", async () => {
    const stdout: string[] = [];
    const fileSystem = createMemoryFileSystem();
    await fileSystem.mkdir(`${projectRoot}/docs`);
    for (let i = 1; i <= 5; i++) {
      await fileSystem.write(
        `${projectRoot}/docs/doc${i}.md`,
        `# Doc ${i}\n` + "content ".repeat(50),
      );
    }

    const code = await runCli(
      [
        "context",
        "get",
        "--root",
        projectRoot,
        "--query",
        "Doc 1",
        "--max-tokens",
        "200",
        "--max-items",
        "2",
        "--json",
      ],
      { catalogRoot, fileSystem },
      {
        stdout: (msg) => stdout.push(msg),
        stderr: () => {},
      },
    );
    expect(code).toBe(0);
    const parsed = JSON.parse(stdout.join("\n"));
    expect(parsed.items.length).toBeLessThanOrEqual(2);
  });
});
