import {
  PROTOCOL_VERSION,
  FEATURE_INTENT_WORKSPACE_PREPARE_METHOD,
  FEATURE_INTENT_WORKSPACE_ANALYZE_METHOD,
} from "./jsonrpc.js";
import type { JsonRpcRequest, JsonRpcSuccess, RequestId } from "./jsonrpc.js";
import { ProtocolValidationError } from "./protocol-validation-error.js";

export type FeatureIntentViewmodelPayload = Readonly<Record<string, unknown>>;

interface FeatureIntentResultPayload {
  readonly protocolVersion: typeof PROTOCOL_VERSION;
  readonly viewmodel: FeatureIntentViewmodelPayload;
}

export interface FeatureIntentWorkspaceParams {
  readonly protocolVersion: typeof PROTOCOL_VERSION;
  readonly root: string;
  readonly title: string;
  readonly summary: string;
  readonly projectId?: string;
}

export type FeatureIntentWorkspacePrepareRequest = JsonRpcRequest<
  typeof FEATURE_INTENT_WORKSPACE_PREPARE_METHOD,
  FeatureIntentWorkspaceParams
>;

export type FeatureIntentWorkspaceAnalyzeRequest = JsonRpcRequest<
  typeof FEATURE_INTENT_WORKSPACE_ANALYZE_METHOD,
  FeatureIntentWorkspaceParams
>;

export type FeatureIntentDaemonRequest =
  FeatureIntentWorkspacePrepareRequest | FeatureIntentWorkspaceAnalyzeRequest;

export type FeatureIntentWorkspacePrepareResponse =
  JsonRpcSuccess<FeatureIntentResultPayload>;

export type FeatureIntentWorkspaceAnalyzeResponse =
  JsonRpcSuccess<FeatureIntentResultPayload>;

type FeatureIntentMethod =
  | typeof FEATURE_INTENT_WORKSPACE_PREPARE_METHOD
  | typeof FEATURE_INTENT_WORKSPACE_ANALYZE_METHOD;

export function isFeatureIntentDaemonMethod(
  method: string,
): method is FeatureIntentMethod {
  return (
    method === FEATURE_INTENT_WORKSPACE_PREPARE_METHOD ||
    method === FEATURE_INTENT_WORKSPACE_ANALYZE_METHOD
  );
}

function createParams(
  root: string,
  title: string,
  summary: string,
  projectId?: string,
): FeatureIntentWorkspaceParams {
  return {
    protocolVersion: PROTOCOL_VERSION,
    root,
    title,
    summary,
    ...(projectId !== undefined ? { projectId } : {}),
  };
}

export function createFeatureIntentWorkspacePrepareRequest(
  id: RequestId,
  root: string,
  title: string,
  summary: string,
  projectId?: string,
): FeatureIntentWorkspacePrepareRequest {
  return {
    jsonrpc: "2.0",
    id,
    method: FEATURE_INTENT_WORKSPACE_PREPARE_METHOD,
    params: createParams(root, title, summary, projectId),
  };
}

export function createFeatureIntentWorkspaceAnalyzeRequest(
  id: RequestId,
  root: string,
  title: string,
  summary: string,
  projectId?: string,
): FeatureIntentWorkspaceAnalyzeRequest {
  return {
    jsonrpc: "2.0",
    id,
    method: FEATURE_INTENT_WORKSPACE_ANALYZE_METHOD,
    params: createParams(root, title, summary, projectId),
  };
}

export function createFeatureIntentWorkspacePrepareResponse(
  id: RequestId,
  viewmodel: FeatureIntentViewmodelPayload,
): FeatureIntentWorkspacePrepareResponse {
  return {
    jsonrpc: "2.0",
    id,
    result: { protocolVersion: PROTOCOL_VERSION, viewmodel },
  };
}

export function createFeatureIntentWorkspaceAnalyzeResponse(
  id: RequestId,
  viewmodel: FeatureIntentViewmodelPayload,
): FeatureIntentWorkspaceAnalyzeResponse {
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

export function parseFeatureIntentDaemonRequest(
  method: string,
  params: Record<string, unknown>,
  id: RequestId,
): FeatureIntentDaemonRequest | null {
  if (!isFeatureIntentDaemonMethod(method)) return null;
  const root = requiredString(params.root, "root");
  const title = requiredString(params.title, "title");
  const summary = requiredString(params.summary, "summary");
  const projectId =
    params.projectId === undefined
      ? undefined
      : requiredString(params.projectId, "projectId");
  if (method === FEATURE_INTENT_WORKSPACE_ANALYZE_METHOD) {
    return createFeatureIntentWorkspaceAnalyzeRequest(
      id,
      root,
      title,
      summary,
      projectId,
    );
  }
  return createFeatureIntentWorkspacePrepareRequest(
    id,
    root,
    title,
    summary,
    projectId,
  );
}
