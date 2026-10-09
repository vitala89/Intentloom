import { ProtocolValidationError } from "../../../protocol-validation-error.js";
import { PROTOCOL_VERSION } from "../../../jsonrpc.js";
import {
  NEUTRON_MUTATION_UNDO_EXECUTION_OUTCOMES,
  NEUTRON_MUTATION_UNDO_EXECUTION_SCHEMA_URN,
  type NeutronMutationUndoExecutionOutcome,
  type NeutronMutationUndoExecutionPath,
  type NeutronMutationUndoExecutionResult,
  type NeutronMutationUndoExecutionVerification,
} from "./neutron-mutation-undo-execution.js";

const SUCCESS = new Set<NeutronMutationUndoExecutionOutcome>([
  "undone",
  "replay",
  "already-undone",
]);

const IDENTITY_LIMIT = 4096;

const RESULT_SECRET_KEYS = [
  "approval",
  "approvalId",
  "approvalToken",
  "approved",
  "bytes",
  "content",
  "currentContent",
  "expectedContentDigest",
  "expectedDigest",
  "files",
  "grantedApprovals",
  "manifestDigest",
  "mutationAllowed",
  "mutationClass",
  "payload",
  "payloadPath",
  "planDigest",
  "preApplyDigest",
  "previousContent",
  "proposedContent",
  "restore",
  "reviewArtifactDigest",
  "rollback",
  "rollbackEvidence",
  "snapshot",
  "snapshotPath",
] as const;

export function assertUndoExecutionSchema(
  result: Record<string, unknown>,
): void {
  if (result.schemaVersion !== NEUTRON_MUTATION_UNDO_EXECUTION_SCHEMA_URN) {
    throw new ProtocolValidationError(
      -32602,
      "unsupported neutron mutation undo execution schema",
    );
  }
  if (result.protocolVersion !== PROTOCOL_VERSION) {
    throw new ProtocolValidationError(-32602, "unsupported protocol version");
  }
}

export function assertUndoExecutionShape(
  outcome: NeutronMutationUndoExecutionOutcome,
  undone: boolean,
  verification: NeutronMutationUndoExecutionVerification,
  paths: readonly NeutronMutationUndoExecutionPath[] | undefined,
): void {
  const success = SUCCESS.has(outcome);
  if (undone !== success) {
    throw new ProtocolValidationError(
      -32602,
      "undo execution undone flag does not match the outcome",
    );
  }
  const expected = success ? "pending" : "not-run";
  if (verification !== expected) {
    throw new ProtocolValidationError(
      -32602,
      "undo execution verification does not match the outcome",
    );
  }
  if (success && (paths === undefined || paths.length === 0)) {
    throw new ProtocolValidationError(
      -32602,
      "undo execution paths are required when undone",
    );
  }
  if (!success && paths !== undefined) {
    throw new ProtocolValidationError(
      -32602,
      "undo execution paths are only present when undone",
    );
  }
}

export function assembleValidatedUndoExecution(
  result: Record<string, unknown>,
  outcome: NeutronMutationUndoExecutionOutcome,
  undone: boolean,
  verification: NeutronMutationUndoExecutionVerification,
  paths: readonly NeutronMutationUndoExecutionPath[] | undefined,
): NeutronMutationUndoExecutionResult {
  const undoTransactionId = optionalId(result.undoTransactionId);
  if (undone && undoTransactionId === undefined) {
    throw new ProtocolValidationError(
      -32602,
      "undo execution requires undoTransactionId when undone",
    );
  }
  return {
    schemaVersion: NEUTRON_MUTATION_UNDO_EXECUTION_SCHEMA_URN,
    protocolVersion: PROTOCOL_VERSION,
    outcome,
    proposalId: boundedString(result.proposalId, "proposalId"),
    transactionId: boundedString(result.transactionId, "transactionId"),
    ...(undoTransactionId === undefined ? {} : { undoTransactionId }),
    undone,
    verified: false,
    verification,
    historicalApplied: result.historicalApplied === true,
    reconciliationRequired: result.reconciliationRequired === true,
    affectedPathCount: count(result.affectedPathCount, "affectedPathCount"),
    createdPathCount: count(result.createdPathCount, "createdPathCount"),
    updatedPathCount: count(result.updatedPathCount, "updatedPathCount"),
    unchangedPathCount: count(result.unchangedPathCount, "unchangedPathCount"),
    ...(paths === undefined ? {} : { paths }),
  };
}

