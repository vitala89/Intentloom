import { PROTOCOL_VERSION } from "./jsonrpc.js";
import { ProtocolValidationError } from "./protocol-validation-error.js";
import {
  NEUTRON_MUTATION_UNDO_AUTHORITY_KEYS,
  NEUTRON_MUTATION_UNDO_OUTCOMES,
  NEUTRON_MUTATION_UNDO_PREFLIGHT_SCHEMA_URN,
  type NeutronMutationUndoOutcome,
} from "./neutron-mutation-undo.js";

const IDENTITY_LIMIT = 4096;
const DIGEST_PATTERN = /^sha256:[0-9a-f]{64}$/u;

export interface NeutronMutationUndoPathProjection {
  readonly path: string;
  readonly effect: "remove-created" | "restore-updated";
  readonly expectedContentDigest: string;
  readonly preApplyDigest?: string;
}

/**
 * Sanitized host preflight. `executionAuthorized` and `approvalReusable`
 * are literal false: eligibility is not Undo permission, and the original
 * Apply approval cannot authorize a later user Undo.
 * `historicalApplied` copies the canonical record. Preflight never rewrites it.
 */
export interface NeutronMutationUndoPreflightResult {
  readonly schemaVersion: typeof NEUTRON_MUTATION_UNDO_PREFLIGHT_SCHEMA_URN;
  readonly protocolVersion: typeof PROTOCOL_VERSION;
  readonly outcome: NeutronMutationUndoOutcome;
  readonly proposalId: string;
  readonly transactionId: string;
  readonly historicalApplied: boolean;
  readonly executionAuthorized: false;
  readonly approvalReusable: false;
  readonly affectedPathCount: number;
  readonly createdPathCount: number;
  readonly updatedPathCount: number;
  readonly unchangedPathCount: number;
  readonly paths?: readonly NeutronMutationUndoPathProjection[];
}

export function validateNeutronMutationUndoPreflightResult(
  value: unknown,
): NeutronMutationUndoPreflightResult {
  const result = object(value, "undo preflight result");
  rejectForbiddenResultKeys(result);
  if (result.schemaVersion !== NEUTRON_MUTATION_UNDO_PREFLIGHT_SCHEMA_URN) {
    throw new ProtocolValidationError(
      -32602,
      "unsupported neutron mutation undo preflight schema",
    );
  }
  if (result.protocolVersion !== PROTOCOL_VERSION) {
    throw new ProtocolValidationError(-32602, "unsupported protocol version");
  }
  if (result.executionAuthorized !== false) {
    throw new ProtocolValidationError(
      -32602,
      "undo preflight cannot authorize execution",
    );
  }
  if (result.approvalReusable !== false) {
    throw new ProtocolValidationError(
      -32602,
      "undo preflight cannot reuse Apply approval",
    );
  }
  const outcome = oneOf(result.outcome);
  const paths =
    result.paths === undefined ? undefined : validatePaths(result.paths);
  if (outcome !== "eligible" && paths !== undefined) {
    throw new ProtocolValidationError(
      -32602,
      "undo preflight paths are only present when eligible",
    );
  }
  return assembleResult(result, outcome, paths);
}

function assembleResult(
  result: Record<string, unknown>,
  outcome: NeutronMutationUndoOutcome,
  paths: readonly NeutronMutationUndoPathProjection[] | undefined,
): NeutronMutationUndoPreflightResult {
  return {
    schemaVersion: NEUTRON_MUTATION_UNDO_PREFLIGHT_SCHEMA_URN,
    protocolVersion: PROTOCOL_VERSION,
    outcome,
    proposalId: boundedString(result.proposalId, "proposalId"),
    transactionId: boundedString(result.transactionId, "transactionId"),
    historicalApplied: result.historicalApplied === true,
    executionAuthorized: false,
    approvalReusable: false,
    affectedPathCount: count(result.affectedPathCount, "affectedPathCount"),
    createdPathCount: count(result.createdPathCount, "createdPathCount"),
    updatedPathCount: count(result.updatedPathCount, "updatedPathCount"),
    unchangedPathCount: count(result.unchangedPathCount, "unchangedPathCount"),
    ...(paths === undefined ? {} : { paths }),
  };
}

function rejectForbiddenResultKeys(result: Record<string, unknown>): void {
  const allowed = new Set([
    "schemaVersion",
    "protocolVersion",
    "outcome",
    "proposalId",
    "transactionId",
    "historicalApplied",
    "executionAuthorized",
    "approvalReusable",
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
        `undo preflight result must not include ${key}`,
      );
    }
  }
  for (const key of NEUTRON_MUTATION_UNDO_AUTHORITY_KEYS) {
    if (key in result) {
      throw new ProtocolValidationError(
        -32602,
        `undo preflight result must not include ${key}`,
      );
    }
  }
}

function validatePaths(
  value: unknown,
): readonly NeutronMutationUndoPathProjection[] {
  if (!Array.isArray(value)) {
    throw new ProtocolValidationError(-32602, "paths must be an array");
  }
  return value.map((entry) => validatePath(entry));
}

function validatePath(entry: unknown): NeutronMutationUndoPathProjection {
  const path = object(entry, "undo path");
  const effect = path.effect;
  if (effect !== "remove-created" && effect !== "restore-updated") {
    throw new ProtocolValidationError(-32602, "undo path effect is invalid");
  }
  const keys = Object.keys(path).sort();
  const expectedKeys =
    effect === "remove-created"
      ? ["effect", "expectedContentDigest", "path"]
      : ["effect", "expectedContentDigest", "path", "preApplyDigest"];
  if (keys.join() !== expectedKeys.join()) {
    throw new ProtocolValidationError(-32602, "undo path shape is invalid");
  }
  const digest = digestField(
    path.expectedContentDigest,
    "expectedContentDigest",
  );
  if (effect === "remove-created") {
    return {
      path: boundedString(path.path, "path"),
      effect,
      expectedContentDigest: digest,
    };
  }
  return {
    path: boundedString(path.path, "path"),
    effect,
    expectedContentDigest: digest,
    preApplyDigest: digestField(path.preApplyDigest, "preApplyDigest"),
  };
}

function digestField(value: unknown, field: string): string {
  if (typeof value !== "string" || !DIGEST_PATTERN.test(value)) {
    throw new ProtocolValidationError(-32602, `${field} is invalid`);
  }
  return value;
}

function oneOf(value: unknown): NeutronMutationUndoOutcome {
  if (
    typeof value !== "string" ||
    !NEUTRON_MUTATION_UNDO_OUTCOMES.includes(
      value as NeutronMutationUndoOutcome,
    )
  ) {
    throw new ProtocolValidationError(-32602, "undo outcome is invalid");
  }
  return value as NeutronMutationUndoOutcome;
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
