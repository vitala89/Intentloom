import { cp, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  createMemoryFileSystem,
  initProject,
  nodeFileSystem,
} from "@intentloom/application";
import { runCli } from "../packages/cli/src/command.js";
import { runCliEntry } from "../packages/cli/src/cli-entry.js";

const catalogRoot = resolve("catalog");

async function brokenCatalogRoot(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "intentloom-diff-catalog-"));
  await cp(resolve("catalog"), join(root, "catalog"), { recursive: true });
  await cp(resolve("profiles"), join(root, "profiles"), { recursive: true });
  const schemaPath = join(root, "catalog/schemas/aif-config.schema.json");
  const schema = JSON.parse(await readFile(schemaPath, "utf8"));
  schema.properties.profile = { $ref: "#/$defs/missing" };
  await writeFile(schemaPath, JSON.stringify(schema), "utf8");
  return join(root, "catalog");
}

async function preparedProject() {
  const root = await mkdtemp(join(tmpdir(), "intentloom-diff-project-"));
  await initProject(
    {
      root,
      profile: "generic",
      catalogRoot,
      adapters: ["cursor"],
    },
    nodeFileSystem,
  );
  return {
    root,
    dependencies: { catalogRoot, fileSystem: nodeFileSystem },
    cleanup: async () => rm(root, { recursive: true, force: true }),
  };
}

