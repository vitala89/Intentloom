import {
  PROTOCOL_VERSION,
  EXISTING_PROJECT_WORKSPACE_PREPARE_METHOD,
} from "./jsonrpc.js";
import type { JsonRpcRequest, JsonRpcSuccess, RequestId } from "./jsonrpc.js";
import type { ExistingProjectScanScope } from "./existing-project-workspace.js";
import { ProtocolValidationError } from "./protocol-validation-error.js";

export type ExistingProjectViewmodelPayload = Readonly<Record<string, unknown>>;

interface ExistingProjectResultPayload {
  readonly protocolVersion: typeof PROTOCOL_VERSION;
  readonly viewmodel: ExistingProjectViewmodelPayload;
}

export interface ExistingProjectWorkspacePrepareParams {
  readonly protocolVersion: typeof PROTOCOL_VERSION;
  readonly root: string;
  readonly projectId?: string;
  readonly scope?: ExistingProjectScanScope;
}

export type ExistingProjectWorkspacePrepareRequest = JsonRpcRequest<
  typeof EXISTING_PROJECT_WORKSPACE_PREPARE_METHOD,
  ExistingProjectWorkspacePrepareParams
>;

export type ExistingProjectWorkspacePrepareResponse =
  JsonRpcSuccess<ExistingProjectResultPayload>;

export function createExistingProjectWorkspacePrepareRequest(
  id: RequestId,
  root: string,
  projectId?: string,
  scope?: ExistingProjectScanScope,
): ExistingProjectWorkspacePrepareRequest {
  return {
    jsonrpc: "2.0",
    id,
    method: EXISTING_PROJECT_WORKSPACE_PREPARE_METHOD,
    params: {
      protocolVersion: PROTOCOL_VERSION,
      root,
      ...(projectId !== undefined ? { projectId } : {}),
      ...(scope !== undefined ? { scope } : {}),
    },
  };
}

export function createExistingProjectWorkspacePrepareResponse(
  id: RequestId,
  viewmodel: ExistingProjectViewmodelPayload,
): ExistingProjectWorkspacePrepareResponse {
  return {
    jsonrpc: "2.0",
    id,
    result: {
      protocolVersion: PROTOCOL_VERSION,
      viewmodel,
    },
  };
}

export function isExistingProjectDaemonMethod(
  method: string,
): method is typeof EXISTING_PROJECT_WORKSPACE_PREPARE_METHOD {
  return method === EXISTING_PROJECT_WORKSPACE_PREPARE_METHOD;
}

function parseScanScope(value: unknown): ExistingProjectScanScope {
  if (value === undefined) return "standard";
  if (value === "quick" || value === "standard" || value === "deep") {
    return value;
  }
  throw new ProtocolValidationError(
    -32602,
    "scope must be quick, standard, or deep",
  );
}

export function parseExistingProjectDaemonRequest(
  method: string,
  params: Record<string, unknown>,
  id: RequestId,
): ExistingProjectWorkspacePrepareRequest | null {
  if (method !== EXISTING_PROJECT_WORKSPACE_PREPARE_METHOD) return null;
  if (typeof params.root !== "string" || params.root.length === 0) {
    throw new ProtocolValidationError(
      -32602,
      "root must be a non-empty string",
    );
  }
  const projectId =
    params.projectId === undefined
      ? undefined
      : typeof params.projectId === "string" && params.projectId.length > 0
        ? params.projectId
        : (() => {
            throw new ProtocolValidationError(
              -32602,
              "projectId must be a non-empty string when provided",
            );
          })();
  return createExistingProjectWorkspacePrepareRequest(
    id,
    params.root,
    projectId,
    parseScanScope(params.scope),
  );
}
