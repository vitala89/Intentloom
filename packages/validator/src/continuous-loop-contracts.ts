import type {
  ContinuousLoopCheckpoint,
  ContinuousLoopComparison,
  ContinuousLoopMemoryApply,
  ContinuousLoopMemoryProposal,
  ContinuousLoopWorkspaceOverview,
} from "@intentloom/protocol";
import { CONTINUOUS_LOOP_WORKSPACE_OVERVIEW_SCHEMA_URN } from "@intentloom/protocol";

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
  "ready",
  "proposed",
  "accepted",
  "blocked",
  "unsupported",
  "incompatible",
  "validation-failed",
  "w12-blocked",
] as const;

const CHANGE_KINDS = [
  "code",
  "policy",
  "evidence",
  "model-interpretation",
] as const;

function validateComparison(value: ContinuousLoopComparison): void {
  if (typeof value.compatible !== "boolean") {
    throw new Error("Invalid comparison.compatible");
  }
  if (!CHANGE_KINDS.includes(value.changeKind)) {
    throw new Error("Invalid comparison.changeKind");
  }
  stringArray(value.newFindingIds, "comparison.newFindingIds");
  stringArray(value.fixedFindingIds, "comparison.fixedFindingIds");
  stringArray(value.unchangedFindingIds, "comparison.unchangedFindingIds");
  if (typeof value.technicalDebtItemDelta !== "number") {
    throw new Error("Invalid comparison.technicalDebtItemDelta");
  }
  if (typeof value.architectureDriftDelta !== "number") {
    throw new Error("Invalid comparison.architectureDriftDelta");
  }
}

function validateCheckpoints(value: readonly ContinuousLoopCheckpoint[]): void {
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

function validateProposal(value: ContinuousLoopMemoryProposal): void {
  nonEmptyString(value.id, "memoryProposal.id");
  if (
    value.lifecycleState !== "draft" &&
    value.lifecycleState !== "proposed" &&
    value.lifecycleState !== "accepted"
  ) {
    throw new Error("Invalid memoryProposal.lifecycleState");
  }
  nonEmptyString(value.content, "memoryProposal.content");
}

function validateApply(value: ContinuousLoopMemoryApply): void {
  if (typeof value.attempted !== "boolean") {
    throw new Error("Invalid memoryApply.attempted");
  }
  if (typeof value.applied !== "boolean") {
    throw new Error("Invalid memoryApply.applied");
  }
  stringArray(value.diagnostics, "memoryApply.diagnostics");
}

export function validateContinuousLoopWorkspaceOverview(
  value: unknown,
): ContinuousLoopWorkspaceOverview {
  if (typeof value !== "object" || value === null) {
    throw new Error("Invalid continuous loop overview: expected object");
  }
  const record = value as ContinuousLoopWorkspaceOverview;
  if (record.schemaVersion !== CONTINUOUS_LOOP_WORKSPACE_OVERVIEW_SCHEMA_URN) {
    throw new Error("Invalid overview: unsupported schema version");
  }
  nonEmptyString(record.root, "root");
  nonEmptyString(record.projectId, "projectId");
  if (typeof record.preparedAt !== "number") {
    throw new Error("Invalid preparedAt");
  }
  if (!GATES.includes(record.loopGate)) {
    throw new Error("Invalid loopGate");
  }
  if (typeof record.mutationAllowed !== "boolean") {
    throw new Error("Invalid mutationAllowed");
  }
  if (record.mutationAllowed && record.loopGate !== "accepted") {
    throw new Error("Invalid mutationAllowed: only true after accepted gate");
  }
  validateComparison(record.comparison);
  validateProposal(record.memoryProposal);
  validateApply(record.memoryApply);
  nonEmptyString(record.nextFeature.title, "nextFeature.title");
  nonEmptyString(record.nextFeature.summary, "nextFeature.summary");
  validateCheckpoints(record.checkpoints);
  stringArray(record.diagnostics, "diagnostics");
  return record;
}
