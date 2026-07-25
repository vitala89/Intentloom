import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  applySkillMutationPlan,
  createMemoryFileSystem,
  createSkillProposal,
  evaluateSkillProposal,
  inspectProceduralMemory,
  listProceduralMemorySummary,
  prepareSkillMutationPlan,
} from "@intentloom/application";
import { runCli } from "../packages/cli/src/command.js";

describe("Controlled Agent Learning Candidate L5 — Accepted Procedural Memory Operations", () => {
  const proposalData = {
    id: "prop-l5-001",
    name: "refactor-helper",
    version: "1.0.0",
    sourceTaskIds: ["task-301"],
    observedPattern: "Extracts refactored helpers",
    confidence: 0.9,
    uncertainty: "None",
    requestedCapabilities: ["refactoring"],
    supportedProfiles: ["all"],
    validationExpectations: ["Clean build"],
    privacyImpact: "None",
    trustClass: "verified-evidence" as const,
    content:
      "## Refactor Procedure\n1. Identify duplicate code.\n2. Extract function.",
  };

  it("aggregates procedural memory summary statistics", async () => {
    const fs = createMemoryFileSystem();
    await createSkillProposal(proposalData, { root: "/project" }, fs);
    await evaluateSkillProposal("prop-l5-001", { root: "/project" }, fs);

    const summary = await listProceduralMemorySummary({ root: "/project" }, fs);
    expect(summary.totalProposals).toBe(1);
    expect(summary.totalEvaluations).toBe(1);
    expect(summary.evaluationPassRate).toBe(100);
    expect(summary.extensionLockStatus).toBe("unverified");
  });

  it("inspects procedural memory and reports lock/evaluation issues", async () => {
    const fs = createMemoryFileSystem();
    await createSkillProposal(proposalData, { root: "/project" }, fs);

    const inspection = await inspectProceduralMemory({ root: "/project" }, fs);
    expect(inspection.summary.totalProposals).toBe(1);
    expect(inspection.issues.length).toBeGreaterThan(0);
    expect(inspection.issues.some((i) => i.includes("missing"))).toBe(true);

    // Create lock file
    await fs.mkdir("/project/.aif/memory");
    await fs.write(
      "/project/.aif/memory/lock.json",
      JSON.stringify({ locked: true }),
    );

    const updatedInspection = await inspectProceduralMemory(
      { root: "/project" },
      fs,
    );
    expect(updatedInspection.summary.extensionLockStatus).toBe("clean");
  });

  it("prepares and applies a skill mutation plan atomically", async () => {
    const fs = createMemoryFileSystem();
    await createSkillProposal(proposalData, { root: "/project" }, fs);
    await evaluateSkillProposal("prop-l5-001", { root: "/project" }, fs);

    const plan = await prepareSkillMutationPlan(
      {
        root: "/project",
        action: "approve",
        proposalId: "prop-l5-001",
        approvalEvidence: "Tech Lead Approval",
      },
      fs,
    );

    expect(plan.action).toBe("approve");
    expect(plan.targetState).toBe("approved");
    expect(plan.checksum.length).toBeGreaterThan(0);

    const applied = await applySkillMutationPlan(
      plan,
      { root: "/project" },
      fs,
    );
    expect(applied.state).toBe("approved");
    expect(applied.approvalEvidence).toBe("Tech Lead Approval");
  });

  it("executes CLI intentloom memory inspect and proposal plan/apply commands", async () => {
    const fs = createMemoryFileSystem();
    await createSkillProposal(proposalData, { root: "/project" }, fs);
    await evaluateSkillProposal("prop-l5-001", { root: "/project" }, fs);

    const inspectOutput: string[] = [];
    const inspectExit = await runCli(
      ["memory", "inspect", "--root", "/project", "--json"],
      { catalogRoot: resolve("catalog"), fileSystem: fs },
      { stdout: (msg) => inspectOutput.push(msg), stderr: () => undefined },
    );

    expect(inspectExit).toBe(0);
    const inspection = JSON.parse(inspectOutput.join("\n"));
    expect(inspection.summary.totalProposals).toBe(1);

    const planOutput: string[] = [];
    const planExit = await runCli(
      [
        "proposal",
        "plan",
        "--root",
        "/project",
        "--action",
        "approve",
        "--id",
        "prop-l5-001",
        "--evidence",
        "CLI Evidence Signoff",
        "--output",
        ".aif/memory/plan.json",
        "--json",
      ],
      { catalogRoot: resolve("catalog"), fileSystem: fs },
      { stdout: (msg) => planOutput.push(msg), stderr: () => undefined },
    );

    expect(planExit).toBe(0);
    const plan = JSON.parse(planOutput.join("\n").trim());
    expect(plan.targetState).toBe("approved");

    const applyOutput: string[] = [];
    const applyExit = await runCli(
      [
        "proposal",
        "apply",
        "--root",
        "/project",
        "--plan-file",
        ".aif/memory/plan.json",
        "--json",
      ],
      { catalogRoot: resolve("catalog"), fileSystem: fs },
      { stdout: (msg) => applyOutput.push(msg), stderr: () => undefined },
    );

    expect(applyExit).toBe(0);
    const applied = JSON.parse(applyOutput.join("\n"));
    expect(applied.state).toBe("approved");
    expect(applied.approvalEvidence).toBe("CLI Evidence Signoff");
  });
});
