import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  applyQualityRemediationPlan,
  computeQualityRemediationDigest,
  prepareQualityRemediationPlan,
  revalidateQualityRemediationPlan,
  rollbackQualityRemediationPlan,
} from "@intentloom/application";
import {
  QUALITY_REMEDIATION_PLAN_SCHEMA_URN,
  type QualityRemediationFileDiff,
  type QualityRemediationProposal,
} from "@intentloom/protocol";
import {
  validateEngineeringQualityRemediationPlan,
  validateQualityRemediationApplyOptions,
} from "@intentloom/validator";

function sha256(content: string): string {
  return createHash("sha256").update(content, "utf8").digest("hex");
}

describe("Engineering Quality Phase Q16: Assisted Remediation", () => {
  const proposal: QualityRemediationProposal = {
    id: "prop-001",
    kind: "decomposition-plan",
    title: "Extract Cohesive Module",
    rationale: "File src/large.ts exceeds physical line limit 250",
    targetFindingIds: ["finding-101"],
    affectedPaths: ["src/large.ts"],
  };

  const beforeContent = "const x = 1;\nconst y = 2;\n";
  const afterContent = "const x = 1;\n";

  const diffs: readonly QualityRemediationFileDiff[] = [
    {
      path: "src/large.ts",
      beforeDigest: sha256(beforeContent),
      afterDigest: sha256(afterContent),
      beforeContent,
      afterContent,
    },
  ];

  it("prepares a valid remediation plan with draft status and content digest", () => {
    const plan = prepareQualityRemediationPlan({
      projectRoot: "/workspace/my-app",
      proposal,
      diffs,
      createdAt: "2026-08-10T12:00:00.000Z",
    });

    expect(plan.schemaVersion).toBe(QUALITY_REMEDIATION_PLAN_SCHEMA_URN);
    expect(plan.status).toBe("draft");
    expect(plan.projectRoot).toBe("/workspace/my-app");
    expect(plan.proposal).toEqual(proposal);
    expect(plan.diffs).toHaveLength(1);

    const expectedDigest = computeQualityRemediationDigest(proposal, diffs);
    expect(plan.contentDigest).toBe(expectedDigest);

    const validated = validateEngineeringQualityRemediationPlan(plan);
    expect(validated.planId).toBe(plan.planId);
  });

  it("revalidates a plan against current file contents and flags stale drift", () => {
    const plan = prepareQualityRemediationPlan({
      projectRoot: "/workspace/my-app",
      proposal,
      diffs,
    });

    const matchingFiles = new Map<string, string>([
      ["src/large.ts", beforeContent],
    ]);
    const validResult = revalidateQualityRemediationPlan(plan, matchingFiles);
    expect(validResult.status).toBe("draft");

    const driftedFiles = new Map<string, string>([
      ["src/large.ts", "const modified = true;\n"],
    ]);
    const staleResult = revalidateQualityRemediationPlan(plan, driftedFiles);
    expect(staleResult.status).toBe("stale");
  });

  it("fails closed when applying a plan without explicit human approval token", () => {
    const plan = prepareQualityRemediationPlan({
      projectRoot: "/workspace/my-app",
      proposal,
      diffs,
    });

    const fileStore = new Map<string, string>([
      ["/workspace/my-app/src/large.ts", beforeContent],
    ]);

    expect(() =>
      applyQualityRemediationPlan(
        {
          projectRoot: "/workspace/my-app",
          plan,
          humanApprovalToken: "invalid-token",
        },
        (p) => fileStore.get(p) ?? "",
        (p, c) => fileStore.set(p, c),
      ),
    ).toThrow(/human approval token mismatch/i);
  });

  it("fails closed when applying a stale remediation plan", () => {
    const plan = prepareQualityRemediationPlan({
      projectRoot: "/workspace/my-app",
      proposal,
      diffs,
    });

    const modifiedFileStore = new Map<string, string>([
      ["/workspace/my-app/src/large.ts", "const changed = true;\n"],
    ]);

    expect(() =>
      applyQualityRemediationPlan(
        {
          projectRoot: "/workspace/my-app",
          plan,
          humanApprovalToken: `approved:${plan.contentDigest}`,
        },
        (p) => modifiedFileStore.get(p) ?? "",
        (p, c) => modifiedFileStore.set(p, c),
      ),
    ).toThrow(/cannot apply stale remediation plan/i);
  });

  it("transactionally applies plan with human approval token and supports rollback", () => {
    const plan = prepareQualityRemediationPlan({
      projectRoot: "/workspace/my-app",
      proposal,
      diffs,
    });

    const targetPath = "/workspace/my-app/src/large.ts";
    const fileStore = new Map<string, string>([[targetPath, beforeContent]]);

    const approvalToken = `approved:${plan.contentDigest}`;
    const { plan: appliedPlan, backups } = applyQualityRemediationPlan(
      {
        projectRoot: "/workspace/my-app",
        plan,
        humanApprovalToken: approvalToken,
      },
      (p) => fileStore.get(p) ?? "",
      (p, c) => fileStore.set(p, c),
    );

    expect(appliedPlan.status).toBe("applied");
    expect(fileStore.get(targetPath)).toBe(afterContent);
    expect(backups.get(targetPath)).toBe(beforeContent);

    const rollbackResult = rollbackQualityRemediationPlan(backups, (p, c) =>
      fileStore.set(p, c),
    );

    expect(rollbackResult.status).toBe("success");
    expect(rollbackResult.restoredFiles).toEqual([targetPath]);
    expect(fileStore.get(targetPath)).toBe(beforeContent);
  });

  it("strictly validates apply options schema boundary", () => {
    const plan = prepareQualityRemediationPlan({
      projectRoot: "/workspace/my-app",
      proposal,
      diffs,
    });

    expect(() =>
      validateQualityRemediationApplyOptions({
        projectRoot: "/workspace/my-app",
        plan,
        humanApprovalToken: 12345,
      }),
    ).toThrow(/remediation apply options\.humanApprovalToken/i);
  });
});
