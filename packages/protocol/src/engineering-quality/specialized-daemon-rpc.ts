import {
  PROTOCOL_VERSION,
  SPECIALIZED_PACKS_CATALOG_METHOD,
  SPECIALIZED_PACKS_CHECKS_METHOD,
  SPECIALIZED_PACKS_DETECT_METHOD,
} from "../jsonrpc.js";
import type { JsonRpcRequest, JsonRpcSuccess, RequestId } from "../jsonrpc.js";

export type SpecializedPackViewmodelPayload = Readonly<Record<string, unknown>>;

export interface SpecializedPackParams {
  readonly protocolVersion: typeof PROTOCOL_VERSION;
  readonly root: string;
}

interface SpecializedPackResultPayload {
  readonly protocolVersion: typeof PROTOCOL_VERSION;
  readonly viewmodel: SpecializedPackViewmodelPayload;
}

type SpecializedPackMethod =
  | typeof SPECIALIZED_PACKS_CATALOG_METHOD
  | typeof SPECIALIZED_PACKS_DETECT_METHOD
  | typeof SPECIALIZED_PACKS_CHECKS_METHOD;

type SpecializedPackRequest<Method extends SpecializedPackMethod> =
  JsonRpcRequest<Method, SpecializedPackParams>;

type SpecializedPackResponse = JsonRpcSuccess<SpecializedPackResultPayload>;

export type SpecializedPacksCatalogResultPayload = SpecializedPackResultPayload;
export type SpecializedPacksCatalogRequest = SpecializedPackRequest<
  typeof SPECIALIZED_PACKS_CATALOG_METHOD
>;
export type SpecializedPacksCatalogResponse = SpecializedPackResponse;

export type SpecializedPacksDetectResultPayload = SpecializedPackResultPayload;
export type SpecializedPacksDetectRequest = SpecializedPackRequest<
  typeof SPECIALIZED_PACKS_DETECT_METHOD
>;
export type SpecializedPacksDetectResponse = SpecializedPackResponse;

export type SpecializedPacksChecksResultPayload = SpecializedPackResultPayload;
export type SpecializedPacksChecksRequest = SpecializedPackRequest<
  typeof SPECIALIZED_PACKS_CHECKS_METHOD
>;
export type SpecializedPacksChecksResponse = SpecializedPackResponse;

function createSpecializedPackRequest<Method extends SpecializedPackMethod>(
  id: RequestId,
  method: Method,
  root: string,
): SpecializedPackRequest<Method> {
  return {
    jsonrpc: "2.0",
    id,
    method,
    params: { protocolVersion: PROTOCOL_VERSION, root },
  };
}

function createSpecializedPackResponse(
  id: RequestId,
  result: Omit<SpecializedPackResultPayload, "protocolVersion">,
): SpecializedPackResponse {
  return {
    jsonrpc: "2.0",
    id,
    result: { protocolVersion: PROTOCOL_VERSION, ...result },
  };
}

export function createSpecializedPacksCatalogRequest(
  id: RequestId,
  root: string,
): SpecializedPacksCatalogRequest {
  return createSpecializedPackRequest(
    id,
    SPECIALIZED_PACKS_CATALOG_METHOD,
    root,
  );
}

export function createSpecializedPacksDetectRequest(
  id: RequestId,
  root: string,
): SpecializedPacksDetectRequest {
  return createSpecializedPackRequest(
    id,
    SPECIALIZED_PACKS_DETECT_METHOD,
    root,
  );
}

export function createSpecializedPacksChecksRequest(
  id: RequestId,
  root: string,
): SpecializedPacksChecksRequest {
  return createSpecializedPackRequest(
    id,
    SPECIALIZED_PACKS_CHECKS_METHOD,
    root,
  );
}

export function createSpecializedPacksCatalogResponse(
  id: RequestId,
  result: Omit<SpecializedPacksCatalogResultPayload, "protocolVersion">,
): SpecializedPacksCatalogResponse {
  return createSpecializedPackResponse(id, result);
}

export function createSpecializedPacksDetectResponse(
  id: RequestId,
  result: Omit<SpecializedPacksDetectResultPayload, "protocolVersion">,
): SpecializedPacksDetectResponse {
  return createSpecializedPackResponse(id, result);
}

export function createSpecializedPacksChecksResponse(
  id: RequestId,
  result: Omit<SpecializedPacksChecksResultPayload, "protocolVersion">,
): SpecializedPacksChecksResponse {
  return createSpecializedPackResponse(id, result);
}
