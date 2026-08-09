import { describe, expect, it } from "vitest";
import { assessProject } from "../packages/application/src/engineering-assessment.js";
import {
  validateCheckerAdapterDiagnostics,
  validateQualityPackReference,
} from "../packages/validator/src/engineering-assessment.js";

describe("Engineering Assessment Quality Packs, Checker Adapters & Graph Providers", () => {
  it("validates QualityPackReference structures", () => {
    const pack = validateQualityPackReference({
      name: "@intentloom/quality-pack-typescript",
      version: "1.0.0",
      rulesCount: 15,
    });
    expect(pack.name).toBe("@intentloom/quality-pack-typescript");
    expect(pack.rulesCount).toBe(15);
  });

  it("validates CheckerAdapterDiagnostics structures", () => {
    const diag = validateCheckerAdapterDiagnostics({
      toolName: "tsc",
      toolVersion: "5.8.2",
      diagnosticsCount: 3,
      rawOutputDigest: "sha256:abc",
    });
    expect(diag.toolName).toBe("tsc");
    expect(diag.diagnosticsCount).toBe(3);
  });

  it("integrates quality packs and checker adapter diagnostics into assessProject", async () => {
    const report = await assessProject({
      root: "/projects/sample-adapter",
      projectId: "sample-adapter",
      now: () => 1770000000000,
      graphProviderKind: "typescript-project-references",
      qualityPacks: [
        {
          name: "@intentloom/quality-pack-core",
          version: "1.0.0",
          rulesCount: 10,
        },
      ],
      checkerDiagnostics: [
        {
          toolName: "eslint",
          toolVersion: "9.0.0",
          diagnosticsCount: 2,
          rawOutputDigest: "sha256:eslint-out",
        },
      ],
    });

    expect(report.envelope.status).toBe("completed");
    expect(report.envelope.findingProjections).toHaveLength(1);
    expect(report.envelope.findingProjections![0]!.category).toBe("quality");
    expect(
      report.envelope.findingProjections![0]!.provenanceClassification,
    ).toBe("checker-adapter");
    expect(report.envelope.architectureResult?.driftDiagnostics).toContain(
      "Applied 1 quality pack(s): @intentloom/quality-pack-core@1.0.0.",
    );
  });
});
