import { describe, expect, it } from "vitest";
import { prepareEngineeringQualityDecompositionPlan } from "@intentloom/application";
import {
  QUALITY_DECOMPOSITION_PLAN_SCHEMA_URN,
  type EngineeringQualityDecompositionEvidence,
} from "@intentloom/protocol";
import { validateEngineeringQualityDecompositionPlan } from "@intentloom/validator";

function oversizedFixture(): EngineeringQualityDecompositionEvidence {
  return {
    artifactPath: "packages/application/src/legacy-quality.ts",
    currentLines: 620,
    preferredLimit: 350,
    hardLimit: 400,
    responsibilities: [
      {
        id: "orchestration",
        name: "Quality orchestration",
        description: "Coordinates the legacy quality operation.",
        measuredLines: 260,
        cohesion: "high",
        publicApiSymbols: [],
        testIds: ["orchestration-test"],
      },
      {
        id: "renderer",
        name: "Quality renderer",
        description: "Renders deterministic quality output.",
        measuredLines: 140,
        cohesion: "low",
        publicApiSymbols: ["renderQuality"],
        testIds: ["renderer-test"],
      },
      {
        id: "policy",
        name: "Policy resolution",
        description: "Resolves quality policy thresholds.",
        measuredLines: 130,
        cohesion: "low",
        publicApiSymbols: [],
        testIds: ["policy-test"],
      },
      {
        id: "parser",
        name: "Evidence parsing",
        description: "Parses already collected evidence.",
        measuredLines: 80,
        cohesion: "medium",
        publicApiSymbols: [],
        testIds: ["parser-test"],
      },
    ],
    dependencies: [
      {
        fromResponsibilityId: "renderer",
        toResponsibilityId: "policy",
        kind: "internal",
        stable: true,
      },
      {
        fromResponsibilityId: "renderer",
        toResponsibilityId: "orchestration",
        kind: "public-api",
        stable: true,
      },
    ],
    publicApi: [
      {
        symbol: "renderQuality",
        responsibilityId: "renderer",
        consumerCount: 3,
        compatibility: "preserve",
      },
    ],
    tests: [
      {
        id: "orchestration-test",
        path: "tests/quality-orchestration.test.ts",
        behavior: "Coordinates policy and evidence operations.",
        responsibilityIds: ["orchestration"],
      },
      {
        id: "renderer-test",
        path: "tests/quality-renderer.test.ts",
        behavior: "Keeps rendered output deterministic.",
        responsibilityIds: ["renderer"],
      },
      {
        id: "policy-test",
        path: "tests/quality-policy.test.ts",
        behavior: "Resolves policy thresholds.",
        responsibilityIds: ["policy"],
      },
      {
        id: "parser-test",
        path: "tests/quality-parser.test.ts",
        behavior: "Parses collected evidence.",
        responsibilityIds: ["parser"],
      },
    ],
  };
}

