import {
  PROTOCOL_VERSION,
  QUALITY_CATALOG_METHOD,
  QUALITY_CHECKERS_METHOD,
  QUALITY_GRAPH_METHOD,
  QUALITY_STANDARDS_METHOD,
} from "../jsonrpc.js";
import type { JsonRpcRequest, JsonRpcSuccess, RequestId } from "../jsonrpc.js";

export type QualityViewmodelPayload = Readonly<Record<string, unknown>>;
export interface QualityParams {
  readonly protocolVersion: typeof PROTOCOL_VERSION;
  readonly root: string;
}
interface QualityResultPayload {
  readonly protocolVersion: typeof PROTOCOL_VERSION;
  readonly viewmodel: QualityViewmodelPayload;
}
type QualityMethod =
  | typeof QUALITY_STANDARDS_METHOD
  | typeof QUALITY_CATALOG_METHOD
  | typeof QUALITY_CHECKERS_METHOD
  | typeof QUALITY_GRAPH_METHOD;
type QualityRequest<Method extends QualityMethod> = JsonRpcRequest<
  Method,
  QualityParams
>;
type QualityResponse = JsonRpcSuccess<QualityResultPayload>;

export type QualityStandardsResultPayload = QualityResultPayload;
export type QualityStandardsRequest = QualityRequest<
  typeof QUALITY_STANDARDS_METHOD
>;
export type QualityStandardsResponse = QualityResponse;
export type QualityCatalogResultPayload = QualityResultPayload;
export type QualityCatalogRequest = QualityRequest<
  typeof QUALITY_CATALOG_METHOD
>;
export type QualityCatalogResponse = QualityResponse;
export type QualityCheckersResultPayload = QualityResultPayload;
export type QualityCheckersRequest = QualityRequest<
  typeof QUALITY_CHECKERS_METHOD
>;
export type QualityCheckersResponse = QualityResponse;
export type QualityGraphResultPayload = QualityResultPayload;
export type QualityGraphRequest = QualityRequest<typeof QUALITY_GRAPH_METHOD>;
export type QualityGraphResponse = QualityResponse;
function createQualityRequest<Method extends QualityMethod>(
  id: RequestId,
  method: Method,
  root: string,
): QualityRequest<Method> {
  return {
    jsonrpc: "2.0",
    id,
    method,
    params: { protocolVersion: PROTOCOL_VERSION, root },
  };
}

function createQualityResponse(
  id: RequestId,
  result: Omit<QualityResultPayload, "protocolVersion">,
): QualityResponse {
  return {
    jsonrpc: "2.0",
    id,
    result: { protocolVersion: PROTOCOL_VERSION, ...result },
  };
}

export function createQualityStandardsRequest(
  id: RequestId,
  root: string,
): QualityStandardsRequest {
  return createQualityRequest(id, QUALITY_STANDARDS_METHOD, root);
}
export function createQualityCatalogRequest(
  id: RequestId,
  root: string,
): QualityCatalogRequest {
  return createQualityRequest(id, QUALITY_CATALOG_METHOD, root);
}
export function createQualityCheckersRequest(
  id: RequestId,
  root: string,
): QualityCheckersRequest {
  return createQualityRequest(id, QUALITY_CHECKERS_METHOD, root);
}
export function createQualityGraphRequest(
  id: RequestId,
  root: string,
): QualityGraphRequest {
  return createQualityRequest(id, QUALITY_GRAPH_METHOD, root);
}

export function createQualityStandardsResponse(
  id: RequestId,
  result: Omit<QualityStandardsResultPayload, "protocolVersion">,
): QualityStandardsResponse {
  return createQualityResponse(id, result) as QualityStandardsResponse;
}
export function createQualityCatalogResponse(
  id: RequestId,
  result: Omit<QualityCatalogResultPayload, "protocolVersion">,
): QualityCatalogResponse {
  return createQualityResponse(id, result) as QualityCatalogResponse;
}
export function createQualityCheckersResponse(
  id: RequestId,
  result: Omit<QualityCheckersResultPayload, "protocolVersion">,
): QualityCheckersResponse {
  return createQualityResponse(id, result) as QualityCheckersResponse;
}
export function createQualityGraphResponse(
  id: RequestId,
  result: Omit<QualityGraphResultPayload, "protocolVersion">,
): QualityGraphResponse {
  return createQualityResponse(id, result) as QualityGraphResponse;
}
