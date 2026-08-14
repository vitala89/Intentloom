import type { ContinuousLoopWorkspaceOverview } from "@intentloom/protocol";

export type ContinuousLoopClientSurfaceState =
  "idle" | "loading" | "ready" | "empty" | "error" | "unsupported";

export interface ContinuousLoopWorkspaceViewModel {
  readonly root: string;
  readonly projectId: string;
  readonly preparedAt: number;
  readonly loopGate: string;
  readonly mutationAllowed: boolean;
  readonly changeKind: string;
  readonly compatible: boolean;
  readonly newFindingCount: number;
  readonly fixedFindingCount: number;
  readonly memoryLifecycleState: string;
  readonly applyAttempted: boolean;
  readonly applyApplied: boolean;
  readonly nextFeatureTitle: string;
  readonly diagnostics: readonly string[];
  readonly checkpointCount: number;
  readonly checkpoints: readonly {
    readonly id: string;
    readonly label: string;
    readonly status: string;
  }[];
  readonly surfaceState: ContinuousLoopClientSurfaceState;
}

export function buildContinuousLoopWorkspaceViewModel(
  overview: ContinuousLoopWorkspaceOverview,
  surfaceState: ContinuousLoopClientSurfaceState = "ready",
): ContinuousLoopWorkspaceViewModel {
  return {
    root: overview.root,
    projectId: overview.projectId,
    preparedAt: overview.preparedAt,
    loopGate: overview.loopGate,
    mutationAllowed: overview.mutationAllowed,
    changeKind: overview.comparison.changeKind,
    compatible: overview.comparison.compatible,
    newFindingCount: overview.comparison.newFindingIds.length,
    fixedFindingCount: overview.comparison.fixedFindingIds.length,
    memoryLifecycleState: overview.memoryProposal.lifecycleState,
    applyAttempted: overview.memoryApply.attempted,
    applyApplied: overview.memoryApply.applied,
    nextFeatureTitle: overview.nextFeature.title,
    diagnostics: overview.diagnostics,
    checkpointCount: overview.checkpoints.length,
    checkpoints: overview.checkpoints.map((checkpoint) => ({
      id: checkpoint.id,
      label: checkpoint.label,
      status: checkpoint.status,
    })),
    surfaceState,
  };
}

export function renderContinuousLoopWorkspaceText(
  viewmodel: ContinuousLoopWorkspaceViewModel,
): string {
  const lines = [
    `Continuous Loop Workspace: ${viewmodel.root}`,
    `Project: ${viewmodel.projectId}`,
    `Loop gate: ${viewmodel.loopGate}`,
    `Change kind: ${viewmodel.changeKind}`,
    `Compatible: ${viewmodel.compatible}`,
    `New findings: ${viewmodel.newFindingCount}`,
    `Fixed findings: ${viewmodel.fixedFindingCount}`,
    `Memory: ${viewmodel.memoryLifecycleState}`,
    `Mutation allowed: ${viewmodel.mutationAllowed}`,
    `Next feature: ${viewmodel.nextFeatureTitle}`,
    `Surface state: ${viewmodel.surfaceState}`,
  ];
  if (viewmodel.diagnostics.length > 0) {
    lines.push(`Diagnostics: ${viewmodel.diagnostics.join(", ")}`);
  }
  return lines.join("\n");
}