describe("Engineering Quality Decomposition Planner (Phase Q5)", () => {
  it("creates a coherent oversized-file plan from whole responsibilities", () => {
    const plan = prepareEngineeringQualityDecompositionPlan({
      projectId: "project-q5",
      taskId: "task-decompose-quality",
      evidence: oversizedFixture(),
    });

    expect(plan.schemaVersion).toBe(QUALITY_DECOMPOSITION_PLAN_SCHEMA_URN);
    expect(plan.status).toBe("review-required");
    expect(plan.recommendedOption).toBe("recommended");
    expect(plan.conflicts).toHaveLength(0);
    expect(plan.options.map((option) => option.kind)).toEqual([
      "minimal",
      "recommended",
      "keep-together",
      "defer",
      "exception",
    ]);

    const minimal = plan.options[0]!;
    expect(minimal.projectedHostLines).toBeLessThanOrEqual(400);
    expect(minimal.extractedResponsibilityIds).toEqual(["renderer", "policy"]);
    expect(minimal.migrationSteps).toHaveLength(3);
    expect(minimal.publicApiActions[0]).toMatch(/renderQuality/);
    expect(minimal.testPreservationSteps).toHaveLength(2);
  });

  it("keeps every option at responsibility boundaries without line ranges", () => {
    const plan = prepareEngineeringQualityDecompositionPlan({
      projectId: "project-q5",
      taskId: "task-boundaries",
      evidence: oversizedFixture(),
    });
    const responsibilityIds = new Set(
      oversizedFixture().responsibilities.map((item) => item.id),
    );

    for (const option of plan.options) {
      expect([
        ...option.extractedResponsibilityIds,
        ...option.retainedResponsibilityIds,
      ]).toHaveLength(responsibilityIds.size);
      expect(option.extractedResponsibilityIds.join(" ")).not.toMatch(
        /lines?/i,
      );
      expect(option.migrationSteps.every((step) => step.order > 0)).toBe(true);
    }
  });

  it("preserves public API and related tests in migration evidence", () => {
    const plan = prepareEngineeringQualityDecompositionPlan({
      projectId: "project-q5",
      taskId: "task-preserve-contracts",
      evidence: oversizedFixture(),
    });
    const recommended = plan.options.find(
      (option) => option.kind === "recommended",
    )!;

    expect(recommended.extractedResponsibilityIds).toContain("renderer");
    expect(recommended.publicApiActions).toEqual([
      expect.stringContaining("renderQuality"),
    ]);
    expect(recommended.testPreservationSteps).toEqual([
      expect.stringContaining("renderer-test"),
      expect.stringContaining("policy-test"),
    ]);
  });

  it("does not mutate the supplied evidence", () => {
    const evidence = oversizedFixture();
    const before = structuredClone(evidence);

    prepareEngineeringQualityDecompositionPlan({
      projectId: "project-q5",
      taskId: "task-read-only",
      evidence,
    });

    expect(evidence).toEqual(before);
  });

  it("reports unsupported oversized evidence instead of inventing a split", () => {
    const fixture = oversizedFixture();
    const evidence: EngineeringQualityDecompositionEvidence = {
      ...fixture,
      responsibilities: fixture.responsibilities.map((item) => ({
        ...item,
        cohesion: "high",
      })),
    };
    const plan = prepareEngineeringQualityDecompositionPlan({
      projectId: "project-q5",
      taskId: "task-no-cohesive-boundary",
      evidence,
    });

    expect(plan.status).toBe("unsupported");
    expect(plan.recommendedOption).toBe("defer");
    expect(plan.conflicts.map((item) => item.kind)).toContain(
      "no-cohesive-extraction",
    );
  });

  it("rejects unknown dependency references at the validation boundary", () => {
    const fixture = oversizedFixture();
    const evidence: EngineeringQualityDecompositionEvidence = {
      ...fixture,
      dependencies: [
        {
          fromResponsibilityId: "renderer",
          toResponsibilityId: "missing",
          kind: "internal",
          stable: true,
        },
      ],
    };

    expect(() =>
      prepareEngineeringQualityDecompositionPlan({
        projectId: "project-q5",
        taskId: "task-invalid-evidence",
        evidence,
      }),
    ).toThrow(/unknown responsibility/);
  });

  it("surfaces public API and unstable dependency review risks", () => {
    const fixture = oversizedFixture();
    const evidence: EngineeringQualityDecompositionEvidence = {
      ...fixture,
      hardLimit: 410,
      dependencies: [
        {
          fromResponsibilityId: "renderer",
          toResponsibilityId: "orchestration",
          kind: "internal",
          stable: false,
        },
      ],
      publicApi: [
        {
          symbol: "renderQuality",
          responsibilityId: "renderer",
          consumerCount: 3,
          compatibility: "review",
        },
      ],
    };
    const plan = prepareEngineeringQualityDecompositionPlan({
      projectId: "project-q5",
      taskId: "task-risk-review",
      evidence,
    });

    expect(plan.status).toBe("review-required");
    expect(plan.conflicts.map((item) => item.kind)).toEqual(
      expect.arrayContaining(["public-api-risk", "dependency-risk"]),
    );
  });

  it("validates the versioned plan contract", () => {
    const plan = prepareEngineeringQualityDecompositionPlan({
      projectId: "project-q5",
      taskId: "task-contract",
      evidence: oversizedFixture(),
    });

    expect(
      validateEngineeringQualityDecompositionPlan(plan).options,
    ).toHaveLength(5);
    expect(() =>
      validateEngineeringQualityDecompositionPlan({
        ...plan,
        schemaVersion: "urn:intentloom:schema:wrong:1",
      }),
    ).toThrow(/schemaVersion/);
  });
});
