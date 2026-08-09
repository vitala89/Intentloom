import { describe, expect, it } from "vitest";
import {
  assessProject,
  assessProjectIncremental,
} from "../packages/application/src/engineering-assessment.js";

describe("Engineering Assessment Incremental & Affected Reassessment", () => {
  it("runs full assessment when changedFiles is empty or baseline is missing", async () => {
    const fullReport = await assessProjectIncremental({
      root: "/projects/sample-incremental",
      projectId: "sample-incremental",
      now: () => 1770000000000,
    });

    expect(fullReport.envelope.identity.id).toBe("assess-1770000000000");
  });

  it("merges affected scope findings with unaffected baseline findings", async () => {
    const baselineReport = await assessProject({
      root: "/projects/sample-incremental",
      projectId: "sample-incremental",
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

    const incrementalReport = await assessProjectIncremental({
      root: "/projects/sample-incremental",
      projectId: "sample-incremental",
      now: () => 1770000100000,
      changedFiles: ["packages/core/src/index.ts"],
      baselineReport,
      packages: ["packages/core", "packages/application"],
      dependencyEdges: [
        {
          from: "packages/core",
          to: "packages/application",
          isBoundaryViolation: true,
        },
      ],
    });

    expect(incrementalReport.summary).toContain(
      "Incremental assessment complete",
    );
    expect(incrementalReport.envelope.findingReferences).toHaveLength(2);
    expect(incrementalReport.envelope.findingReferences).toContain("fp-arch-1");
    expect(incrementalReport.envelope.findingReferences).toContain("fp-chk-1");
  });

  it("falls back conservatively to full assessment when fallbackToFull is true", async () => {
    const baselineReport = await assessProject({
      root: "/projects/sample-incremental",
      projectId: "sample-incremental",
    });

    const report = await assessProjectIncremental({
      root: "/projects/sample-incremental",
      projectId: "sample-incremental",
      changedFiles: ["packages/core/src/index.ts"],
      baselineReport,
      fallbackToFull: true,
    });

    expect(report.summary).not.toContain("Incremental assessment complete");
  });
});
