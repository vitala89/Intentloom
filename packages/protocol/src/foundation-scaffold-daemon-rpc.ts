import {
  PROTOCOL_VERSION,
  FOUNDATION_SCAFFOLD_PREPARE_METHOD,
  FOUNDATION_SCAFFOLD_GET_METHOD,
  FOUNDATION_SCAFFOLD_COMPARE_METHOD,
  FOUNDATION_SCAFFOLD_VALIDATE_METHOD,
} from "./jsonrpc.js";
import type { JsonRpcRequest, JsonRpcSuccess, RequestId } from "./jsonrpc.js";
import type { FoundationViewmodelPayload } from "./foundation-daemon-rpc.js";
import { ProtocolValidationError } from "./protocol-validation-error.js";

interface FoundationScaffoldResultPayload {
  readonly protocolVersion: typeof PROTOCOL_VERSION;
  readonly viewmodel: FoundationViewmodelPayload;
}

type FoundationScaffoldMethod =
  | typeof FOUNDATION_SCAFFOLD_PREPARE_METHOD
  | typeof FOUNDATION_SCAFFOLD_GET_METHOD
  | typeof FOUNDATION_SCAFFOLD_COMPARE_METHOD
  | typeof FOUNDATION_SCAFFOLD_VALIDATE_METHOD;

type FoundationScaffoldRequest<
  Method extends FoundationScaffoldMethod,
  Params extends object,
> = JsonRpcRequest<
  Method,
  Params & { readonly protocolVersion: typeof PROTOCOL_VERSION }
>;

export interface FoundationScaffoldPrepareParams {
  readonly protocolVersion: typeof PROTOCOL_VERSION;
  readonly workshopId: string;
  readonly root?: string;
}

export interface FoundationScaffoldGetParams {
  readonly protocolVersion: typeof PROTOCOL_VERSION;
  readonly workshopId: string;
  readonly planId: string;
}

export interface FoundationScaffoldCompareParams {
  readonly protocolVersion: typeof PROTOCOL_VERSION;
  readonly workshopId: string;
  readonly planId: string;
  readonly existingPaths?: readonly string[];
}

export interface FoundationScaffoldValidateParams {
  readonly protocolVersion: typeof PROTOCOL_VERSION;
  readonly workshopId: string;
  readonly planId: string;
}

export type FoundationScaffoldPrepareRequest = FoundationScaffoldRequest<
  typeof FOUNDATION_SCAFFOLD_PREPARE_METHOD,
  FoundationScaffoldPrepareParams
>;
export type FoundationScaffoldGetRequest = FoundationScaffoldRequest<
  typeof FOUNDATION_SCAFFOLD_GET_METHOD,
  FoundationScaffoldGetParams
>;
export type FoundationScaffoldCompareRequest = FoundationScaffoldRequest<
  typeof FOUNDATION_SCAFFOLD_COMPARE_METHOD,
  FoundationScaffoldCompareParams
>;
export type FoundationScaffoldValidateRequest = FoundationScaffoldRequest<
  typeof FOUNDATION_SCAFFOLD_VALIDATE_METHOD,
  FoundationScaffoldValidateParams
>;

export type FoundationScaffoldDaemonRequest =
  | FoundationScaffoldPrepareRequest
  | FoundationScaffoldGetRequest
  | FoundationScaffoldCompareRequest
  | FoundationScaffoldValidateRequest;

export type FoundationScaffoldPrepareResultPayload =
  FoundationScaffoldResultPayload;
export type FoundationScaffoldGetResultPayload =
  FoundationScaffoldResultPayload;
export type FoundationScaffoldCompareResultPayload =
  FoundationScaffoldResultPayload;
export type FoundationScaffoldValidateResultPayload =
  FoundationScaffoldResultPayload;

const SCAFFOLD_METHODS: readonly FoundationScaffoldMethod[] = [
  FOUNDATION_SCAFFOLD_PREPARE_METHOD,
  FOUNDATION_SCAFFOLD_GET_METHOD,
  FOUNDATION_SCAFFOLD_COMPARE_METHOD,
  FOUNDATION_SCAFFOLD_VALIDATE_METHOD,
];

export function isFoundationScaffoldDaemonMethod(
  method: string,
): method is FoundationScaffoldMethod {
  return SCAFFOLD_METHODS.includes(method as FoundationScaffoldMethod);
}

function createRequest<
  Method extends FoundationScaffoldMethod,
  Params extends object,
>(
  id: RequestId,
  method: Method,
  params: Params & { readonly protocolVersion: typeof PROTOCOL_VERSION },
): FoundationScaffoldRequest<Method, Params> {
  return { jsonrpc: "2.0", id, method, params };
}

