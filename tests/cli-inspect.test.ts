import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { createMemoryFileSystem } from "../packages/application/src/index.js";
import { runCli } from "../packages/cli/src/command.js";

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
});
