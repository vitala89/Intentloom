import {
  PROTOCOL_VERSION,
  EXISTING_PROJECT_ADOPTION_APPROVE_METHOD,
} from "./jsonrpc.js";
import type { JsonRpcRequest, JsonRpcSuccess, RequestId } from "./jsonrpc.js";
import { ProtocolValidationError } from "./protocol-validation-error.js";
import { stringValue } from "./workspace-daemon-request-helpers.js";
import { SHA256_HEX_PATTERN } from "./adoption-prepared-plan.js";
import { parseExistingProjectAdoptionPreparedPlan } from "./adoption-prepared-plan-parse.js";
import type { ExistingProjectAdoptionPreparedPlan } from "./adoption-prepared-plan.js";
import {
  EXISTING_PROJECT_ADOPTION_APPROVAL_SOURCE,
  type ExistingProjectAdoptionApprovalSource,
  type ExistingProjectAdoptionApproveViewModel,
} from "./adoption-approval.js";
import { parseExistingProjectAdoptionApproveViewModel } from "./adoption-approval-parse.js";

export interface ExistingProjectAdoptionApproveParams {
  readonly protocolVersion: typeof PROTOCOL_VERSION;
  readonly root: string;
  readonly preparedPlanId: string;
  readonly planDigest: string;
  readonly preparedPlan: ExistingProjectAdoptionPreparedPlan;
  readonly approvalSource: ExistingProjectAdoptionApprovalSource;
}

export type ExistingProjectAdoptionApproveRequest = JsonRpcRequest<
  typeof EXISTING_PROJECT_ADOPTION_APPROVE_METHOD,
  ExistingProjectAdoptionApproveParams
>;

export type ExistingProjectAdoptionApproveResponse = JsonRpcSuccess<{
  readonly protocolVersion: typeof PROTOCOL_VERSION;
  readonly viewmodel: ExistingProjectAdoptionApproveViewModel;
}>;

export function createExistingProjectAdoptionApproveRequest(
  id: RequestId,
  root: string,
  preparedPlanId: string,
  planDigest: string,
  preparedPlan: ExistingProjectAdoptionPreparedPlan,
  approvalSource: ExistingProjectAdoptionApprovalSource = EXISTING_PROJECT_ADOPTION_APPROVAL_SOURCE,
): ExistingProjectAdoptionApproveRequest {
  return {
    jsonrpc: "2.0",
    id,
    method: EXISTING_PROJECT_ADOPTION_APPROVE_METHOD,
    params: {
      protocolVersion: PROTOCOL_VERSION,
      root,
      preparedPlanId,
      planDigest,
      preparedPlan: parseExistingProjectAdoptionPreparedPlan(preparedPlan),
      approvalSource,
    },
  };
}

export function createExistingProjectAdoptionApproveResponse(
  id: RequestId,
  viewmodel: ExistingProjectAdoptionApproveViewModel,
): ExistingProjectAdoptionApproveResponse {
  return {
    jsonrpc: "2.0",
    id,
    result: {
      protocolVersion: PROTOCOL_VERSION,
      viewmodel: parseExistingProjectAdoptionApproveViewModel(viewmodel),
    },
  };
}

export function isExistingProjectAdoptionApproveMethod(
  method: string,
): method is typeof EXISTING_PROJECT_ADOPTION_APPROVE_METHOD {
  return method === EXISTING_PROJECT_ADOPTION_APPROVE_METHOD;
}

export function parseExistingProjectAdoptionApproveRequest(
  method: string,
  params: Record<string, unknown>,
  id: RequestId,
): ExistingProjectAdoptionApproveRequest | null {
  if (method !== EXISTING_PROJECT_ADOPTION_APPROVE_METHOD) return null;
  if (typeof params.root !== "string" || params.root.length === 0) {
    throw new ProtocolValidationError(
      -32602,
      "root must be a non-empty string",
    );
  }
  const planDigest = stringValue(params.planDigest, "planDigest");
  if (!SHA256_HEX_PATTERN.test(planDigest)) {
    throw new ProtocolValidationError(
      -32602,
      "planDigest must be a sha256 hex digest",
    );
  }
  const approvalSource =
    params.approvalSource === undefined
      ? EXISTING_PROJECT_ADOPTION_APPROVAL_SOURCE
      : stringValue(params.approvalSource, "approvalSource");
  if (approvalSource !== EXISTING_PROJECT_ADOPTION_APPROVAL_SOURCE) {
    throw new ProtocolValidationError(-32602, "approvalSource is unsupported");
  }
  return createExistingProjectAdoptionApproveRequest(
    id,
    params.root,
    stringValue(params.preparedPlanId, "preparedPlanId"),
    planDigest,
    parseExistingProjectAdoptionPreparedPlan(params.preparedPlan),
    EXISTING_PROJECT_ADOPTION_APPROVAL_SOURCE,
  );
}
