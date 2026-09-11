import {
  PROTOCOL_VERSION,
  NEUTRON_SESSION_CANCEL_METHOD,
  NEUTRON_SESSION_CREATE_METHOD,
  NEUTRON_SESSION_GET_METHOD,
  NEUTRON_TURN_EXECUTE_METHOD,
} from "./jsonrpc.js";
import type { JsonRpcRequest, JsonRpcSuccess, RequestId } from "./jsonrpc.js";
import type {
  NeutronAdapterCapability,
  NeutronErrorCode,
  NeutronReadOnlyTool,
  NeutronRuntimeSession,
} from "./neutron-runtime.js";
import type {
  NeutronTurnContextSummary,
  NeutronTurnToolActivity,
} from "./neutron-session-activity.js";
import type { NeutronGraphSnapshot } from "./neutron-graph.js";
import { ProtocolValidationError } from "./protocol-validation-error.js";

export {
  NEUTRON_TOOL_ACTIVITY_STATUSES,
  NEUTRON_TURN_ACTIVITY_SUMMARY_MAX_CHARS,
  NEUTRON_TURN_SECRET_PATH_LIMIT,
  type NeutronToolActivityStatus,
  type NeutronTurnContextSourceRow,
  type NeutronTurnContextSummary,
  type NeutronTurnToolActivity,
} from "./neutron-session-activity.js";

export {
  NEUTRON_ADAPTER_CAPABILITY_SCHEMA_URN,
  NEUTRON_ERROR_CODES,
  NEUTRON_READ_ONLY_TOOLS,
  NEUTRON_RUNTIME_SESSION_SCHEMA_URN,
  NEUTRON_SESSION_STATES,
  NEUTRON_TASK_STATES,
  type NeutronAdapterCapability,
  type NeutronErrorCode,
  type NeutronReadOnlyTool,
  type NeutronRuntimeSession,
  type NeutronTaskNode,
  type NeutronTaskState,
} from "./neutron-runtime.js";

export type NeutronSessionViewmodelPayload = NeutronSessionViewmodel;

export interface NeutronSessionViewmodel {
  readonly session: NeutronRuntimeSession;
  readonly adapter: NeutronAdapterCapability;
  readonly prompt: string | null;
  readonly responseText: string | null;
  readonly toolName: NeutronReadOnlyTool | null;
  readonly errorCode: NeutronErrorCode | null;
  readonly errorMessage: string | null;
  readonly projectFingerprintBefore: string | null;
  readonly projectFingerprintAfter: string | null;
  readonly cancellationAcknowledged: boolean;
  readonly contextSummary: NeutronTurnContextSummary | null;
  readonly toolActivity: readonly NeutronTurnToolActivity[];
  readonly graphSnapshot: NeutronGraphSnapshot | null;
}

interface NeutronSessionResultPayload {
  readonly protocolVersion: typeof PROTOCOL_VERSION;
  readonly viewmodel: NeutronSessionViewmodelPayload;
}

export interface NeutronSessionCreateParams {
  readonly protocolVersion: typeof PROTOCOL_VERSION;
  readonly root: string;
  readonly projectId?: string;
}

export interface NeutronSessionBoundParams {
  readonly protocolVersion: typeof PROTOCOL_VERSION;
  readonly root: string;
  readonly sessionId: string;
  readonly projectId: string;
}

export interface NeutronTurnExecuteParams extends NeutronSessionBoundParams {
  readonly prompt: string;
}

export type NeutronSessionCreateRequest = JsonRpcRequest<
  typeof NEUTRON_SESSION_CREATE_METHOD,
  NeutronSessionCreateParams
>;
export type NeutronSessionGetRequest = JsonRpcRequest<
  typeof NEUTRON_SESSION_GET_METHOD,
  NeutronSessionBoundParams
>;
export type NeutronSessionCancelRequest = JsonRpcRequest<
  typeof NEUTRON_SESSION_CANCEL_METHOD,
  NeutronSessionBoundParams
>;
export type NeutronTurnExecuteRequest = JsonRpcRequest<
  typeof NEUTRON_TURN_EXECUTE_METHOD,
  NeutronTurnExecuteParams
>;

export type NeutronDaemonRequest =
  | NeutronSessionCreateRequest
  | NeutronSessionGetRequest
  | NeutronSessionCancelRequest
  | NeutronTurnExecuteRequest;

export type NeutronSessionCreateResponse =
  JsonRpcSuccess<NeutronSessionResultPayload>;
