import { describe, expect, it } from "vitest";
import {
  assessProject,
  compareTargetStateOptions,
  explainAssessmentEvidence,
  explainAssessmentFinding,
  explainRemediationRoadmap,
} from "../packages/application/src/engineering-assessment.js";

describe("Engineering Assessment Conversational Explanations", () => {
  it("explains findings and evidence from assessment report", async () => {
    const report = await assessProject({
      root: "/projects/sample-conversational",
      projectId: "sample-conversational",
      now: () => 1770000000000,
      packages: ["packages/core", "packages/application"],
      dependencyEdges: [
        {
          from: "packages/core",
          to: "packages/application",
          isBoundaryViolation: true,
        },
      ],
      checkerDiagnostics: [
        {
          toolName: "eslint",
          toolVersion: "8.50.0",
          diagnosticsCount: 3,
        },
      ],
    });

    const findingExplanation = explainAssessmentFinding(report, "fp-arch-1");
    expect(findingExplanation).toContain("fp-arch-1");
    expect(findingExplanation).toContain("ERROR");
    expect(findingExplanation).toContain("Boundary violation");

    const evidenceExplanation = explainAssessmentEvidence(
      report,
      "ev-arch-001",
    );
    expect(evidenceExplanation).toContain("ev-arch-001");
    expect(evidenceExplanation).toContain("intentloom-assess");

    const missingFinding = explainAssessmentFinding(report, "fp-non-existent");
    expect(missingFinding).toContain("was not found");
  });

  it("compares target state options and explains remediation roadmap", async () => {
    const report = await assessProject({
      root: "/projects/sample-conversational",
      projectId: "sample-conversational",
      now: () => 1770000000000,
      packages: ["packages/core", "packages/application"],
      dependencyEdges: [
        {
          from: "packages/core",
          to: "packages/application",
          isBoundaryViolation: true,
        },
      ],
    });

    const optionsComparison = compareTargetStateOptions(report);
    expect(optionsComparison).toContain("opt-minimal");
    expect(optionsComparison).toContain("RECOMMENDED");
    expect(optionsComparison).toContain("opt-migration");

    const roadmapExplanation = explainRemediationRoadmap(report);
    expect(roadmapExplanation).toContain("Target Option [opt-minimal]");
    expect(roadmapExplanation).toContain("Phase Immediate: fp-arch-1");
  });

  it("handles reports with no findings cleanly", async () => {
    const report = await assessProject({
      root: "/projects/clean-project",
      projectId: "clean-project",
    });

    const optionsComparison = compareTargetStateOptions(report);
    expect(optionsComparison).toBe(
      "No target-state options available in current assessment report.",
    );

    const roadmapExplanation = explainRemediationRoadmap(report);
    expect(roadmapExplanation).toBe(
      "No remediation roadmap available in current assessment report.",
    );
  });
});
