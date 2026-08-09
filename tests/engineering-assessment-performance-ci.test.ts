import { describe, expect, it } from "vitest";
import { assessProject } from "../packages/application/src/engineering-assessment.js";
import {
  validateMonorepoCIAssessmentResult,
  validatePerformanceBaselineEvidence,
} from "../packages/validator/src/engineering-assessment.js";

describe("Engineering Assessment Performance Baseline & Monorepo CI Integration", () => {
  it("validates PerformanceBaselineEvidence structures", () => {
    const baseline = validatePerformanceBaselineEvidence({
      scenarioId: "build-latency-benchmark",
      environment: "ci-linux-x64",
      metrics: [
        {
          metricName: "buildTimeMs",
          beforeValue: 12000,
          afterValue: 9500,
          unit: "ms",
          deltaPercent: -20.83,
        },
      ],
    });
    expect(baseline.scenarioId).toBe("build-latency-benchmark");
    expect(baseline.metrics).toHaveLength(1);
    expect(baseline.metrics[0]!.deltaPercent).toBe(-20.83);
  });

  it("validates MonorepoCIAssessmentResult structures", () => {
    const monorepoCi = validateMonorepoCIAssessmentResult({
      workspaceType: "pnpm-workspace",
      cachedTasksCount: 45,
      uncachedTasksCount: 5,
      ciPipelineCount: 2,
    });
    expect(monorepoCi.workspaceType).toBe("pnpm-workspace");
    expect(monorepoCi.cachedTasksCount).toBe(45);
  });

  it("integrates performance baseline and monorepo CI results into assessProject operation", async () => {
    const report = await assessProject({
      root: "/projects/sample-perf-ci",
      projectId: "sample-perf-ci",
      now: () => 1770000000000,
      performanceEvidence: {
        scenarioId: "bundle-size",
        environment: "production-build",
        metrics: [
          {
            metricName: "bundleSizeBytes",
            beforeValue: 250000,
            afterValue: 210000,
            unit: "bytes",
            deltaPercent: -16,
          },
        ],
      },
      monorepoCiResult: {
        workspaceType: "nx-workspace",
        cachedTasksCount: 120,
        uncachedTasksCount: 10,
        ciPipelineCount: 3,
      },
    });

    expect(report.envelope.performanceEvidence?.scenarioId).toBe("bundle-size");
    expect(report.envelope.monorepoCiResult?.workspaceType).toBe(
      "nx-workspace",
    );
    expect(report.envelope.monorepoCiResult?.cachedTasksCount).toBe(120);
  });
});
