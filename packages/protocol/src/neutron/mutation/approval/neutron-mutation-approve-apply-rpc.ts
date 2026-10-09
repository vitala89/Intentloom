import type { NeutronMutationApprovalIntent } from "./neutron-mutation-approval-intent.js";
import {
  NEUTRON_MUTATION_APPROVAL_INTENT_ACTION,
  NEUTRON_MUTATION_APPROVAL_INTENT_AUTHORITY_KEYS,
  NEUTRON_MUTATION_APPROVAL_INTENT_FIELDS,
  NEUTRON_MUTATION_APPROVAL_INTENT_SCHEMA_URN,
} from "./neutron-mutation-approval-intent.js";
import {
  NEUTRON_MUTATION_APPROVE_AND_APPLY_METHOD,
  PROTOCOL_VERSION,
} from "../../../jsonrpc.js";
import type { JsonRpcRequest, RequestId } from "../../../jsonrpc.js";
import { ProtocolValidationError } from "../../../protocol-validation-error.js";

export {
  NEUTRON_MUTATION_APPROVAL_INTENT_ACTION,
  NEUTRON_MUTATION_APPROVAL_INTENT_SCHEMA_URN,
};

export const NEUTRON_MUTATION_APPROVE_AND_APPLY_SCHEMA_URN =
  "urn:intentloom:schema:neutron-mutation-approve-and-apply:1" as const;

export const NEUTRON_MUTATION_APPROVE_AND_APPLY_STAGES = [
  "approval-rejected",
  "apply",
] as const;
export type NeutronMutationApproveAndApplyStage =
  (typeof NEUTRON_MUTATION_APPROVE_AND_APPLY_STAGES)[number];

/**
 * Host refusal before a canonical Apply transaction. These are not write
 * results. `applied` is not reported in this stage.
 */
export const NEUTRON_MUTATION_APPROVE_AND_APPLY_APPROVAL_OUTCOMES = [
  "proposal-not-found",
  "review-unavailable",
  "preview-not-authoritative",
  "root-mismatch",
  "project-mismatch",
  "session-mismatch",
  "graph-mismatch",
  "payload-mismatch",
  "stale",
  "expired",
  "cancelled",
  "graph-stale",
  "intent-rejected",
  "not-eligible",
  "durable-state-unavailable",
] as const;
export type NeutronMutationApproveAndApplyApprovalOutcome =
  (typeof NEUTRON_MUTATION_APPROVE_AND_APPLY_APPROVAL_OUTCOMES)[number];

export const NEUTRON_MUTATION_APPROVE_AND_APPLY_GRAPH_FAILURE_CODES = [
  "preview-not-authoritative",
  "proposal-not-found",
  "graph-stale",
  "cancelled-before-write",
] as const;

export type NeutronMutationApproveAndApplyRequest = JsonRpcRequest<
  typeof NEUTRON_MUTATION_APPROVE_AND_APPLY_METHOD,
  NeutronMutationApprovalIntent
>;

export function isNeutronMutationApproveAndApplyMethod(
  method: string,
): method is typeof NEUTRON_MUTATION_APPROVE_AND_APPLY_METHOD {
  return method === NEUTRON_MUTATION_APPROVE_AND_APPLY_METHOD;
}

export function createNeutronMutationApproveAndApplyRequest(
  id: RequestId,
  intent: NeutronMutationApprovalIntent,
): NeutronMutationApproveAndApplyRequest {
  return {
    jsonrpc: "2.0",
    id,
    method: NEUTRON_MUTATION_APPROVE_AND_APPLY_METHOD,
    params: intent,
  };
}

export function parseNeutronMutationApproveAndApplyDaemonRequest(
  method: string,
  params: Record<string, unknown>,
  id: RequestId,
): NeutronMutationApproveAndApplyRequest | null {
  if (!isNeutronMutationApproveAndApplyMethod(method)) return null;
  return createNeutronMutationApproveAndApplyRequest(
    id,
    parseNeutronMutationApproveAndApplyParams(params),
  );
}

export function parseNeutronMutationApproveAndApplyParams(
  params: Record<string, unknown>,
): NeutronMutationApprovalIntent {
  rejectUnknownParamKeys(params);
  if (params.schemaVersion !== NEUTRON_MUTATION_APPROVAL_INTENT_SCHEMA_URN) {
    throw new ProtocolValidationError(
      -32602,
      "unsupported neutron mutation approval intent schema",
    );
  }
  if (params.protocolVersion !== PROTOCOL_VERSION) {
    throw new ProtocolValidationError(
      -32602,
      "mutation approval intent protocolVersion is invalid",
    );
  }
  if (params.action !== NEUTRON_MUTATION_APPROVAL_INTENT_ACTION) {
    throw new ProtocolValidationError(
      -32602,
      "mutation approval intent action is invalid",
    );
  }
  return {
    schemaVersion: NEUTRON_MUTATION_APPROVAL_INTENT_SCHEMA_URN,
    protocolVersion: PROTOCOL_VERSION,
    action: NEUTRON_MUTATION_APPROVAL_INTENT_ACTION,
    root: requiredString(params.root, "root"),
    sessionId: requiredString(params.sessionId, "sessionId"),
    projectId: requiredString(params.projectId, "projectId"),
    graphId: requiredString(params.graphId, "graphId"),
    proposalId: requiredString(params.proposalId, "proposalId"),
  };
}

function rejectUnknownParamKeys(params: Record<string, unknown>): void {
  const allowed = new Set<string>(NEUTRON_MUTATION_APPROVAL_INTENT_FIELDS);
  for (const key of Object.keys(params)) {
    if (!allowed.has(key)) {
      throw new ProtocolValidationError(
        -32602,
        `mutation approval intent must not include ${key}`,
      );
    }
  }
  for (const key of NEUTRON_MUTATION_APPROVAL_INTENT_AUTHORITY_KEYS) {
    if (key in params) {
      throw new ProtocolValidationError(
        -32602,
        `mutation approval intent must not include ${key}`,
      );
    }
  }
}

function requiredString(value: unknown, field: string): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new ProtocolValidationError(
      -32602,
      `${field} must be a non-empty string`,
    );
  }
  return value;
}
