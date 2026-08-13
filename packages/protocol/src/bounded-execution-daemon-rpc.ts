import {
  PROTOCOL_VERSION,
  BOUNDED_EXECUTION_WORKSPACE_PREPARE_METHOD,
  BOUNDED_EXECUTION_WORKSPACE_EXECUTE_METHOD,
} from "./jsonrpc.js";
import type { JsonRpcRequest, JsonRpcSuccess, RequestId } from "./jsonrpc.js";
import { ProtocolValidationError } from "./protocol-validation-error.js";

export type BoundedExecutionViewmodelPayload = Readonly<
  Record<string, unknown>
>;

interface BoundedExecutionResultPayload {
  readonly protocolVersion: typeof PROTOCOL_VERSION;
  readonly viewmodel: BoundedExecutionViewmodelPayload;
}

export interface BoundedExecutionWorkspaceParams {
  readonly protocolVersion: typeof PROTOCOL_VERSION;
  readonly root: string;
  readonly title: string;
  readonly summary: string;
  readonly projectId?: string;
  readonly planApproval?: string;
  readonly requestedNetworkAccess?: boolean;
  readonly requestedProcessExecution?: boolean;
  readonly requestedAllowedCommands?: readonly string[];
  readonly requestedAllowedPaths?: readonly string[];
  readonly requestedRoot?: string;
  readonly proposedPaths?: readonly string[];
  readonly applyRequested?: boolean;
  readonly grantedApprovals?: readonly string[];
}

export type BoundedExecutionWorkspacePrepareRequest = JsonRpcRequest<
  typeof BOUNDED_EXECUTION_WORKSPACE_PREPARE_METHOD,
  BoundedExecutionWorkspaceParams
>;

export type BoundedExecutionWorkspaceExecuteRequest = JsonRpcRequest<
  typeof BOUNDED_EXECUTION_WORKSPACE_EXECUTE_METHOD,
  BoundedExecutionWorkspaceParams
>;

export type BoundedExecutionDaemonRequest =
  | BoundedExecutionWorkspacePrepareRequest
  | BoundedExecutionWorkspaceExecuteRequest;

export type BoundedExecutionWorkspacePrepareResponse =
  JsonRpcSuccess<BoundedExecutionResultPayload>;

export type BoundedExecutionWorkspaceExecuteResponse =
  JsonRpcSuccess<BoundedExecutionResultPayload>;

type BoundedExecutionMethod =
  | typeof BOUNDED_EXECUTION_WORKSPACE_PREPARE_METHOD
  | typeof BOUNDED_EXECUTION_WORKSPACE_EXECUTE_METHOD;

export function isBoundedExecutionDaemonMethod(
  method: string,
): method is BoundedExecutionMethod {
  return (
    method === BOUNDED_EXECUTION_WORKSPACE_PREPARE_METHOD ||
    method === BOUNDED_EXECUTION_WORKSPACE_EXECUTE_METHOD
  );
}

function createParams(
  params: Omit<BoundedExecutionWorkspaceParams, "protocolVersion">,
): BoundedExecutionWorkspaceParams {
  return { protocolVersion: PROTOCOL_VERSION, ...params };
}

export function createBoundedExecutionWorkspacePrepareRequest(
  id: RequestId,
  params: Omit<BoundedExecutionWorkspaceParams, "protocolVersion">,
): BoundedExecutionWorkspacePrepareRequest {
  return {
    jsonrpc: "2.0",
    id,
    method: BOUNDED_EXECUTION_WORKSPACE_PREPARE_METHOD,
    params: createParams(params),
  };
}

export function createBoundedExecutionWorkspaceExecuteRequest(
  id: RequestId,
  params: Omit<BoundedExecutionWorkspaceParams, "protocolVersion">,
): BoundedExecutionWorkspaceExecuteRequest {
  return {
    jsonrpc: "2.0",
    id,
    method: BOUNDED_EXECUTION_WORKSPACE_EXECUTE_METHOD,
    params: createParams(params),
  };
}

