import { describe, expect, it } from "vitest";
import {
  checkEngineeringQuality,
  classifyEngineeringArtifact,
  measureEngineeringArtifact,
} from "@intentloom/application";
import { QUALITY_POLICY_SCHEMA_URN } from "@intentloom/protocol";

describe("Artifact Classifier & File Metrics (Phase Q2)", () => {
  it("classifies files deterministically based on paths and extensions", () => {
    expect(
      classifyEngineeringArtifact({ path: "packages/core/src/index.ts" }),
    ).toBe("hand-written-production");

    expect(
      classifyEngineeringArtifact({ path: "tests/core-metrics.test.ts" }),
    ).toBe("hand-written-test");

    expect(
      classifyEngineeringArtifact({
        path: "catalog/schemas/policy.schema.json",
      }),
    ).toBe("schema-or-protocol");

    expect(
      classifyEngineeringArtifact({ path: "docs/governance/CODE_QUALITY.md" }),
    ).toBe("documentation");

    expect(
      classifyEngineeringArtifact({ path: "src/generated/types.ts" }),
    ).toBe("generated-source");
  });

  it("measures physical lines, line endings, and computes SHA-256 digest", () => {
    const sampleContent = "line 1\r\nline 2\r\nline 3\r\nline 4\r\nline 5";
    const measured = measureEngineeringArtifact({
      path: "src/sample.ts",
      content: sampleContent,
    });

    expect(measured.classification).toBe("hand-written-production");
    expect(measured.measuredValue).toBe(5);
    expect(measured.lineEnding).toBe("crlf");
    expect(measured.contentDigest).toBeDefined();
    expect(measured.contentDigest).toHaveLength(64);
  });

  it("checks quality against policy thresholds and reports findings when exceeded", () => {
    const policy = {
      schemaVersion: QUALITY_POLICY_SCHEMA_URN,
      policyId: "policy-test",
      profileName: "balanced" as const,
      defaultRules: [
        {
          id: "rule-lines",
          name: "Line Count Rule",
          description: "Max 3 lines preferred",
          category: "code-quality" as const,
          severity: "error" as const,
          applicableClassifications: ["hand-written-production" as const],
          thresholds: [
            { level: "preferred" as const, maxPhysicalLines: 3 },
            { level: "hard" as const, maxPhysicalLines: 10 },
          ],
        },
      ],
    };

    const oversizedContent = "1\n2\n3\n4\n5";
    const findings = checkEngineeringQuality({
      path: "src/oversized.ts",
      content: oversizedContent,
      policy,
    });

    expect(findings).toHaveLength(1);
    expect(findings[0]!.state).toBe("preferred-exceeded");
    expect(findings[0]!.measuredValue).toBe(5);
    expect(findings[0]!.thresholdValue).toBe(3);
  });
});
