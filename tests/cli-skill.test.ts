import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { createMemoryFileSystem } from "@intentloom/application";
import { runCli } from "../packages/cli/src/command.js";
import { runCliEntry } from "../packages/cli/src/cli-entry.js";

const catalogRoot = resolve("catalog");

const sampleSkill1 = `---
name: sample-code-review
version: 1.2.0
description: Perform automated code review on bounded diffs
packs:
  - frontend
  - backend
roles:
  - reviewer
trustClass: canonical-policy
capabilities:
  - code-analysis
---

# sample-code-review

## Trigger

When a pull request or code change is ready for review.

## Inputs

- diff source code diff
- policy canonical policy document

## Procedure

1. Read diff.
2. Check for security or performance issues.

## Exact outputs

Review findings with severity and remediation steps.
`;

const sampleSkill2 = `---
name: sample-deploy-helper
version: 2.0.0
description: Manage infrastructure and deployment tasks
packs:
  - devops
roles:
  - devops-engineer
trustClass: verified-evidence
capabilities:
  - deployment
---

# sample-deploy-helper

## Trigger

When deploying application to production.

## Inputs

- manifest deployment configuration

## Procedure

1. Validate configuration.
2. Trigger pipeline.

## Exact outputs

Deployment status log.
`;

function skillProject(name: string): string {
  return `/project/skill-${name}`;
}

function skillFixtureFs(projectRoot: string) {
  return createMemoryFileSystem({
    [`${projectRoot}/catalog/skills/sample-code-review/SKILL.md`]: sampleSkill1,
    [`${projectRoot}/catalog/skills/sample-deploy-helper/SKILL.md`]:
      sampleSkill2,
  });
}

