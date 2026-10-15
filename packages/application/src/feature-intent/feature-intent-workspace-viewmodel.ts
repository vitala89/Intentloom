import type { FeatureIntentWorkspaceOverview } from "@intentloom/protocol";

export type FeatureIntentClientSurfaceState =
  "idle" | "loading" | "ready" | "empty" | "error" | "unsupported";

export interface FeatureIntentAlternativeViewModel {
  readonly id: string;
  readonly title: string;
  readonly strategy: string;
  readonly summary: string;
  readonly selected: boolean;
}

export interface FeatureIntentPlanStepViewModel {
  readonly id: string;
  readonly label: string;
}

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
  readonly publicApiSurfaces: readonly string[];
  readonly graphNodeCount: number;
  readonly specializedPackIds: readonly string[];
  readonly foundationPresent: boolean;
  readonly impactSummary: string;
  readonly assessmentFindingsCount: number;
  readonly debtItemCount: number;
  readonly publicApiChangeRisk: string;
  readonly evidence: readonly string[];
  readonly alternativeCount: number;
  readonly alternatives: readonly FeatureIntentAlternativeViewModel[];
  readonly selectedAlternativeId: string;
  readonly planStepCount: number;
  readonly planSteps: readonly FeatureIntentPlanStepViewModel[];
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
    publicApiSurfaces: overview.affectedScope.publicApiSurfaces,
    graphNodeCount: overview.architectureImpact.graphNodeCount,
    specializedPackIds: overview.affectedScope.specializedPackIds,
    foundationPresent: overview.affectedScope.foundationPresent,
    impactSummary: overview.architectureImpact.summary,
    assessmentFindingsCount:
      overview.architectureImpact.assessmentFindingsCount,
    debtItemCount: overview.architectureImpact.debtItemCount,
    publicApiChangeRisk: overview.architectureImpact.publicApiChangeRisk,
    evidence: overview.architectureImpact.evidence,
    alternativeCount: overview.alternatives.length,
    alternatives: overview.alternatives.map((alternative) => ({
      id: alternative.id,
      title: alternative.title,
      strategy: alternative.strategy,
      summary: alternative.summary,
      selected: alternative.id === overview.plan.selectedAlternativeId,
    })),
    selectedAlternativeId: overview.plan.selectedAlternativeId,
    planStepCount: overview.plan.steps.length,
    planSteps: overview.plan.steps.map((step) => ({
      id: step.id,
      label: step.label,
    })),
    reviewRequired: true,
    mutationAllowed: false,
    executionGate: "w11-blocked",
    surfaceState,
  };
}

export function renderFeatureIntentWorkspaceText(
  viewmodel: FeatureIntentWorkspaceViewModel,
): string {
  const lines = [
    `Feature Intent Workspace: ${viewmodel.root}`,
    `Project: ${viewmodel.projectId}`,
    `Intent: ${viewmodel.title}`,
    `Packages: ${viewmodel.packages.join(", ")}`,
    `Public API surfaces: ${viewmodel.publicApiSurfaces.join(", ") || "none"}`,
    `Impact: ${viewmodel.impactSummary}`,
    `Public API change risk: ${viewmodel.publicApiChangeRisk}`,
    `Alternatives: ${viewmodel.alternativeCount}`,
  ];
  for (const alternative of viewmodel.alternatives) {
    const marker = alternative.selected ? " (selected)" : "";
    lines.push(`  - ${alternative.title}${marker}: ${alternative.summary}`);
  }
  lines.push(`Plan steps: ${viewmodel.planStepCount}`);
  for (const step of viewmodel.planSteps) {
    lines.push(`  - ${step.label}`);
  }
  lines.push(
    `Review required: ${viewmodel.reviewRequired}`,
    `Mutation allowed: ${viewmodel.mutationAllowed}`,
    `Execution gate: ${viewmodel.executionGate}`,
    `Surface state: ${viewmodel.surfaceState}`,
  );
  return lines.join("\n");
}
