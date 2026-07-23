import { describe, expect, it } from "vitest";
import {
  analyzeReleaseEvidence,
  evaluateReleaseConformance,
} from "../packages/evidence-analysis/src/index.js";

describe("release evidence analysis", () => {
  it("verifies an explicit local timeline control from complete evidence", () => {
    const report = evaluateReleaseConformance(
      {
        operationVersion: 1,
        caseType: "release",
        caseId: "release-1",
        projectKey: "org/repo",
        quality: "complete",
        findings: [
          {
            code: "local-timeline-verified",
            status: "verified",
            provider: null,
            sourceIds: [],
          },
        ],
      },
      { operationVersion: 1, requiredControls: ["local-release-timeline"] },
    );

    expect(report).toEqual({
      operationVersion: 1,
      caseType: "release",
      caseId: "release-1",
      projectKey: "org/repo",
      summary: "verified",
      findings: [
        {
          control: "local-release-timeline",
          status: "verified",
          evidenceCodes: ["local-timeline-verified"],
          sourceIds: [],
        },
      ],
    });
  });

  it("marks an unknown required control as unsupported", () => {
    const report = evaluateReleaseConformance(
      {
        operationVersion: 1,
        caseType: "release",
        caseId: "release-1",
        projectKey: "org/repo",
        quality: "complete",
        findings: [
          {
            code: "provider-commit-verified",
            status: "verified",
            provider: "github",
            sourceIds: ["release-1"],
          },
        ],
      },
      {
        operationVersion: 1,
        requiredControls: ["unknown-control"],
      } as unknown as {
        readonly operationVersion: 1;
        readonly requiredControls: readonly (
          | "local-release-timeline"
          | "provider-evidence"
          | "provider-commit-provenance"
        )[];
      },
    );

    expect(report).toMatchObject({
      summary: "evidence-unsupported",
      findings: [{ control: "unknown-control", status: "unsupported" }],
    });
  });

  it("preserves ambiguous, missing, and conflicting evidence in stable control order", () => {
    const evidence = {
      operationVersion: 1 as const,
      caseType: "release" as const,
      caseId: "release-2",
      projectKey: "org/repo",
      quality: "conflicted" as const,
      findings: [
        {
          code: "provider-commit-missing-locally" as const,
          status: "conflicting" as const,
          provider: "github" as const,
          sourceIds: ["r2"],
        },
        {
          code: "local-timeline-bounded" as const,
          status: "ambiguous" as const,
          provider: null,
          sourceIds: [],
        },
        {
          code: "provider-evidence-missing" as const,
          status: "missing" as const,
          provider: "github" as const,
          sourceIds: [],
        },
      ],
    };
    const controls = {
      operationVersion: 1 as const,
      requiredControls: [
        "provider-evidence",
        "local-release-timeline",
        "provider-commit-provenance",
      ] as const,
    };

    const first = evaluateReleaseConformance(evidence, controls);
    const second = evaluateReleaseConformance(evidence, controls);

    expect(second).toEqual(first);
    expect(first).toMatchObject({
      summary: "evidence-conflicted",
      findings: [
        { control: "local-release-timeline", status: "ambiguous" },
        { control: "provider-commit-provenance", status: "conflicting" },
        { control: "provider-evidence", status: "missing" },
      ],
    });
  });

  it("rejects duplicate controls under the versioned control-set contract", () => {
    expect(() =>
      evaluateReleaseConformance(
        {
          operationVersion: 1,
          caseType: "release",
          caseId: "release-3",
          projectKey: "org/repo",
          quality: "complete",
          findings: [],
        },
        {
          operationVersion: 1,
          requiredControls: [
            "local-release-timeline",
            "local-release-timeline",
          ],
        },
      ),
    ).toThrow("release conformance controls must be unique");
  });

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
