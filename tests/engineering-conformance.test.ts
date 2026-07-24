import { describe, expect, it } from "vitest";
import {
  evaluateEngineeringConformance,
  type EngineeringWorkflowPolicy,
  type GenericTimeline,
} from "../packages/evidence-analysis/src/index.js";

describe("evaluateEngineeringConformance", () => {
  const samplePolicy: EngineeringWorkflowPolicy = {
    schemaVersion: "1",
    policyId: "policy:canonical-pr-v1",
    description: "Standard pull request engineering policy",
    rules: [
      {
        ruleId: "rule:require-code-review",
        caseType: "pull-request",
        severity: "error",
        title: "Required Code Review",
        condition: {
          type: "required-activity",
          activity: "pull-request.reviewed",
        },
        remediation: {
          summary: "Pull request requires at least one review approval.",
          actionableSteps: ["Request review from a repository maintainer."],
        },
      },
      {
        ruleId: "rule:forbidden-direct-commit",
        caseType: "pull-request",
        severity: "error",
        title: "No Direct Commits to Main",
        condition: {
          type: "forbidden-activity",
          activity: "direct-commit-to-main",
        },
      },
      {
        ruleId: "rule:ordered-pipeline",
        caseType: "pull-request",
        severity: "warning",
        title: "Ordered Pipeline Sequence",
        condition: {
          type: "ordered-sequence",
          sequence: [
            "branch.created",
            "pull-request.created",
            "ci-build.passed",
            "pull-request.merged",
          ],
        },
      },
      {
        ruleId: "rule:ci-evidence",
        caseType: "pull-request",
        severity: "error",
        title: "CI Build Evidence Presence",
        condition: {
          type: "evidence-presence",
          evidenceType: "ci-build-passed",
        },
      },
      {
        ruleId: "rule:lead-time-limit",
        caseType: "pull-request",
        severity: "info",
        title: "Lead Time Threshold",
        condition: {
          type: "time-delta-threshold",
          maxMinutes: 120,
        },
      },
    ],
  };

  it("evaluates a compliant timeline with pass status for all rules", () => {
    const compliantTimeline: GenericTimeline = {
      caseType: "pull-request",
      caseId: "pr:101",
      events: [
        {
          activity: "branch.created",
          source: "git",
          sourceId: "commit:1",
          timestamp: "2026-07-24T00:00:00Z",
        },
        {
          activity: "pull-request.created",
          source: "github-export",
          sourceId: "pr:101",
          timestamp: "2026-07-24T00:10:00Z",
        },
        {
          activity: "ci-build.passed",
          source: "github-export",
          sourceId: "check:1",
          evidenceType: "ci-build-passed",
          timestamp: "2026-07-24T00:20:00Z",
        },
        {
          activity: "pull-request.reviewed",
          source: "github-export",
          sourceId: "review:1",
          timestamp: "2026-07-24T00:30:00Z",
        },
        {
          activity: "pull-request.merged",
          source: "github-export",
          sourceId: "pr:101-merge",
          timestamp: "2026-07-24T00:40:00Z",
        },
      ],
    };

    const report = evaluateEngineeringConformance(
      compliantTimeline,
      samplePolicy,
    );

    expect(report.operationVersion).toBe(1);
    expect(report.policyId).toBe("policy:canonical-pr-v1");
    expect(report.caseType).toBe("pull-request");
    expect(report.caseId).toBe("pr:101");
    expect(report.summary.totalRules).toBe(5);
    expect(report.summary.passed).toBe(5);
    expect(report.summary.violations).toBe(0);
    expect(report.summary.missingEvidence).toBe(0);
  });

  it("detects forbidden activity violations", () => {
    const violationTimeline: GenericTimeline = {
      caseType: "pull-request",
      caseId: "pr:102",
      events: [
        {
          activity: "direct-commit-to-main",
          source: "git",
          sourceId: "commit:bad",
          timestamp: "2026-07-24T00:00:00Z",
        },
      ],
    };

    const report = evaluateEngineeringConformance(
      violationTimeline,
      samplePolicy,
    );

    const forbiddenFinding = report.findings.find(
      (f) => f.ruleId === "rule:forbidden-direct-commit",
    );
    expect(forbiddenFinding).toBeDefined();
    expect(forbiddenFinding?.status).toBe("violation");
    expect(forbiddenFinding?.evidence).toHaveLength(1);
    expect(report.summary.violations).toBeGreaterThanOrEqual(1);
  });

  it("detects missing evidence for required activities", () => {
    const missingEvidenceTimeline: GenericTimeline = {
      caseType: "pull-request",
      caseId: "pr:103",
      events: [
        {
          activity: "branch.created",
          source: "git",
          sourceId: "commit:1",
        },
      ],
    };

    const report = evaluateEngineeringConformance(
      missingEvidenceTimeline,
      samplePolicy,
    );

    const reviewFinding = report.findings.find(
      (f) => f.ruleId === "rule:require-code-review",
    );
    expect(reviewFinding?.status).toBe("missing-evidence");
    expect(reviewFinding?.remediation?.summary).toContain("review");
    expect(report.summary.missingEvidence).toBeGreaterThanOrEqual(1);
  });

  it("detects out-of-order sequence violations", () => {
    const outOfOrderTimeline: GenericTimeline = {
      caseType: "pull-request",
      caseId: "pr:104",
      events: [
        {
          activity: "pull-request.merged",
          source: "github-export",
          sourceId: "merge:1",
        },
        {
          activity: "branch.created",
          source: "git",
          sourceId: "commit:1",
        },
        {
          activity: "pull-request.created",
          source: "github-export",
          sourceId: "pr:104",
        },
        {
          activity: "ci-build.passed",
          source: "github-export",
          sourceId: "check:1",
        },
      ],
    };

    const report = evaluateEngineeringConformance(
      outOfOrderTimeline,
      samplePolicy,
    );

    const sequenceFinding = report.findings.find(
      (f) => f.ruleId === "rule:ordered-pipeline",
    );
    expect(sequenceFinding?.status).toBe("violation");
  });

  it("throws error for unsupported policy schema version", () => {
    const invalidPolicy = {
      ...samplePolicy,
      schemaVersion: "99" as any,
    };
    const timeline: GenericTimeline = {
      caseType: "pull-request",
      caseId: "pr:105",
      events: [],
    };

    expect(() =>
      evaluateEngineeringConformance(timeline, invalidPolicy),
    ).toThrow("unsupported engineering workflow policy schema version");
  });

  it("throws error for duplicate rule IDs", () => {
    const duplicatePolicy: EngineeringWorkflowPolicy = {
      schemaVersion: "1",
      policyId: "policy:duplicate",
      rules: [
        {
          ruleId: "rule:same",
          caseType: "pull-request",
          severity: "error",
          title: "Rule 1",
          condition: { type: "required-activity", activity: "a" },
        },
        {
          ruleId: "rule:same",
          caseType: "pull-request",
          severity: "warning",
          title: "Rule 2",
          condition: { type: "required-activity", activity: "b" },
        },
      ],
    };
    const timeline: GenericTimeline = {
      caseType: "pull-request",
      caseId: "pr:106",
      events: [],
    };

    expect(() =>
      evaluateEngineeringConformance(timeline, duplicatePolicy),
    ).toThrow("engineering workflow policy rule IDs must be unique");
  });
});
