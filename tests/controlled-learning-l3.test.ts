import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  createMemoryFileSystem,
  createSkillProposal,
  getSkillProposal,
  listSkillProposals,
  rollbackSkill,
  updateSkillProposalState,
} from "@intentloom/application";
import {
  validateSkillProposal,
  type SkillProposal,
} from "@intentloom/protocol";
import { runCli } from "../packages/cli/src/command.js";

describe("Controlled Agent Learning Candidate L3 — Skill Proposal Lifecycle", () => {
  const proposalData = {
    id: "prop-001",
    name: "auth-guard-pattern",
    version: "1.0.0",
    sourceTaskIds: ["task-101", "task-102"],
    observedPattern: "Repeated JWT validation logic across 3 endpoints",
    confidence: 0.9,
    uncertainty: "May require adapter-specific auth token headers",
    requestedCapabilities: ["auth-middleware"],
    supportedProfiles: ["full-stack", "api"],
    validationExpectations: ["Unit tests for JWT header parsing"],
    privacyImpact: "None. Auth headers are sanitized.",
    trustClass: "agent-generated" as const,
    content: "## Auth Guard Procedure\n1. Intercept request.\n2. Verify token.",
  };

  it("validates skill proposal schema", () => {
    const valid: SkillProposal = {
      schemaVersion: "1",
      id: "prop-001",
      name: "auth-guard-pattern",
      version: "1.0.0",
      state: "proposed",
      sourceTaskIds: ["task-101"],
      observedPattern: "Pattern X",
      confidence: 0.85,
      uncertainty: "Low risk",
      requestedCapabilities: ["auth"],
      supportedProfiles: ["api"],
      validationExpectations: ["Pass unit tests"],
      privacyImpact: "None",
      trustClass: "agent-generated",
      content: "# Instructions",
      createdAt: "2026-07-26T00:00:00.000Z",
      updatedAt: "2026-07-26T00:00:00.000Z",
    };

    const result = validateSkillProposal(valid);
    expect(result.id).toBe("prop-001");
    expect(result.state).toBe("proposed");
    expect(result.confidence).toBe(0.85);

    expect(() =>
      validateSkillProposal({ ...valid, state: "invalid-state" }),
    ).toThrow("invalid state: invalid-state");
  });

  it("creates an inactive proposal stored in .aif/memory/proposals/", async () => {
    const fs = createMemoryFileSystem();
    const created = await createSkillProposal(
      proposalData,
      { root: "/project" },
      fs,
    );

    expect(created.id).toBe("prop-001");
    expect(created.state).toBe("proposed");

    const saved = await getSkillProposal("prop-001", { root: "/project" }, fs);
    expect(saved).not.toBeNull();
    expect(saved?.id).toBe("prop-001");
    expect(saved?.state).toBe("proposed");

    const all = await listSkillProposals({ root: "/project" }, fs);
    expect(all.length).toBe(1);
  });

  it("enforces explicit approval evidence for approved/active states", async () => {
    const fs = createMemoryFileSystem();
    await createSkillProposal(proposalData, { root: "/project" }, fs);

    await expect(
      updateSkillProposalState(
        "prop-001",
        "approved",
        { root: "/project", bypassEvaluationGate: true },
        fs,
      ),
    ).rejects.toThrow(/approvalEvidence/);

    const approved = await updateSkillProposalState(
      "prop-001",
      "approved",
      {
        root: "/project",
        approvalEvidence: "Reviewed and verified by Lead Tech",
        bypassEvaluationGate: true,
      },
      fs,
    );

    expect(approved.state).toBe("approved");
    expect(approved.approvalEvidence).toBe(
      "Reviewed and verified by Lead Tech",
    );
  });

  it("performs deterministic rollback", async () => {
    const fs = createMemoryFileSystem();
    await createSkillProposal(
      { ...proposalData, previousVersion: "0.9.0" },
      { root: "/project" },
      fs,
    );

    const rolledBack = await rollbackSkill(
      "prop-001",
      { root: "/project" },
      fs,
    );
    expect(rolledBack.state).toBe("rolled-back");
    expect(rolledBack.previousVersion).toBe("0.9.0");
  });

  it("executes CLI intentloom proposal commands", async () => {
    const fs = createMemoryFileSystem();

    const createOutput: string[] = [];
    const createExit = await runCli(
      [
        "proposal",
        "create",
        "--root",
        "/project",
        "--json-input",
        JSON.stringify(proposalData),
        "--json",
      ],
      { catalogRoot: resolve("catalog"), fileSystem: fs },
      { stdout: (msg) => createOutput.push(msg), stderr: () => undefined },
    );

    expect(createExit).toBe(0);
    const created = JSON.parse(createOutput.join("\n"));
    expect(created.id).toBe("prop-001");

    // Run evaluation first so evaluation gate passes
    await runCli(
      [
        "evaluate",
        "run",
        "--root",
        "/project",
        "--proposal-id",
        "prop-001",
        "--json",
      ],
      { catalogRoot: resolve("catalog"), fileSystem: fs },
      { stdout: () => undefined, stderr: () => undefined },
    );

    const approveOutput: string[] = [];
    const approveExit = await runCli(
      [
        "proposal",
        "approve",
        "--root",
        "/project",
        "--id",
        "prop-001",
        "--evidence",
        "Manual Security Sign-off",
        "--json",
      ],
      { catalogRoot: resolve("catalog"), fileSystem: fs },
      { stdout: (msg) => approveOutput.push(msg), stderr: () => undefined },
    );

    expect(approveExit).toBe(0);
    const approved = JSON.parse(approveOutput.join("\n"));
    expect(approved.state).toBe("approved");
    expect(approved.approvalEvidence).toBe("Manual Security Sign-off");

    const listOutput: string[] = [];
    const listExit = await runCli(
      ["proposal", "list", "--root", "/project", "--json"],
      { catalogRoot: resolve("catalog"), fileSystem: fs },
      { stdout: (msg) => listOutput.push(msg), stderr: () => undefined },
    );

    expect(listExit).toBe(0);
    const list = JSON.parse(listOutput.join("\n"));
    expect(list.length).toBe(1);
    expect(list[0].id).toBe("prop-001");
  });
});
