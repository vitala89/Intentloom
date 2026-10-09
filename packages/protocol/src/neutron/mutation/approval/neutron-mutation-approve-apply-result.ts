import {
  NEUTRON_MUTATION_APPLY_FAILURE_CODES,
  NEUTRON_MUTATION_APPLY_STATUSES,
  type NeutronMutationApplyFailureCode,
  type NeutronMutationApplyStatus,
} from "../apply/neutron-mutation-apply.js";
import { PROTOCOL_VERSION } from "../../../jsonrpc.js";
import type { JsonRpcSuccess, RequestId } from "../../../jsonrpc.js";
import { ProtocolValidationError } from "../../../protocol-validation-error.js";
import {
  approveApplyBoolean,
  approveApplyObject,
  approveApplyOneOf,
  approveApplyOptionalString,
  approveApplyStringList,
} from "./neutron-mutation-approve-apply-fields.js";
import {
  NEUTRON_MUTATION_VERIFICATION_STATUSES,
  type NeutronMutationVerificationStatus,
} from "../verification/neutron-mutation-verification.js";
import {
  NEUTRON_MUTATION_APPROVE_AND_APPLY_APPROVAL_OUTCOMES,
  NEUTRON_MUTATION_APPROVE_AND_APPLY_GRAPH_FAILURE_CODES,
  NEUTRON_MUTATION_APPROVE_AND_APPLY_SCHEMA_URN,
  NEUTRON_MUTATION_APPROVE_AND_APPLY_STAGES,
  type NeutronMutationApproveAndApplyApprovalOutcome,
  type NeutronMutationApproveAndApplyStage,
} from "./neutron-mutation-approve-apply-rpc.js";

const APPLY_FAILURE_CODES = new Set<string>([
  ...NEUTRON_MUTATION_APPLY_FAILURE_CODES,
  ...NEUTRON_MUTATION_APPROVE_AND_APPLY_GRAPH_FAILURE_CODES,
]);

const RESULT_KEYS = new Set([
  "schemaVersion",
  "protocolVersion",
  "stage",
  "proposalId",
  "approvalOutcome",
  "applied",
  "status",
  "verificationStatus",
  "failureCode",
  "reconciliationRequired",
  "transactionId",
  "approvalId",
  "reviewArtifactDigest",
  "planDigest",
  "changedPaths",
  "diagnostics",
]);

const FORBIDDEN_RESULT_KEYS = [
  "approvalToken",
  "previousContent",
  "proposedContent",
  "currentContent",
  "prompts",
  "reasoning",
  "grantedApprovals",
  "files",
  "content",
  "filesToApply",
] as const;

export interface NeutronMutationApproveAndApplyResult {
  readonly schemaVersion: typeof NEUTRON_MUTATION_APPROVE_AND_APPLY_SCHEMA_URN;
  readonly protocolVersion: typeof PROTOCOL_VERSION;
  readonly stage: NeutronMutationApproveAndApplyStage;
  readonly proposalId?: string;
  readonly approvalOutcome?: NeutronMutationApproveAndApplyApprovalOutcome;
  readonly applied?: boolean;
  readonly status?: NeutronMutationApplyStatus;
  readonly verificationStatus?: NeutronMutationVerificationStatus;
  readonly failureCode?: NeutronMutationApplyFailureCode | string;
  readonly reconciliationRequired?: boolean;
  readonly transactionId?: string;
  readonly approvalId?: string;
  readonly reviewArtifactDigest?: string;
  readonly planDigest?: string;
  readonly changedPaths?: readonly string[];
  readonly diagnostics?: readonly string[];
}

export type NeutronMutationApproveAndApplyResponse =
  JsonRpcSuccess<NeutronMutationApproveAndApplyResult>;

export function createNeutronMutationApproveAndApplyResponse(
  id: RequestId,
  result: NeutronMutationApproveAndApplyResult,
): NeutronMutationApproveAndApplyResponse {
  return {
    jsonrpc: "2.0",
    id,
    result: validateNeutronMutationApproveAndApplyResult(result),
  };
}

export function parseNeutronMutationApproveAndApplyResponse(
  value: unknown,
): NeutronMutationApproveAndApplyResult {
  const record = approveApplyObject(value, "jsonrpc response");
  if (record.jsonrpc !== "2.0") {
    throw new ProtocolValidationError(-32600, "jsonrpc must equal 2.0");
  }
  return validateNeutronMutationApproveAndApplyResult(record.result);
}

