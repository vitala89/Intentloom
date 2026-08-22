import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { createMemoryFileSystem } from "../packages/application/src/index.js";
import { runCli } from "../packages/cli/src/command.js";
import { runCliEntry } from "../packages/cli/src/cli-entry.js";

describe("inspect CLI", () => {
  it("renders the application inspection result without writing", async () => {
    const fs = createMemoryFileSystem({
      "/project/AGENTS.md": "project guidance",
      "/project/.aif/config.yaml": "profile: generic",
      "/project/.aif/manifest.lock.json": "{}",
      "/project/.aif/source-map.json": "{}",
    });
    const before = [...fs.files.entries()];
    const output: string[] = [];

    const exitCode = await runCli(
      ["inspect", "/project", "--json"],
      { catalogRoot: resolve("catalog"), fileSystem: fs },
      { stdout: (message) => output.push(message), stderr: () => undefined },
    );

    expect(exitCode).toBe(0);
    expect(JSON.parse(output.join("\n"))).toMatchObject({
      operationVersion: 1,
      readiness: "ready",
      instructionPaths: ["AGENTS.md"],
    });
    expect([...fs.files.entries()]).toEqual(before);
  });

  it("renders human output through the shared formatter", async () => {
    const fs = createMemoryFileSystem({
      "/project/AGENTS.md": "project guidance",
      "/project/.aif/config.yaml": "profile: generic",
      "/project/.aif/manifest.lock.json": "{}",
      "/project/.aif/source-map.json": "{}",
    });
    const output: string[] = [];

    const exitCode = await runCli(
      ["inspect", "--root", "/project"],
      { catalogRoot: resolve("catalog"), fileSystem: fs },
      { stdout: (message) => output.push(message), stderr: () => undefined },
    );

    expect(exitCode).toBe(0);
    expect(output.join("\n")).toContain("Profile: generic");
    expect(output.join("\n")).toContain("Instruction files: AGENTS.md");
  });

  it("accepts a positional project path without --root", async () => {
    const fs = createMemoryFileSystem({
      "/project/AGENTS.md": "project guidance",
      "/project/.aif/config.yaml": "profile: generic",
      "/project/.aif/manifest.lock.json": "{}",
      "/project/.aif/source-map.json": "{}",
    });
    const output: string[] = [];

    const exitCode = await runCli(
      ["inspect", "/project", "--json"],
      { catalogRoot: resolve("catalog"), fileSystem: fs },
      { stdout: (message) => output.push(message), stderr: () => undefined },
    );

    expect(exitCode).toBe(0);
    expect(JSON.parse(output.join("\n"))).toMatchObject({
      readiness: "ready",
      instructionPaths: ["AGENTS.md"],
    });
  });

  it("returns exit code 3 when inspection reports error findings", async () => {
    const base = createMemoryFileSystem({
      "/project/README.md": "safe",
    });
    const fs = {
      ...base,
      isSymbolicLink: async () => true,
    };
    const output: string[] = [];

    const exitCode = await runCli(
      ["inspect", "/project", "--json"],
      { catalogRoot: resolve("catalog"), fileSystem: fs },
      { stdout: (message) => output.push(message), stderr: () => undefined },
    );

    expect(exitCode).toBe(3);
    expect(
      JSON.parse(output.join("\n")).findings.some(
        (finding: { severity: string }) => finding.severity === "error",
      ),
    ).toBe(true);
  });

  it("rejects unknown options with usage exit code", async () => {
    const errors: string[] = [];

    const exitCode = await runCli(
      ["inspect", "--task", "example"],
      { catalogRoot: resolve("catalog") },
      {
        stdout: () => undefined,
        stderr: (message) => errors.push(message),
      },
    );

    expect(exitCode).toBe(2);
    expect(errors.join("\n")).toContain("unknown option: --task");
  });

  it("dispatches inspect through runCliEntry", async () => {
    const fs = createMemoryFileSystem({
      "/project/AGENTS.md": "project guidance",
      "/project/.aif/config.yaml": "profile: generic",
      "/project/.aif/manifest.lock.json": "{}",
      "/project/.aif/source-map.json": "{}",
    });
    const output: string[] = [];

    const exitCode = await runCliEntry(
      ["inspect", "--root", "/project", "--json"],
      { catalogRoot: resolve("catalog"), fileSystem: fs },
      { stdout: (message) => output.push(message), stderr: () => undefined },
    );

    expect(exitCode).toBe(0);
    expect(JSON.parse(output.join("\n"))).toMatchObject({
      readiness: "ready",
      instructionPaths: ["AGENTS.md"],
    });
  });
});
