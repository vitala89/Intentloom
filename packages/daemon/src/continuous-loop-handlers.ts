import { resolve } from "node:path";
import {
  buildContinuousLoopWorkspaceViewModel,
  prepareContinuousLoopWorkspace,
} from "@intentloom/application";
import type {
  ContinuousLoopDaemonRequest,
  ContinuousLoopViewmodelPayload,
  ContinuousLoopWorkspaceExecuteRequest,
  ContinuousLoopWorkspaceExecuteResponse,
  ContinuousLoopWorkspaceParams,
  ContinuousLoopWorkspacePrepareRequest,
  ContinuousLoopWorkspacePrepareResponse,
} from "@intentloom/protocol";
import {
  CONTINUOUS_LOOP_WORKSPACE_EXECUTE_METHOD,
  CONTINUOUS_LOOP_WORKSPACE_PREPARE_METHOD,
  createContinuousLoopWorkspaceExecuteResponse,
  createContinuousLoopWorkspacePrepareResponse,
  isContinuousLoopDaemonMethod,
} from "@intentloom/protocol";
import type { DaemonCapability } from "@intentloom/protocol";
import { nodeFileSystem } from "@intentloom/application";
import type { PrepareContinuousLoopWorkspaceOptions } from "@intentloom/application";

export interface ContinuousLoopDaemonOptions {
  readonly continuousLoopWorkspacePrepare?: (
    request: ContinuousLoopWorkspacePrepareRequest,
  ) => Promise<
    Omit<ContinuousLoopWorkspacePrepareResponse["result"], "protocolVersion">
  >;
  readonly continuousLoopWorkspaceExecute?: (
    request: ContinuousLoopWorkspaceExecuteRequest,
  ) => Promise<
    Omit<ContinuousLoopWorkspaceExecuteResponse["result"], "protocolVersion">
  >;
}

function enabled(
  method: string,
  operation: string,
  classification: DaemonCapability["classification"],
): DaemonCapability {
  return { method, operation, classification };
}

export function continuousLoopCapabilities(
  options: ContinuousLoopDaemonOptions,
): readonly DaemonCapability[] {
  const capabilities: DaemonCapability[] = [];
  if (options.continuousLoopWorkspacePrepare) {
    capabilities.push(
      enabled(
        CONTINUOUS_LOOP_WORKSPACE_PREPARE_METHOD,
        "continuous-loop.workspace.prepare",
        "read-only",
      ),
    );
  }
  if (options.continuousLoopWorkspaceExecute) {
    capabilities.push(
      enabled(
        CONTINUOUS_LOOP_WORKSPACE_EXECUTE_METHOD,
        "continuous-loop.workspace.execute",
        "mutating",
      ),
    );
  }
  return capabilities;
}

function toWorkspaceOptions(
  params: ContinuousLoopWorkspaceParams,
  applyRequested: boolean,
): PrepareContinuousLoopWorkspaceOptions {
  return {
    root: resolve(params.root),
    previous: params.previous,
    current: params.current,
    applyRequested,
    ...(params.projectId !== undefined ? { projectId: params.projectId } : {}),
    ...(params.changeKind !== undefined
      ? { changeKind: params.changeKind }
      : {}),
    ...(params.memoryContent !== undefined
      ? { memoryContent: params.memoryContent }
      : {}),
    ...(params.grantedApprovals !== undefined
      ? { grantedApprovals: params.grantedApprovals }
      : {}),
  };
}

export async function dispatchContinuousLoopRequest(
  request: ContinuousLoopDaemonRequest,
  options: ContinuousLoopDaemonOptions,
  canonicalProjectRoot: (root: string) => Promise<string>,
): Promise<
  | ContinuousLoopWorkspacePrepareResponse
  | ContinuousLoopWorkspaceExecuteResponse
  | null
> {
  if (!isContinuousLoopDaemonMethod(request.method)) return null;
  const root = await canonicalProjectRoot(request.params.root);
  if (request.method === CONTINUOUS_LOOP_WORKSPACE_EXECUTE_METHOD) {
    const execute = options.continuousLoopWorkspaceExecute;
    if (!execute) return null;
    const payload = await execute({
      ...request,
      params: { ...request.params, root },
    });
    return createContinuousLoopWorkspaceExecuteResponse(
      request.id,
      payload.viewmodel,
    );
  }
  const prepare = options.continuousLoopWorkspacePrepare;
  if (!prepare) return null;
  const payload = await prepare({
    ...request,
    params: { ...request.params, root },
  });
  return createContinuousLoopWorkspacePrepareResponse(
    request.id,
    payload.viewmodel,
  );
}

async function overviewViewmodel(
  request: ContinuousLoopDaemonRequest,
  applyRequested: boolean,
): Promise<ContinuousLoopViewmodelPayload> {
  const overview = await prepareContinuousLoopWorkspace(
    toWorkspaceOptions(request.params, applyRequested),
    nodeFileSystem,
  );
  return buildContinuousLoopWorkspaceViewModel(
    overview,
    "ready",
  ) as unknown as ContinuousLoopViewmodelPayload;
}

export async function handleContinuousLoopWorkspacePrepare(
  request: ContinuousLoopWorkspacePrepareRequest,
): Promise<
  Omit<ContinuousLoopWorkspacePrepareResponse["result"], "protocolVersion">
> {
  return { viewmodel: await overviewViewmodel(request, false) };
}

export async function handleContinuousLoopWorkspaceExecute(
  request: ContinuousLoopWorkspaceExecuteRequest,
): Promise<
  Omit<ContinuousLoopWorkspaceExecuteResponse["result"], "protocolVersion">
> {
  return {
    viewmodel: await overviewViewmodel(
      request,
      request.params.applyRequested === true,
    ),
  };
}

export function isContinuousLoopRequest(request: {
  readonly method: string;
}): request is ContinuousLoopDaemonRequest {
  return isContinuousLoopDaemonMethod(request.method);
}
