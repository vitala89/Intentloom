import type {
  BoundedExecutionApplySummary,
  BoundedExecutionArchitectureCheck,
  BoundedExecutionCapability,
  BoundedExecutionCheckerResult,
  BoundedExecutionCheckpoint,
  BoundedExecutionDiffReview,
  BoundedExecutionWorkspaceOverview,
} from "@intentloom/protocol";
import { BOUNDED_EXECUTION_WORKSPACE_OVERVIEW_SCHEMA_URN } from "@intentloom/protocol";

function nonEmptyString(value: unknown, field: string): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`Invalid ${field}: expected non-empty string`);
  }
  return value;
}

function stringArray(value: unknown, field: string): readonly string[] {
  if (!Array.isArray(value)) {
    throw new Error(`Invalid ${field}: expected array`);
  }
  return value.map((entry, index) =>
    nonEmptyString(entry, `${field}[${index}]`),
  );
}

const GATES = [
  "w11-blocked",
  "capability-granted",
  "executed",
  "verified",
  "applied",
  "blocked",
  "unsupported",
  "validation-failed",
] as const;

function validateCapability(value: BoundedExecutionCapability): void {
  nonEmptyString(value.approvedRoot, "capability.approvedRoot");
  stringArray(value.allowedPaths, "capability.allowedPaths");
  stringArray(value.allowedCommands, "capability.allowedCommands");
  if (value.networkAccess !== false) {
    throw new Error("Invalid capability.networkAccess");
  }
  if (value.processExecution !== false) {
    throw new Error("Invalid capability.processExecution");
  }
  if (typeof value.mutationAllowed !== "boolean") {
    throw new Error("Invalid capability.mutationAllowed");
  }
}

function validateCheckpoints(
  value: readonly BoundedExecutionCheckpoint[],
): void {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error("Invalid checkpoints");
  }
  for (const checkpoint of value) {
    nonEmptyString(checkpoint.id, "checkpoint.id");
    nonEmptyString(checkpoint.label, "checkpoint.label");
    if (
      checkpoint.status !== "pending" &&
      checkpoint.status !== "passed" &&
      checkpoint.status !== "failed" &&
      checkpoint.status !== "blocked"
    ) {
      throw new Error("Invalid checkpoint.status");
    }
  }
}

function validateCheckers(
  value: readonly BoundedExecutionCheckerResult[],
): void {
  if (!Array.isArray(value)) {
    throw new Error("Invalid checkerResults");
  }
  for (const checker of value) {
    nonEmptyString(checker.checkerId, "checker.checkerId");
    if (typeof checker.passed !== "boolean") {
      throw new Error("Invalid checker.passed");
    }
    nonEmptyString(checker.summary, "checker.summary");
  }
}

function validateArchitecture(value: BoundedExecutionArchitectureCheck): void {
  if (typeof value.passed !== "boolean") {
    throw new Error("Invalid architectureCheck.passed");
  }
  nonEmptyString(value.summary, "architectureCheck.summary");
}

function validateDiff(value: BoundedExecutionDiffReview): void {
  stringArray(value.proposedPaths, "diffReview.proposedPaths");
  stringArray(value.allowedPaths, "diffReview.allowedPaths");
  stringArray(value.outsideApprovedPaths, "diffReview.outsideApprovedPaths");
  if (value.reviewRequired !== true) {
    throw new Error("Invalid diffReview.reviewRequired");
  }
}

function validateApply(value: BoundedExecutionApplySummary): void {
  if (typeof value.attempted !== "boolean") {
    throw new Error("Invalid apply.attempted");
  }
  if (typeof value.applied !== "boolean") {
    throw new Error("Invalid apply.applied");
  }
  stringArray(value.diagnostics, "apply.diagnostics");
}

export function validateBoundedExecutionWorkspaceOverview(
  value: unknown,
): BoundedExecutionWorkspaceOverview {
  if (typeof value !== "object" || value === null) {
    throw new Error("Invalid bounded execution overview: expected object");
  }
  const record = value as BoundedExecutionWorkspaceOverview;
  if (
    record.schemaVersion !== BOUNDED_EXECUTION_WORKSPACE_OVERVIEW_SCHEMA_URN
  ) {
    throw new Error("Invalid overview: unsupported schema version");
  }
  nonEmptyString(record.root, "root");
  nonEmptyString(record.projectId, "projectId");
  if (typeof record.preparedAt !== "number") {
    throw new Error("Invalid preparedAt");
  }
  nonEmptyString(record.intentId, "intentId");
  nonEmptyString(record.selectedAlternativeId, "selectedAlternativeId");
  if (!GATES.includes(record.executionGate)) {
    throw new Error("Invalid executionGate");
  }
  if (typeof record.mutationAllowed !== "boolean") {
    throw new Error("Invalid mutationAllowed");
  }
  if (record.mutationAllowed && record.executionGate !== "applied") {
    throw new Error("Invalid mutationAllowed: only true after applied gate");
  }
  validateCapability(record.capability);
  validateCheckpoints(record.checkpoints);
  validateCheckers(record.checkerResults);
  validateArchitecture(record.architectureCheck);
  validateDiff(record.diffReview);
  validateApply(record.apply);
  stringArray(record.verificationEvidence, "verificationEvidence");
  stringArray(record.diagnostics, "diagnostics");
  nonEmptyString(record.harnessScorecardStatus, "harnessScorecardStatus");
  return record;
}
