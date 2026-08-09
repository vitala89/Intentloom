import { describe, expect, it } from "vitest";
import {
  assessProject,
  buildAssessmentViewModel,
} from "../packages/application/src/engineering-assessment.js";

describe("Engineering Assessment ViewModel Adapter", () => {
  it("builds structured AssessmentViewModel for desktop/UI workspaces", async () => {
    const report = await assessProject({
      root: "/projects/sample-viewmodel",
      projectId: "sample-viewmodel",
      now: () => 1770000000000,
      packages: ["packages/core", "packages/application"],
      dependencyEdges: [
        {
          from: "packages/core",
          to: "packages/application",
          isBoundaryViolation: true,
        },
      ],
      performanceEvidence: {
        scenarioId: "latency-test",
        environment: "staging",
        metrics: [
          {
            metricName: "requestDurationMs",
            beforeValue: 120,
            afterValue: 95,
            unit: "ms",
            deltaPercent: -20.83,
          },
        ],
      },
      monorepoCiResult: {
        workspaceType: "pnpm-workspace",
        cachedTasksCount: 30,
        uncachedTasksCount: 2,
        ciPipelineCount: 1,
      },
      aiEngineeringResult: {
        controlsEvaluated: 3,
        checks: [
          {
            checkId: "ctrl-1",
            status: "passed",
            description: "Strict boundary rules active",
          },
        ],
      },
    });

    const vm = buildAssessmentViewModel(report);

    expect(vm.overview.assessmentId).toBe("assess-1770000000000");
    expect(vm.overview.projectId).toBe("sample-viewmodel");
    expect(vm.overview.findingsCount).toBe(1);

    expect(vm.architecture.packagesCount).toBe(2);
    expect(vm.architecture.boundaryViolationsCount).toBe(1);

    expect(vm.performance.scenarioId).toBe("latency-test");
    expect(vm.performance.metricsCount).toBe(1);

    expect(vm.monorepoCi.workspaceType).toBe("pnpm-workspace");
    expect(vm.monorepoCi.cachedTasksCount).toBe(30);

    expect(vm.aiEngineering.controlsEvaluated).toBe(3);
    expect(vm.aiEngineering.checksCount).toBe(1);

    expect(vm.technicalDebt.itemsCount).toBe(1);
    expect(vm.recommendations).toHaveLength(2);
    expect(vm.roadmap.targetOptionId).toBe("opt-minimal");
    expect(vm.roadmap.immediateItemsCount).toBe(1);
  });

  it("builds empty UI sections cleanly when report has no findings or extra data", async () => {
    const report = await assessProject({
      root: "/projects/clean-viewmodel",
      projectId: "clean-viewmodel",
    });

    const vm = buildAssessmentViewModel(report);

    expect(vm.overview.findingsCount).toBe(0);
    expect(vm.architecture.boundaryViolationsCount).toBe(0);
    expect(vm.performance.metricsCount).toBe(0);
    expect(vm.aiEngineering.controlsEvaluated).toBe(0);
    expect(vm.recommendations).toHaveLength(0);
    expect(vm.roadmap.immediateItemsCount).toBe(0);
  });
});
