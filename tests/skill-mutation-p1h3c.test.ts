import { createHash } from "node:crypto";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  applySkillMutationPlan,
  createMemoryFileSystem,
  createSkillProposal,
  getSkillProposal,
  prepareSkillMutationPlan,
  rollbackSkill,
  updateSkillProposalState,
  type FileSystem,
} from "@intentloom/application";
import type { SkillEvaluationResult } from "@intentloom/protocol";

function proposalInput(
  id: string,
  overrides: Record<string, unknown> = {},
): Parameters<typeof createSkillProposal>[0] {
  return {
    id,
    name: `${id}-name`,
    version: "1.0.0",
    sourceTaskIds: ["task-1"],
    observedPattern: "Repeated procedure",
    confidence: 0.8,
    uncertainty: "Low",
    requestedCapabilities: ["read"],
    supportedProfiles: ["api"],
    validationExpectations: ["Tests pass"],
    privacyImpact: "None",
    trustClass: "agent-generated",
    content: "abcd",
    ...overrides,
  };
}

function evaluationRecord(
  id: string,
  overrides: Partial<SkillEvaluationResult> = {},
): SkillEvaluationResult {
  return {
    schemaVersion: "1",
    id,
    skillId: "alpha-name",
    proposalId: "alpha",
    outcome: "passed",
    passed: true,
    contextCost: 1,
    toolSelectionScore: 1,
    capabilityScore: 1,
    securityPass: true,
    details: ["Security checks passed"],
    provenance: {
      runtime: "node-v22",
      provider: "local-evaluator",
      model: "eval-gate-v1",
      environment: "test-harness",
    },
    evaluatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function storeEvaluation(
  fs: ReturnType<typeof createMemoryFileSystem>,
  record: SkillEvaluationResult,
): void {
  fs.files.set(
    `/project/.aif/memory/evaluations/${record.id}.json`,
    `${JSON.stringify(record, null, 2)}\n`,
  );
}

function checksum(payload: string): string {
  return createHash("sha256").update(payload).digest("hex");
}

function projectPath(relativePath: string): string {
  return resolve("/project", relativePath);
}

function isMutationLogPath(path: string): boolean {
  return path.replaceAll("\\", "/").includes("/.aif/memory/mutations/");
}

describe("P1H.3c skill mutation extraction", () => {
  it("requires evidence for approval and activation and preserves the other transitions", async () => {
    const fs = createMemoryFileSystem();
    await createSkillProposal(
      proposalInput("alpha", {
        approvalEvidence: "original",
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      }),
      { root: "/project" },
      fs,
    );
    storeEvaluation(fs, evaluationRecord("eval-pass"));

    await expect(
      updateSkillProposalState(
        "alpha",
        "approved",
        { root: "/project", approvalEvidence: "   " },
        fs,
      ),
    ).rejects.toThrow(
      "Transitioning proposal alpha to approved requires non-empty approvalEvidence",
    );
    await expect(
      updateSkillProposalState("alpha", "active", { root: "/project" }, fs),
    ).rejects.toThrow(
      "Transitioning proposal alpha to active requires non-empty approvalEvidence",
    );
    await expect(
      updateSkillProposalState(
        "missing",
        "deprecated",
        { root: "/project" },
        fs,
      ),
    ).rejects.toThrow("Skill proposal not found: missing");
    await expect(
      updateSkillProposalState(
        "../../../../outside",
        "deprecated",
        { root: "/project" },
        fs,
      ),
    ).rejects.toThrow("path traversal:");

    const deprecated = await updateSkillProposalState(
      "alpha",
      "deprecated",
      { root: "/project" },
      fs,
    );
    expect(deprecated.state).toBe("deprecated");
    expect(deprecated.approvalEvidence).toBe("original");
    expect(deprecated.updatedAt).not.toBe("2026-01-01T00:00:00.000Z");
    expect(fs.files.get("/project/.aif/memory/proposals/alpha.json")).toBe(
      `${JSON.stringify(deprecated, null, 2)}\n`,
    );

    const replaced = await updateSkillProposalState(
      "alpha",
      "deprecated",
      { root: "/project", approvalEvidence: "replacement" },
      fs,
    );
    expect(replaced.approvalEvidence).toBe("replacement");
  });

  it("keeps the evaluation gate, latest-match rule, and bypass flag", async () => {
    const fs = createMemoryFileSystem();
    await createSkillProposal(proposalInput("alpha"), { root: "/project" }, fs);

    await expect(
      updateSkillProposalState(
        "alpha",
        "active",
        { root: "/project", approvalEvidence: "Reviewed" },
        fs,
      ),
    ).rejects.toThrow(
      "Activation blocked: skill proposal alpha has no evaluation records",
    );

    storeEvaluation(
      fs,
      evaluationRecord("eval-old-pass", {
        evaluatedAt: "2026-01-01T00:00:00.000Z",
        outcome: "passed",
        passed: true,
        securityPass: true,
      }),
    );
    storeEvaluation(
      fs,
      evaluationRecord("eval-new-fail", {
        evaluatedAt: "2026-02-01T00:00:00.000Z",
        outcome: "ambiguous",
        passed: false,
        securityPass: true,
      }),
    );
    await expect(
      updateSkillProposalState(
        "alpha",
        "approved",
        { root: "/project", approvalEvidence: "Reviewed" },
        fs,
      ),
    ).rejects.toThrow(
      "Activation blocked: skill proposal alpha evaluation outcome is ambiguous",
    );

    storeEvaluation(
      fs,
      evaluationRecord("eval-unsafe", {
        proposalId: "unsafe",
        skillId: "unsafe",
        evaluatedAt: "2026-03-01T00:00:00.000Z",
        outcome: "unsafe",
        passed: false,
        securityPass: false,
      }),
    );
    await createSkillProposal(
      proposalInput("unsafe"),
      { root: "/project" },
      fs,
    );
    await expect(
      updateSkillProposalState(
        "unsafe",
        "active",
        { root: "/project", approvalEvidence: "Reviewed" },
        fs,
      ),
    ).rejects.toThrow(
      "Activation blocked: skill proposal unsafe evaluation outcome is unsafe",
    );

    storeEvaluation(
      fs,
      evaluationRecord("eval-regressed", {
        proposalId: "regressed",
        skillId: "regressed-name",
        evaluatedAt: "2026-03-01T00:00:00.000Z",
        outcome: "regressed",
        passed: true,
        securityPass: true,
      }),
    );
    await createSkillProposal(
      proposalInput("regressed"),
      { root: "/project" },
      fs,
    );
    await expect(
      updateSkillProposalState(
        "regressed",
        "approved",
        { root: "/project", approvalEvidence: "Reviewed" },
        fs,
      ),
    ).rejects.toThrow(
      "Activation blocked: skill proposal regressed evaluation outcome is regressed",
    );

    storeEvaluation(
      fs,
      evaluationRecord("eval-by-id", {
        proposalId: "other",
        skillId: "matched",
        evaluatedAt: "2026-04-01T00:00:00.000Z",
        outcome: "improved",
        passed: true,
        securityPass: true,
      }),
    );
    await createSkillProposal(
      proposalInput("matched"),
      { root: "/project" },
      fs,
    );
    const bySkillId = await updateSkillProposalState(
      "matched",
      "approved",
      { root: "/project", approvalEvidence: "Matched by skill id" },
      fs,
    );
    expect(bySkillId.state).toBe("approved");

    const bypassed = await updateSkillProposalState(
      "alpha",
      "active",
      {
        root: "/project",
        approvalEvidence: "Bypass",
        bypassEvaluationGate: true,
      },
      fs,
    );
    expect(bypassed.state).toBe("active");
    expect(bypassed.approvalEvidence).toBe("Bypass");
  });

  it("rolls a proposal back without evidence, an evaluation, or a skill file restore", async () => {
    const fs = createMemoryFileSystem({
      "/project/skills/alpha/SKILL.md": "original skill",
    });
    await createSkillProposal(
      proposalInput("alpha", { approvalEvidence: "kept" }),
      { root: "/project" },
      fs,
    );

    const rolledBack = await rollbackSkill("alpha", { root: "/project" }, fs);
    expect(rolledBack.state).toBe("rolled-back");
    expect(rolledBack.approvalEvidence).toBe("kept");
    expect(fs.files.get("/project/skills/alpha/SKILL.md")).toBe(
      "original skill",
    );

    const evidenced = await rollbackSkill(
      "alpha",
      { root: "/project", approvalEvidence: "optional note" },
      fs,
    );
    expect(evidenced.state).toBe("rolled-back");
    expect(evidenced.approvalEvidence).toBe("optional note");
    await expect(
      rollbackSkill("missing", { root: "/project" }, fs),
    ).rejects.toThrow("Skill proposal not found: missing");
  });

  it("builds a read-only mutation plan with the existing checksum payload", async () => {
    const fs = createMemoryFileSystem();
    await createSkillProposal(proposalInput("alpha"), { root: "/project" }, fs);
    const before = [...fs.files.keys()];
    const actions = [
      ["approve", "approved"],
      ["activate", "active"],
      ["deprecate", "deprecated"],
      ["rollback", "rolled-back"],
    ] as const;

    for (const [action, targetState] of actions) {
      const plan = await prepareSkillMutationPlan(
        {
          root: "/project",
          action,
          proposalId: "alpha",
          approvalEvidence: "Reviewed",
        },
        fs,
      );
      expect(plan.targetState).toBe(targetState);
      expect(plan.checksum).toBe(
        checksum(
          `${plan.id}:${action}:alpha:${targetState}:${plan.approvalEvidence ?? ""}`,
        ),
      );
    }

    const withoutEvidence = await prepareSkillMutationPlan(
      { root: "/project", action: "deprecate", proposalId: "alpha" },
      fs,
    );
    expect(withoutEvidence.approvalEvidence).toBeUndefined();
    expect(withoutEvidence.checksum).toBe(
      checksum(`${withoutEvidence.id}:deprecate:alpha:deprecated:`),
    );
    expect([...fs.files.keys()]).toEqual(before);
    expect(
      (await getSkillProposal("alpha", { root: "/project" }, fs))?.state,
    ).toBe("proposed");
    await expect(
      prepareSkillMutationPlan(
        { root: "/project", action: "deprecate", proposalId: "missing" },
        fs,
      ),
    ).rejects.toThrow("Skill proposal not found: missing");
  });

  it("validates a plan, then writes the mutation log after the state change", async () => {
    const fs = createMemoryFileSystem();
    await createSkillProposal(proposalInput("alpha"), { root: "/project" }, fs);
    storeEvaluation(fs, evaluationRecord("eval-pass"));
    const plan = await prepareSkillMutationPlan(
      {
        root: "/project",
        action: "approve",
        proposalId: "alpha",
        approvalEvidence: "Reviewed",
      },
      fs,
    );

    await expect(
      applySkillMutationPlan({ schemaVersion: "2" }, { root: "/project" }, fs),
    ).rejects.toThrow("unsupported skill mutation plan schema version");
    expect(
      (await getSkillProposal("alpha", { root: "/project" }, fs))?.state,
    ).toBe("proposed");

    const mismatched = {
      ...plan,
      action: "approve" as const,
      targetState: "deprecated" as const,
      checksum: "not-recomputed",
    };
    const writes: string[] = [];
    const recording: FileSystem = {
      ...fs,
      async write(path, content) {
        writes.push(path);
        await fs.write(path, content);
      },
    };
    const applied = await applySkillMutationPlan(
      mismatched,
      { root: "/project" },
      recording,
    );
    expect(applied.state).toBe("deprecated");
    expect(writes).toEqual([
      projectPath(".aif/memory/proposals/alpha.json"),
      projectPath(`.aif/memory/mutations/${plan.id}.json`),
    ]);
    const logged = await fs.read(writes[1]!);
    expect(logged.endsWith("\n")).toBe(true);
    expect(JSON.parse(logged)).toEqual({
      schemaVersion: "1",
      id: plan.id,
      action: "approve",
      proposalId: "alpha",
      targetState: "deprecated",
      approvalEvidence: "Reviewed",
      checksum: "not-recomputed",
      createdAt: plan.createdAt,
    });
  });

  it("leaves the updated proposal in place when the mutation log write fails first", async () => {
    const fs = createMemoryFileSystem();
    await createSkillProposal(proposalInput("beta"), { root: "/project" }, fs);
    const plan = await prepareSkillMutationPlan(
      {
        root: "/project",
        action: "deprecate",
        proposalId: "beta",
      },
      fs,
    );
    const failing: FileSystem = {
      ...fs,
      async write(path, content) {
        if (isMutationLogPath(path)) {
          throw new Error("mutation log write failed");
        }
        await fs.write(path, content);
      },
    };
    await expect(
      applySkillMutationPlan(plan, { root: "/project" }, failing),
    ).rejects.toThrow("mutation log write failed");
    expect(
      (await getSkillProposal("beta", { root: "/project" }, fs))?.state,
    ).toBe("deprecated");
    expect([...fs.files.keys()].some(isMutationLogPath)).toBe(false);

    await createSkillProposal(proposalInput("gamma"), { root: "/project" }, fs);
    const rollbackPlan = await prepareSkillMutationPlan(
      { root: "/project", action: "rollback", proposalId: "gamma" },
      fs,
    );
    await expect(
      applySkillMutationPlan(
        { ...rollbackPlan, targetState: "active", checksum: "not-recomputed" },
        { root: "/project" },
        failing,
      ),
    ).rejects.toThrow("mutation log write failed");
    expect(
      (await getSkillProposal("gamma", { root: "/project" }, fs))?.state,
    ).toBe("rolled-back");
    expect([...fs.files.keys()].some(isMutationLogPath)).toBe(false);
  });
});
