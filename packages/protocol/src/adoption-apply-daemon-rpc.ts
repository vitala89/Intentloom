import {
  PROTOCOL_VERSION,
  EXISTING_PROJECT_ADOPTION_APPLY_METHOD,
} from "./jsonrpc.js";
import type { JsonRpcRequest, JsonRpcSuccess, RequestId } from "./jsonrpc.js";
import { ProtocolValidationError } from "./protocol-validation-error.js";
import { stringValue } from "./workspace-daemon-request-helpers.js";
import { SHA256_HEX_PATTERN } from "./adoption-prepared-plan.js";
import { parseExistingProjectAdoptionPreparedPlan } from "./adoption-prepared-plan-parse.js";
import { parseExistingProjectAdoptionApproval } from "./adoption-approval-parse.js";
import { parseExistingProjectAdoptionApplyViewModel } from "./adoption-apply-parse.js";
import type { ExistingProjectAdoptionPreparedPlan } from "./adoption-prepared-plan.js";
import type { ExistingProjectAdoptionApproval } from "./adoption-approval.js";
import type { ExistingProjectAdoptionApplyViewModel } from "./adoption-apply.js";

export interface ExistingProjectAdoptionApplyParams {
  readonly protocolVersion: typeof PROTOCOL_VERSION;
  readonly root: string;
  readonly preparedPlanId: string;
  readonly planDigest: string;
  readonly preparedPlan: ExistingProjectAdoptionPreparedPlan;
  readonly approval: ExistingProjectAdoptionApproval;
}

export type ExistingProjectAdoptionApplyRequest = JsonRpcRequest<
  typeof EXISTING_PROJECT_ADOPTION_APPLY_METHOD,
  ExistingProjectAdoptionApplyParams
>;

export type ExistingProjectAdoptionApplyResponse = JsonRpcSuccess<{
  readonly protocolVersion: typeof PROTOCOL_VERSION;
  readonly viewmodel: ExistingProjectAdoptionApplyViewModel;
}>;

export function createExistingProjectAdoptionApplyRequest(
  id: RequestId,
  root: string,
  preparedPlanId: string,
  planDigest: string,
  preparedPlan: ExistingProjectAdoptionPreparedPlan,
  approval: ExistingProjectAdoptionApproval,
): ExistingProjectAdoptionApplyRequest {
  return {
    jsonrpc: "2.0",
    id,
    method: EXISTING_PROJECT_ADOPTION_APPLY_METHOD,
    params: {
      protocolVersion: PROTOCOL_VERSION,
      root,
      preparedPlanId,
      planDigest,
      preparedPlan: parseExistingProjectAdoptionPreparedPlan(preparedPlan),
      approval: parseExistingProjectAdoptionApproval(approval),
    },
  };
}

export function createExistingProjectAdoptionApplyResponse(
  id: RequestId,
  viewmodel: ExistingProjectAdoptionApplyViewModel,
): ExistingProjectAdoptionApplyResponse {
  return {
    jsonrpc: "2.0",
    id,
    result: {
      protocolVersion: PROTOCOL_VERSION,
      viewmodel: parseExistingProjectAdoptionApplyViewModel(viewmodel),
    },
  };
}

export function isExistingProjectAdoptionApplyMethod(
  method: string,
): method is typeof EXISTING_PROJECT_ADOPTION_APPLY_METHOD {
  return method === EXISTING_PROJECT_ADOPTION_APPLY_METHOD;
}

export function parseExistingProjectAdoptionApplyRequest(
  method: string,
  params: Record<string, unknown>,
  id: RequestId,
): ExistingProjectAdoptionApplyRequest | null {
  if (method !== EXISTING_PROJECT_ADOPTION_APPLY_METHOD) return null;
  if (typeof params.root !== "string" || params.root.length === 0) {
    throw new ProtocolValidationError(
      -32602,
      "root must be a non-empty string",
    );
  }
  if ("previousContent" in params) {
    throw new ProtocolValidationError(
      -32602,
      "apply request must not include previousContent",
    );
  }
  const planDigest = stringValue(params.planDigest, "planDigest");
  if (!SHA256_HEX_PATTERN.test(planDigest)) {
    throw new ProtocolValidationError(
      -32602,
      "planDigest must be a sha256 hex digest",
    );
  }
  if (params.approval === undefined) {
    throw new ProtocolValidationError(-32602, "approval is required");
  }
  return createExistingProjectAdoptionApplyRequest(
    id,
    params.root,
    stringValue(params.preparedPlanId, "preparedPlanId"),
    planDigest,
    parseExistingProjectAdoptionPreparedPlan(params.preparedPlan),
    parseExistingProjectAdoptionApproval(params.approval),
  );
}
