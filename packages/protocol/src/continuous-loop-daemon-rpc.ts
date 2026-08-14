import {
  PROTOCOL_VERSION,
  CONTINUOUS_LOOP_WORKSPACE_PREPARE_METHOD,
  CONTINUOUS_LOOP_WORKSPACE_EXECUTE_METHOD,
} from "./jsonrpc.js";
import type { JsonRpcRequest, JsonRpcSuccess, RequestId } from "./jsonrpc.js";
import { ProtocolValidationError } from "./protocol-validation-error.js";
import type {
  ContinuousLoopChangeKind,
  ContinuousLoopSnapshot,
} from "./continuous-loop-workspace.js";

export type ContinuousLoopViewmodelPayload = Readonly<Record<string, unknown>>;

interface ContinuousLoopResultPayload {
  readonly protocolVersion: typeof PROTOCOL_VERSION;
  readonly viewmodel: ContinuousLoopViewmodelPayload;
}

export interface ContinuousLoopWorkspaceParams {
  readonly protocolVersion: typeof PROTOCOL_VERSION;
  readonly root: string;
  readonly projectId?: string;
  readonly previous: ContinuousLoopSnapshot;
  readonly current: ContinuousLoopSnapshot;
  readonly changeKind?: ContinuousLoopChangeKind;
  readonly memoryContent?: string;
  readonly applyRequested?: boolean;
  readonly grantedApprovals?: readonly string[];
}

export type ContinuousLoopWorkspacePrepareRequest = JsonRpcRequest<
  typeof CONTINUOUS_LOOP_WORKSPACE_PREPARE_METHOD,
  ContinuousLoopWorkspaceParams
>;

export type ContinuousLoopWorkspaceExecuteRequest = JsonRpcRequest<
  typeof CONTINUOUS_LOOP_WORKSPACE_EXECUTE_METHOD,
  ContinuousLoopWorkspaceParams
>;

export type ContinuousLoopDaemonRequest =
  ContinuousLoopWorkspacePrepareRequest | ContinuousLoopWorkspaceExecuteRequest;

export type ContinuousLoopWorkspacePrepareResponse =
  JsonRpcSuccess<ContinuousLoopResultPayload>;

export type ContinuousLoopWorkspaceExecuteResponse =
  JsonRpcSuccess<ContinuousLoopResultPayload>;

type ContinuousLoopMethod =
  | typeof CONTINUOUS_LOOP_WORKSPACE_PREPARE_METHOD
  | typeof CONTINUOUS_LOOP_WORKSPACE_EXECUTE_METHOD;

export function isContinuousLoopDaemonMethod(
  method: string,
): method is ContinuousLoopMethod {
  return (
    method === CONTINUOUS_LOOP_WORKSPACE_PREPARE_METHOD ||
    method === CONTINUOUS_LOOP_WORKSPACE_EXECUTE_METHOD
  );
}

function createParams(
  params: Omit<ContinuousLoopWorkspaceParams, "protocolVersion">,
): ContinuousLoopWorkspaceParams {
  return { protocolVersion: PROTOCOL_VERSION, ...params };
}

export function createContinuousLoopWorkspacePrepareRequest(
  id: RequestId,
  params: Omit<ContinuousLoopWorkspaceParams, "protocolVersion">,
): ContinuousLoopWorkspacePrepareRequest {
  return {
    jsonrpc: "2.0",
    id,
    method: CONTINUOUS_LOOP_WORKSPACE_PREPARE_METHOD,
    params: createParams(params),
  };
}

export function createContinuousLoopWorkspaceExecuteRequest(
  id: RequestId,
  params: Omit<ContinuousLoopWorkspaceParams, "protocolVersion">,
): ContinuousLoopWorkspaceExecuteRequest {
  return {
    jsonrpc: "2.0",
    id,
    method: CONTINUOUS_LOOP_WORKSPACE_EXECUTE_METHOD,
    params: createParams(params),
  };
}

