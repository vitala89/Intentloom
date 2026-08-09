import { describe, expect, it } from "vitest";
import {
  QUALITY_POLICY_SCHEMA_URN,
  type EngineeringQualityPolicy,
} from "@intentloom/protocol";
import {
  validateEngineeringQualityFinding,
  validateEngineeringQualityPolicy,
} from "@intentloom/validator";

describe("Engineering Quality Contracts (Phase Q1)", () => {
  it("validates a canonical engineering quality policy", () => {
    const policyInput: EngineeringQualityPolicy = {
      schemaVersion: QUALITY_POLICY_SCHEMA_URN,
      policyId: "policy-balanced-001",
      profileName: "balanced",
      defaultRules: [
        {
          id: "rule-file-lines",
          name: "File Physical Lines Budget",
          description: "Enforces physical line thresholds on production files",
          category: "code-quality",
          severity: "error",
          applicableClassifications: ["hand-written-production"],
          thresholds: [
            { level: "preferred", maxPhysicalLines: 250 },
            { level: "review", maxPhysicalLines: 300 },
            { level: "hard", maxPhysicalLines: 400 },
          ],
        },
      ],
      scopes: [
        {
          pathPattern: "packages/application/src/**",
          classification: "hand-written-production",
        },
      ],
    };

    const validated = validateEngineeringQualityPolicy(policyInput);
    expect(validated.policyId).toBe("policy-balanced-001");
    expect(validated.defaultRules).toHaveLength(1);
    expect(validated.defaultRules[0]!.thresholds).toHaveLength(3);
  });

  it("throws when policy schema version is invalid", () => {
    expect(() =>
      validateEngineeringQualityPolicy({
        schemaVersion: "urn:invalid:schema",
        policyId: "p1",
        profileName: "balanced",
        defaultRules: [],
      }),
    ).toThrow(/policy.schemaVersion must equal/);
  });

  it("validates finding structures", () => {
    const findingInput = {
      schemaVersion: "urn:intentloom:schema:engineering-quality-finding:1",
      findingId: "fnd-001",
      ruleId: "rule-file-lines",
      artifactPath: "src/oversized.ts",
      classification: "hand-written-production",
      state: "hard-limit-exceeded",
      severity: "error",
      exceededThresholdLevel: "hard",
      measuredValue: 420,
      thresholdValue: 400,
      message: "Exceeded hard limit of 400 lines",
      evidence: {
        artifactPath: "src/oversized.ts",
        classification: "hand-written-production",
        measuredValue: 420,
        unit: "physical-lines",
        contentDigest: "abc123digest",
        lineEnding: "lf",
      },
    };

    const validated = validateEngineeringQualityFinding(findingInput);
    expect(validated.findingId).toBe("fnd-001");
    expect(validated.state).toBe("hard-limit-exceeded");
    expect(validated.evidence.measuredValue).toBe(420);
  });
});
