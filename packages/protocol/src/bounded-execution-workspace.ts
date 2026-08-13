export const BOUNDED_EXECUTION_WORKSPACE_OVERVIEW_SCHEMA_URN =
  "urn:intentloom:schema:bounded-execution-workspace-overview:1" as const;

export const BOUNDED_EXECUTION_OPERATIONS = [
  "approveImplementationPlan",
  "grantExecutionCapability",
  "executeBoundedTask",
  "collectCheckpoints",
  "runVerificationChecks",
  "prepareDiffReview",
  "applyBoundedExecution",
] as const;

export type BoundedExecutionOperation =
  (typeof BOUNDED_EXECUTION_OPERATIONS)[number];

export type BoundedExecutionGate =
  | "w11-blocked"
  | "capability-granted"
  | "executed"
  | "verified"
  | "applied"
  | "blocked"
  | "unsupported"
  | "validation-failed";

export type BoundedExecutionCheckpointStatus =
  "pending" | "passed" | "failed" | "blocked";

export interface BoundedExecutionCapability {
  readonly approvedRoot: string;
  readonly allowedPaths: readonly string[];
  readonly allowedCommands: readonly string[];
  readonly networkAccess: false;
  readonly processExecution: false;
  readonly mutationAllowed: boolean;
}

export interface BoundedExecutionCheckpoint {
  readonly id: string;
  readonly label: string;
  readonly status: BoundedExecutionCheckpointStatus;
}

export interface BoundedExecutionCheckerResult {
  readonly checkerId: string;
  readonly passed: boolean;
  readonly summary: string;
}

export interface BoundedExecutionArchitectureCheck {
  readonly passed: boolean;
  readonly summary: string;
}

export interface BoundedExecutionDiffReview {
  readonly proposedPaths: readonly string[];
  readonly allowedPaths: readonly string[];
  readonly outsideApprovedPaths: readonly string[];
  readonly reviewRequired: true;
}

export interface BoundedExecutionApplySummary {
  readonly attempted: boolean;
  readonly applied: boolean;
  readonly diagnostics: readonly string[];
}

export interface BoundedExecutionWorkspaceOverview {
  readonly schemaVersion: typeof BOUNDED_EXECUTION_WORKSPACE_OVERVIEW_SCHEMA_URN;
  readonly root: string;
  readonly projectId: string;
  readonly preparedAt: number;
  readonly intentId: string;
  readonly selectedAlternativeId: string;
  readonly executionGate: BoundedExecutionGate;
  readonly mutationAllowed: boolean;
  readonly capability: BoundedExecutionCapability;
  readonly checkpoints: readonly BoundedExecutionCheckpoint[];
  readonly checkerResults: readonly BoundedExecutionCheckerResult[];
  readonly architectureCheck: BoundedExecutionArchitectureCheck;
  readonly diffReview: BoundedExecutionDiffReview;
  readonly apply: BoundedExecutionApplySummary;
  readonly verificationEvidence: readonly string[];
  readonly diagnostics: readonly string[];
  readonly harnessScorecardStatus: string;
}
