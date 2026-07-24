import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  createMemoryFileSystem,
  planPackUpdate,
} from "@intentloom/application";
import { runCli } from "../packages/cli/src/command.js";

describe("pack update CLI (intentloom update)", () => {
  it("generates update proposal plan for target pack version", async () => {
    const fs = createMemoryFileSystem({
      "/project/CURRENT_STATE.md": "current status",
      "/project/DUTY_WATCH.md": "duty watch log",
    });

    const updatePlan = await planPackUpdate(
      { root: "/project", targetPackVersion: "1.1.0" },
      fs,
    );

    expect(updatePlan.packVersion).toBe("1.1.0");
    expect(updatePlan.schemaVersion).toBe(1);
  });

  it("routes intentloom update --plan --json via CLI", async () => {
    const fs = createMemoryFileSystem({
      "/project/CURRENT_STATE.md": "current status",
      "/project/DUTY_WATCH.md": "duty watch log",
    });
    const output: string[] = [];

    const exitCode = await runCli(
      ["update", "--plan", "/project", "--json"],
      { catalogRoot: resolve("catalog"), fileSystem: fs },
      { stdout: (message) => output.push(message), stderr: () => undefined },
    );

    expect(exitCode).toBe(0);
    const plan = JSON.parse(output.join("\n")) as Record<string, unknown>;
    expect(plan).toMatchObject({
      packId: "duty-watch",
      packVersion: "1.1.0",
      schemaVersion: 1,
    });
  });

  it("applies update plan transactionally via intentloom update --apply", async () => {
    const fs = createMemoryFileSystem({
      "/project/CURRENT_STATE.md": "current status",
      "/project/DUTY_WATCH.md": "duty watch log",
    });

    // Write update plan
    const updatePlan = await planPackUpdate(
      { root: "/project", targetPackVersion: "1.1.0" },
      fs,
    );
    fs.files.set("/project/update-plan.json", JSON.stringify(updatePlan));
    const output: string[] = [];

    const exitCode = await runCli(
      ["update", "--apply", "update-plan.json", "/project", "--json"],
      { catalogRoot: resolve("catalog"), fileSystem: fs },
      { stdout: (message) => output.push(message), stderr: () => undefined },
    );

    expect(exitCode).toBe(0);
    const result = JSON.parse(output.join("\n")) as Record<string, unknown>;
    expect(result).toMatchObject({
      status: "success",
    });
    expect(fs.files.has("/project/.aif/migration-journal.json")).toBe(true);
  });
});
