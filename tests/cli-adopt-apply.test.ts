import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  createMemoryFileSystem,
  planProjectAdoption,
} from "@intentloom/application";
import { runCli } from "../packages/cli/src/command.js";
import { stableStringify } from "@intentloom/core/adoption";

describe("adopt --apply CLI", () => {
  it("executes valid adoption plan transactionally", async () => {
    const fs = createMemoryFileSystem({
      "/project/CURRENT_STATE.md": "current status",
      "/project/DUTY_WATCH.md": "duty watch log",
    });
    const plan = await planProjectAdoption({ root: "/project" }, fs);
    fs.files.set("/project/plan.json", stableStringify(plan));
    const output: string[] = [];

    const exitCode = await runCli(
      ["adopt", "--apply", "plan.json", "/project", "--json"],
      { catalogRoot: resolve("catalog"), fileSystem: fs },
      { stdout: (message) => output.push(message), stderr: () => undefined },
    );

    expect(exitCode).toBe(0);
    const result = JSON.parse(output.join("\n")) as Record<string, unknown>;
    expect(result).toMatchObject({
      status: "success",
    });
    expect(fs.files.has("/project/.aif/migration-journal.json")).toBe(true);
    expect(fs.files.has("/project/AGENT_START_HERE.md")).toBe(true);
  });

  it("performs dry-run apply without modifying filesystem", async () => {
    const fs = createMemoryFileSystem({
      "/project/CURRENT_STATE.md": "current status",
      "/project/DUTY_WATCH.md": "duty watch log",
    });
    const plan = await planProjectAdoption({ root: "/project" }, fs);
    fs.files.set("/project/plan.json", stableStringify(plan));
    const before = new Map(fs.files);
    const output: string[] = [];

    const exitCode = await runCli(
      ["adopt", "--apply", "plan.json", "/project", "--dry-run", "--json"],
      { catalogRoot: resolve("catalog"), fileSystem: fs },
      { stdout: (message) => output.push(message), stderr: () => undefined },
    );

    expect(exitCode).toBe(0);
    const result = JSON.parse(output.join("\n")) as Record<string, unknown>;
    expect(result).toMatchObject({
      status: "no-op",
    });
    expect(fs.files).toEqual(before);
  });

  it("aborts transaction when expectedCurrentHash is stale", async () => {
    const fs = createMemoryFileSystem({
      "/project/CURRENT_STATE.md": "initial state",
      "/project/DUTY_WATCH.md": "duty watch log",
    });
    const plan = await planProjectAdoption({ root: "/project" }, fs);
    fs.files.set("/project/plan.json", stableStringify(plan));

    // Modify file after plan generation to induce stale hash
    fs.files.set("/project/CURRENT_STATE.md", "modified state after plan");
    const output: string[] = [];

    const exitCode = await runCli(
      ["adopt", "--apply", "plan.json", "/project", "--json"],
      { catalogRoot: resolve("catalog"), fileSystem: fs },
      { stdout: (message) => output.push(message), stderr: () => undefined },
    );

    expect(exitCode).toBe(3);
    const result = JSON.parse(output.join("\n")) as Record<string, unknown>;
    expect(result).toMatchObject({
      status: "stale-hash",
    });
    expect(fs.files.has("/project/AGENT_START_HERE.md")).toBe(false);
  });

  it("handles non-existent plan file gracefully with exit code 3", async () => {
    const fs = createMemoryFileSystem({
      "/project/DUTY_WATCH.md": "duty watch log",
    });
    const errOutput: string[] = [];

    const exitCode = await runCli(
      ["adopt", "--apply", "missing-plan.json", "/project"],
      { catalogRoot: resolve("catalog"), fileSystem: fs },
      { stdout: () => undefined, stderr: (message) => errOutput.push(message) },
    );

    expect(exitCode).toBe(3);
    expect(errOutput.join("\n")).toContain("Adoption plan file not found");
  });
});
