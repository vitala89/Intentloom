import { PROTOCOL_VERSION } from "../../../jsonrpc.js";
import { ProtocolValidationError } from "../../../protocol-validation-error.js";

export const NEUTRON_MUTATION_UNDO_REQUEST_SCHEMA_URN =
  "urn:intentloom:schema:neutron-mutation-undo-approval-intent:1" as const;

export const NEUTRON_MUTATION_UNDO_REQUEST_ACTION = "request-undo" as const;

export const NEUTRON_MUTATION_UNDO_REQUEST_FIELDS = [
  "schemaVersion",
  "protocolVersion",
  "action",
  "root",
  "sessionId",
  "projectId",
  "graphId",
  "proposalId",
  "transactionId",
] as const;

/**
 * Caller-supplied authority, bytes, or snapshot locations. Rejected.
 * The host resolves the original transaction and the U2 snapshot itself.
 */
export const NEUTRON_MUTATION_UNDO_REQUEST_AUTHORITY_KEYS = [
  "approval",
  "approvalId",
  "approvalToken",
  "approved",
  "applied",
  "bytes",
  "changedPaths",
  "content",
  "currentContent",
  "expectedContentDigest",
  "expectedDigest",
  "files",
  "grantedApprovals",
  "manifestDigest",
  "mutationAllowed",
  "mutationClass",
  "paths",
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
  "undoTransactionId",
  "verified",
] as const;

const IDENTITY_LIMIT = 4096;

/**
 * Human request that the trusted host undo one original Apply transaction.
 * `transactionId` is that original transaction. The action is not approval.
 */
export interface NeutronMutationUndoRequest {
  readonly schemaVersion: typeof NEUTRON_MUTATION_UNDO_REQUEST_SCHEMA_URN;
  readonly protocolVersion: typeof PROTOCOL_VERSION;
  readonly action: typeof NEUTRON_MUTATION_UNDO_REQUEST_ACTION;
  readonly root: string;
  readonly sessionId: string;
  readonly projectId: string;
  readonly graphId: string;
  readonly proposalId: string;
  readonly transactionId: string;
}

export function parseNeutronMutationUndoRequest(
  value: unknown,
): NeutronMutationUndoRequest {
  const params = object(value, "undo request");
  rejectUnexpectedRequestKeys(params);
  if (params.schemaVersion !== NEUTRON_MUTATION_UNDO_REQUEST_SCHEMA_URN) {
    throw new ProtocolValidationError(
      -32602,
      "unsupported neutron mutation undo request schema",
    );
  }
  if (params.protocolVersion !== PROTOCOL_VERSION) {
    throw new ProtocolValidationError(
      -32602,
      "undo request protocolVersion is invalid",
    );
  }
  if (params.action !== NEUTRON_MUTATION_UNDO_REQUEST_ACTION) {
    throw new ProtocolValidationError(-32602, "undo request action is invalid");
  }
  return {
    schemaVersion: NEUTRON_MUTATION_UNDO_REQUEST_SCHEMA_URN,
    protocolVersion: PROTOCOL_VERSION,
    action: NEUTRON_MUTATION_UNDO_REQUEST_ACTION,
    root: boundedString(params.root, "root"),
    sessionId: boundedString(params.sessionId, "sessionId"),
    projectId: boundedString(params.projectId, "projectId"),
    graphId: boundedString(params.graphId, "graphId"),
    proposalId: boundedString(params.proposalId, "proposalId"),
    transactionId: boundedString(params.transactionId, "transactionId"),
  };
}

function rejectUnexpectedRequestKeys(params: Record<string, unknown>): void {
  const allowed = new Set<string>(NEUTRON_MUTATION_UNDO_REQUEST_FIELDS);
  for (const key of Object.keys(params)) {
    if (!allowed.has(key)) {
      throw new ProtocolValidationError(
        -32602,
        `undo request must not include ${key}`,
      );
    }
  }
  for (const key of NEUTRON_MUTATION_UNDO_REQUEST_AUTHORITY_KEYS) {
    if (key in params) {
      throw new ProtocolValidationError(
        -32602,
        `undo request must not include ${key}`,
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
