import type {
  AIEngineeringAssessmentResult,
  AssessmentModule,
  CheckerAdapterDiagnostics,
  GraphProviderKind,
  MonorepoCIAssessmentResult,
  PerformanceBaselineEvidence,
  QualityPackReference,
} from "@intentloom/protocol";

export interface AssessProjectOptions {
  readonly root: string;
  readonly projectId?: string;
  readonly profile?: string;
  readonly modules?: readonly AssessmentModule[];
  readonly now?: () => number;
  readonly packages?: readonly string[];
  readonly dependencyEdges?: readonly {
    readonly from: string;
    readonly to: string;
    readonly isBoundaryViolation: boolean;
  }[];
  readonly qualityPacks?: readonly QualityPackReference[];
  readonly checkerDiagnostics?: readonly CheckerAdapterDiagnostics[];
  readonly graphProviderKind?: GraphProviderKind;
  readonly performanceEvidence?: PerformanceBaselineEvidence;
  readonly monorepoCiResult?: MonorepoCIAssessmentResult;
  readonly aiEngineeringResult?: AIEngineeringAssessmentResult;
}
