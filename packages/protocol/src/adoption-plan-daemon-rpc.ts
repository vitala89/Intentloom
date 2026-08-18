import {
  PROTOCOL_VERSION,
  EXISTING_PROJECT_ADOPTION_PLAN_METHOD,
} from "./jsonrpc.js";
import type { JsonRpcRequest, JsonRpcSuccess, RequestId } from "./jsonrpc.js";
import { ProtocolValidationError } from "./protocol-validation-error.js";
import type { ExistingProjectAdoptionPlanViewModel } from "./adoption-plan.js";

export type {
  AdoptionPreviewAction,
  AdoptionPreviewItem,
  ExistingProjectAdoptionPlanViewModel,
} from "./adoption-plan.js";
export { parseExistingProjectAdoptionPlanViewModel } from "./adoption-plan.js";

export interface ExistingProjectAdoptionPlanParams {
  readonly protocolVersion: typeof PROTOCOL_VERSION;
  readonly root: string;
  readonly projectId?: string;
}

export type ExistingProjectAdoptionPlanRequest = JsonRpcRequest<
  typeof EXISTING_PROJECT_ADOPTION_PLAN_METHOD,
  ExistingProjectAdoptionPlanParams
>;

interface ExistingProjectAdoptionPlanResult {
  readonly protocolVersion: typeof PROTOCOL_VERSION;
  readonly viewmodel: ExistingProjectAdoptionPlanViewModel;
}

export type ExistingProjectAdoptionPlanResponse =
  JsonRpcSuccess<ExistingProjectAdoptionPlanResult>;

export function createExistingProjectAdoptionPlanRequest(
  id: RequestId,
  root: string,
  projectId?: string,
): ExistingProjectAdoptionPlanRequest {
  return {
    jsonrpc: "2.0",
    id,
    method: EXISTING_PROJECT_ADOPTION_PLAN_METHOD,
    params: {
      protocolVersion: PROTOCOL_VERSION,
      root,
      ...(projectId !== undefined ? { projectId } : {}),
    },
  };
}

export function createExistingProjectAdoptionPlanResponse(
  id: RequestId,
  viewmodel: ExistingProjectAdoptionPlanViewModel,
): ExistingProjectAdoptionPlanResponse {
  return {
    jsonrpc: "2.0",
    id,
    result: { protocolVersion: PROTOCOL_VERSION, viewmodel },
  };
}

export function isExistingProjectAdoptionPlanMethod(
  method: string,
): method is typeof EXISTING_PROJECT_ADOPTION_PLAN_METHOD {
  return method === EXISTING_PROJECT_ADOPTION_PLAN_METHOD;
}

export function parseExistingProjectAdoptionPlanRequest(
  method: string,
  params: Record<string, unknown>,
  id: RequestId,
): ExistingProjectAdoptionPlanRequest | null {
  if (method !== EXISTING_PROJECT_ADOPTION_PLAN_METHOD) return null;
  if (typeof params.root !== "string" || params.root.length === 0) {
    throw new ProtocolValidationError(
      -32602,
      "root must be a non-empty string",
    );
  }
  if (params.projectId === undefined) {
    return createExistingProjectAdoptionPlanRequest(id, params.root);
  }
  if (typeof params.projectId !== "string" || params.projectId.length === 0) {
    throw new ProtocolValidationError(
      -32602,
      "projectId must be a non-empty string when provided",
    );
  }
  return createExistingProjectAdoptionPlanRequest(
    id,
    params.root,
    params.projectId,
  );
}