export function createContinuousLoopWorkspacePrepareResponse(
  id: RequestId,
  viewmodel: ContinuousLoopViewmodelPayload,
): ContinuousLoopWorkspacePrepareResponse {
  return {
    jsonrpc: "2.0",
    id,
    result: { protocolVersion: PROTOCOL_VERSION, viewmodel },
  };
}

export function createContinuousLoopWorkspaceExecuteResponse(
  id: RequestId,
  viewmodel: ContinuousLoopViewmodelPayload,
): ContinuousLoopWorkspaceExecuteResponse {
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

function requiredInteger(value: unknown, field: string): number {
  if (typeof value !== "number" || !Number.isInteger(value)) {
    throw new ProtocolValidationError(-32602, `${field} must be an integer`);
  }
  return value;
}

function parseSnapshot(value: unknown, field: string): ContinuousLoopSnapshot {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new ProtocolValidationError(-32602, `${field} must be an object`);
  }
  const record = value as Record<string, unknown>;
  if (!Array.isArray(record.findingIds)) {
    throw new ProtocolValidationError(
      -32602,
      `${field}.findingIds must be a string array`,
    );
  }
  return {
    projectId: requiredString(record.projectId, `${field}.projectId`),
    schemaVersion: requiredString(
      record.schemaVersion,
      `${field}.schemaVersion`,
    ),
    findingIds: record.findingIds.map((entry, index) =>
      requiredString(entry, `${field}.findingIds[${index}]`),
    ),
    technicalDebtItemCount: requiredInteger(
      record.technicalDebtItemCount,
      `${field}.technicalDebtItemCount`,
    ),
    architectureViolationCount: requiredInteger(
      record.architectureViolationCount,
      `${field}.architectureViolationCount`,
    ),
  };
}

const CHANGE_KINDS = [
  "code",
  "policy",
  "evidence",
  "model-interpretation",
] as const;

function parseWorkspaceParams(
  params: Record<string, unknown>,
): Omit<ContinuousLoopWorkspaceParams, "protocolVersion"> {
  const applyRequested = optionalBoolean(
    params.applyRequested,
    "applyRequested",
  );
  const approvals = optionalStringArray(
    params.grantedApprovals,
    "grantedApprovals",
  );
  const changeKind = params.changeKind;
  if (
    changeKind !== undefined &&
    (typeof changeKind !== "string" ||
      !CHANGE_KINDS.includes(changeKind as ContinuousLoopChangeKind))
  ) {
    throw new ProtocolValidationError(-32602, "changeKind is invalid");
  }
  return {
    root: requiredString(params.root, "root"),
    previous: parseSnapshot(params.previous, "previous"),
    current: parseSnapshot(params.current, "current"),
    ...(params.projectId !== undefined
      ? { projectId: requiredString(params.projectId, "projectId") }
      : {}),
    ...(changeKind !== undefined
      ? { changeKind: changeKind as ContinuousLoopChangeKind }
      : {}),
    ...(params.memoryContent !== undefined
      ? {
          memoryContent: requiredString(params.memoryContent, "memoryContent"),
        }
      : {}),
    ...(applyRequested !== undefined ? { applyRequested } : {}),
    ...(approvals !== undefined ? { grantedApprovals: approvals } : {}),
  };
}

export function parseContinuousLoopDaemonRequest(
  method: string,
  params: Record<string, unknown>,
  id: RequestId,
): ContinuousLoopDaemonRequest | null {
  if (!isContinuousLoopDaemonMethod(method)) return null;
  const parsed = parseWorkspaceParams(params);
  if (method === CONTINUOUS_LOOP_WORKSPACE_EXECUTE_METHOD) {
    return createContinuousLoopWorkspaceExecuteRequest(id, parsed);
  }
  return createContinuousLoopWorkspacePrepareRequest(id, parsed);
}