describe("diff CLI", () => {
  it("dispatches diff through runCliEntry", async () => {
    const { root, dependencies, cleanup } = await preparedProject();
    try {
      const output: string[] = [];

      const exitCode = await runCliEntry(
        ["diff", "--root", root, "--json"],
        dependencies,
        { stdout: (message) => output.push(message), stderr: () => undefined },
      );

      expect(exitCode).toBe(0);
      expect(JSON.parse(output.join("\n"))).toHaveProperty("changes");
    } finally {
      await cleanup();
    }
  });

  it("accepts positional PROJECT_PATH", async () => {
    const projectRoot = resolve("explicit diff project");
    const fs = createMemoryFileSystem({
      [join(projectRoot, "README.md")]: "project\n",
    });
    const stdout: string[] = [];
    const stderr: string[] = [];
    const before = [...fs.files.entries()];

    const exitCode = await runCli(
      ["diff", projectRoot],
      { catalogRoot, fileSystem: fs },
      {
        stdout: (message) => stdout.push(message),
        stderr: (message) => stderr.push(message),
      },
    );

    expect(exitCode).toBe(0);
    expect(stderr.join("\n")).not.toContain("unexpected argument");
    expect([...fs.files.entries()]).toEqual(before);
    expect(stdout.join("\n").length).toBeGreaterThan(0);
  });

  it("accepts --root for project path", async () => {
    const { root, dependencies, cleanup } = await preparedProject();
    try {
      const output: string[] = [];

      const exitCode = await runCli(
        ["diff", "--root", root, "--json"],
        dependencies,
        { stdout: (message) => output.push(message), stderr: () => undefined },
      );

      expect(exitCode).toBe(0);
      expect(JSON.parse(output.join("\n"))).toHaveProperty("changes");
    } finally {
      await cleanup();
    }
  });

  it("rejects duplicate positional project path combined with --root", async () => {
    const stderr: string[] = [];

    const exitCode = await runCli(
      ["diff", "/first", "--root", "/second"],
      { catalogRoot, fileSystem: createMemoryFileSystem() },
      { stdout: () => undefined, stderr: (message) => stderr.push(message) },
    );

    expect(exitCode).toBe(2);
    expect(stderr).toEqual(["project path specified more than once"]);
  });

  it("rejects missing option values", async () => {
    const stderr: string[] = [];

    const exitCode = await runCli(
      ["diff", "--profile"],
      { catalogRoot },
      { stdout: () => undefined, stderr: (message) => stderr.push(message) },
    );

    expect(exitCode).toBe(2);
    expect(stderr.join("\n")).toContain("missing value for --profile");
  });

  it("rejects unknown options", async () => {
    const stderr: string[] = [];

    const exitCode = await runCli(
      ["diff", "--unknown-flag"],
      { catalogRoot },
      { stdout: () => undefined, stderr: (message) => stderr.push(message) },
    );

    expect(exitCode).toBe(2);
    expect(stderr.join("\n")).toContain("unknown option: --unknown-flag");
  });

  it("accepts legacy ignored boolean flags such as --strict", async () => {
    const { root, dependencies, cleanup } = await preparedProject();
    try {
      const output: string[] = [];

      const exitCode = await runCli(
        ["diff", "--root", root, "--strict", "--json"],
        dependencies,
        { stdout: (message) => output.push(message), stderr: () => undefined },
      );

      expect(exitCode).toBe(0);
      expect(JSON.parse(output.join("\n"))).toHaveProperty("changes");
    } finally {
      await cleanup();
    }
  });

  it("accepts --dry-run without changing diff application behavior", async () => {
    const { root, dependencies, cleanup } = await preparedProject();
    try {
      const dryOutput: string[] = [];
      const plainOutput: string[] = [];

      const dryExit = await runCli(
        ["diff", "--root", root, "--dry-run", "--json"],
        dependencies,
        {
          stdout: (message) => dryOutput.push(message),
          stderr: () => undefined,
        },
      );
      const plainExit = await runCli(
        ["diff", "--root", root, "--json"],
        dependencies,
        {
          stdout: (message) => plainOutput.push(message),
          stderr: () => undefined,
        },
      );

      expect(dryExit).toBe(plainExit);
      expect(JSON.parse(dryOutput.join("\n"))).toEqual(
        JSON.parse(plainOutput.join("\n")),
      );
    } finally {
      await cleanup();
    }
  });

  it("rejects --force with the sync-only message", async () => {
    const stderr: string[] = [];

    const exitCode = await runCli(
      ["diff", "--force"],
      { catalogRoot },
      { stdout: () => undefined, stderr: (message) => stderr.push(message) },
    );

    expect(exitCode).toBe(2);
    expect(stderr.join("\n")).toContain("--force is only valid with sync");
  });

  it("rejects --cache with the clean-only message", async () => {
    const stderr: string[] = [];

    const exitCode = await runCli(
      ["diff", "--cache"],
      { catalogRoot },
      { stdout: () => undefined, stderr: (message) => stderr.push(message) },
    );

    expect(exitCode).toBe(2);
    expect(stderr.join("\n")).toContain("--cache is only valid with clean");
  });

  it("rejects adoption mapping flags", async () => {
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

  it("rejects paired daemon flags on diff", async () => {
    const stderr: string[] = [];

    const exitCode = await runCli(
      [
        "diff",
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

  it("reports parser errors before schema catalog bootstrap errors", async () => {
    const brokenRoot = await brokenCatalogRoot();
    const stderr: string[] = [];

    const exitCode = await runCli(
      ["diff", "--unknown-flag"],
      { catalogRoot: brokenRoot },
      { stdout: () => undefined, stderr: (message) => stderr.push(message) },
    );

    expect(exitCode).toBe(2);
    expect(stderr.join("\n")).toContain("unknown option: --unknown-flag");
    expect(stderr.join("\n")).not.toContain(
      "Intentloom schema catalog validation failed",
    );
  });

  it("returns exit code 3 for invalid metadata", async () => {
    const { root, dependencies, cleanup } = await preparedProject();
    try {
      await writeFile(join(root, ".aif/source-map.json"), "null", "utf8");
      const stderr: string[] = [];
      const stdout: string[] = [];

      const exitCode = await runCli(["diff", "--root", root], dependencies, {
        stdout: (message) => stdout.push(message),
        stderr: (message) => stderr.push(message),
      });

      expect(exitCode).toBe(3);
      expect(stdout.join("\n")).toBe("");
      expect(stderr.join("\n")).toContain(
        "Intentloom project artifact validation failed",
      );
    } finally {
      await cleanup();
    }
  });

  it("runs without stored config using defaults", async () => {
    const projectRoot = resolve("diff without config");
    const fs = createMemoryFileSystem({
      [join(projectRoot, "README.md")]: "project\n",
    });
    const output: string[] = [];

    const exitCode = await runCli(
      ["diff", "--root", projectRoot, "--json"],
      { catalogRoot, fileSystem: fs },
      { stdout: (message) => output.push(message), stderr: () => undefined },
    );

    expect(exitCode).toBe(0);
    expect(JSON.parse(output.join("\n"))).toHaveProperty("changes");
  });

  it("uses stored config profile and adapters when present", async () => {
    const { root, dependencies, cleanup } = await preparedProject();
    try {
      const output: string[] = [];

      const exitCode = await runCli(
        ["diff", "--root", root, "--json"],
        dependencies,
        { stdout: (message) => output.push(message), stderr: () => undefined },
      );

      expect(exitCode).toBe(0);
      const diff = JSON.parse(output.join("\n")) as Record<string, unknown>;
      expect(diff).toHaveProperty("changes");
    } finally {
      await cleanup();
    }
  });

  it("allows CLI profile override", async () => {
    const { root, dependencies, cleanup } = await preparedProject();
    try {
      const output: string[] = [];

      const exitCode = await runCli(
        ["diff", "--root", root, "--profile", "generic", "--json"],
        dependencies,
        { stdout: (message) => output.push(message), stderr: () => undefined },
      );

      expect(exitCode).toBe(0);
      expect(JSON.parse(output.join("\n"))).toHaveProperty("changes");
    } finally {
      await cleanup();
    }
  });

  it("allows CLI adapters override", async () => {
    const { root, dependencies, cleanup } = await preparedProject();
    try {
      const output: string[] = [];

      const exitCode = await runCli(
        ["diff", "--root", root, "--adapters", "cursor", "--json"],
        dependencies,
        { stdout: (message) => output.push(message), stderr: () => undefined },
      );

      expect(exitCode).toBe(0);
      expect(JSON.parse(output.join("\n"))).toHaveProperty("changes");
    } finally {
      await cleanup();
    }
  });

  it("returns exit code 0 for a clean text diff", async () => {
    const { root, dependencies, cleanup } = await preparedProject();
    try {
      const output: string[] = [];

      const exitCode = await runCli(["diff", "--root", root], dependencies, {
        stdout: (message) => output.push(message),
        stderr: () => undefined,
      });

      expect(exitCode).toBe(0);
      expect(output.join("\n")).not.toMatch(/^\{/);
    } finally {
      await cleanup();
    }
  });

  it("returns exit code 0 for a clean JSON diff", async () => {
    const { root, dependencies, cleanup } = await preparedProject();
    try {
      const output: string[] = [];

      const exitCode = await runCli(
        ["diff", "--root", root, "--json"],
        dependencies,
        { stdout: (message) => output.push(message), stderr: () => undefined },
      );

      expect(exitCode).toBe(0);
      expect(JSON.parse(output.join("\n"))).toHaveProperty("changes");
    } finally {
      await cleanup();
    }
  });

  it("returns exit code 3 for conflict diffs", async () => {
    const { root, dependencies, cleanup } = await preparedProject();
    try {
      const agentsPath = join(root, "AGENTS.md");
      const original = await readFile(agentsPath, "utf8");
      await writeFile(agentsPath, `${original} trailing\n`, "utf8");
      const stderr: string[] = [];
      const stdout: string[] = [];

      const exitCode = await runCli(
        ["diff", "--root", root, "--json"],
        dependencies,
        {
          stdout: (message) => stdout.push(message),
          stderr: (message) => stderr.push(message),
        },
      );

      expect(exitCode).toBe(3);
      const diff = JSON.parse(stdout.join("\n")) as {
        changes: { kind: string; path: string }[];
      };
      expect(diff.changes.some((change) => change.kind === "conflict")).toBe(
        true,
      );
      expect(stderr.join("\n")).toBe("");
    } finally {
      await cleanup();
    }
  });

  it("routes application errors through outer catch", async () => {
    const stderr: string[] = [];

    const exitCode = await runCli(
      ["diff", "--root", "/missing/read/root", "--adapters", "not-an-adapter"],
      { catalogRoot, fileSystem: nodeFileSystem },
      { stdout: () => undefined, stderr: (message) => stderr.push(message) },
    );

    expect(exitCode).toBe(2);
    expect(stderr.join("\n")).toContain("invalid --adapters value");
  });

  it("does not mutate project files", async () => {
    const { root, dependencies, cleanup } = await preparedProject();
    try {
      const before = await readFile(join(root, "AGENTS.md"), "utf8");
      const stdout: string[] = [];

      const exitCode = await runCli(
        ["diff", "--root", root, "--json"],
        dependencies,
        { stdout: (message) => stdout.push(message), stderr: () => undefined },
      );

      expect(exitCode).toBe(0);
      expect(stdout.join("\n").length).toBeGreaterThan(0);
      expect(await readFile(join(root, "AGENTS.md"), "utf8")).toBe(before);
    } finally {
      await cleanup();
    }
  });
});
