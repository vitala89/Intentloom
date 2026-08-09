import { describe, expect, it } from "vitest";
import {
  measureEngineeringArtifact,
  prepareEngineeringQualityTaskPlan,
  compareEngineeringQualityTaskPlan,
  renderEngineeringQualityPullRequestEvidence,
  resolveEngineeringQualityPolicyForPath,
} from "@intentloom/application";
import {
  QUALITY_POLICY_SCHEMA_URN,
  QUALITY_PULL_REQUEST_EVIDENCE_SCHEMA_URN,
  type EngineeringQualityEvidence,
} from "@intentloom/protocol";
import { validateEngineeringQualityPullRequestEvidence } from "@intentloom/validator";

const policy = {
  schemaVersion: QUALITY_POLICY_SCHEMA_URN,
  policyId: "quality-q4",
  profileName: "balanced" as const,
  defaultRules: [
    {
      id: "rule-lines",
      name: "Physical lines",
      description: "Keeps source files within budgets",
      category: "maintainability" as const,
      severity: "error" as const,
      applicableClassifications: ["hand-written-production" as const],
      thresholds: [
        { level: "review" as const, maxPhysicalLines: 12 },
        { level: "hard" as const, maxPhysicalLines: 14 },
      ],
    },
  ],
  scopes: [
    {
      pathPattern: "packages/application/src/**",
      classification: "hand-written-production" as const,
    },
  ],
};

function evidence(path: string, lines: number): EngineeringQualityEvidence {
  return measureEngineeringArtifact({
    path,
    content: Array.from({ length: lines }, (_, index) => `line-${index}`).join(
      "\n",
    ),
  });
}

const acceptanceCriteria = [
  {
    id: "tests-added",
    description: "Focused regression tests cover the changed behavior.",
    required: true,
  },
];

function planFor(
  estimatedGrowth: {
    minimum: number;
    likely: number;
    confidence: "low" | "medium" | "high";
  } = {
    minimum: 1,
    likely: 2,
    confidence: "medium",
  },
) {
  return prepareEngineeringQualityTaskPlan({
    projectId: "project-q4",
    taskId: "task-quality-integration",
    policy,
    changes: [
      {
        path: "packages/application/src/quality-task.ts",
        currentEvidence: evidence(
          "packages/application/src/quality-task.ts",
          10,
        ),
        estimatedGrowth,
      },
    ],
    acceptanceCriteria,
  });
}

describe("Engineering Quality Task and PR Integration (Phase Q4)", () => {
  it("resolves affected-path policy scopes deterministically", () => {
    const resolution = resolveEngineeringQualityPolicyForPath(
      policy,
      "packages/application/src/quality-task.ts",
      "hand-written-production",
    );

    expect(resolution.status).toBe("resolved");
    expect(resolution.matchedScopes).toEqual(["packages/application/src/**"]);
    expect(resolution.applicableRuleIds).toEqual(["rule-lines"]);
    expect(resolution.hardLimit).toBe(14);
  });

  it("accepts a projection that stays within the resolved policy", () => {
    const plan = planFor();

    expect(plan.status).toBe("accepted");
    expect(plan.changes[0]!.projectedLikely).toBe(12);
    expect(plan.conflicts).toHaveLength(0);
  });

  it("creates a visible conflict before mutation for likely hard-limit growth", () => {
    const plan = planFor({ minimum: 3, likely: 5, confidence: "high" });

    expect(plan.status).toBe("conflict");
    expect(plan.conflicts[0]!.kind).toBe("hard-limit-crossing");
  });

  it("requires a plan acceptance criterion", () => {
    const plan = prepareEngineeringQualityTaskPlan({
      projectId: "project-q4",
      taskId: "task-without-criteria",
      policy,
      changes: [
        {
          path: "packages/application/src/quality-task.ts",
          currentEvidence: evidence(
            "packages/application/src/quality-task.ts",
            10,
          ),
          estimatedGrowth: { minimum: 0, likely: 0, confidence: "high" },
        },
      ],
      acceptanceCriteria: [],
    });

    expect(plan.status).toBe("conflict");
    expect(
      plan.conflicts.some(
        (item) => item.kind === "missing-acceptance-criteria",
      ),
    ).toBe(true);
  });

  it("passes final evidence when growth and required criteria remain within plan", () => {
    const plan = planFor();
    const diff = compareEngineeringQualityTaskPlan({
      plan,
      finalEvidence: [evidence("packages/application/src/quality-task.ts", 12)],
      acceptanceResults: [
        {
          criterionId: "tests-added",
          satisfied: true,
          details: "Test suite added.",
        },
      ],
    });

    expect(diff.status).toBe("passed");
    expect(diff.changes[0]!.status).toBe("within-plan");
  });

  it("reports final projection drift and unexpected paths", () => {
    const plan = planFor();
    const diff = compareEngineeringQualityTaskPlan({
      plan,
      finalEvidence: [
        evidence("packages/application/src/quality-task.ts", 14),
        evidence("packages/application/src/unplanned.ts", 4),
      ],
      acceptanceResults: [
        {
          criterionId: "tests-added",
          satisfied: true,
          details: "Test suite added.",
        },
      ],
    });

    expect(diff.status).toBe("conflict");
    expect(diff.conflicts.map((item) => item.kind)).toEqual(
      expect.arrayContaining(["projection-drift", "unexpected-path"]),
    );
  });

  it("renders deterministic pull-request evidence and validates its schema", () => {
    const plan = planFor();
    const diff = compareEngineeringQualityTaskPlan({
      plan,
      finalEvidence: [evidence("packages/application/src/quality-task.ts", 12)],
      acceptanceResults: [
        {
          criterionId: "tests-added",
          satisfied: true,
          details: "Test suite added.",
        },
      ],
    });
    const rendered = renderEngineeringQualityPullRequestEvidence({
      plan,
      diff,
    });

    expect(rendered.status).toBe("ready");
    expect(rendered.markdown).toContain("## Engineering Quality Evidence");
    expect(rendered.markdown).toContain(
      "packages/application/src/quality-task.ts",
    );
    expect(rendered.schemaVersion).toBe(
      QUALITY_PULL_REQUEST_EVIDENCE_SCHEMA_URN,
    );
    expect(validateEngineeringQualityPullRequestEvidence(rendered).status).toBe(
      "ready",
    );
  });
});