export function createBoundedExecutionWorkspacePrepareResponse(
  id: RequestId,
  viewmodel: BoundedExecutionViewmodelPayload,
): BoundedExecutionWorkspacePrepareResponse {
  return {
    jsonrpc: "2.0",
    id,
    result: { protocolVersion: PROTOCOL_VERSION, viewmodel },
  };
}

export function createBoundedExecutionWorkspaceExecuteResponse(
  id: RequestId,
  viewmodel: BoundedExecutionViewmodelPayload,
): BoundedExecutionWorkspaceExecuteResponse {
  return {
    jsonrpc: "2.0",
    id,
    result: { protocolVersion: PROTOCOL_VERSION, viewmodel },
  };
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

function optionalStringArray(
  value: unknown,
  field: string,
): readonly string[] | undefined {
  if (value === undefined) return undefined;
  if (
    !Array.isArray(value) ||
    value.some((entry) => typeof entry !== "string")
  ) {
    throw new ProtocolValidationError(
      -32602,
      `${field} must be a string array`,
    );
  }
  return value;
}

function optionalBoolean(value: unknown, field: string): boolean | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "boolean") {
    throw new ProtocolValidationError(-32602, `${field} must be a boolean`);
  }
  return value;
}

function parseWorkspaceParams(
  params: Record<string, unknown>,
): Omit<BoundedExecutionWorkspaceParams, "protocolVersion"> {
  const network = optionalBoolean(
    params.requestedNetworkAccess,
    "requestedNetworkAccess",
  );
  const process = optionalBoolean(
    params.requestedProcessExecution,
    "requestedProcessExecution",
  );
  const commands = optionalStringArray(
    params.requestedAllowedCommands,
    "requestedAllowedCommands",
  );
  const paths = optionalStringArray(
    params.requestedAllowedPaths,
    "requestedAllowedPaths",
  );
  const proposed = optionalStringArray(params.proposedPaths, "proposedPaths");
  const applyRequested = optionalBoolean(
    params.applyRequested,
    "applyRequested",
  );
  const approvals = optionalStringArray(
    params.grantedApprovals,
    "grantedApprovals",
  );
  return {
    root: requiredString(params.root, "root"),
    title: requiredString(params.title, "title"),
    summary: requiredString(params.summary, "summary"),
    ...(params.projectId !== undefined
      ? { projectId: requiredString(params.projectId, "projectId") }
      : {}),
    ...(params.planApproval !== undefined
      ? { planApproval: requiredString(params.planApproval, "planApproval") }
      : {}),
    ...(network !== undefined ? { requestedNetworkAccess: network } : {}),
    ...(process !== undefined ? { requestedProcessExecution: process } : {}),
    ...(commands !== undefined ? { requestedAllowedCommands: commands } : {}),
    ...(paths !== undefined ? { requestedAllowedPaths: paths } : {}),
    ...(params.requestedRoot !== undefined
      ? { requestedRoot: requiredString(params.requestedRoot, "requestedRoot") }
      : {}),
    ...(proposed !== undefined ? { proposedPaths: proposed } : {}),
    ...(applyRequested !== undefined ? { applyRequested } : {}),
    ...(approvals !== undefined ? { grantedApprovals: approvals } : {}),
  };
}

export function parseBoundedExecutionDaemonRequest(
  method: string,
  params: Record<string, unknown>,
  id: RequestId,
): BoundedExecutionDaemonRequest | null {
  if (!isBoundedExecutionDaemonMethod(method)) return null;
  const parsed = parseWorkspaceParams(params);
  if (method === BOUNDED_EXECUTION_WORKSPACE_EXECUTE_METHOD) {
    return createBoundedExecutionWorkspaceExecuteRequest(id, parsed);
  }
  return createBoundedExecutionWorkspacePrepareRequest(id, parsed);
}
