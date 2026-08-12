import type {
  ExistingProjectFlowStep,
  ExistingProjectScanScope,
  ExistingProjectWorkspaceOverview,
} from "@intentloom/protocol";

export type ExistingProjectClientSurfaceState =
  "idle" | "loading" | "ready" | "empty" | "error" | "unsupported";

export interface ExistingProjectFlowStepViewModel {
  readonly id: string;
  readonly label: string;
  readonly status: ExistingProjectFlowStep["status"];
  readonly readOnly: true;
}

export interface ExistingProjectWorkspaceViewModel {
  readonly root: string;
  readonly projectId: string;
  readonly scope: ExistingProjectScanScope;
  readonly preparedAt: number;
  readonly profile: string;
  readonly readiness: string;
  readonly detectedAdapters: readonly string[];
  readonly inspectFindingCount: number;
  readonly adoptionOperationCount: number;
  readonly adoptionFindingCount: number;
  readonly specializedCandidateCount: number;
  readonly compatiblePackIds: readonly string[];
  readonly doctorFindingCount: number;
  readonly assessmentFindingsCount: number;
  readonly recommendationsCount: number;
  readonly targetOptionId?: string;
  readonly flowSteps: readonly ExistingProjectFlowStepViewModel[];
  readonly surfaceState: ExistingProjectClientSurfaceState;
}

export function buildExistingProjectWorkspaceViewModel(
  overview: ExistingProjectWorkspaceOverview,
  surfaceState: ExistingProjectClientSurfaceState = "ready",
): ExistingProjectWorkspaceViewModel {
  return {
    root: overview.root,
    projectId: overview.projectId,
    scope: overview.scope,
    preparedAt: overview.preparedAt,
    profile: overview.inspect.profile,
    readiness: overview.inspect.readiness,
    detectedAdapters: overview.inspect.detectedAdapters,
    inspectFindingCount: overview.inspect.findingCount,
    adoptionOperationCount: overview.adoption?.operationCount ?? 0,
    adoptionFindingCount: overview.adoption?.findingCount ?? 0,
    specializedCandidateCount: overview.specializedPacks.candidateCount,
    compatiblePackIds: overview.specializedPacks.compatiblePackIds,
    doctorFindingCount: overview.doctor?.findingCount ?? 0,
    assessmentFindingsCount: overview.assessment?.findingsCount ?? 0,
    recommendationsCount: overview.assessment?.recommendationsCount ?? 0,
    ...(overview.assessment?.targetOptionId !== undefined
      ? { targetOptionId: overview.assessment.targetOptionId }
      : {}),
    flowSteps: overview.flowSteps.map((step) => ({
      id: step.id,
      label: step.label,
      status: step.status,
      readOnly: true as const,
    })),
    surfaceState,
  };
}

export function renderExistingProjectWorkspaceText(
  viewmodel: ExistingProjectWorkspaceViewModel,
): string {
  const lines = [
    `Existing Project Workspace: ${viewmodel.root}`,
    `Project: ${viewmodel.projectId}`,
    `Scope: ${viewmodel.scope}`,
    `Profile: ${viewmodel.profile} (${viewmodel.readiness})`,
    `Inspect findings: ${viewmodel.inspectFindingCount}`,
    `Adoption operations: ${viewmodel.adoptionOperationCount}`,
    `Specialized candidates: ${viewmodel.specializedCandidateCount}`,
    `Compatible packs: ${viewmodel.compatiblePackIds.join(", ") || "none"}`,
    `Doctor findings: ${viewmodel.doctorFindingCount}`,
    `Assessment findings: ${viewmodel.assessmentFindingsCount}`,
    `Recommendations: ${viewmodel.recommendationsCount}`,
    `Surface state: ${viewmodel.surfaceState}`,
    "Flow:",
  ];
  for (const step of viewmodel.flowSteps) {
    lines.push(`  - ${step.label}: ${step.status}`);
  }
  return lines.join("\n");
}
