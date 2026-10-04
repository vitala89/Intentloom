import { PROTOCOL_VERSION } from "./jsonrpc.js";
import type { JsonRpcSuccess, RequestId } from "./jsonrpc.js";
import {
  approveApplyObject,
  approveApplyOptionalString,
  approveApplyString,
} from "./neutron-mutation-approve-apply-fields.js";
import { ProtocolValidationError } from "./protocol-validation-error.js";
import { NEUTRON_MUTATION_STATUS_SCHEMA_URN } from "./neutron-mutation-status-rpc.js";
import {
  validateNeutronMutationStatusResult,
  type NeutronMutationStatusResult,
} from "./neutron-mutation-status-result.js";

const CLOSED_KEYS = new Set([
  "schemaVersion",
  "protocolVersion",
  "outcome",
  "proposalId",
  "transactionId",
]);

const FORBIDDEN_RESULT_KEYS = [
  "approvalToken",
  "previousContent",
  "proposedContent",
  "currentContent",
  "prompts",
  "prompt",
  "reasoning",
  "grantedApprovals",
  "files",
  "content",
  "filesToApply",
  "verification",
  "rollback",
  "durableStateDirectory",
  "path",
] as const;

export interface NeutronMutationVerificationRetryClosed {
  readonly schemaVersion: typeof NEUTRON_MUTATION_STATUS_SCHEMA_URN;
  readonly protocolVersion: typeof PROTOCOL_VERSION;
  readonly outcome: "not-eligible";
  readonly proposalId: string;
  readonly transactionId?: string;
}

/**
 * Sanitized status projection. `recorded` reuses the status result.
 * `not-eligible` carries no verification evidence and no file bodies.
 */
export type NeutronMutationVerificationRetryResult =
  NeutronMutationStatusResult | NeutronMutationVerificationRetryClosed;

export type NeutronMutationVerificationRetryResponse =
  JsonRpcSuccess<NeutronMutationVerificationRetryResult>;

export function createNeutronMutationVerificationRetryResponse(
  id: RequestId,
  result: NeutronMutationVerificationRetryResult,
): NeutronMutationVerificationRetryResponse {
  return {
    jsonrpc: "2.0",
    id,
    result: validateNeutronMutationVerificationRetryResult(result),
  };
}

export function parseNeutronMutationVerificationRetryResponse(
  value: unknown,
): NeutronMutationVerificationRetryResult {
  const record = approveApplyObject(value, "jsonrpc response");
  if (record.jsonrpc !== "2.0") {
    throw new ProtocolValidationError(-32600, "jsonrpc must equal 2.0");
  }
  return validateNeutronMutationVerificationRetryResult(record.result);
}

export function validateNeutronMutationVerificationRetryResult(
  value: unknown,
): NeutronMutationVerificationRetryResult {
  const result = approveApplyObject(value, "result");
  rejectForbiddenRetryKeys(result);
  if (result.outcome === "not-eligible") return closedRetryResult(result);
  return validateNeutronMutationStatusResult(result);
}

export function notEligibleVerificationRetry(input: {
  readonly proposalId: string;
  readonly transactionId?: string;
}): NeutronMutationVerificationRetryClosed {
  return validateNeutronMutationVerificationRetryResult({
    schemaVersion: NEUTRON_MUTATION_STATUS_SCHEMA_URN,
    protocolVersion: PROTOCOL_VERSION,
    outcome: "not-eligible",
    proposalId: input.proposalId,
    ...(input.transactionId === undefined
      ? {}
      : { transactionId: input.transactionId }),
  }) as NeutronMutationVerificationRetryClosed;
}

function closedRetryResult(
  result: Record<string, unknown>,
): NeutronMutationVerificationRetryClosed {
  for (const key of Object.keys(result)) {
    if (!CLOSED_KEYS.has(key)) {
      throw new ProtocolValidationError(
        -32602,
        `verification retry result must not include ${key}`,
      );
    }
  }
  if (result.schemaVersion !== NEUTRON_MUTATION_STATUS_SCHEMA_URN) {
    throw new ProtocolValidationError(
      -32602,
      "unsupported neutron mutation verification retry result",
    );
  }
  if (result.protocolVersion !== PROTOCOL_VERSION) {
    throw new ProtocolValidationError(-32602, "unsupported protocol version");
  }
  return {
    schemaVersion: NEUTRON_MUTATION_STATUS_SCHEMA_URN,
    protocolVersion: PROTOCOL_VERSION,
    outcome: "not-eligible",
    proposalId: approveApplyString(result.proposalId, "proposalId"),
    ...approveApplyOptionalString(result, "transactionId"),
  };
}

function rejectForbiddenRetryKeys(result: Record<string, unknown>): void {
  for (const key of FORBIDDEN_RESULT_KEYS) {
    if (key in result) {
      throw new ProtocolValidationError(
        -32602,
        `verification retry result must not include ${key}`,
      );
    }
  }
}