function createResponse(
  id: RequestId,
  result: Omit<FoundationScaffoldResultPayload, "protocolVersion">,
): JsonRpcSuccess<FoundationScaffoldResultPayload> {
  return {
    jsonrpc: "2.0",
    id,
    result: { protocolVersion: PROTOCOL_VERSION, ...result },
  };
}

export function createFoundationScaffoldPrepareRequest(
  id: RequestId,
  workshopId: string,
  root?: string,
): FoundationScaffoldPrepareRequest {
  return createRequest(id, FOUNDATION_SCAFFOLD_PREPARE_METHOD, {
    protocolVersion: PROTOCOL_VERSION,
    workshopId,
    ...(root !== undefined ? { root } : {}),
  });
}

export function createFoundationScaffoldGetRequest(
  id: RequestId,
  workshopId: string,
  planId: string,
): FoundationScaffoldGetRequest {
  return createRequest(id, FOUNDATION_SCAFFOLD_GET_METHOD, {
    protocolVersion: PROTOCOL_VERSION,
    workshopId,
    planId,
  });
}

export function createFoundationScaffoldCompareRequest(
  id: RequestId,
  workshopId: string,
  planId: string,
  existingPaths?: readonly string[],
): FoundationScaffoldCompareRequest {
  return createRequest(id, FOUNDATION_SCAFFOLD_COMPARE_METHOD, {
    protocolVersion: PROTOCOL_VERSION,
    workshopId,
    planId,
    ...(existingPaths !== undefined ? { existingPaths } : {}),
  });
}

export function createFoundationScaffoldValidateRequest(
  id: RequestId,
  workshopId: string,
  planId: string,
): FoundationScaffoldValidateRequest {
  return createRequest(id, FOUNDATION_SCAFFOLD_VALIDATE_METHOD, {
    protocolVersion: PROTOCOL_VERSION,
    workshopId,
    planId,
  });
}

export function createFoundationScaffoldPrepareResponse(
  id: RequestId,
  result: Omit<FoundationScaffoldPrepareResultPayload, "protocolVersion">,
): JsonRpcSuccess<FoundationScaffoldPrepareResultPayload> {
  return createResponse(id, result);
}

export function createFoundationScaffoldGetResponse(
  id: RequestId,
  result: Omit<FoundationScaffoldGetResultPayload, "protocolVersion">,
): JsonRpcSuccess<FoundationScaffoldGetResultPayload> {
  return createResponse(id, result);
}

export function createFoundationScaffoldCompareResponse(
  id: RequestId,
  result: Omit<FoundationScaffoldCompareResultPayload, "protocolVersion">,
): JsonRpcSuccess<FoundationScaffoldCompareResultPayload> {
  return createResponse(id, result);
}

export function createFoundationScaffoldValidateResponse(
  id: RequestId,
  result: Omit<FoundationScaffoldValidateResultPayload, "protocolVersion">,
): JsonRpcSuccess<FoundationScaffoldValidateResultPayload> {
  return createResponse(id, result);
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringValue(value: unknown, field: string): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new ProtocolValidationError(
      -32602,
      `${field} must be a non-empty string`,
    );
  }
  return value;
}

export function parseFoundationScaffoldDaemonRequest(
  method: string,
  params: Record<string, unknown>,
  id: RequestId,
): FoundationScaffoldDaemonRequest | null {
  if (!isFoundationScaffoldDaemonMethod(method)) {
    return null;
  }
  const workshopId = stringValue(params.workshopId, "workshopId");
  if (method === FOUNDATION_SCAFFOLD_PREPARE_METHOD) {
    const root =
      params.root === undefined ? undefined : stringValue(params.root, "root");
    return createFoundationScaffoldPrepareRequest(id, workshopId, root);
  }
  const planId = stringValue(params.planId, "planId");
  if (method === FOUNDATION_SCAFFOLD_GET_METHOD) {
    return createFoundationScaffoldGetRequest(id, workshopId, planId);
  }
  if (method === FOUNDATION_SCAFFOLD_COMPARE_METHOD) {
    let existingPaths: readonly string[] | undefined;
    if (params.existingPaths !== undefined) {
      if (
        !Array.isArray(params.existingPaths) ||
        !params.existingPaths.every((entry) => typeof entry === "string")
      ) {
        throw new ProtocolValidationError(
          -32602,
          "existingPaths must be an array of strings",
        );
      }
      existingPaths = params.existingPaths;
    }
    return createFoundationScaffoldCompareRequest(
      id,
      workshopId,
      planId,
      existingPaths,
    );
  }
  if (!isObject(params)) {
    throw new ProtocolValidationError(-32602, "params must be an object");
  }
  return createFoundationScaffoldValidateRequest(id, workshopId, planId);
}

export const FOUNDATION_SCAFFOLD_DAEMON_METHODS = SCAFFOLD_METHODS;
