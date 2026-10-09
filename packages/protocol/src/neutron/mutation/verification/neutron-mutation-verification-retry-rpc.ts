import {
  NEUTRON_MUTATION_VERIFICATION_RETRY_METHOD,
  PROTOCOL_VERSION,
} from "../../../jsonrpc.js";
import type { JsonRpcRequest, RequestId } from "../../../jsonrpc.js";
import { ProtocolValidationError } from "../../../protocol-validation-error.js";
import { NEUTRON_MUTATION_STATUS_AUTHORITY_KEYS } from "../status/neutron-mutation-status-rpc.js";

export const NEUTRON_MUTATION_VERIFICATION_RETRY_SCHEMA_URN =
  "urn:intentloom:schema:neutron-mutation-verification-retry:1" as const;

export const NEUTRON_MUTATION_VERIFICATION_RETRY_FIELDS = [
  "schemaVersion",
  "protocolVersion",
  "root",
  "sessionId",
  "projectId",
  "graphId",
  "proposalId",
  "transactionId",
] as const;

/** Caller-supplied authority or content. Rejected, not ignored. */
export const NEUTRON_MUTATION_VERIFICATION_RETRY_AUTHORITY_KEYS = [
  ...NEUTRON_MUTATION_STATUS_AUTHORITY_KEYS,
  "applied",
  "bytes",
  "evidence",
  "evidenceDigest",
  "failureCode",
  "rollback",
  "status",
  "verification",
  "verificationEvidence",
  "verificationStatus",
] as const;

const IDENTITY_LIMIT = 4096;

export interface NeutronMutationVerificationRetryQuery {
  readonly schemaVersion: typeof NEUTRON_MUTATION_VERIFICATION_RETRY_SCHEMA_URN;
  readonly protocolVersion: typeof PROTOCOL_VERSION;
  readonly root: string;
  readonly sessionId: string;
  readonly projectId: string;
  readonly graphId: string;
  readonly proposalId: string;
  readonly transactionId?: string;
}

export type NeutronMutationVerificationRetryRequest = JsonRpcRequest<
  typeof NEUTRON_MUTATION_VERIFICATION_RETRY_METHOD,
  NeutronMutationVerificationRetryQuery
>;

export function isNeutronMutationVerificationRetryMethod(
  method: string,
): method is typeof NEUTRON_MUTATION_VERIFICATION_RETRY_METHOD {
  return method === NEUTRON_MUTATION_VERIFICATION_RETRY_METHOD;
}

export function createNeutronMutationVerificationRetryRequest(
  id: RequestId,
  query: NeutronMutationVerificationRetryQuery,
): NeutronMutationVerificationRetryRequest {
  return {
    jsonrpc: "2.0",
    id,
    method: NEUTRON_MUTATION_VERIFICATION_RETRY_METHOD,
    params: query,
  };
}

export function parseNeutronMutationVerificationRetryDaemonRequest(
  method: string,
  params: Record<string, unknown>,
  id: RequestId,
): NeutronMutationVerificationRetryRequest | null {
  if (!isNeutronMutationVerificationRetryMethod(method)) return null;
  return createNeutronMutationVerificationRetryRequest(
    id,
    parseNeutronMutationVerificationRetryQuery(params),
  );
}

export function parseNeutronMutationVerificationRetryQuery(
  params: Record<string, unknown>,
): NeutronMutationVerificationRetryQuery {
  rejectUnexpectedRetryKeys(params);
  if (params.schemaVersion !== NEUTRON_MUTATION_VERIFICATION_RETRY_SCHEMA_URN) {
    throw new ProtocolValidationError(
      -32602,
      "unsupported neutron mutation verification retry schema",
    );
  }
  if (params.protocolVersion !== PROTOCOL_VERSION) {
    throw new ProtocolValidationError(
      -32602,
      "verification retry protocolVersion is invalid",
    );
  }
  const query: NeutronMutationVerificationRetryQuery = {
    schemaVersion: NEUTRON_MUTATION_VERIFICATION_RETRY_SCHEMA_URN,
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

function rejectUnexpectedRetryKeys(params: Record<string, unknown>): void {
  const allowed = new Set<string>(NEUTRON_MUTATION_VERIFICATION_RETRY_FIELDS);
  for (const key of Object.keys(params)) {
    if (!allowed.has(key)) {
      throw new ProtocolValidationError(
        -32602,
        `verification retry query must not include ${key}`,
      );
    }
  }
  for (const key of NEUTRON_MUTATION_VERIFICATION_RETRY_AUTHORITY_KEYS) {
    if (key in params) {
      throw new ProtocolValidationError(
        -32602,
        `verification retry query must not include ${key}`,
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
