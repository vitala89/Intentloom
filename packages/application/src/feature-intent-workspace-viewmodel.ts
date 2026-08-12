import type { FeatureIntentWorkspaceOverview } from "@intentloom/protocol";

export type FeatureIntentClientSurfaceState =
  "idle" | "loading" | "ready" | "empty" | "error" | "unsupported";

export interface FeatureIntentWorkspaceViewModel {
  readonly root: string;
  readonly projectId: string;
  readonly preparedAt: number;
  readonly intentId: string;
  readonly title: string;
  readonly summary: string;
  readonly packageCount: number;
  readonly packages: readonly string[];
  readonly publicApiCount: number;
  readonly graphNodeCount: number;
  readonly specializedPackIds: readonly string[];
  readonly foundationPresent: boolean;
  readonly impactSummary: string;
  readonly assessmentFindingsCount: number;
  readonly debtItemCount: number;
  readonly publicApiChangeRisk: string;
  readonly alternativeCount: number;
  readonly selectedAlternativeId: string;
  readonly planStepCount: number;
  readonly reviewRequired: true;
  readonly mutationAllowed: false;
  readonly executionGate: "w11-blocked";
  readonly surfaceState: FeatureIntentClientSurfaceState;
}

export function buildFeatureIntentWorkspaceViewModel(
  overview: FeatureIntentWorkspaceOverview,
  surfaceState: FeatureIntentClientSurfaceState = "ready",
): FeatureIntentWorkspaceViewModel {
  return {
    root: overview.root,
    projectId: overview.projectId,
    preparedAt: overview.preparedAt,
    intentId: overview.intent.id,
    title: overview.intent.title,
    summary: overview.intent.summary,
    packageCount: overview.affectedScope.packages.length,
    packages: overview.affectedScope.packages,
    publicApiCount: overview.affectedScope.publicApiSurfaces.length,
    graphNodeCount: overview.architectureImpact.graphNodeCount,
    specializedPackIds: overview.affectedScope.specializedPackIds,
    foundationPresent: overview.affectedScope.foundationPresent,
    impactSummary: overview.architectureImpact.summary,
    assessmentFindingsCount:
      overview.architectureImpact.assessmentFindingsCount,
    debtItemCount: overview.architectureImpact.debtItemCount,
    publicApiChangeRisk: overview.architectureImpact.publicApiChangeRisk,
    alternativeCount: overview.alternatives.length,
    selectedAlternativeId: overview.plan.selectedAlternativeId,
    planStepCount: overview.plan.steps.length,
    reviewRequired: true,
    mutationAllowed: false,
    executionGate: "w11-blocked",
    surfaceState,
  };
}

export function renderFeatureIntentWorkspaceText(
  viewmodel: FeatureIntentWorkspaceViewModel,
): string {
  return [
    `Feature Intent Workspace: ${viewmodel.root}`,
    `Project: ${viewmodel.projectId}`,
    `Intent: ${viewmodel.title}`,
    `Packages: ${viewmodel.packages.join(", ")}`,
    `Impact: ${viewmodel.impactSummary}`,
    `Alternatives: ${viewmodel.alternativeCount}`,
    `Plan steps: ${viewmodel.planStepCount}`,
    `Review required: ${viewmodel.reviewRequired}`,
    `Mutation allowed: ${viewmodel.mutationAllowed}`,
    `Execution gate: ${viewmodel.executionGate}`,
    `Surface state: ${viewmodel.surfaceState}`,
  ].join("\n");
}
