import { describe, expect, it } from "vitest";
import {
  approveEngineeringQualityBaseline,
  checkEngineeringQuality,
  compareEngineeringQualityRatchet,
  measureEngineeringArtifact,
  prepareEngineeringQualityBaseline,
  reduceEngineeringQualityBaseline,
} from "@intentloom/application";
import {
  QUALITY_BASELINE_PREVIEW_SCHEMA_URN,
  type EngineeringQualityFinding,
} from "@intentloom/protocol";
import {
  validateEngineeringQualityBaselinePreview,
  validateEngineeringQualityBaseline,
} from "@intentloom/validator";

const policy = {
  schemaVersion: "urn:intentloom:schema:engineering-quality-policy:1" as const,
  policyId: "quality-balanced",
  profileName: "legacy-ratchet" as const,
  defaultRules: [
    {
      id: "rule-file-lines",
      name: "File lines",
      description: "Keeps physical lines within the configured budget",
      category: "maintainability" as const,
      severity: "error" as const,
      applicableClassifications: ["hand-written-production" as const],
      thresholds: [
        { level: "preferred" as const, maxPhysicalLines: 3 },
        { level: "hard" as const, maxPhysicalLines: 10 },
      ],
    },
  ],
};

function finding(
  content: string,
  path = "src/legacy.ts",
): EngineeringQualityFinding {
  return checkEngineeringQuality({ path, content, policy })[0]!;
}

function baselineFor(
  currentFinding: EngineeringQualityFinding,
  options: { expiresAt?: number } = {},
) {
  const preview = prepareEngineeringQualityBaseline({
    projectId: "project-1",
    policyId: policy.policyId,
    policyVersion: "1.0.0",
    ruleVersions: { "rule-file-lines": "1.0.0" },
    findings: [currentFinding],
    reason: "Reviewed legacy debt",
    owner: "platform",
    createdAt: 1_000,
    expiresAt: options.expiresAt,
  });
  return {
    preview,
    baseline: approveEngineeringQualityBaseline(preview, {
      approvedBy: "maintainer",
      approvedAt: 1_001,
    }),
  };
}

describe("Engineering Quality Baseline and Ratchet (Phase Q3)", () => {
  it("previews debt and requires explicit approval", () => {
    const current = finding("1\n2\n3\n4\n5");
    const { preview } = baselineFor(current);

    expect(preview.approvalRequired).toBe(true);
    expect(preview.candidateItems).toHaveLength(1);
    expect((preview as { approvedBy?: string }).approvedBy).toBeUndefined();
    expect(() =>
      validateEngineeringQualityBaselinePreview({
        ...preview,
        approvalRequired: false,
      }),
    ).toThrow(/explicit approval/);
  });

  it("creates an approved baseline with policy and approval evidence", () => {
    const current = finding("1\n2\n3\n4\n5");
    const { baseline } = baselineFor(current);

    expect(baseline.policyId).toBe(policy.policyId);
    expect(baseline.approvedBy).toBe("maintainer");
    expect(baseline.items[0]!.ruleVersion).toBe("1.0.0");
    expect(validateEngineeringQualityBaseline(baseline).items).toHaveLength(1);
  });

  it("passes untouched debt and converts it to legacy-baseline state", () => {
    const current = finding("1\n2\n3\n4\n5");
    const { baseline } = baselineFor(current);
    const result = compareEngineeringQualityRatchet({
      baseline,
      findings: [current],
      now: 1_002,
    });

    expect(result.status).toBe("passed");
    expect(result.legacyFindings[0]!.state).toBe("legacy-baseline");
    expect(result.newViolations).toHaveLength(0);
    expect(result.growthViolations).toHaveLength(0);
  });

  it("fails new violations and growth beyond zero allowance", () => {
    const current = finding("1\n2\n3\n4\n5");
    const { baseline } = baselineFor(current);
    const grown = finding("1\n2\n3\n4\n5\n6\n7");
    const newFinding = finding("1\n2\n3\n4\n5", "src/new.ts");

    const growth = compareEngineeringQualityRatchet({
      baseline,
      findings: [grown],
      now: 1_002,
    });
    const added = compareEngineeringQualityRatchet({
      baseline,
      findings: [current, newFinding],
      now: 1_002,
    });

    expect(growth.status).toBe("failed");
    expect(growth.growthViolations).toHaveLength(1);
    expect(added.status).toBe("failed");
    expect(added.newViolations).toHaveLength(1);
  });

  it("reports stale content and expired review windows", () => {
    const initial = finding("1\n2\n3\n4\n5");
    const { baseline } = baselineFor(initial, { expiresAt: 1_500 });
    const changed = finding("a\nb\nc\nd\ne");
    const result = compareEngineeringQualityRatchet({
      baseline,
      findings: [changed],
      evidence: [
        measureEngineeringArtifact({
          path: changed.artifactPath,
          content: "a\nb\nc\nd\ne",
        }),
      ],
      now: 2_000,
    });

    expect(result.status).toBe("passed");
    expect(result.requiresReview).toBe(true);
    expect(result.staleItems).toHaveLength(1);
    expect(result.expiredItems).toHaveLength(1);
  });

  it("prepares debt reduction by removing only resolved entries", () => {
    const current = finding("1\n2\n3\n4\n5");
    const { baseline } = baselineFor(current);
    const reduction = reduceEngineeringQualityBaseline({
      baseline,
      findings: [],
      currentEvidence: [
        measureEngineeringArtifact({
          path: current.artifactPath,
          content: "1\n2\n3\n4\n5",
        }),
      ],
      preparedAt: 2_000,
    });

    expect(reduction.removedItems).toHaveLength(1);
    expect(reduction.retainedItems).toHaveLength(0);
    expect(reduction.baseline.items).toHaveLength(0);
  });

  it("keeps the Q3 preview contract versioned", () => {
    const current = finding("1\n2\n3\n4\n5");
    const { preview } = baselineFor(current);
    expect(preview.schemaVersion).toBe(QUALITY_BASELINE_PREVIEW_SCHEMA_URN);
  });
});
