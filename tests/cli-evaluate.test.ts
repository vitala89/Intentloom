import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { createMemoryFileSystem } from "@intentloom/application";
import { runCli } from "../packages/cli/src/command.js";
import { runCliEntry } from "../packages/cli/src/cli-entry.js";

const catalogRoot = resolve("catalog");

const proposalData = {
  id: "prop-eval-cli",
  name: "safe-code-format",
  version: "1.0.0",
  sourceTaskIds: ["task-201"],
  observedPattern: "Consistently formats imports",
  confidence: 0.95,
  uncertainty: "None",
  requestedCapabilities: ["formatting"],
  supportedProfiles: ["all"],
  validationExpectations: ["Pass linter"],
  privacyImpact: "None",
  trustClass: "verified-evidence" as const,
  content: "## Format Procedure\n1. Run formatter.\n2. Verify diff.",
};

function evaluateProject(name: string): string {
  return `/project/evaluate-${name}`;
}

async function seedProposal(
  projectRoot: string,
  fileSystem = createMemoryFileSystem(),
) {
  await runCli(
    [
      "proposal",
      "create",
      "--root",
      projectRoot,
      "--json-input",
      JSON.stringify(proposalData),
    ],
    { catalogRoot, fileSystem },
    { stdout: () => undefined, stderr: () => undefined },
  );
  return fileSystem;
}

