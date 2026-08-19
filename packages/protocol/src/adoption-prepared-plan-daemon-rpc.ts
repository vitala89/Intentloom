import {
  PROTOCOL_VERSION,
  EXISTING_PROJECT_ADOPTION_PREPARE_METHOD,
  EXISTING_PROJECT_ADOPTION_REVALIDATE_METHOD,
} from "./jsonrpc.js";
import type { JsonRpcRequest, JsonRpcSuccess, RequestId } from "./jsonrpc.js";
import { ProtocolValidationError } from "./protocol-validation-error.js";
import { stringValue } from "./workspace-daemon-request-helpers.js";
import { ADOPTION_PREVIEW_IDENTITY_PATTERN } from "./adoption-plan.js";
import { parseSelectedAdoptionDecisions } from "./adoption-decision-parse.js";
import type { SelectedAdoptionDecision } from "./adoption-decision.js";
import {
  parseExistingProjectAdoptionPreparedPlan,
  parseExistingProjectAdoptionPrepareViewModel,
  parseExistingProjectAdoptionRevalidateViewModel,
} from "./adoption-prepared-plan-parse.js";
import type {
  ExistingProjectAdoptionPreparedPlan,
  ExistingProjectAdoptionPrepareViewModel,
  ExistingProjectAdoptionRevalidateViewModel,
} from "./adoption-prepared-plan.js";

export interface ExistingProjectAdoptionPrepareParams {
  readonly protocolVersion: typeof PROTOCOL_VERSION;
  readonly root: string;
  readonly previewIdentity: string;
  readonly projectId?: string;
  readonly decisions: readonly SelectedAdoptionDecision[];
}

export type ExistingProjectAdoptionPrepareRequest = JsonRpcRequest<
  typeof EXISTING_PROJECT_ADOPTION_PREPARE_METHOD,
  ExistingProjectAdoptionPrepareParams
>;

export type ExistingProjectAdoptionPrepareResponse = JsonRpcSuccess<{
  readonly protocolVersion: typeof PROTOCOL_VERSION;
  readonly viewmodel: ExistingProjectAdoptionPrepareViewModel;
}>;

export interface ExistingProjectAdoptionRevalidateParams {
  readonly protocolVersion: typeof PROTOCOL_VERSION;
  readonly root: string;
  readonly preparedPlan: ExistingProjectAdoptionPreparedPlan;
}

export type ExistingProjectAdoptionRevalidateRequest = JsonRpcRequest<
  typeof EXISTING_PROJECT_ADOPTION_REVALIDATE_METHOD,
  ExistingProjectAdoptionRevalidateParams
>;

export type ExistingProjectAdoptionRevalidateResponse = JsonRpcSuccess<{
  readonly protocolVersion: typeof PROTOCOL_VERSION;
  readonly viewmodel: ExistingProjectAdoptionRevalidateViewModel;
}>;

export function createExistingProjectAdoptionPrepareRequest(
  id: RequestId,
  root: string,
  previewIdentity: string,
  decisions: readonly SelectedAdoptionDecision[],
  projectId?: string,
): ExistingProjectAdoptionPrepareRequest {
  return {
    jsonrpc: "2.0",
    id,
    method: EXISTING_PROJECT_ADOPTION_PREPARE_METHOD,
    params: {
      protocolVersion: PROTOCOL_VERSION,
      root,
      previewIdentity,
      decisions,
      ...(projectId !== undefined ? { projectId } : {}),
    },
  };
}

export function createExistingProjectAdoptionPrepareResponse(
  id: RequestId,
  viewmodel: ExistingProjectAdoptionPrepareViewModel,
): ExistingProjectAdoptionPrepareResponse {
  return {
    jsonrpc: "2.0",
    id,
    result: {
      protocolVersion: PROTOCOL_VERSION,
      viewmodel: parseExistingProjectAdoptionPrepareViewModel(viewmodel),
    },
  };
}

export function createExistingProjectAdoptionRevalidateRequest(
  id: RequestId,
  root: string,
  preparedPlan: ExistingProjectAdoptionPreparedPlan,
): ExistingProjectAdoptionRevalidateRequest {
  return {
    jsonrpc: "2.0",
    id,
    method: EXISTING_PROJECT_ADOPTION_REVALIDATE_METHOD,
    params: {
      protocolVersion: PROTOCOL_VERSION,
      root,
      preparedPlan: parseExistingProjectAdoptionPreparedPlan(preparedPlan),
    },
  };
}

export function createExistingProjectAdoptionRevalidateResponse(
  id: RequestId,
  viewmodel: ExistingProjectAdoptionRevalidateViewModel,
): ExistingProjectAdoptionRevalidateResponse {
  return {
    jsonrpc: "2.0",
    id,
    result: {
      protocolVersion: PROTOCOL_VERSION,
      viewmodel: parseExistingProjectAdoptionRevalidateViewModel(viewmodel),
    },
  };
}

export function isExistingProjectAdoptionPrepareMethod(
  method: string,
): method is typeof EXISTING_PROJECT_ADOPTION_PREPARE_METHOD {
  return method === EXISTING_PROJECT_ADOPTION_PREPARE_METHOD;
}

export function isExistingProjectAdoptionRevalidateMethod(
  method: string,
): method is typeof EXISTING_PROJECT_ADOPTION_REVALIDATE_METHOD {
  return method === EXISTING_PROJECT_ADOPTION_REVALIDATE_METHOD;
}

export function parseExistingProjectAdoptionPrepareRequest(
  method: string,
  params: Record<string, unknown>,
  id: RequestId,
): ExistingProjectAdoptionPrepareRequest | null {
  if (method !== EXISTING_PROJECT_ADOPTION_PREPARE_METHOD) return null;
  if (typeof params.root !== "string" || params.root.length === 0) {
    throw new ProtocolValidationError(
      -32602,
      "root must be a non-empty string",
    );
  }
  const previewIdentity = stringValue(
    params.previewIdentity,
    "previewIdentity",
  );
  if (!ADOPTION_PREVIEW_IDENTITY_PATTERN.test(previewIdentity)) {
    throw new ProtocolValidationError(
      -32602,
      "previewIdentity must be a sha256 hex digest",
    );
  }
  const decisions = parseSelectedAdoptionDecisions(params.decisions);
  if (params.projectId === undefined) {
    return createExistingProjectAdoptionPrepareRequest(
      id,
      params.root,
      previewIdentity,
      decisions,
    );
  }
  if (typeof params.projectId !== "string" || params.projectId.length === 0) {
    throw new ProtocolValidationError(
      -32602,
      "projectId must be a non-empty string when provided",
    );
  }
  return createExistingProjectAdoptionPrepareRequest(
    id,
    params.root,
    previewIdentity,
    decisions,
    params.projectId,
  );
}

export function parseExistingProjectAdoptionRevalidateRequest(
  method: string,
  params: Record<string, unknown>,
  id: RequestId,
): ExistingProjectAdoptionRevalidateRequest | null {
  if (method !== EXISTING_PROJECT_ADOPTION_REVALIDATE_METHOD) return null;
  if (typeof params.root !== "string" || params.root.length === 0) {
    throw new ProtocolValidationError(
      -32602,
      "root must be a non-empty string",
    );
  }
  return createExistingProjectAdoptionRevalidateRequest(
    id,
    params.root,
    parseExistingProjectAdoptionPreparedPlan(params.preparedPlan),
  );
}