export type NeutronSessionGetResponse =
  JsonRpcSuccess<NeutronSessionResultPayload>;
export type NeutronSessionCancelResponse =
  JsonRpcSuccess<NeutronSessionResultPayload>;
export type NeutronTurnExecuteResponse =
  JsonRpcSuccess<NeutronSessionResultPayload>;

type NeutronSessionMethod =
  | typeof NEUTRON_SESSION_CREATE_METHOD
  | typeof NEUTRON_SESSION_GET_METHOD
  | typeof NEUTRON_SESSION_CANCEL_METHOD
  | typeof NEUTRON_TURN_EXECUTE_METHOD;

export function isNeutronSessionDaemonMethod(
  method: string,
): method is NeutronSessionMethod {
  return (
    method === NEUTRON_SESSION_CREATE_METHOD ||
    method === NEUTRON_SESSION_GET_METHOD ||
    method === NEUTRON_SESSION_CANCEL_METHOD ||
    method === NEUTRON_TURN_EXECUTE_METHOD
  );
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

export function createNeutronSessionCreateRequest(
  id: RequestId,
  root: string,
  projectId?: string,
): NeutronSessionCreateRequest {
  return {
    jsonrpc: "2.0",
    id,
    method: NEUTRON_SESSION_CREATE_METHOD,
    params: {
      protocolVersion: PROTOCOL_VERSION,
      root,
      ...(projectId !== undefined ? { projectId } : {}),
    },
  };
}

export function createNeutronSessionGetRequest(
  id: RequestId,
  root: string,
  sessionId: string,
  projectId: string,
): NeutronSessionGetRequest {
  return {
    jsonrpc: "2.0",
    id,
    method: NEUTRON_SESSION_GET_METHOD,
    params: {
      protocolVersion: PROTOCOL_VERSION,
      root,
      sessionId,
      projectId,
    },
  };
}

export function createNeutronSessionCancelRequest(
  id: RequestId,
  root: string,
  sessionId: string,
  projectId: string,
): NeutronSessionCancelRequest {
  return {
    jsonrpc: "2.0",
    id,
    method: NEUTRON_SESSION_CANCEL_METHOD,
    params: {
      protocolVersion: PROTOCOL_VERSION,
      root,
      sessionId,
      projectId,
    },
  };
}

export function createNeutronTurnExecuteRequest(
  id: RequestId,
  root: string,
  sessionId: string,
  projectId: string,
  prompt: string,
): NeutronTurnExecuteRequest {
  return {
    jsonrpc: "2.0",
    id,
    method: NEUTRON_TURN_EXECUTE_METHOD,
    params: {
      protocolVersion: PROTOCOL_VERSION,
      root,
      sessionId,
      projectId,
      prompt,
    },
  };
}

export function createNeutronSessionResponse(
  id: RequestId,
  viewmodel: NeutronSessionViewmodelPayload,
): NeutronSessionCreateResponse {
  return {
    jsonrpc: "2.0",
    id,
    result: { protocolVersion: PROTOCOL_VERSION, viewmodel },
  };
}

function boundParams(
  params: Record<string, unknown>,
): NeutronSessionBoundParams {
  return {
    protocolVersion: PROTOCOL_VERSION,
    root: requiredString(params.root, "root"),
    sessionId: requiredString(params.sessionId, "sessionId"),
    projectId: requiredString(params.projectId, "projectId"),
  };
}

export function parseNeutronSessionDaemonRequest(
  method: string,
  params: Record<string, unknown>,
  id: RequestId,
): NeutronDaemonRequest | null {
  if (!isNeutronSessionDaemonMethod(method)) return null;
  if (method === NEUTRON_SESSION_CREATE_METHOD) {
    const projectId =
      params.projectId === undefined
        ? undefined
        : requiredString(params.projectId, "projectId");
    return createNeutronSessionCreateRequest(
      id,
      requiredString(params.root, "root"),
      projectId,
    );
  }
  const bound = boundParams(params);
  if (method === NEUTRON_SESSION_GET_METHOD) {
    return createNeutronSessionGetRequest(
      id,
      bound.root,
      bound.sessionId,
      bound.projectId,
    );
  }
  if (method === NEUTRON_SESSION_CANCEL_METHOD) {
    return createNeutronSessionCancelRequest(
      id,
      bound.root,
      bound.sessionId,
      bound.projectId,
    );
  }
  return createNeutronTurnExecuteRequest(
    id,
    bound.root,
    bound.sessionId,
    bound.projectId,
    requiredString(params.prompt, "prompt"),
  );
}
