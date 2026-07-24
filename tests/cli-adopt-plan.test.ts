import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { createMemoryFileSystem } from "../packages/application/src/index.js";
import { runCli } from "../packages/cli/src/command.js";

describe("adopt --plan CLI", () => {
  it("renders human-readable adoption plan without writing files", async () => {
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
    const before = new Map(fs.files);
    const output: string[] = [];

    const exitCode = await runCli(
      ["adopt", "--plan", "/project"],
      { catalogRoot: resolve("catalog"), fileSystem: fs },
      { stdout: (message) => output.push(message), stderr: () => undefined },
    );

    expect(exitCode).toBe(0);
    const text = output.join("\n");
    expect(text).toContain("Adoption Plan: duty-watch");
    expect(text).toContain("Automatic Apply Allowed: yes");
    expect(text).toContain("operational-project-state");
    expect(text).toContain("docs/product/CURRENT_STATE.md");
    expect(text).toContain("duty-watch-log");
    expect(text).toContain("DUTY_WATCH.md");
    expect(fs.files).toEqual(before);
  });

  it("renders structured JSON adoption plan with --json", async () => {
    const fs = createMemoryFileSystem({
      "/project/CURRENT_STATE.md": "current status",
      "/project/AGENT_START_HERE.md": "agent entrypoint",
      "/project/DUTY_WATCH.md": "duty watch log",
    });
    const output: string[] = [];

    const exitCode = await runCli(
      ["adopt", "--plan", "/project", "--json"],
      { catalogRoot: resolve("catalog"), fileSystem: fs },
      { stdout: (message) => output.push(message), stderr: () => undefined },
    );

    expect(exitCode).toBe(0);
    const json = JSON.parse(output.join("\n")) as Record<string, unknown>;
    expect(json).toMatchObject({
      schemaVersion: 1,
      packId: "duty-watch",
      packVersion: "1.0.0",
      automaticApplyAllowed: true,
    });
    expect(json.mappings).toContainEqual(
      expect.objectContaining({
        role: "operational-project-state",
        path: "CURRENT_STATE.md",
      }),
    );
  });

  it("writes adoption plan to file when --output is specified", async () => {
    const fs = createMemoryFileSystem({
      "/project/DUTY_WATCH.md": "duty watch log",
    });

    const exitCode = await runCli(
      [
        "adopt",
        "--plan",
        "/project",
        "--json",
        "--output",
        "adoption-plan.json",
      ],
      { catalogRoot: resolve("catalog"), fileSystem: fs },
      { stdout: () => undefined, stderr: () => undefined },
    );

    expect(exitCode).toBe(0);
    expect(fs.files.has("/project/adoption-plan.json")).toBe(true);
    const saved = JSON.parse(
      fs.files.get("/project/adoption-plan.json")!,
    ) as Record<string, unknown>;
    expect(saved).toMatchObject({
      schemaVersion: 1,
      packId: "duty-watch",
    });
  });

  it("returns exit code 3 when --strict is specified and ambiguous roles exist", async () => {
    const fs = createMemoryFileSystem({
      "/project/docs/product/CURRENT_STATE.md": "state candidate 1",
      "/project/PROJECT_STATE.md": "state candidate 2",
    });
    const output: string[] = [];

    const exitCode = await runCli(
      ["adopt", "--plan", "/project", "--strict"],
      { catalogRoot: resolve("catalog"), fileSystem: fs },
      { stdout: (message) => output.push(message), stderr: () => undefined },
    );

    expect(exitCode).toBe(3);
    const text = output.join("\n");
    expect(text).toContain("Automatic Apply Allowed: no");
    expect(text).toContain("[ambiguous] ambiguous-role-mapping");
  });
});
