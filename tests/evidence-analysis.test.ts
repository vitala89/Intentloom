import { describe, expect, it } from "vitest";
import { analyzeReleaseEvidence } from "../packages/evidence-analysis/src/index.js";

describe("release evidence analysis", () => {
  it("verifies provider commit provenance against local Git", () => {
    const report = analyzeReleaseEvidence(
      {
        caseId: "release-1",
        quality: "complete",
        events: [{ commitId: "abc", timestamp: 1 }],
      },
      {
        provider: "github",
        projectKey: "org/repo",
        status: "available",
        events: [{ eventType: "release", sourceId: "r1", commitIds: ["abc"] }],
      },
      "org/repo",
    );
    expect(report.quality).toBe("complete");
    expect(report.findings.at(-1)).toMatchObject({
      code: "provider-commit-verified",
      status: "verified",
    });
  });

  it("distinguishes missing, ambiguous, and conflicting evidence", () => {
    const report = analyzeReleaseEvidence(
      { caseId: "release-1", quality: "complete", events: [] },
      {
        provider: "gitlab",
        projectKey: "other/repo",
        status: "available",
        events: [{ eventType: "release", sourceId: "r1" }],
      },
      "org/repo",
    );
    expect(report.quality).toBe("conflicted");
    expect(report.findings.at(-1)?.status).toBe("conflicting");
  });
});
