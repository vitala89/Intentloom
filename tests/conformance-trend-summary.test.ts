import { describe, expect, it } from "vitest";
import {
  summarizeConformanceTrend,
  type EngineeringConformanceReport,
} from "../packages/evidence-analysis/src/index.js";
import { summarizeProjectConformanceTrend } from "@intentloom/application";

describe("summarizeConformanceTrend", () => {
  const reports: readonly EngineeringConformanceReport[] = [
    {
      operationVersion: 1,
      policyId: "policy:release-v1",
      evaluatedAt: "2026-07-26T00:00:00.000Z",
      caseType: "release",
      caseId: "release:1",
      summary: {
        totalRules: 2,
        passed: 1,
        violations: 1,
        missingEvidence: 0,
        ambiguousEvidence: 0,
        unsupported: 0,
      },
      findings: [
        {
          ruleId: "review",
          caseType: "release",
          severity: "error",
          status: "violation",
          title: "Review",
          evidence: [],
        },
        {
          ruleId: "tag",
          caseType: "release",
          severity: "info",
          status: "pass",
          title: "Tag",
          evidence: [],
        },
      ],
    },
    {
      operationVersion: 1,
      policyId: "policy:release-v1",
      evaluatedAt: "2026-07-27T00:00:00.000Z",
      caseType: "release",
      caseId: "release:2",
      summary: {
        totalRules: 2,
        passed: 1,
        violations: 0,
        missingEvidence: 1,
        ambiguousEvidence: 0,
        unsupported: 0,
      },
      findings: [
        {
          ruleId: "review",
          caseType: "release",
          severity: "warning",
          status: "missing-evidence",
          title: "Review",
          evidence: [],
        },
        {
          ruleId: "tag",
          caseType: "release",
          severity: "info",
          status: "pass",
          title: "Tag",
          evidence: [],
        },
      ],
    },
  ];

  it("aggregates status and severity counts deterministically", () => {
    const first = summarizeConformanceTrend(reports);
    const second = summarizeConformanceTrend([...reports].reverse());
    expect(first).toEqual(second);
    expect(first).toEqual({
      operationVersion: 1,
      caseType: "release",
      policyId: "policy:release-v1",
      reportCount: 2,
      findingCount: 4,
      statusCounts: {
        pass: 2,
        violation: 1,
        "missing-evidence": 1,
        "ambiguous-evidence": 0,
        unsupported: 0,
      },
      severityCounts: { error: 1, warning: 1, info: 2 },
    });
  });

  it("uses the same result through application and rejects mixed scope", () => {
    expect(summarizeProjectConformanceTrend(reports)).toEqual(
      summarizeConformanceTrend(reports),
    );
    expect(() =>
      summarizeConformanceTrend([
        reports[0]!,
        { ...reports[1]!, policyId: "policy:other" },
      ]),
    ).toThrow("conformance trend reports must share one policy");
    expect(() =>
      summarizeConformanceTrend([
        reports[0]!,
        { ...reports[1]!, caseType: "pull-request" },
      ]),
    ).toThrow("conformance trend reports must share one case type");
  });

  it("rejects insufficient or invalid reports without mutating inputs", () => {
    const snapshot = structuredClone(reports);
    expect(() => summarizeConformanceTrend([reports[0]!])).toThrow(
      "at least two conformance reports are required",
    );
    expect(() =>
      summarizeConformanceTrend([
        reports[0]!,
        { ...reports[1]!, operationVersion: 2 as unknown as 1 },
      ]),
    ).toThrow("engineering conformance report is invalid");
    expect(reports).toEqual(snapshot);
  });
});
