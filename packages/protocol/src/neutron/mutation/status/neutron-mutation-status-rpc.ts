import {
  NEUTRON_MUTATION_STATUS_GET_METHOD,
  PROTOCOL_VERSION,
} from "../../../jsonrpc.js";
import type { JsonRpcRequest, RequestId } from "../../../jsonrpc.js";
import { ProtocolValidationError } from "../../../protocol-validation-error.js";

export const NEUTRON_MUTATION_STATUS_SCHEMA_URN =
  "urn:intentloom:schema:neutron-mutation-status:1" as const;

export const NEUTRON_MUTATION_STATUS_FIELDS = [
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
 * `transactionId` is optional lookup identity and is not in this list.
 */
export const NEUTRON_MUTATION_STATUS_AUTHORITY_KEYS = [
  "approval",
  "approvalDigest",
  "approvalId",
  "approvalToken",
  "approved",
  "approvedAt",
  "approvalSource",
  "approvalValidUntil",
  "approvingActor",
  "authorized",
  "changedPaths",
  "content",
  "currentContent",
  "durableStateDirectory",
  "expiresAt",
  "expiry",
  "files",
  "filesToApply",
  "grantedApprovals",
  "mutationAllowed",
  "mutationClass",
  "path",
  "paths",
  "planDigest",
  "previousContent",
  "projectStateDigest",
  "prompt",
  "prompts",
  "proposedContent",
  "query",
  "reasoning",
  "reviewArtifactDigest",
  "state",
  "transactionState",
] as const;

const IDENTITY_LIMIT = 4096;

export interface NeutronMutationStatusQuery {
  readonly schemaVersion: typeof NEUTRON_MUTATION_STATUS_SCHEMA_URN;
  readonly protocolVersion: typeof PROTOCOL_VERSION;
  readonly root: string;
  readonly sessionId: string;
  readonly projectId: string;
  readonly graphId: string;
  readonly proposalId: string;
  readonly transactionId?: string;
}

export type NeutronMutationStatusGetRequest = JsonRpcRequest<
  typeof NEUTRON_MUTATION_STATUS_GET_METHOD,
  NeutronMutationStatusQuery
>;

export function isNeutronMutationStatusGetMethod(
  method: string,
): method is typeof NEUTRON_MUTATION_STATUS_GET_METHOD {
  return method === NEUTRON_MUTATION_STATUS_GET_METHOD;
}

export function createNeutronMutationStatusGetRequest(
  id: RequestId,
  query: NeutronMutationStatusQuery,
): NeutronMutationStatusGetRequest {
  return {
    jsonrpc: "2.0",
    id,
    method: NEUTRON_MUTATION_STATUS_GET_METHOD,
    params: query,
  };
}

export function parseNeutronMutationStatusGetDaemonRequest(
  method: string,
  params: Record<string, unknown>,
  id: RequestId,
): NeutronMutationStatusGetRequest | null {
  if (!isNeutronMutationStatusGetMethod(method)) return null;
  return createNeutronMutationStatusGetRequest(
    id,
    parseNeutronMutationStatusQuery(params),
  );
}

export function parseNeutronMutationStatusQuery(
  params: Record<string, unknown>,
): NeutronMutationStatusQuery {
  rejectUnexpectedStatusKeys(params);
  if (params.schemaVersion !== NEUTRON_MUTATION_STATUS_SCHEMA_URN) {
    throw new ProtocolValidationError(
      -32602,
      "unsupported neutron mutation status schema",
    );
  }
  if (params.protocolVersion !== PROTOCOL_VERSION) {
    throw new ProtocolValidationError(
      -32602,
      "mutation status protocolVersion is invalid",
    );
  }
  const query: NeutronMutationStatusQuery = {
    schemaVersion: NEUTRON_MUTATION_STATUS_SCHEMA_URN,
    protocolVersion: PROTOCOL_VERSION,
    root: boundedString(params.root, "root"),
    sessionId: boundedString(params.sessionId, "sessionId"),
    projectId: boundedString(params.projectId, "projectId"),
    graphId: boundedString(params.graphId, "graphId"),
    proposalId: boundedString(params.proposalId, "proposalId"),
  };
  if (params.transactionId === undefined) return query;
  return {
    ...query,
    transactionId: boundedString(params.transactionId, "transactionId"),
  };
}

function rejectUnexpectedStatusKeys(params: Record<string, unknown>): void {
  const allowed = new Set<string>(NEUTRON_MUTATION_STATUS_FIELDS);
  for (const key of Object.keys(params)) {
    if (!allowed.has(key)) {
      throw new ProtocolValidationError(
        -32602,
        `mutation status query must not include ${key}`,
      );
    }
  }
  for (const key of NEUTRON_MUTATION_STATUS_AUTHORITY_KEYS) {
    if (key in params) {
      throw new ProtocolValidationError(
        -32602,
        `mutation status query must not include ${key}`,
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
