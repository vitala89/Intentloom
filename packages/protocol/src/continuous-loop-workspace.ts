export const CONTINUOUS_LOOP_WORKSPACE_OVERVIEW_SCHEMA_URN =
  "urn:intentloom:schema:continuous-loop-workspace-overview:1" as const;

export const CONTINUOUS_LOOP_OPERATIONS = [
  "refreshAssessment",
  "classifyFindings",
  "proposeProjectMemory",
  "reviewMemoryUpdate",
  "suggestNextFeature",
] as const;

export type ContinuousLoopOperation =
  (typeof CONTINUOUS_LOOP_OPERATIONS)[number];

export type ContinuousLoopGate =
  | "ready"
  | "proposed"
  | "accepted"
  | "blocked"
  | "unsupported"
  | "incompatible"
  | "validation-failed"
  | "w12-blocked";

export type ContinuousLoopChangeKind =
  "code" | "policy" | "evidence" | "model-interpretation";

export type ContinuousLoopCheckpointStatus =
  "pending" | "passed" | "failed" | "blocked";

export interface ContinuousLoopSnapshot {
  readonly projectId: string;
  readonly schemaVersion: string;
  readonly findingIds: readonly string[];
  readonly technicalDebtItemCount: number;
  readonly architectureViolationCount: number;
}

export interface ContinuousLoopComparison {
  readonly compatible: boolean;
  readonly changeKind: ContinuousLoopChangeKind;
  readonly newFindingIds: readonly string[];
  readonly fixedFindingIds: readonly string[];
  readonly unchangedFindingIds: readonly string[];
  readonly technicalDebtItemDelta: number;
  readonly architectureDriftDelta: number;
}

export interface ContinuousLoopCheckpoint {
  readonly id: string;
  readonly label: string;
  readonly status: ContinuousLoopCheckpointStatus;
}

export interface ContinuousLoopMemoryProposal {
  readonly id: string;
  readonly lifecycleState: "draft" | "proposed" | "accepted";
  readonly content: string;
}

export interface ContinuousLoopMemoryApply {
  readonly attempted: boolean;
  readonly applied: boolean;
  readonly diagnostics: readonly string[];
}

export interface ContinuousLoopNextFeature {
  readonly title: string;
  readonly summary: string;
}

export interface ContinuousLoopWorkspaceOverview {
  readonly schemaVersion: typeof CONTINUOUS_LOOP_WORKSPACE_OVERVIEW_SCHEMA_URN;
  readonly root: string;
  readonly projectId: string;
  readonly preparedAt: number;
  readonly loopGate: ContinuousLoopGate;
  readonly mutationAllowed: boolean;
  readonly comparison: ContinuousLoopComparison;
  readonly memoryProposal: ContinuousLoopMemoryProposal;
  readonly memoryApply: ContinuousLoopMemoryApply;
  readonly nextFeature: ContinuousLoopNextFeature;
  readonly checkpoints: readonly ContinuousLoopCheckpoint[];
  readonly diagnostics: readonly string[];
}