describe("skill CLI extraction", () => {
  it("dispatches skill through runCliEntry", async () => {
    const projectRoot = skillProject("entry-dispatch");
    const fileSystem = skillFixtureFs(projectRoot);
    const stdout: string[] = [];

    const exitCode = await runCliEntry(
      [
        "skill",
        "discover",
        "--root",
        projectRoot,
        "--level",
        "catalog",
        "--json",
      ],
      { catalogRoot, fileSystem },
      { stdout: (message) => stdout.push(message), stderr: () => undefined },
    );

    expect(exitCode).toBe(0);
    expect(JSON.parse(stdout.join("\n")).skills.length).toBe(2);
  });

  it("requires discover subcommand", async () => {
    const stderr: string[] = [];

    const exitCode = await runCli(
      ["skill"],
      { catalogRoot, fileSystem: createMemoryFileSystem() },
      { stdout: () => undefined, stderr: (message) => stderr.push(message) },
    );

    expect(exitCode).toBe(2);
    expect(stderr.join("\n")).toBe("skill requires discover subcommand");
  });

  it("rejects unsupported subcommands", async () => {
    const stderr: string[] = [];

    const exitCode = await runCli(
      ["skill", "list"],
      { catalogRoot, fileSystem: createMemoryFileSystem() },
      { stdout: () => undefined, stderr: (message) => stderr.push(message) },
    );

    expect(exitCode).toBe(2);
    expect(stderr.join("\n")).toBe("skill requires discover subcommand");
  });

  it("rejects unknown options", async () => {
    const stderr: string[] = [];

    const exitCode = await runCli(
      ["skill", "discover", "--unknown"],
      { catalogRoot, fileSystem: createMemoryFileSystem() },
      { stdout: () => undefined, stderr: (message) => stderr.push(message) },
    );

    expect(exitCode).toBe(2);
    expect(stderr.join("\n")).toBe("unknown option: --unknown");
  });

  it("rejects missing option values", async () => {
    const stderr: string[] = [];

    const exitCode = await runCli(
      ["skill", "discover", "--level"],
      { catalogRoot, fileSystem: createMemoryFileSystem() },
      { stdout: () => undefined, stderr: (message) => stderr.push(message) },
    );

    expect(exitCode).toBe(2);
    expect(stderr.join("\n")).toBe("missing value for --level");
  });

  it("rejects duplicate --root", async () => {
    const stderr: string[] = [];

    const exitCode = await runCli(
      ["skill", "discover", "--root", "/first", "--root", "/second"],
      { catalogRoot, fileSystem: createMemoryFileSystem() },
      { stdout: () => undefined, stderr: (message) => stderr.push(message) },
    );

    expect(exitCode).toBe(2);
    expect(stderr.join("\n")).toBe("project path specified more than once");
  });

  it("rejects unexpected positional arguments", async () => {
    const stderr: string[] = [];

    const exitCode = await runCli(
      ["skill", "discover", "extra"],
      { catalogRoot, fileSystem: createMemoryFileSystem() },
      { stdout: () => undefined, stderr: (message) => stderr.push(message) },
    );

    expect(exitCode).toBe(2);
    expect(stderr.join("\n")).toBe("unexpected argument: extra");
  });

  it("rejects --force", async () => {
    const stderr: string[] = [];

    const exitCode = await runCli(
      ["skill", "discover", "--force"],
      { catalogRoot, fileSystem: createMemoryFileSystem() },
      { stdout: () => undefined, stderr: (message) => stderr.push(message) },
    );

    expect(exitCode).toBe(2);
    expect(stderr.join("\n")).toBe("--force is only valid with sync");
  });

  it("rejects adoption mapping flags", async () => {
    const stderr: string[] = [];

    const exitCode = await runCli(
      ["skill", "discover", "--project-owned-mapping", "src/**"],
      { catalogRoot, fileSystem: createMemoryFileSystem() },
      { stdout: () => undefined, stderr: (message) => stderr.push(message) },
    );

    expect(exitCode).toBe(2);
    expect(stderr.join("\n")).toBe(
      "adoption mappings are only valid with init or adopt",
    );
  });

  it("rejects invalid --level", async () => {
    const stderr: string[] = [];
    const projectRoot = skillProject("invalid-level");

    const exitCode = await runCli(
      ["skill", "discover", "--root", projectRoot, "--level", "invalid"],
      { catalogRoot, fileSystem: skillFixtureFs(projectRoot) },
      { stdout: () => undefined, stderr: (message) => stderr.push(message) },
    );

    expect(exitCode).toBe(2);
    expect(stderr.join("\n")).toBe(
      "--level must be catalog, contract, or procedure",
    );
  });

  it("discovers skills with JSON output", async () => {
    const projectRoot = skillProject("json-parity");
    const fileSystem = skillFixtureFs(projectRoot);
    const stdout: string[] = [];

    const exitCode = await runCli(
      [
        "skill",
        "discover",
        "--root",
        projectRoot,
        "--level",
        "catalog",
        "--json",
      ],
      { catalogRoot, fileSystem },
      { stdout: (message) => stdout.push(message), stderr: () => undefined },
    );

    expect(exitCode).toBe(0);
    const parsed = JSON.parse(stdout.join("\n"));
    expect(parsed.level).toBe("catalog");
    expect(parsed.skills.length).toBe(2);
    expect(parsed.budgetSavingsPercentage).toBeGreaterThan(0);
  });

  it("discovers skills with text output", async () => {
    const projectRoot = skillProject("text-parity");
    const fileSystem = skillFixtureFs(projectRoot);
    const stdout: string[] = [];

    const exitCode = await runCli(
      ["skill", "discover", "--root", projectRoot, "--level", "catalog"],
      { catalogRoot, fileSystem },
      { stdout: (message) => stdout.push(message), stderr: () => undefined },
    );

    expect(exitCode).toBe(0);
    const output = stdout.join("\n");
    expect(output).toContain("Discovered 2 skills (Level: catalog)");
    expect(output).toContain("Total context budget:");
    expect(output).toContain("[sample-code-review]");
    expect(output).toContain("[sample-deploy-helper]");
  });

  it("defaults to catalog level when --level omitted", async () => {
    const projectRoot = skillProject("default-level");
    const fileSystem = skillFixtureFs(projectRoot);
    const stdout: string[] = [];

    const exitCode = await runCli(
      ["skill", "discover", "--root", projectRoot, "--json"],
      { catalogRoot, fileSystem },
      { stdout: (message) => stdout.push(message), stderr: () => undefined },
    );

    expect(exitCode).toBe(0);
    expect(JSON.parse(stdout.join("\n")).level).toBe("catalog");
  });

  it("filters skills by pack and role", async () => {
    const projectRoot = skillProject("filters");
    const fileSystem = skillFixtureFs(projectRoot);
    const stdout: string[] = [];

    const exitCode = await runCli(
      [
        "skill",
        "discover",
        "--root",
        projectRoot,
        "--pack",
        "devops",
        "--role",
        "devops-engineer",
        "--json",
      ],
      { catalogRoot, fileSystem },
      { stdout: (message) => stdout.push(message), stderr: () => undefined },
    );

    expect(exitCode).toBe(0);
    const parsed = JSON.parse(stdout.join("\n"));
    expect(parsed.skills.length).toBe(1);
    expect(parsed.skills[0]!.id).toBe("sample-deploy-helper");
  });
});
