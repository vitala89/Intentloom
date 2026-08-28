import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { createMemoryFileSystem } from "@intentloom/application";
import { runCli } from "../packages/cli/src/command.js";
import { runCliEntry } from "../packages/cli/src/cli-entry.js";

const catalogRoot = resolve("catalog");

const proposalData = {
  id: "prop-cli-parity",
  name: "auth-guard-pattern",
  version: "1.0.0",
  sourceTaskIds: ["task-101"],
  observedPattern: "Repeated JWT validation logic across endpoints",
  confidence: 0.9,
  uncertainty: "May require adapter-specific auth token headers",
  requestedCapabilities: ["auth-middleware"],
  supportedProfiles: ["full-stack"],
  validationExpectations: ["Unit tests for JWT header parsing"],
  privacyImpact: "None. Auth headers are sanitized.",
  trustClass: "agent-generated" as const,
  content: "## Auth Guard Procedure\n1. Intercept request.\n2. Verify token.",
};

function proposalProject(name: string): string {
  return `/project/proposal-${name}`;
}

describe("proposal CLI extraction", () => {
  it("dispatches proposal through runCliEntry", async () => {
    const projectRoot = proposalProject("entry-dispatch");
    const fileSystem = createMemoryFileSystem();
    const stdout: string[] = [];

    const exitCode = await runCliEntry(
      [
        "proposal",
        "create",
        "--root",
        projectRoot,
        "--json-input",
        JSON.stringify(proposalData),
        "--json",
      ],
      { catalogRoot, fileSystem },
      { stdout: (message) => stdout.push(message), stderr: () => undefined },
    );

    expect(exitCode).toBe(0);
    expect(JSON.parse(stdout.join("\n")).id).toBe("prop-cli-parity");
  });

  it("requires list, get, create, approve, plan, or apply subcommand", async () => {
    const stderr: string[] = [];

    const exitCode = await runCli(
      ["proposal"],
      { catalogRoot, fileSystem: createMemoryFileSystem() },
      { stdout: () => undefined, stderr: (message) => stderr.push(message) },
    );

    expect(exitCode).toBe(2);
    expect(stderr.join("\n")).toBe(
      "proposal requires list, get, create, approve, plan, or apply subcommand",
    );
  });

  it("rejects unsupported subcommands", async () => {
    const stderr: string[] = [];

    const exitCode = await runCli(
      ["proposal", "archive"],
      { catalogRoot, fileSystem: createMemoryFileSystem() },
      { stdout: () => undefined, stderr: (message) => stderr.push(message) },
    );

    expect(exitCode).toBe(2);
    expect(stderr.join("\n")).toBe(
      "proposal requires list, get, create, approve, plan, or apply subcommand",
    );
  });

  it("rejects unknown options", async () => {
    const stderr: string[] = [];

    const exitCode = await runCli(
      ["proposal", "list", "--unknown"],
      { catalogRoot, fileSystem: createMemoryFileSystem() },
      { stdout: () => undefined, stderr: (message) => stderr.push(message) },
    );

    expect(exitCode).toBe(2);
    expect(stderr.join("\n")).toBe("unknown option: --unknown");
  });

  it("rejects missing option values", async () => {
    const stderr: string[] = [];

    const exitCode = await runCli(
      ["proposal", "get", "--id"],
      { catalogRoot, fileSystem: createMemoryFileSystem() },
      { stdout: () => undefined, stderr: (message) => stderr.push(message) },
    );

    expect(exitCode).toBe(2);
    expect(stderr.join("\n")).toBe("missing value for --id");
  });

  it("rejects duplicate --root", async () => {
    const stderr: string[] = [];

    const exitCode = await runCli(
      ["proposal", "list", "--root", "/first", "--root", "/second"],
      { catalogRoot, fileSystem: createMemoryFileSystem() },
      { stdout: () => undefined, stderr: (message) => stderr.push(message) },
    );

    expect(exitCode).toBe(2);
    expect(stderr.join("\n")).toBe("project path specified more than once");
  });

  it("rejects unexpected positional arguments", async () => {
    const stderr: string[] = [];

    const exitCode = await runCli(
      ["proposal", "list", "extra"],
      { catalogRoot, fileSystem: createMemoryFileSystem() },
      { stdout: () => undefined, stderr: (message) => stderr.push(message) },
    );

    expect(exitCode).toBe(2);
    expect(stderr.join("\n")).toBe("unexpected argument: extra");
  });

  it("rejects --force", async () => {
    const stderr: string[] = [];

    const exitCode = await runCli(
      ["proposal", "list", "--force"],
      { catalogRoot, fileSystem: createMemoryFileSystem() },
      { stdout: () => undefined, stderr: (message) => stderr.push(message) },
    );

    expect(exitCode).toBe(2);
    expect(stderr.join("\n")).toBe("--force is only valid with sync");
  });

  it("rejects adoption mapping flags", async () => {
    const stderr: string[] = [];

    const exitCode = await runCli(
      ["proposal", "list", "--project-owned-mapping", "src/**"],
      { catalogRoot, fileSystem: createMemoryFileSystem() },
      { stdout: () => undefined, stderr: (message) => stderr.push(message) },
    );

    expect(exitCode).toBe(2);
    expect(stderr.join("\n")).toBe(
      "adoption mappings are only valid with init or adopt",
    );
  });

  it("creates, lists, gets, approves, plans, and applies proposals", async () => {
    const projectRoot = proposalProject("lifecycle");
    const fileSystem = createMemoryFileSystem();

    const createExit = await runCli(
      [
        "proposal",
        "create",
        "--root",
        projectRoot,
        "--json-input",
        JSON.stringify(proposalData),
        "--json",
      ],
      { catalogRoot, fileSystem },
      { stdout: () => undefined, stderr: () => undefined },
    );
    expect(createExit).toBe(0);

    await runCli(
      [
        "evaluate",
        "run",
        "--root",
        projectRoot,
        "--proposal-id",
        "prop-cli-parity",
        "--json",
      ],
      { catalogRoot, fileSystem },
      { stdout: () => undefined, stderr: () => undefined },
    );

    const listOutput: string[] = [];
    const listExit = await runCli(
      ["proposal", "list", "--root", projectRoot, "--json"],
      { catalogRoot, fileSystem },
      {
        stdout: (message) => listOutput.push(message),
        stderr: () => undefined,
      },
    );
    expect(listExit).toBe(0);
    const list = JSON.parse(listOutput.join("\n"));
    expect(list).toHaveLength(1);
    expect(list[0].id).toBe("prop-cli-parity");

    const getOutput: string[] = [];
    const getExit = await runCli(
      [
        "proposal",
        "get",
        "--root",
        projectRoot,
        "--id",
        "prop-cli-parity",
        "--json",
      ],
      { catalogRoot, fileSystem },
      { stdout: (message) => getOutput.push(message), stderr: () => undefined },
    );
    expect(getExit).toBe(0);
    expect(JSON.parse(getOutput.join("\n")).state).toBe("proposed");

    const planOutput: string[] = [];
    const planExit = await runCli(
      [
        "proposal",
        "plan",
        "--root",
        projectRoot,
        "--action",
        "approve",
        "--id",
        "prop-cli-parity",
        "--evidence",
        "CLI Evidence Signoff",
        "--output",
        ".aif/memory/plan.json",
        "--json",
      ],
      { catalogRoot, fileSystem },
      {
        stdout: (message) => planOutput.push(message),
        stderr: () => undefined,
      },
    );
    expect(planExit).toBe(0);
    expect(JSON.parse(planOutput.join("\n").trim()).targetState).toBe(
      "approved",
    );

    const applyOutput: string[] = [];
    const applyExit = await runCli(
      [
        "proposal",
        "apply",
        "--root",
        projectRoot,
        "--plan-file",
        ".aif/memory/plan.json",
        "--json",
      ],
      { catalogRoot, fileSystem },
      {
        stdout: (message) => applyOutput.push(message),
        stderr: () => undefined,
      },
    );
    expect(applyExit).toBe(0);
    const applied = JSON.parse(applyOutput.join("\n"));
    expect(applied.state).toBe("approved");
    expect(applied.approvalEvidence).toBe("CLI Evidence Signoff");
  });

  it("renders empty list text output", async () => {
    const projectRoot = proposalProject("empty-list");
    const stdout: string[] = [];

    const exitCode = await runCli(
      ["proposal", "list", "--root", projectRoot],
      { catalogRoot, fileSystem: createMemoryFileSystem() },
      { stdout: (message) => stdout.push(message), stderr: () => undefined },
    );

    expect(exitCode).toBe(0);
    expect(stdout.join("\n")).toBe("");
  });

  it("returns exit 3 when proposal is not found", async () => {
    const projectRoot = proposalProject("missing");
    const stderr: string[] = [];

    const exitCode = await runCli(
      ["proposal", "get", "--root", projectRoot, "--id", "missing-id"],
      { catalogRoot, fileSystem: createMemoryFileSystem() },
      { stdout: () => undefined, stderr: (message) => stderr.push(message) },
    );

    expect(exitCode).toBe(3);
    expect(stderr.join("\n")).toBe("Proposal not found: missing-id\n");
  });

  it("requires --id for proposal get when no positional id token exists", async () => {
    const stderr: string[] = [];

    const exitCode = await runCli(
      ["proposal", "get"],
      { catalogRoot, fileSystem: createMemoryFileSystem() },
      { stdout: () => undefined, stderr: (message) => stderr.push(message) },
    );

    expect(exitCode).toBe(2);
    expect(stderr.join("\n")).toBe("proposal get requires --id <id>");
  });

  it("requires json input or file for proposal create", async () => {
    const stderr: string[] = [];

    const exitCode = await runCli(
      ["proposal", "create", "--root", "/project"],
      { catalogRoot, fileSystem: createMemoryFileSystem() },
      { stdout: () => undefined, stderr: (message) => stderr.push(message) },
    );

    expect(exitCode).toBe(2);
    expect(stderr.join("\n")).toBe(
      "proposal create requires --json-input <json> or --file <path>",
    );
  });

  it("creates proposal from --file input", async () => {
    const projectRoot = proposalProject("file-input");
    const fileSystem = createMemoryFileSystem({
      [join(projectRoot, "input/proposal.json")]: JSON.stringify(proposalData),
    });
    const stdout: string[] = [];

    const exitCode = await runCli(
      [
        "proposal",
        "create",
        "--root",
        projectRoot,
        "--file",
        "input/proposal.json",
        "--json",
      ],
      { catalogRoot, fileSystem },
      { stdout: (message) => stdout.push(message), stderr: () => undefined },
    );

    expect(exitCode).toBe(0);
    expect(JSON.parse(stdout.join("\n")).id).toBe("prop-cli-parity");
  });

  it("approves proposal with explicit evidence", async () => {
    const projectRoot = proposalProject("approve");
    const fileSystem = createMemoryFileSystem();

    await runCli(
      [
        "proposal",
        "create",
        "--root",
        projectRoot,
        "--json-input",
        JSON.stringify({ ...proposalData, id: "prop-approve" }),
      ],
      { catalogRoot, fileSystem },
      { stdout: () => undefined, stderr: () => undefined },
    );
    await runCli(
      [
        "evaluate",
        "run",
        "--root",
        projectRoot,
        "--proposal-id",
        "prop-approve",
      ],
      { catalogRoot, fileSystem },
      { stdout: () => undefined, stderr: () => undefined },
    );

    const stdout: string[] = [];
    const exitCode = await runCli(
      [
        "proposal",
        "approve",
        "--root",
        projectRoot,
        "--id",
        "prop-approve",
        "--evidence",
        "Manual Security Sign-off",
        "--json",
      ],
      { catalogRoot, fileSystem },
      { stdout: (message) => stdout.push(message), stderr: () => undefined },
    );

    expect(exitCode).toBe(0);
    const approved = JSON.parse(stdout.join("\n"));
    expect(approved.state).toBe("approved");
    expect(approved.approvalEvidence).toBe("Manual Security Sign-off");
  });

  it("requires id and evidence for proposal approve", async () => {
    const stderr: string[] = [];

    const exitCode = await runCli(
      ["proposal", "approve", "--root", "/project", "--id", "prop-001"],
      { catalogRoot, fileSystem: createMemoryFileSystem() },
      { stdout: () => undefined, stderr: (message) => stderr.push(message) },
    );

    expect(exitCode).toBe(2);
    expect(stderr.join("\n")).toBe(
      "proposal approve requires --id <id> and --evidence <evidence>",
    );
  });

  it("requires action and id for proposal plan", async () => {
    const stderr: string[] = [];

    const exitCode = await runCli(
      ["proposal", "plan"],
      { catalogRoot, fileSystem: createMemoryFileSystem() },
      { stdout: () => undefined, stderr: (message) => stderr.push(message) },
    );

    expect(exitCode).toBe(2);
    expect(stderr.join("\n")).toBe(
      "proposal plan requires --action <approve|activate|deprecate|rollback> and --id <id>",
    );
  });

  it("requires plan-file for proposal apply", async () => {
    const stderr: string[] = [];

    const exitCode = await runCli(
      ["proposal", "apply"],
      { catalogRoot, fileSystem: createMemoryFileSystem() },
      { stdout: () => undefined, stderr: (message) => stderr.push(message) },
    );

    expect(exitCode).toBe(2);
    expect(stderr.join("\n")).toBe(
      "proposal apply requires --plan-file <path>",
    );
  });

  it("returns exit 3 when plan file is not found for apply", async () => {
    const projectRoot = proposalProject("missing-plan");
    const stderr: string[] = [];

    const exitCode = await runCli(
      [
        "proposal",
        "apply",
        "--root",
        projectRoot,
        "--plan-file",
        "missing-plan.json",
      ],
      { catalogRoot, fileSystem: createMemoryFileSystem() },
      { stdout: () => undefined, stderr: (message) => stderr.push(message) },
    );

    expect(exitCode).toBe(3);
    expect(stderr.join("\n")).toBe(
      "Skill mutation plan file not found: missing-plan.json\n",
    );
  });

  it("filters list output by state and trust-class", async () => {
    const projectRoot = proposalProject("filters");
    const fileSystem = createMemoryFileSystem();

    await runCli(
      [
        "proposal",
        "create",
        "--root",
        projectRoot,
        "--json-input",
        JSON.stringify({
          ...proposalData,
          id: "prop-filter-a",
          trustClass: "verified-evidence",
        }),
      ],
      { catalogRoot, fileSystem },
      { stdout: () => undefined, stderr: () => undefined },
    );
    await runCli(
      [
        "proposal",
        "create",
        "--root",
        projectRoot,
        "--json-input",
        JSON.stringify({
          ...proposalData,
          id: "prop-filter-b",
          trustClass: "agent-generated",
        }),
      ],
      { catalogRoot, fileSystem },
      { stdout: () => undefined, stderr: () => undefined },
    );

    const stdout: string[] = [];
    const exitCode = await runCli(
      [
        "proposal",
        "list",
        "--root",
        projectRoot,
        "--trust-class",
        "verified-evidence",
        "--json",
      ],
      { catalogRoot, fileSystem },
      { stdout: (message) => stdout.push(message), stderr: () => undefined },
    );

    expect(exitCode).toBe(0);
    const list = JSON.parse(stdout.join("\n"));
    expect(list).toHaveLength(1);
    expect(list[0].id).toBe("prop-filter-a");
  });
});
