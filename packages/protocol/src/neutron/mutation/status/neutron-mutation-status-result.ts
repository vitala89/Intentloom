import type {
  NeutronMutationApplyFailureCode,
  NeutronMutationApplyStatus,
  NeutronMutationTransactionState,
} from "../apply/neutron-mutation-apply.js";
import { PROTOCOL_VERSION } from "../../../jsonrpc.js";
import type { JsonRpcSuccess, RequestId } from "../../../jsonrpc.js";
import {
  approveApplyObject,
  approveApplyOneOf,
  approveApplyString,
} from "../approval/neutron-mutation-approve-apply-fields.js";
import { ProtocolValidationError } from "../../../protocol-validation-error.js";
import { NEUTRON_MUTATION_STATUS_SCHEMA_URN } from "./neutron-mutation-status-rpc.js";
import type { NeutronMutationVerificationStatus } from "../verification/neutron-mutation-verification.js";
import {
  closedStatusResult,
  recordedStatusResult,
} from "./neutron-mutation-status-result-body.js";

export const NEUTRON_MUTATION_STATUS_OUTCOMES = [
  "unknown",
  "recorded",
  "root-mismatch",
  "project-mismatch",
  "session-mismatch",
  "graph-mismatch",
  "transaction-mismatch",
  "durable-state-unavailable",
] as const;
export type NeutronMutationStatusOutcome =
  (typeof NEUTRON_MUTATION_STATUS_OUTCOMES)[number];

const RECORDED_KEYS = new Set([
  "schemaVersion",
  "protocolVersion",
  "outcome",
  "proposalId",
  "applied",
  "transactionState",
  "status",
  "verificationStatus",
  "reconciliationRequired",
  "failureCode",
  "transactionId",
  "approvalId",
  "reviewArtifactDigest",
  "planDigest",
  "changedPaths",
  "diagnostics",
]);

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

export interface NeutronMutationStatusResult {
  readonly schemaVersion: typeof NEUTRON_MUTATION_STATUS_SCHEMA_URN;
  readonly protocolVersion: typeof PROTOCOL_VERSION;
  readonly outcome: NeutronMutationStatusOutcome;
  readonly proposalId: string;
  readonly applied?: boolean;
  readonly transactionState?: NeutronMutationTransactionState;
  readonly status?: NeutronMutationApplyStatus;
  readonly verificationStatus?: NeutronMutationVerificationStatus;
  readonly reconciliationRequired?: boolean;
  readonly failureCode?: NeutronMutationApplyFailureCode;
  readonly transactionId?: string;
  readonly approvalId?: string;
  readonly reviewArtifactDigest?: string;
  readonly planDigest?: string;
  readonly changedPaths?: readonly string[];
  readonly diagnostics?: readonly string[];
}

export type NeutronMutationStatusGetResponse =
  JsonRpcSuccess<NeutronMutationStatusResult>;

export function createNeutronMutationStatusGetResponse(
  id: RequestId,
  result: NeutronMutationStatusResult,
): NeutronMutationStatusGetResponse {
  return {
    jsonrpc: "2.0",
    id,
    result: validateNeutronMutationStatusResult(result),
  };
}

export function parseNeutronMutationStatusGetResponse(
  value: unknown,
): NeutronMutationStatusResult {
  const record = approveApplyObject(value, "jsonrpc response");
  if (record.jsonrpc !== "2.0") {
    throw new ProtocolValidationError(-32600, "jsonrpc must equal 2.0");
  }
  return validateNeutronMutationStatusResult(record.result);
}

export function validateNeutronMutationStatusResult(
  value: unknown,
): NeutronMutationStatusResult {
  const result = approveApplyObject(value, "result");
  rejectForbiddenStatusKeys(result);
  if (result.schemaVersion !== NEUTRON_MUTATION_STATUS_SCHEMA_URN) {
    throw new ProtocolValidationError(
      -32602,
      "unsupported neutron mutation status schema",
    );
  }
  if (result.protocolVersion !== PROTOCOL_VERSION) {
    throw new ProtocolValidationError(-32602, "unsupported protocol version");
  }
  const outcome = approveApplyOneOf(
    result.outcome,
    NEUTRON_MUTATION_STATUS_OUTCOMES,
    "outcome",
  );
  const proposalId = approveApplyString(result.proposalId, "proposalId");
  if (outcome !== "recorded") {
    return closedStatusResult(result, outcome, proposalId, CLOSED_KEYS);
  }
  return recordedStatusResult(result, proposalId, RECORDED_KEYS);
}

export function closedNeutronMutationStatus(input: {
  readonly outcome: Exclude<NeutronMutationStatusOutcome, "recorded">;
  readonly proposalId: string;
  readonly transactionId?: string;
}): NeutronMutationStatusResult {
  return validateNeutronMutationStatusResult({
    schemaVersion: NEUTRON_MUTATION_STATUS_SCHEMA_URN,
    protocolVersion: PROTOCOL_VERSION,
    outcome: input.outcome,
    proposalId: input.proposalId,
    ...(input.transactionId === undefined
      ? {}
      : { transactionId: input.transactionId }),
  });
}

function rejectForbiddenStatusKeys(result: Record<string, unknown>): void {
  for (const key of FORBIDDEN_RESULT_KEYS) {
    if (key in result) {
      throw new ProtocolValidationError(
        -32602,
        `mutation status result must not include ${key}`,
      );
    }
  }
}
