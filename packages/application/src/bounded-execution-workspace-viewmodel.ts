import type { BoundedExecutionWorkspaceOverview } from "@intentloom/protocol";

export type BoundedExecutionClientSurfaceState =
  "idle" | "loading" | "ready" | "empty" | "error" | "unsupported";

export interface BoundedExecutionWorkspaceViewModel {
  readonly root: string;
  readonly projectId: string;
  readonly preparedAt: number;
  readonly intentId: string;
  readonly selectedAlternativeId: string;
  readonly executionGate: string;
  readonly mutationAllowed: boolean;
  readonly approvedRoot: string;
  readonly allowedPaths: readonly string[];
  readonly allowedCommands: readonly string[];
  readonly networkAccess: false;
  readonly processExecution: false;
  readonly checkpointCount: number;
  readonly checkpoints: readonly {
    readonly id: string;
    readonly label: string;
    readonly status: string;
  }[];
  readonly checkerCount: number;
  readonly architecturePassed: boolean;
  readonly proposedPaths: readonly string[];
  readonly outsideApprovedPaths: readonly string[];
  readonly applyAttempted: boolean;
  readonly applyApplied: boolean;
  readonly diagnostics: readonly string[];
  readonly harnessScorecardStatus: string;
  readonly verificationEvidence: readonly string[];
  readonly surfaceState: BoundedExecutionClientSurfaceState;
}

export function buildBoundedExecutionWorkspaceViewModel(
  overview: BoundedExecutionWorkspaceOverview,
  surfaceState: BoundedExecutionClientSurfaceState = "ready",
): BoundedExecutionWorkspaceViewModel {
  return {
    root: overview.root,
    projectId: overview.projectId,
    preparedAt: overview.preparedAt,
    intentId: overview.intentId,
    selectedAlternativeId: overview.selectedAlternativeId,
    executionGate: overview.executionGate,
    mutationAllowed: overview.mutationAllowed,
    approvedRoot: overview.capability.approvedRoot,
    allowedPaths: overview.capability.allowedPaths,
    allowedCommands: overview.capability.allowedCommands,
    networkAccess: false,
    processExecution: false,
    checkpointCount: overview.checkpoints.length,
    checkpoints: overview.checkpoints.map((checkpoint) => ({
      id: checkpoint.id,
      label: checkpoint.label,
      status: checkpoint.status,
    })),
    checkerCount: overview.checkerResults.length,
    architecturePassed: overview.architectureCheck.passed,
    proposedPaths: overview.diffReview.proposedPaths,
    outsideApprovedPaths: overview.diffReview.outsideApprovedPaths,
    applyAttempted: overview.apply.attempted,
    applyApplied: overview.apply.applied,
    diagnostics: overview.diagnostics,
    harnessScorecardStatus: overview.harnessScorecardStatus,
    verificationEvidence: overview.verificationEvidence,
    surfaceState,
  };
}

export function renderBoundedExecutionWorkspaceText(
  viewmodel: BoundedExecutionWorkspaceViewModel,
): string {
  const lines = [
    `Bounded Execution Workspace: ${viewmodel.root}`,
    `Project: ${viewmodel.projectId}`,
    `Intent: ${viewmodel.intentId}`,
    `Execution gate: ${viewmodel.executionGate}`,
    `Mutation allowed: ${viewmodel.mutationAllowed}`,
    `Allowed paths: ${viewmodel.allowedPaths.join(", ") || "none"}`,
    `Network access: ${viewmodel.networkAccess}`,
    `Process execution: ${viewmodel.processExecution}`,
    `Checkpoints: ${viewmodel.checkpointCount}`,
  ];
  for (const checkpoint of viewmodel.checkpoints) {
    lines.push(`  - ${checkpoint.label}: ${checkpoint.status}`);
  }
  lines.push(
    `Architecture passed: ${viewmodel.architecturePassed}`,
    `Apply attempted: ${viewmodel.applyAttempted}`,
    `Apply applied: ${viewmodel.applyApplied}`,
    `Harness: ${viewmodel.harnessScorecardStatus}`,
    `Surface state: ${viewmodel.surfaceState}`,
  );
  if (viewmodel.diagnostics.length > 0) {
    lines.push(`Diagnostics: ${viewmodel.diagnostics.join(", ")}`);
  }
  return lines.join("\n");
}
