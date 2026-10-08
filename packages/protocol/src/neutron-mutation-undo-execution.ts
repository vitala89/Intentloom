import { PROTOCOL_VERSION } from "./jsonrpc.js";
import { ProtocolValidationError } from "./protocol-validation-error.js";
import {
  assertUndoExecutionSchema,
  assertUndoExecutionShape,
  assembleValidatedUndoExecution,
  rejectForbiddenUndoExecutionKeys,
  undoExecutionOutcome,
  undoExecutionVerification,
  validateUndoExecutionPaths,
} from "./neutron-mutation-undo-execution-check.js";

export const NEUTRON_MUTATION_UNDO_EXECUTION_SCHEMA_URN =
  "urn:intentloom:schema:neutron-mutation-undo-execution:1" as const;

export const NEUTRON_MUTATION_UNDO_EXECUTION_OUTCOMES = [
  "undone",
  "replay",
  "already-undone",
  "in-flight",
  "intent-rejected",
  "project-locked",
  "transaction-failed",
  "failed-before-write",
  "not-applied",
  "transaction-not-found",
  "transaction-mismatch",
  "stale-current-state",
  "reconciliation-required",
  "undo-source-unavailable",
  "integrity-failure",
  "unsupported-transaction",
] as const;

export type NeutronMutationUndoExecutionOutcome =
  (typeof NEUTRON_MUTATION_UNDO_EXECUTION_OUTCOMES)[number];

export const NEUTRON_MUTATION_UNDO_EXECUTION_VERIFICATIONS = [
  "pending",
  "not-run",
] as const;

export type NeutronMutationUndoExecutionVerification =
  (typeof NEUTRON_MUTATION_UNDO_EXECUTION_VERIFICATIONS)[number];

export interface NeutronMutationUndoExecutionPath {
  readonly path: string;
  readonly effect: "remove-created" | "restore-updated";
}

/**
 * Public Undo execution fact. `verified` is literal false: U3 does not
 * perform U4 independent verification. The result carries no bytes, tokens,
 * or snapshot locations.
 */
export interface NeutronMutationUndoExecutionResult {
  readonly schemaVersion: typeof NEUTRON_MUTATION_UNDO_EXECUTION_SCHEMA_URN;
  readonly protocolVersion: typeof PROTOCOL_VERSION;
  readonly outcome: NeutronMutationUndoExecutionOutcome;
  readonly proposalId: string;
  readonly transactionId: string;
  readonly undoTransactionId?: string;
  readonly undone: boolean;
  readonly verified: false;
  readonly verification: NeutronMutationUndoExecutionVerification;
  readonly historicalApplied: boolean;
  readonly reconciliationRequired: boolean;
  readonly affectedPathCount: number;
  readonly createdPathCount: number;
  readonly updatedPathCount: number;
  readonly unchangedPathCount: number;
  readonly paths?: readonly NeutronMutationUndoExecutionPath[];
}

export interface NeutronMutationUndoExecutionBody {
  readonly outcome: NeutronMutationUndoExecutionOutcome;
  readonly proposalId: string;
  readonly transactionId: string;
  readonly undoTransactionId?: string;
  readonly undone: boolean;
  readonly verification: NeutronMutationUndoExecutionVerification;
  readonly historicalApplied: boolean;
  readonly reconciliationRequired: boolean;
  readonly affectedPathCount: number;
  readonly createdPathCount: number;
  readonly updatedPathCount: number;
  readonly unchangedPathCount: number;
  readonly paths?: readonly NeutronMutationUndoExecutionPath[];
}

export function assembleNeutronMutationUndoExecutionResult(
  body: NeutronMutationUndoExecutionBody,
): NeutronMutationUndoExecutionResult {
  return validateNeutronMutationUndoExecutionResult({
    schemaVersion: NEUTRON_MUTATION_UNDO_EXECUTION_SCHEMA_URN,
    protocolVersion: PROTOCOL_VERSION,
    ...body,
    verified: false,
  });
}

export function validateNeutronMutationUndoExecutionResult(
  value: unknown,
): NeutronMutationUndoExecutionResult {
  const result = objectRecord(value);
  rejectForbiddenUndoExecutionKeys(result);
  assertUndoExecutionSchema(result);
  if (result.verified !== false) {
    throw new ProtocolValidationError(
      -32602,
      "undo execution cannot claim verification",
    );
  }
  const outcome = undoExecutionOutcome(result.outcome);
  const undone = result.undone === true;
  const verification = undoExecutionVerification(result.verification);
  const paths =
    result.paths === undefined
      ? undefined
      : validateUndoExecutionPaths(result.paths);
  assertUndoExecutionShape(outcome, undone, verification, paths);
  if (
    result.reconciliationRequired !==
    (outcome === "reconciliation-required")
  ) {
    throw new ProtocolValidationError(
      -32602,
      "undo reconciliation flag does not match the outcome",
    );
  }
  return assembleValidatedUndoExecution(
    result,
    outcome,
    undone,
    verification,
    paths,
  );
}

function objectRecord(value: unknown): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new ProtocolValidationError(
      -32602,
      "undo execution result must be an object",
    );
  }
  return value as Record<string, unknown>;
}