describe("evaluate CLI extraction", () => {
  it("dispatches evaluate through runCliEntry", async () => {
    const projectRoot = evaluateProject("entry-dispatch");
    const fileSystem = await seedProposal(projectRoot);
    const stdout: string[] = [];

    const exitCode = await runCliEntry(
      [
        "evaluate",
        "run",
        "--root",
        projectRoot,
        "--proposal-id",
        "prop-eval-cli",
        "--json",
      ],
      { catalogRoot, fileSystem },
      { stdout: (message) => stdout.push(message), stderr: () => undefined },
    );

    expect(exitCode).toBe(0);
    expect(JSON.parse(stdout.join("\n")).proposalId).toBe("prop-eval-cli");
  });

  it("requires run or list subcommand", async () => {
    const stderr: string[] = [];

    const exitCode = await runCli(
      ["evaluate"],
      { catalogRoot, fileSystem: createMemoryFileSystem() },
      { stdout: () => undefined, stderr: (message) => stderr.push(message) },
    );

    expect(exitCode).toBe(2);
    expect(stderr.join("\n")).toBe("evaluate requires run or list subcommand");
  });

  it("rejects unsupported subcommands", async () => {
    const stderr: string[] = [];

    const exitCode = await runCli(
      ["evaluate", "get"],
      { catalogRoot, fileSystem: createMemoryFileSystem() },
      { stdout: () => undefined, stderr: (message) => stderr.push(message) },
    );

    expect(exitCode).toBe(2);
    expect(stderr.join("\n")).toBe("evaluate requires run or list subcommand");
  });

  it("rejects unknown options", async () => {
    const stderr: string[] = [];

    const exitCode = await runCli(
      ["evaluate", "list", "--unknown"],
      { catalogRoot, fileSystem: createMemoryFileSystem() },
      { stdout: () => undefined, stderr: (message) => stderr.push(message) },
    );

    expect(exitCode).toBe(2);
    expect(stderr.join("\n")).toBe("unknown option: --unknown");
  });

  it("rejects missing option values", async () => {
    const stderr: string[] = [];

    const exitCode = await runCli(
      ["evaluate", "run", "--proposal-id"],
      { catalogRoot, fileSystem: createMemoryFileSystem() },
      { stdout: () => undefined, stderr: (message) => stderr.push(message) },
    );

    expect(exitCode).toBe(2);
    expect(stderr.join("\n")).toBe("missing value for --proposal-id");
  });

  it("rejects duplicate --root", async () => {
    const stderr: string[] = [];

    const exitCode = await runCli(
      ["evaluate", "list", "--root", "/first", "--root", "/second"],
      { catalogRoot, fileSystem: createMemoryFileSystem() },
      { stdout: () => undefined, stderr: (message) => stderr.push(message) },
    );

    expect(exitCode).toBe(2);
    expect(stderr.join("\n")).toBe("project path specified more than once");
  });

  it("rejects unexpected positional arguments", async () => {
    const stderr: string[] = [];

    const exitCode = await runCli(
      ["evaluate", "list", "extra"],
      { catalogRoot, fileSystem: createMemoryFileSystem() },
      { stdout: () => undefined, stderr: (message) => stderr.push(message) },
    );

    expect(exitCode).toBe(2);
    expect(stderr.join("\n")).toBe("unexpected argument: extra");
  });

  it("rejects --force", async () => {
    const stderr: string[] = [];

    const exitCode = await runCli(
      ["evaluate", "list", "--force"],
      { catalogRoot, fileSystem: createMemoryFileSystem() },
      { stdout: () => undefined, stderr: (message) => stderr.push(message) },
    );

    expect(exitCode).toBe(2);
    expect(stderr.join("\n")).toBe("--force is only valid with sync");
  });

  it("rejects adoption mapping flags", async () => {
    const stderr: string[] = [];

    const exitCode = await runCli(
      ["evaluate", "list", "--project-owned-mapping", "src/**"],
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
      ["evaluate", "list", "--cache"],
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
        "evaluate",
        "list",
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

  it("requires --proposal-id for evaluate run when no positional id", async () => {
    const stderr: string[] = [];

    const exitCode = await runCli(
      ["evaluate", "run"],
      { catalogRoot, fileSystem: createMemoryFileSystem() },
      { stdout: () => undefined, stderr: (message) => stderr.push(message) },
    );

    expect(exitCode).toBe(2);
    expect(stderr.join("\n")).toBe("evaluate run requires --proposal-id <id>");
  });

  it("runs evaluation with JSON output", async () => {
    const projectRoot = evaluateProject("run-json");
    const fileSystem = await seedProposal(projectRoot);
    const stdout: string[] = [];

    const exitCode = await runCli(
      [
        "evaluate",
        "run",
        "--root",
        projectRoot,
        "--proposal-id",
        "prop-eval-cli",
        "--json",
      ],
      { catalogRoot, fileSystem },
      { stdout: (message) => stdout.push(message), stderr: () => undefined },
    );

    expect(exitCode).toBe(0);
    const parsed = JSON.parse(stdout.join("\n"));
    expect(parsed.passed).toBe(true);
    expect(parsed.securityPass).toBe(true);
    expect(parsed.outcome).toBe("passed");
    expect(parsed.skillId).toBe("safe-code-format");
  });

  it("runs evaluation with human output", async () => {
    const projectRoot = evaluateProject("run-text");
    const fileSystem = await seedProposal(projectRoot);
    const stdout: string[] = [];

    const exitCode = await runCli(
      [
        "evaluate",
        "run",
        "--root",
        projectRoot,
        "--proposal-id",
        "prop-eval-cli",
      ],
      { catalogRoot, fileSystem },
      { stdout: (message) => stdout.push(message), stderr: () => undefined },
    );

    expect(exitCode).toBe(0);
    expect(stdout.join("\n")).toBe(
      "Evaluated proposal [prop-eval-cli]: outcome=passed, passed=true, securityPass=true",
    );
  });

  it("returns exit 2 when proposal is not found", async () => {
    const projectRoot = evaluateProject("missing-proposal");
    const stderr: string[] = [];

    const exitCode = await runCli(
      ["evaluate", "run", "--root", projectRoot, "--proposal-id", "missing-id"],
      { catalogRoot, fileSystem: createMemoryFileSystem() },
      { stdout: () => undefined, stderr: (message) => stderr.push(message) },
    );

    expect(exitCode).toBe(2);
    expect(stderr.join("\n")).toBe("Skill proposal not found: missing-id");
  });

  it("lists evaluations with JSON output", async () => {
    const projectRoot = evaluateProject("list-json");
    const fileSystem = await seedProposal(projectRoot);
    await runCli(
      [
        "evaluate",
        "run",
        "--root",
        projectRoot,
        "--proposal-id",
        "prop-eval-cli",
      ],
      { catalogRoot, fileSystem },
      { stdout: () => undefined, stderr: () => undefined },
    );

    const stdout: string[] = [];
    const exitCode = await runCli(
      ["evaluate", "list", "--root", projectRoot, "--json"],
      { catalogRoot, fileSystem },
      { stdout: (message) => stdout.push(message), stderr: () => undefined },
    );

    expect(exitCode).toBe(0);
    const evaluations = JSON.parse(stdout.join("\n"));
    expect(evaluations).toHaveLength(1);
    expect(evaluations[0].proposalId).toBe("prop-eval-cli");
  });

  it("lists evaluations with human output", async () => {
    const projectRoot = evaluateProject("list-text");
    const fileSystem = await seedProposal(projectRoot);
    await runCli(
      [
        "evaluate",
        "run",
        "--root",
        projectRoot,
        "--proposal-id",
        "prop-eval-cli",
      ],
      { catalogRoot, fileSystem },
      { stdout: () => undefined, stderr: () => undefined },
    );

    const stdout: string[] = [];
    const exitCode = await runCli(
      ["evaluate", "list", "--root", projectRoot],
      { catalogRoot, fileSystem },
      { stdout: (message) => stdout.push(message), stderr: () => undefined },
    );

    expect(exitCode).toBe(0);
    const output = stdout.join("\n");
    expect(output).toMatch(
      /^- \[eval-prop-eval-cli-\d+\] skill=safe-code-format outcome=passed passed=true$/,
    );
  });

  it("renders empty list text output", async () => {
    const projectRoot = evaluateProject("empty-list");
    const stdout: string[] = [];

    const exitCode = await runCli(
      ["evaluate", "list", "--root", projectRoot],
      { catalogRoot, fileSystem: createMemoryFileSystem() },
      { stdout: (message) => stdout.push(message), stderr: () => undefined },
    );

    expect(exitCode).toBe(0);
    expect(stdout.join("\n")).toBe("");
  });

  it("filters list output by --skill-id", async () => {
    const projectRoot = evaluateProject("skill-filter");
    const fileSystem = await seedProposal(projectRoot);
    await runCli(
      [
        "evaluate",
        "run",
        "--root",
        projectRoot,
        "--proposal-id",
        "prop-eval-cli",
      ],
      { catalogRoot, fileSystem },
      { stdout: () => undefined, stderr: () => undefined },
    );

    const stdout: string[] = [];
    const exitCode = await runCli(
      [
        "evaluate",
        "list",
        "--root",
        projectRoot,
        "--skill-id",
        "safe-code-format",
        "--json",
      ],
      { catalogRoot, fileSystem },
      { stdout: (message) => stdout.push(message), stderr: () => undefined },
    );

    expect(exitCode).toBe(0);
    expect(JSON.parse(stdout.join("\n"))).toHaveLength(1);

    const filteredStdout: string[] = [];
    const filteredExit = await runCli(
      [
        "evaluate",
        "list",
        "--root",
        projectRoot,
        "--skill-id",
        "other-skill",
        "--json",
      ],
      { catalogRoot, fileSystem },
      {
        stdout: (message) => filteredStdout.push(message),
        stderr: () => undefined,
      },
    );

    expect(filteredExit).toBe(0);
    expect(JSON.parse(filteredStdout.join("\n"))).toHaveLength(0);
  });
});
