import { resolve } from "node:path";
import {
  buildExistingProjectWorkspaceViewModel,
  prepareExistingProjectWorkspace,
} from "@intentloom/application";
import type {
  ExistingProjectWorkspacePrepareRequest,
  ExistingProjectWorkspacePrepareResponse,
  ExistingProjectViewmodelPayload,
} from "@intentloom/protocol";
import {
  EXISTING_PROJECT_WORKSPACE_PREPARE_METHOD,
  createExistingProjectWorkspacePrepareResponse,
  isExistingProjectDaemonMethod,
} from "@intentloom/protocol";
import type { DaemonCapability } from "@intentloom/protocol";
import { nodeFileSystem } from "@intentloom/application";

export interface ExistingProjectDaemonOptions {
  readonly existingProjectWorkspacePrepare?: (
    request: ExistingProjectWorkspacePrepareRequest,
  ) => Promise<
    Omit<ExistingProjectWorkspacePrepareResponse["result"], "protocolVersion">
  >;
}

function enabled(method: string, operation: string): DaemonCapability {
  return { method, operation, classification: "read-only" };
}

export function existingProjectCapabilities(
  options: ExistingProjectDaemonOptions,
): readonly DaemonCapability[] {
  return options.existingProjectWorkspacePrepare
    ? [
        enabled(
          EXISTING_PROJECT_WORKSPACE_PREPARE_METHOD,
          "existing-project.workspace.prepare",
        ),
      ]
    : [];
}

export async function dispatchExistingProjectRequest(
  request: ExistingProjectWorkspacePrepareRequest,
  options: ExistingProjectDaemonOptions,
  canonicalProjectRoot: (root: string) => Promise<string>,
): Promise<ExistingProjectWorkspacePrepareResponse | null> {
  if (!isExistingProjectDaemonMethod(request.method)) return null;
  const prepare = options.existingProjectWorkspacePrepare;
  if (!prepare) return null;
  const root = await canonicalProjectRoot(request.params.root);
  const payload = await prepare({
    ...request,
    params: { ...request.params, root },
  });
  return createExistingProjectWorkspacePrepareResponse(
    request.id,
    payload.viewmodel,
  );
}

export async function handleExistingProjectWorkspacePrepare(
  request: ExistingProjectWorkspacePrepareRequest,
): Promise<
  Omit<ExistingProjectWorkspacePrepareResponse["result"], "protocolVersion">
> {
  const overview = await prepareExistingProjectWorkspace(
    {
      root: resolve(request.params.root),
      ...(request.params.projectId !== undefined
        ? { projectId: request.params.projectId }
        : {}),
      ...(request.params.scope !== undefined
        ? { scope: request.params.scope }
        : {}),
    },
    nodeFileSystem,
  );
  const viewmodel = buildExistingProjectWorkspaceViewModel(overview, "ready");
  return {
    viewmodel: viewmodel as unknown as ExistingProjectViewmodelPayload,
  };
}

export function isExistingProjectRequest(request: {
  readonly method: string;
}): request is ExistingProjectWorkspacePrepareRequest {
  return isExistingProjectDaemonMethod(request.method);
}
