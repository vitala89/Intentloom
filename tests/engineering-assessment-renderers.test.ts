import { describe, expect, it } from "vitest";
import {
  assessProject,
  renderAssessmentReport,
} from "../packages/application/src/engineering-assessment.js";

describe("Engineering Assessment Report Renderers & Export", () => {
  it("renders report to JSON format", async () => {
    const report = await assessProject({
      root: "/projects/sample-render",
      projectId: "sample-render",
    });

    const jsonOutput = renderAssessmentReport(report, { format: "json" });
    expect(jsonOutput).toContain(
      '"schemaVersion": "urn:intentloom:schema:assessment-report:1"',
    );
    expect(jsonOutput).toContain('"projectId": "sample-render"');
  });

  it("renders report to Markdown format", async () => {
    const report = await assessProject({
      root: "/projects/sample-render",
      projectId: "sample-render",
      packages: ["packages/core", "packages/application"],
      dependencyEdges: [
        {
          from: "packages/core",
          to: "packages/application",
          isBoundaryViolation: true,
        },
      ],
    });

    const mdOutput = renderAssessmentReport(report, { format: "markdown" });
    expect(mdOutput).toContain(
      "# Engineering Assessment Report: sample-render",
    );
    expect(mdOutput).toContain("## Findings Summary");
    expect(mdOutput).toContain("fp-arch-1");
  });

  it("renders report to HTML format with HTML escaping", async () => {
    const report = await assessProject({
      root: "/projects/<script>alert(1)</script>",
      projectId: "<script>xss</script>",
    });

    const htmlOutput = renderAssessmentReport(report, { format: "html" });
    expect(htmlOutput).toContain("&lt;script&gt;xss&lt;/script&gt;");
    expect(htmlOutput).not.toContain("<script>xss</script>");
  });

  it("redacts secrets when redactSecrets option is true", async () => {
    const report = await assessProject({
      root: "/projects/sample-secrets",
      projectId: "sample-secrets",
      checkerDiagnostics: [
        {
          toolName: "secret-checker",
          toolVersion: "1.0.0",
          diagnosticsCount: 1,
          rawOutputDigest: "api_key=secret12345",
        },
      ],
    });

    const redactedJson = renderAssessmentReport(report, {
      format: "json",
      redactSecrets: true,
    });

    expect(redactedJson).toContain("api_key=[REDACTED]");
    expect(redactedJson).not.toContain("secret12345");
  });
});
