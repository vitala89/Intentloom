import { describe, expect, it } from "vitest";
import { assessProject } from "../packages/application/src/engineering-assessment.js";

describe("Engineering Assessment Application Operation (assessProject)", () => {
  it("executes read-only project assessment with no boundary violations", async () => {
    const report = await assessProject({
      root: "/projects/sample-clean",
      projectId: "sample-clean",
      now: () => 1770000000000,
      packages: ["packages/core", "packages/application"],
      dependencyEdges: [
        {
          from: "packages/application",
          to: "packages/core",
          isBoundaryViolation: false,
        },
      ],
    });

    expect(report.schemaVersion).toBe(
      "urn:intentloom:schema:assessment-report:1",
    );
    expect(report.envelope.status).toBe("completed");
    expect(report.envelope.findingProjections).toEqual([]);
    expect(report.technicalDebtMap.items).toEqual([]);
    expect(report.summary).toContain("project structure conforms");
  });

  it("detects architectural boundary violations and creates finding projections & technical debt items", async () => {
    const report = await assessProject({
      root: "/projects/sample-violating",
      projectId: "sample-violating",
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

    expect(report.envelope.findingProjections).toHaveLength(1);
    expect(report.envelope.findingProjections![0]!.category).toBe(
      "architecture",
    );
    expect(report.envelope.findingProjections![0]!.severity).toBe("error");
    expect(report.technicalDebtMap.items).toHaveLength(1);
    expect(report.technicalDebtMap.items[0]!.findingProjectionId).toBe(
      "fp-arch-1",
    );
    expect(report.summary).toContain("1 finding projection(s) identified");
  });

  it("rejects empty root parameter", async () => {
    await expect(assessProject({ root: "" })).rejects.toThrow(
      "root must be a non-empty string",
    );
  });
});