export function validateNeutronMutationApproveAndApplyResult(
  value: unknown,
): NeutronMutationApproveAndApplyResult {
  const result = approveApplyObject(value, "result");
  rejectForbiddenResultKeys(result);
  rejectUnknownResultKeys(result);
  if (result.schemaVersion !== NEUTRON_MUTATION_APPROVE_AND_APPLY_SCHEMA_URN) {
    throw new ProtocolValidationError(
      -32602,
      "unsupported neutron mutation approve-and-apply schema",
    );
  }
  if (result.protocolVersion !== PROTOCOL_VERSION) {
    throw new ProtocolValidationError(-32602, "unsupported protocol version");
  }
  const stage = approveApplyOneOf(
    result.stage,
    NEUTRON_MUTATION_APPROVE_AND_APPLY_STAGES,
    "stage",
  );
  if (stage === "approval-rejected") return rejectedResult(result);
  return applyResult(result);
}

function rejectedResult(
  result: Record<string, unknown>,
): NeutronMutationApproveAndApplyResult {
  if (result.applied !== undefined) {
    throw new ProtocolValidationError(
      -32602,
      "approval-rejected result must not include applied",
    );
  }
  return {
    schemaVersion: NEUTRON_MUTATION_APPROVE_AND_APPLY_SCHEMA_URN,
    protocolVersion: PROTOCOL_VERSION,
    stage: "approval-rejected",
    approvalOutcome: approveApplyOneOf(
      result.approvalOutcome,
      NEUTRON_MUTATION_APPROVE_AND_APPLY_APPROVAL_OUTCOMES,
      "approvalOutcome",
    ),
    ...approveApplyOptionalString(result, "proposalId"),
    ...optionalDiagnostics(result),
  };
}

function applyResult(
  result: Record<string, unknown>,
): NeutronMutationApproveAndApplyResult {
  if (typeof result.applied !== "boolean") {
    throw new ProtocolValidationError(-32602, "applied must be a boolean");
  }
  const failureCode = optionalFailureCode(result.failureCode);
  return {
    schemaVersion: NEUTRON_MUTATION_APPROVE_AND_APPLY_SCHEMA_URN,
    protocolVersion: PROTOCOL_VERSION,
    stage: "apply",
    applied: result.applied,
    status: approveApplyOneOf(
      result.status,
      NEUTRON_MUTATION_APPLY_STATUSES,
      "status",
    ),
    reconciliationRequired: approveApplyBoolean(
      result.reconciliationRequired,
      "reconciliationRequired",
    ),
    changedPaths: approveApplyStringList(result.changedPaths, "changedPaths"),
    diagnostics: approveApplyStringList(result.diagnostics, "diagnostics"),
    ...approveApplyOptionalString(result, "proposalId"),
    ...approveApplyOptionalString(result, "transactionId"),
    ...approveApplyOptionalString(result, "approvalId"),
    ...approveApplyOptionalString(result, "reviewArtifactDigest"),
    ...approveApplyOptionalString(result, "planDigest"),
    ...(result.verificationStatus === undefined
      ? {}
      : {
          verificationStatus: approveApplyOneOf(
            result.verificationStatus,
            NEUTRON_MUTATION_VERIFICATION_STATUSES,
            "verificationStatus",
          ),
        }),
    ...(failureCode === undefined ? {} : { failureCode }),
  };
}

function rejectForbiddenResultKeys(result: Record<string, unknown>): void {
  for (const key of FORBIDDEN_RESULT_KEYS) {
    if (key in result) {
      throw new ProtocolValidationError(
        -32602,
        `approve-and-apply result must not include ${key}`,
      );
    }
  }
}

function rejectUnknownResultKeys(result: Record<string, unknown>): void {
  for (const key of Object.keys(result)) {
    if (!RESULT_KEYS.has(key)) {
      throw new ProtocolValidationError(
        -32602,
        `approve-and-apply result must not include ${key}`,
      );
    }
  }
}

function optionalDiagnostics(result: Record<string, unknown>): {
  readonly diagnostics?: readonly string[];
} {
  if (result.diagnostics === undefined) return {};
  return {
    diagnostics: approveApplyStringList(result.diagnostics, "diagnostics"),
  };
}

function optionalFailureCode(value: unknown): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "string" || !APPLY_FAILURE_CODES.has(value)) {
    throw new ProtocolValidationError(-32602, "failureCode is invalid");
  }
  return value;
}
