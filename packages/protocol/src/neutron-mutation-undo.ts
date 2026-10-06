import { PROTOCOL_VERSION } from "./jsonrpc.js";
import { ProtocolValidationError } from "./protocol-validation-error.js";

export const NEUTRON_MUTATION_UNDO_INTENT_SCHEMA_URN =
  "urn:intentloom:schema:neutron-mutation-undo-intent:1" as const;

export const NEUTRON_MUTATION_UNDO_PREFLIGHT_SCHEMA_URN =
  "urn:intentloom:schema:neutron-mutation-undo-preflight:1" as const;

export const NEUTRON_MUTATION_UNDO_INTENT_FIELDS = [
  "schemaVersion",
  "protocolVersion",
  "root",
  "sessionId",
  "projectId",
  "graphId",
  "proposalId",
  "transactionId",
] as const;

/**
 * Caller-supplied authority or content. Rejected, not ignored.
 * Undo identity is the exact transaction. The host derives every fact.
 */
export const NEUTRON_MUTATION_UNDO_AUTHORITY_KEYS = [
  "approval",
  "approvalToken",
  "approved",
  "applied",
  "bytes",
  "changedPaths",
  "currentContent",
  "expectedDigest",
  "files",
  "grantedApprovals",
  "mutationAllowed",
  "planDigest",
  "previousContent",
  "proposedContent",
  "reviewArtifactDigest",
  "rollback",
  "rollbackEvidence",
  "verified",
] as const;

export const NEUTRON_MUTATION_UNDO_OUTCOMES = [
  "eligible",
  "not-applied",
  "transaction-not-found",
  "transaction-mismatch",
  "stale-current-state",
  "reconciliation-required",
  "undo-source-unavailable",
  "integrity-failure",
  "unsupported-transaction",
] as const;
export type NeutronMutationUndoOutcome =
  (typeof NEUTRON_MUTATION_UNDO_OUTCOMES)[number];

const IDENTITY_LIMIT = 4096;

/**
 * Identity-only request for a future user Undo.
 * This is not Apply approval and it cannot carry restoration bytes.
 */
export interface NeutronMutationUndoIntent {
  readonly schemaVersion: typeof NEUTRON_MUTATION_UNDO_INTENT_SCHEMA_URN;
  readonly protocolVersion: typeof PROTOCOL_VERSION;
  readonly root: string;
  readonly sessionId: string;
  readonly projectId: string;
  readonly graphId: string;
  readonly proposalId: string;
  readonly transactionId: string;
}

export function parseNeutronMutationUndoIntent(
  value: unknown,
): NeutronMutationUndoIntent {
  const params = object(value, "undo intent");
  rejectUnexpectedIntentKeys(params);
  if (params.schemaVersion !== NEUTRON_MUTATION_UNDO_INTENT_SCHEMA_URN) {
    throw new ProtocolValidationError(
      -32602,
      "unsupported neutron mutation undo intent schema",
    );
  }
  if (params.protocolVersion !== PROTOCOL_VERSION) {
    throw new ProtocolValidationError(
      -32602,
      "undo intent protocolVersion is invalid",
    );
  }
  return {
    schemaVersion: NEUTRON_MUTATION_UNDO_INTENT_SCHEMA_URN,
    protocolVersion: PROTOCOL_VERSION,
    root: boundedString(params.root, "root"),
    sessionId: boundedString(params.sessionId, "sessionId"),
    projectId: boundedString(params.projectId, "projectId"),
    graphId: boundedString(params.graphId, "graphId"),
    proposalId: boundedString(params.proposalId, "proposalId"),
    transactionId: boundedString(params.transactionId, "transactionId"),
  };
}

function rejectUnexpectedIntentKeys(params: Record<string, unknown>): void {
  const allowed = new Set<string>(NEUTRON_MUTATION_UNDO_INTENT_FIELDS);
  for (const key of Object.keys(params)) {
    if (!allowed.has(key)) {
      throw new ProtocolValidationError(
        -32602,
        `undo intent must not include ${key}`,
      );
    }
  }
  for (const key of NEUTRON_MUTATION_UNDO_AUTHORITY_KEYS) {
    if (key in params) {
      throw new ProtocolValidationError(
        -32602,
        `undo intent must not include ${key}`,
      );
    }
  }
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
