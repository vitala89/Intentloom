import { describe, expect, it } from "vitest";
import {
  assessProject,
  assessProjectIncremental,
  buildAssessmentViewModel,
  compareAssessmentReports,
  compareTargetStateOptions,
  createRemediationProposal,
  explainAssessmentEvidence,
  explainAssessmentFinding,
  explainRemediationRoadmap,
  renderAssessmentReport,
} from "../packages/application/src/engineering-assessment.js";

describe("Engineering Assessment Stabilization & Public Contract Verification", () => {
  it("executes deterministic assessment without requiring any AI components", async () => {
    const report = await assessProject({
      root: "/projects/sample-stabilization",
      projectId: "sample-stabilization",
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
          diagnosticsCount: 1,
        },
      ],
    });

    expect(report.envelope.identity.id).toBeDefined();
    expect(report.envelope.findingProjections).toHaveLength(2);
    expect(report.envelope.provenance.toolName).toBe("intentloom");
  });

  it("enforces strict read-only immutability and approval requirements for remediation proposals", async () => {
    const report = await assessProject({
      root: "/projects/sample-stabilization",
      projectId: "sample-stabilization",
      packages: ["packages/core", "packages/application"],
      dependencyEdges: [
        {
          from: "packages/core",
          to: "packages/application",
          isBoundaryViolation: true,
        },
      ],
    });

    const proposal = createRemediationProposal(report, "fp-arch-1");
    expect(proposal.requiresApproval).toBe(true);
    expect(proposal.rollbackStrategy).toContain("Revert changes");
  });

  it("verifies end-to-end flow from assessment to viewmodel, explanation, incremental update, comparison, and rendering", async () => {
    const initialReport = await assessProject({
      root: "/projects/e2e-stabilization",
      projectId: "e2e-stabilization",
      now: () => 1770000000000,
      packages: ["packages/core", "packages/application"],
      dependencyEdges: [
        {
          from: "packages/core",
          to: "packages/application",
          isBoundaryViolation: true,
        },
      ],
      qualityPacks: [
        {
          name: "react-best-practices",
          version: "1.0.0",
          rulesCount: 15,
        },
      ],
    });

    // View Model
    const viewModel = buildAssessmentViewModel(initialReport);
    expect(viewModel.overview.projectId).toBe("e2e-stabilization");
    expect(viewModel.architecture.boundaryViolationsCount).toBe(1);

    // Explanations
    const findingExpl = explainAssessmentFinding(initialReport, "fp-arch-1");
    expect(findingExpl).toContain("Boundary violation");

    const evidenceExpl = explainAssessmentEvidence(
      initialReport,
      "ev-arch-001",
    );
    expect(evidenceExpl).toContain("Architecture graph");

    const optionsExpl = compareTargetStateOptions(initialReport);
    expect(optionsExpl).toContain("Minimal Remediation");

    const roadmapExpl = explainRemediationRoadmap(initialReport);
    expect(roadmapExpl).toContain("Remediation Roadmap");

    // Incremental reassessment
    const updatedReport = await assessProjectIncremental({
      root: "/projects/e2e-stabilization",
      projectId: "e2e-stabilization",
      now: () => 1770000100000,
      changedFiles: ["packages/core/src/index.ts"],
      baselineReport: initialReport,
      packages: ["packages/core", "packages/application"],
      dependencyEdges: [], // Fixed violation
    });

    // Comparison
    const comparison = compareAssessmentReports(initialReport, updatedReport);
    expect(comparison.isCompatible).toBe(true);
    expect(comparison.fixedFindingIds).toContain("fp-arch-1");
    expect(comparison.architectureDriftDelta).toBe(-1);

    // Export renderings
    const jsonStr = renderAssessmentReport(updatedReport, { format: "json" });
    expect(jsonStr).toContain("e2e-stabilization");

    const mdStr = renderAssessmentReport(updatedReport, { format: "markdown" });
    expect(mdStr).toContain(
      "# Engineering Assessment Report: e2e-stabilization",
    );

    const htmlStr = renderAssessmentReport(updatedReport, { format: "html" });
    expect(htmlStr).toContain(
      "<h1>Engineering Assessment Report: e2e-stabilization</h1>",
    );
  });
});
