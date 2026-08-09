export interface ArchitectureDependencyEdge {
  readonly from: string;
  readonly to: string;
  readonly isBoundaryViolation: boolean;
}

export interface ArchitectureAssessmentResult {
  readonly packages: readonly string[];
  readonly dependencyEdges: readonly ArchitectureDependencyEdge[];
  readonly dependencyCycles: readonly (readonly string[])[];
  readonly driftDiagnostics: readonly string[];
}

export interface QualityPackReference {
  readonly name: string;
  readonly version: string;
  readonly rulesCount: number;
}

export interface CheckerAdapterDiagnostics {
  readonly toolName: string;
  readonly toolVersion: string;
  readonly diagnosticsCount: number;
  readonly rawOutputDigest?: string;
}

export type GraphProviderKind =
  | "workspace-manifest"
  | "typescript-project-references"
  | "import-graph"
  | "nx-export"
  | "cargo-metadata";

export interface PerformanceMetricDelta {
  readonly metricName: string;
  readonly beforeValue: number;
  readonly afterValue: number;
  readonly unit: string;
  readonly deltaPercent: number;
}

export interface PerformanceBaselineEvidence {
  readonly scenarioId: string;
  readonly environment: string;
  readonly metrics: readonly PerformanceMetricDelta[];
}

export interface MonorepoCIAssessmentResult {
  readonly workspaceType: string;
  readonly cachedTasksCount: number;
  readonly uncachedTasksCount: number;
  readonly ciPipelineCount: number;
}

export interface AIEngineeringControlCheck {
  readonly checkId: string;
  readonly status: "passed" | "warning" | "failed" | "insufficient-evidence";
  readonly description: string;
}

export interface AIEngineeringAssessmentResult {
  readonly controlsEvaluated: number;
  readonly checks: readonly AIEngineeringControlCheck[];
}
