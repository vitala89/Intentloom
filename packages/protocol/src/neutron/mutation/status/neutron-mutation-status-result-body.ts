import {
  NEUTRON_MUTATION_APPLY_FAILURE_CODES,
  NEUTRON_MUTATION_APPLY_STATUSES,
  NEUTRON_MUTATION_TRANSACTION_STATES,
  type NeutronMutationApplyFailureCode,
  type NeutronMutationApplyStatus,
  type NeutronMutationTransactionState,
} from "../apply/neutron-mutation-apply.js";
import { PROTOCOL_VERSION } from "../../../jsonrpc.js";
import {
  approveApplyBoolean,
  approveApplyOneOf,
  approveApplyOptionalString,
  approveApplyStringList,
} from "../approval/neutron-mutation-approve-apply-fields.js";
import { ProtocolValidationError } from "../../../protocol-validation-error.js";
import { NEUTRON_MUTATION_STATUS_SCHEMA_URN } from "./neutron-mutation-status-rpc.js";
import {
  NEUTRON_MUTATION_VERIFICATION_STATUSES,
  type NeutronMutationVerificationStatus,
} from "../verification/neutron-mutation-verification.js";
import type { NeutronMutationStatusResult } from "./neutron-mutation-status-result.js";

const LIST_LIMIT = 256;
const DIAGNOSTIC_LIMIT = 500;

export function closedStatusResult(
  result: Record<string, unknown>,
  outcome: NeutronMutationStatusResult["outcome"],
  proposalId: string,
  allowed: ReadonlySet<string>,
): NeutronMutationStatusResult {
  rejectUnknownStatusKeys(result, allowed);
  if (result.applied !== undefined) {
    throw new ProtocolValidationError(
      -32602,
      "unrecorded mutation status must not include applied",
    );
  }
  return {
    schemaVersion: NEUTRON_MUTATION_STATUS_SCHEMA_URN,
    protocolVersion: PROTOCOL_VERSION,
    outcome,
    proposalId,
    ...approveApplyOptionalString(result, "transactionId"),
  };
}

export function recordedStatusResult(
  result: Record<string, unknown>,
  proposalId: string,
  allowed: ReadonlySet<string>,
): NeutronMutationStatusResult {
  rejectUnknownStatusKeys(result, allowed);
  const failureCode = optionalFailureCode(result.failureCode);
  return {
    schemaVersion: NEUTRON_MUTATION_STATUS_SCHEMA_URN,
    protocolVersion: PROTOCOL_VERSION,
    outcome: "recorded",
    proposalId,
    applied: approveApplyBoolean(result.applied, "applied"),
    transactionState: transactionState(result.transactionState),
    reconciliationRequired: approveApplyBoolean(
      result.reconciliationRequired,
      "reconciliationRequired",
    ),
    changedPaths: boundedStatusList(result.changedPaths, "changedPaths"),
    diagnostics: boundedStatusList(result.diagnostics, "diagnostics"),
    ...approveApplyOptionalString(result, "transactionId"),
    ...approveApplyOptionalString(result, "approvalId"),
    ...approveApplyOptionalString(result, "reviewArtifactDigest"),
    ...approveApplyOptionalString(result, "planDigest"),
    ...optionalStatus(result.status),
    ...optionalVerification(result.verificationStatus),
    ...(failureCode === undefined ? {} : { failureCode }),
  };
}

function transactionState(value: unknown): NeutronMutationTransactionState {
  return approveApplyOneOf(
    value,
    NEUTRON_MUTATION_TRANSACTION_STATES,
    "transactionState",
  );
}

function optionalStatus(
  value: unknown,
): { readonly status: NeutronMutationApplyStatus } | Record<string, never> {
  if (value === undefined) return {};
  return {
    status: approveApplyOneOf(value, NEUTRON_MUTATION_APPLY_STATUSES, "status"),
  };
}

function optionalVerification(
  value: unknown,
):
  | { readonly verificationStatus: NeutronMutationVerificationStatus }
  | Record<string, never> {
  if (value === undefined) return {};
  return {
    verificationStatus: approveApplyOneOf(
      value,
      NEUTRON_MUTATION_VERIFICATION_STATUSES,
      "verificationStatus",
    ),
  };
}

function optionalFailureCode(
  value: unknown,
): NeutronMutationApplyFailureCode | undefined {
  if (value === undefined) return undefined;
  return approveApplyOneOf(
    value,
    NEUTRON_MUTATION_APPLY_FAILURE_CODES,
    "failureCode",
  );
}

function boundedStatusList(value: unknown, field: string): readonly string[] {
  const values = approveApplyStringList(value, field);
  if (values.length > LIST_LIMIT) {
    throw new ProtocolValidationError(-32602, `${field} exceeds its bound`);
  }
  for (const item of values) {
    if (item.length > DIAGNOSTIC_LIMIT || item.includes("\n")) {
      throw new ProtocolValidationError(
        -32602,
        `${field} entry exceeds its bound`,
      );
    }
  }
  return values;
}

function rejectUnknownStatusKeys(
  result: Record<string, unknown>,
  allowed: ReadonlySet<string>,
): void {
  for (const key of Object.keys(result)) {
    if (!allowed.has(key)) {
      throw new ProtocolValidationError(
        -32602,
        `mutation status result must not include ${key}`,
      );
    }
  }
}