export function rejectForbiddenUndoExecutionKeys(
  result: Record<string, unknown>,
): void {
  const allowed = new Set([
    "schemaVersion",
    "protocolVersion",
    "outcome",
    "proposalId",
    "transactionId",
    "undoTransactionId",
    "undone",
    "verified",
    "verification",
    "historicalApplied",
    "reconciliationRequired",
    "affectedPathCount",
    "createdPathCount",
    "updatedPathCount",
    "unchangedPathCount",
    "paths",
  ]);
  for (const key of Object.keys(result)) {
    if (!allowed.has(key)) {
      throw new ProtocolValidationError(
        -32602,
        `undo execution result must not include ${key}`,
      );
    }
  }
  for (const key of RESULT_SECRET_KEYS) {
    if (key in result) {
      throw new ProtocolValidationError(
        -32602,
        `undo execution result must not include ${key}`,
      );
    }
  }
}

export function validateUndoExecutionPaths(
  value: unknown,
): readonly NeutronMutationUndoExecutionPath[] {
  if (!Array.isArray(value)) {
    throw new ProtocolValidationError(-32602, "paths must be an array");
  }
  return value.map((entry) => validatePath(entry));
}

export function undoExecutionOutcome(
  value: unknown,
): NeutronMutationUndoExecutionOutcome {
  if (
    typeof value !== "string" ||
    !NEUTRON_MUTATION_UNDO_EXECUTION_OUTCOMES.includes(
      value as NeutronMutationUndoExecutionOutcome,
    )
  ) {
    throw new ProtocolValidationError(
      -32602,
      "undo execution outcome is invalid",
    );
  }
  return value as NeutronMutationUndoExecutionOutcome;
}

export function undoExecutionVerification(
  value: unknown,
): NeutronMutationUndoExecutionVerification {
  if (value !== "pending" && value !== "not-run") {
    throw new ProtocolValidationError(
      -32602,
      "undo execution verification is invalid",
    );
  }
  return value;
}

function validatePath(entry: unknown): NeutronMutationUndoExecutionPath {
  const path = object(entry, "undo execution path");
  const keys = Object.keys(path).sort();
  if (keys.join() !== "effect,path") {
    throw new ProtocolValidationError(
      -32602,
      "undo execution path shape is invalid",
    );
  }
  if (path.effect !== "remove-created" && path.effect !== "restore-updated") {
    throw new ProtocolValidationError(-32602, "undo path effect is invalid");
  }
  return {
    path: boundedString(path.path, "path"),
    effect: path.effect,
  };
}

function optionalId(value: unknown): string | undefined {
  if (value === undefined) return undefined;
  return boundedString(value, "undoTransactionId");
}

function count(value: unknown, field: string): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0) {
    throw new ProtocolValidationError(
      -32602,
      `${field} must be a non-negative integer`,
    );
  }
  return value;
}

function boundedString(value: unknown, field: string): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new ProtocolValidationError(
      -32602,
      `${field} must be a non-empty string`,
    );
  }
  if (value.length > IDENTITY_LIMIT) {
    throw new ProtocolValidationError(-32602, `${field} exceeds its bound`);
  }
  return value;
}

function object(value: unknown, label: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new ProtocolValidationError(-32602, `${label} must be an object`);
  }
  return value as Record<string, unknown>;
}
