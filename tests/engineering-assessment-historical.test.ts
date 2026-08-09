import { describe, expect, it } from "vitest";
import {
  assessProject,
  compareAssessmentReports,
} from "../packages/application/src/engineering-assessment.js";

describe("Engineering Assessment Historical Comparison & Trend Analysis", () => {
  it("compares two assessment reports and detects fixed, new, and unchanged findings", async () => {
    const previousReport = await assessProject({
      root: "/projects/sample-historical",
      projectId: "sample-historical",
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
          diagnosticsCount: 2,
        },
      ],
    });

    const currentReport = await assessProject({
      root: "/projects/sample-historical",
      projectId: "sample-historical",
      now: () => 1770000100000,
      packages: ["packages/core", "packages/application"],
      dependencyEdges: [], // Fixed boundary violation!
      checkerDiagnostics: [
        {
          toolName: "eslint",
          toolVersion: "8.50.0",
          diagnosticsCount: 2,
        },
      ],
    });

    const comparison = compareAssessmentReports(previousReport, currentReport);

    expect(comparison.previousId).toBe("assess-1770000000000");
    expect(comparison.currentId).toBe("assess-1770000100000");
    expect(comparison.isCompatible).toBe(true);
    expect(comparison.fixedFindingIds).toContain("fp-arch-1");
    expect(comparison.unchangedFindingIds).toContain("fp-chk-1");
    expect(comparison.architectureDriftDelta).toBe(-1);
  });

  it("marks comparison incompatible when project IDs differ", async () => {
    const reportA = await assessProject({
      root: "/projects/project-a",
      projectId: "project-a",
    });

    const reportB = await assessProject({
      root: "/projects/project-b",
      projectId: "project-b",
    });

    const comparison = compareAssessmentReports(reportA, reportB);

    expect(comparison.isCompatible).toBe(false);
  });
});
