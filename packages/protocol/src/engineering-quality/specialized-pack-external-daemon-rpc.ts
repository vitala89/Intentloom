import {
  PROTOCOL_VERSION,
  SPECIALIZED_PACKS_EXTERNAL_ACTIVATE_METHOD,
  SPECIALIZED_PACKS_EXTERNAL_PREVIEW_METHOD,
} from "../jsonrpc.js";
import type { JsonRpcRequest, JsonRpcSuccess, RequestId } from "../jsonrpc.js";
import type { ExternalQualityPackActivationApproval } from "./external-pack-import.js";
import type { ExternalQualityPackSource } from "./external-pack-import.js";
import { ProtocolValidationError } from "../protocol-validation-error.js";
import {
  parseExternalSpecializedPackActivateFields,
  parseExternalSpecializedPackPreviewFields,
} from "./specialized-pack-external-daemon-parse.js";

export type SpecializedPackExternalViewmodelPayload = Readonly<
  Record<string, unknown>
>;

interface SpecializedPackExternalResultPayload {
  readonly protocolVersion: typeof PROTOCOL_VERSION;
  readonly viewmodel: SpecializedPackExternalViewmodelPayload;
}

export interface SpecializedPacksExternalPreviewParams {
  readonly protocolVersion: typeof PROTOCOL_VERSION;
  readonly root: string;
  readonly payload: string;
  readonly source: ExternalQualityPackSource;
  readonly declaredPublisher: string;
  readonly declaredLicense: string;
}

export interface SpecializedPacksExternalActivateParams extends SpecializedPacksExternalPreviewParams {
  readonly approval: ExternalQualityPackActivationApproval;
}

export type SpecializedPacksExternalPreviewRequest = JsonRpcRequest<
  typeof SPECIALIZED_PACKS_EXTERNAL_PREVIEW_METHOD,
  SpecializedPacksExternalPreviewParams
>;

export type SpecializedPacksExternalActivateRequest = JsonRpcRequest<
  typeof SPECIALIZED_PACKS_EXTERNAL_ACTIVATE_METHOD,
  SpecializedPacksExternalActivateParams
>;

export type SpecializedPacksExternalPreviewResponse =
  JsonRpcSuccess<SpecializedPackExternalResultPayload>;

export type SpecializedPacksExternalActivateResponse =
  JsonRpcSuccess<SpecializedPackExternalResultPayload>;

export function isSpecializedPacksExternalPreviewMethod(
  method: string,
): method is typeof SPECIALIZED_PACKS_EXTERNAL_PREVIEW_METHOD {
  return method === SPECIALIZED_PACKS_EXTERNAL_PREVIEW_METHOD;
}

export function isSpecializedPacksExternalActivateMethod(
  method: string,
): method is typeof SPECIALIZED_PACKS_EXTERNAL_ACTIVATE_METHOD {
  return method === SPECIALIZED_PACKS_EXTERNAL_ACTIVATE_METHOD;
}

export function parseSpecializedPacksExternalPreviewRequest(
  method: string,
  params: Record<string, unknown>,
  id: RequestId,
  root: string,
): SpecializedPacksExternalPreviewRequest | null {
  if (!isSpecializedPacksExternalPreviewMethod(method)) return null;
  try {
    const fields = parseExternalSpecializedPackPreviewFields(params);
    return createSpecializedPacksExternalPreviewRequest(id, root, fields);
  } catch (error: unknown) {
    if (error instanceof ProtocolValidationError) throw error;
    throw new ProtocolValidationError(
      -32602,
      error instanceof Error ? error.message : String(error),
    );
  }
}

export function parseSpecializedPacksExternalActivateRequest(
  method: string,
  params: Record<string, unknown>,
  id: RequestId,
  root: string,
): SpecializedPacksExternalActivateRequest | null {
  if (!isSpecializedPacksExternalActivateMethod(method)) return null;
  try {
    const fields = parseExternalSpecializedPackActivateFields(params);
    return createSpecializedPacksExternalActivateRequest(id, root, fields);
  } catch (error: unknown) {
    if (error instanceof ProtocolValidationError) throw error;
    throw new ProtocolValidationError(
      -32602,
      error instanceof Error ? error.message : String(error),
    );
  }
}

export function createSpecializedPacksExternalPreviewRequest(
  id: RequestId,
  root: string,
  params: Omit<
    SpecializedPacksExternalPreviewParams,
    "protocolVersion" | "root"
  >,
): SpecializedPacksExternalPreviewRequest {
  return {
    jsonrpc: "2.0",
    id,
    method: SPECIALIZED_PACKS_EXTERNAL_PREVIEW_METHOD,
    params: { protocolVersion: PROTOCOL_VERSION, root, ...params },
  };
}

export function createSpecializedPacksExternalActivateRequest(
  id: RequestId,
  root: string,
  params: Omit<
    SpecializedPacksExternalActivateParams,
    "protocolVersion" | "root"
  >,
): SpecializedPacksExternalActivateRequest {
  return {
    jsonrpc: "2.0",
    id,
    method: SPECIALIZED_PACKS_EXTERNAL_ACTIVATE_METHOD,
    params: { protocolVersion: PROTOCOL_VERSION, root, ...params },
  };
}

export function createSpecializedPacksExternalPreviewResponse(
  id: RequestId,
  viewmodel: SpecializedPackExternalViewmodelPayload,
): SpecializedPacksExternalPreviewResponse {
  return {
    jsonrpc: "2.0",
    id,
    result: { protocolVersion: PROTOCOL_VERSION, viewmodel },
  };
}

export function createSpecializedPacksExternalActivateResponse(
  id: RequestId,
  viewmodel: SpecializedPackExternalViewmodelPayload,
): SpecializedPacksExternalActivateResponse {
  return {
    jsonrpc: "2.0",
    id,
    result: { protocolVersion: PROTOCOL_VERSION, viewmodel },
  };
}
