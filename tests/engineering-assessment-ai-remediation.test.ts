import { describe, expect, it } from "vitest";
import { assessProject } from "../packages/application/src/engineering-assessment.js";
import {
  validateAIEngineeringAssessmentResult,
  validateRemediationRoadmap,
  validateTargetStateOption,
} from "../packages/validator/src/engineering-assessment.js";

describe("Engineering Assessment AI Engineering Controls & Remediation Roadmap", () => {
  it("validates AIEngineeringAssessmentResult structures", () => {
    const aiResult = validateAIEngineeringAssessmentResult({
      controlsEvaluated: 4,
      checks: [
        {
          checkId: "ai-ctrl-001",
          status: "passed",
          description: "Canonical engineering rules discovered",
        },
        {
          checkId: "ai-ctrl-002",
          status: "warning",
          description: "Persistent memory boundary bounds loose",
        },
      ],
    });
    expect(aiResult.controlsEvaluated).toBe(4);
    expect(aiResult.checks).toHaveLength(2);
    expect(aiResult.checks[0]!.status).toBe("passed");
  });

  it("validates TargetStateOption and RemediationRoadmap structures", () => {
    const option = validateTargetStateOption({
      optionId: "opt-001",
      title: "Incremental Modernization",
      description: "Step-by-step refactoring",
      complexity: "medium",
      risks: ["Temporary dual maintenance"],
      recommendationLevel: "recommended",
    });
    expect(option.optionId).toBe("opt-001");

    const roadmap = validateRemediationRoadmap({
      targetStateOptionId: "opt-001",
      phases: [
        {
          phaseName: "Immediate",
          items: ["fp-arch-1"],
        },
        {
          phaseName: "Next",
          items: ["fp-chk-1"],
        },
        {
          phaseName: "Later",
          items: [],
        },
      ],
    });
    expect(roadmap.targetStateOptionId).toBe("opt-001");
    expect(roadmap.phases).toHaveLength(3);
  });

  it("generates target-state options and remediation roadmap in assessProject when findings exist", async () => {
    const report = await assessProject({
      root: "/projects/sample-ai-remediation",
      projectId: "sample-ai-remediation",
      now: () => 1770000000000,
      packages: ["packages/core", "packages/application"],
      dependencyEdges: [
        {
          from: "packages/core",
          to: "packages/application",
          isBoundaryViolation: true,
        },
      ],
      aiEngineeringResult: {
        controlsEvaluated: 2,
        checks: [
          {
            checkId: "ai-001",
            status: "passed",
            description: "No hidden prompt telemetry",
          },
        ],
      },
    });

    expect(report.envelope.aiEngineeringResult?.controlsEvaluated).toBe(2);
    expect(report.envelope.targetStateOptions).toHaveLength(2);
    expect(report.envelope.targetStateOptions![0]!.optionId).toBe(
      "opt-minimal",
    );
    expect(report.envelope.remediationRoadmap?.targetStateOptionId).toBe(
      "opt-minimal",
    );
    expect(report.envelope.remediationRoadmap?.phases[0]!.phaseName).toBe(
      "Immediate",
    );
    expect(report.envelope.remediationRoadmap?.phases[0]!.items).toContain(
      "fp-arch-1",
    );
  });
});
