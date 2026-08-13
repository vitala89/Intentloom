import { resolve } from "node:path";
import {
  buildBoundedExecutionWorkspaceViewModel,
  prepareBoundedExecutionWorkspace,
} from "@intentloom/application";
import type {
  BoundedExecutionDaemonRequest,
  BoundedExecutionViewmodelPayload,
  BoundedExecutionWorkspaceExecuteRequest,
  BoundedExecutionWorkspaceExecuteResponse,
  BoundedExecutionWorkspaceParams,
  BoundedExecutionWorkspacePrepareRequest,
  BoundedExecutionWorkspacePrepareResponse,
} from "@intentloom/protocol";
import {
  BOUNDED_EXECUTION_WORKSPACE_EXECUTE_METHOD,
  BOUNDED_EXECUTION_WORKSPACE_PREPARE_METHOD,
  createBoundedExecutionWorkspaceExecuteResponse,
  createBoundedExecutionWorkspacePrepareResponse,
  isBoundedExecutionDaemonMethod,
} from "@intentloom/protocol";
import type { DaemonCapability } from "@intentloom/protocol";
import { nodeFileSystem } from "@intentloom/application";
import type { PrepareBoundedExecutionWorkspaceOptions } from "@intentloom/application";

export interface BoundedExecutionDaemonOptions {
  readonly boundedExecutionWorkspacePrepare?: (
    request: BoundedExecutionWorkspacePrepareRequest,
  ) => Promise<
    Omit<BoundedExecutionWorkspacePrepareResponse["result"], "protocolVersion">
  >;
  readonly boundedExecutionWorkspaceExecute?: (
    request: BoundedExecutionWorkspaceExecuteRequest,
  ) => Promise<
    Omit<BoundedExecutionWorkspaceExecuteResponse["result"], "protocolVersion">
  >;
}

function enabled(
  method: string,
  operation: string,
  classification: DaemonCapability["classification"],
): DaemonCapability {
  return { method, operation, classification };
}

export function boundedExecutionCapabilities(
  options: BoundedExecutionDaemonOptions,
): readonly DaemonCapability[] {
  const capabilities: DaemonCapability[] = [];
  if (options.boundedExecutionWorkspacePrepare) {
    capabilities.push(
      enabled(
        BOUNDED_EXECUTION_WORKSPACE_PREPARE_METHOD,
        "bounded-execution.workspace.prepare",
        "read-only",
      ),
    );
  }
  if (options.boundedExecutionWorkspaceExecute) {
    capabilities.push(
      enabled(
        BOUNDED_EXECUTION_WORKSPACE_EXECUTE_METHOD,
        "bounded-execution.workspace.execute",
        "mutating",
      ),
    );
  }
  return capabilities;
}

function toWorkspaceOptions(
  params: BoundedExecutionWorkspaceParams,
  applyRequested: boolean,
): PrepareBoundedExecutionWorkspaceOptions {
  return {
    root: resolve(params.root),
    title: params.title,
    summary: params.summary,
    applyRequested,
    ...(params.projectId !== undefined ? { projectId: params.projectId } : {}),
    ...(params.planApproval !== undefined
      ? { planApproval: params.planApproval }
      : {}),
    ...(params.requestedNetworkAccess !== undefined
      ? { requestedNetworkAccess: params.requestedNetworkAccess }
      : {}),
    ...(params.requestedProcessExecution !== undefined
      ? { requestedProcessExecution: params.requestedProcessExecution }
      : {}),
    ...(params.requestedAllowedCommands !== undefined
      ? { requestedAllowedCommands: params.requestedAllowedCommands }
      : {}),
    ...(params.requestedAllowedPaths !== undefined
      ? { requestedAllowedPaths: params.requestedAllowedPaths }
      : {}),
    ...(params.requestedRoot !== undefined
      ? { requestedRoot: params.requestedRoot }
      : {}),
    ...(params.proposedPaths !== undefined
      ? { proposedPaths: params.proposedPaths }
      : {}),
    ...(params.grantedApprovals !== undefined
      ? { grantedApprovals: params.grantedApprovals }
      : {}),
  };
}

export async function dispatchBoundedExecutionRequest(
  request: BoundedExecutionDaemonRequest,
  options: BoundedExecutionDaemonOptions,
  canonicalProjectRoot: (root: string) => Promise<string>,
): Promise<
  | BoundedExecutionWorkspacePrepareResponse
  | BoundedExecutionWorkspaceExecuteResponse
  | null
> {
  if (!isBoundedExecutionDaemonMethod(request.method)) return null;
  const root = await canonicalProjectRoot(request.params.root);
  if (request.method === BOUNDED_EXECUTION_WORKSPACE_EXECUTE_METHOD) {
    const execute = options.boundedExecutionWorkspaceExecute;
    if (!execute) return null;
    const payload = await execute({
      ...request,
      params: { ...request.params, root },
    });
    return createBoundedExecutionWorkspaceExecuteResponse(
      request.id,
      payload.viewmodel,
    );
  }
  const prepare = options.boundedExecutionWorkspacePrepare;
  if (!prepare) return null;
  const payload = await prepare({
    ...request,
    params: { ...request.params, root },
  });
  return createBoundedExecutionWorkspacePrepareResponse(
    request.id,
    payload.viewmodel,
  );
}

async function overviewViewmodel(
  request: BoundedExecutionDaemonRequest,
  applyRequested: boolean,
): Promise<BoundedExecutionViewmodelPayload> {
  const overview = await prepareBoundedExecutionWorkspace(
    toWorkspaceOptions(request.params, applyRequested),
    nodeFileSystem,
  );
  return buildBoundedExecutionWorkspaceViewModel(
    overview,
    "ready",
  ) as unknown as BoundedExecutionViewmodelPayload;
}

export async function handleBoundedExecutionWorkspacePrepare(
  request: BoundedExecutionWorkspacePrepareRequest,
): Promise<
  Omit<BoundedExecutionWorkspacePrepareResponse["result"], "protocolVersion">
> {
  return { viewmodel: await overviewViewmodel(request, false) };
}

export async function handleBoundedExecutionWorkspaceExecute(
  request: BoundedExecutionWorkspaceExecuteRequest,
): Promise<
  Omit<BoundedExecutionWorkspaceExecuteResponse["result"], "protocolVersion">
> {
  return {
    viewmodel: await overviewViewmodel(
      request,
      request.params.applyRequested === true,
    ),
  };
}

export function isBoundedExecutionRequest(request: {
  readonly method: string;
}): request is BoundedExecutionDaemonRequest {
  return isBoundedExecutionDaemonMethod(request.method);
}
