import type { AssessmentReportModel } from "@intentloom/protocol";

export interface AssessmentViewModel {
  readonly overview: {
    readonly assessmentId: string;
    readonly projectId: string;
    readonly root: string;
    readonly status: string;
    readonly summary: string;
    readonly findingsCount: number;
    readonly evidenceCount: number;
  };
  readonly architecture: {
    readonly packagesCount: number;
    readonly boundaryViolationsCount: number;
    readonly driftDiagnostics: readonly string[];
  };
  readonly quality: {
    readonly findingsCount: number;
    readonly evidenceCount: number;
  };
  readonly performance: {
    readonly scenarioId?: string;
    readonly metricsCount: number;
  };
  readonly monorepoCi: {
    readonly workspaceType?: string;
    readonly cachedTasksCount?: number;
  };
  readonly aiEngineering: {
    readonly controlsEvaluated: number;
    readonly checksCount: number;
  };
  readonly technicalDebt: {
    readonly itemsCount: number;
  };
  readonly recommendations: readonly {
    readonly optionId: string;
    readonly title: string;
    readonly level: string;
  }[];
  readonly roadmap: {
    readonly targetOptionId?: string;
    readonly immediateItemsCount: number;
    readonly nextItemsCount: number;
    readonly laterItemsCount: number;
  };
}

export function buildAssessmentViewModel(
  report: AssessmentReportModel,
): AssessmentViewModel {
  const env = report.envelope;
  const arch = env.architectureResult;
  const perf = env.performanceEvidence;
  const ci = env.monorepoCiResult;
  const ai = env.aiEngineeringResult;

  const immediatePhase = env.remediationRoadmap?.phases.find(
    (p) => p.phaseName === "Immediate",
  );
  const nextPhase = env.remediationRoadmap?.phases.find(
    (p) => p.phaseName === "Next",
  );
  const laterPhase = env.remediationRoadmap?.phases.find(
    (p) => p.phaseName === "Later",
  );

  return {
    overview: {
      assessmentId: env.identity.id,
      projectId: env.scope.projectId,
      root: env.scope.root,
      status: env.status,
      summary: report.summary,
      findingsCount: env.findingReferences.length,
      evidenceCount: env.evidenceReferences.length,
    },
    architecture: {
      packagesCount: arch?.packages.length ?? 0,
      boundaryViolationsCount:
        arch?.dependencyEdges.filter((e) => e.isBoundaryViolation).length ?? 0,
      driftDiagnostics: arch?.driftDiagnostics ?? [],
    },
    quality: {
      findingsCount:
        env.findingProjections?.filter((fp) => fp.category === "quality")
          .length ?? 0,
      evidenceCount: env.evidenceReferences.length,
    },
    performance: {
      ...(perf?.scenarioId !== undefined
        ? { scenarioId: perf.scenarioId }
        : {}),
      metricsCount: perf?.metrics.length ?? 0,
    },
    monorepoCi: {
      ...(ci?.workspaceType !== undefined
        ? { workspaceType: ci.workspaceType }
        : {}),
      ...(ci?.cachedTasksCount !== undefined
        ? { cachedTasksCount: ci.cachedTasksCount }
        : {}),
    },
    aiEngineering: {
      controlsEvaluated: ai?.controlsEvaluated ?? 0,
      checksCount: ai?.checks.length ?? 0,
    },
    technicalDebt: {
      itemsCount: report.technicalDebtMap.items.length,
    },
    recommendations:
      env.targetStateOptions?.map((opt) => ({
        optionId: opt.optionId,
        title: opt.title,
        level: opt.recommendationLevel,
      })) ?? [],
    roadmap: {
      ...(env.remediationRoadmap?.targetStateOptionId !== undefined
        ? { targetOptionId: env.remediationRoadmap.targetStateOptionId }
        : {}),
      immediateItemsCount: immediatePhase?.items.length ?? 0,
      nextItemsCount: nextPhase?.items.length ?? 0,
      laterItemsCount: laterPhase?.items.length ?? 0,
    },
  };
}
