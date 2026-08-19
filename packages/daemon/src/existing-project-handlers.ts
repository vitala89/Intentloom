import { resolve } from "node:path";
import {
  buildExistingProjectWorkspaceViewModel,
  nodeFileSystem,
  prepareExistingProjectAdoptionPlan,
  prepareExistingProjectWorkspace,
  validateExistingProjectAdoptionDecisions,
} from "@intentloom/application";
import type {
  ExistingProjectAdoptionDecisionsRequest,
  ExistingProjectAdoptionDecisionsResponse,
  ExistingProjectAdoptionPlanRequest,
  ExistingProjectAdoptionPlanResponse,
  ExistingProjectViewmodelPayload,
  ExistingProjectWorkspacePrepareRequest,
  ExistingProjectWorkspacePrepareResponse,
} from "@intentloom/protocol";
import {
  EXISTING_PROJECT_ADOPTION_DECISIONS_METHOD,
  EXISTING_PROJECT_ADOPTION_PLAN_METHOD,
  EXISTING_PROJECT_WORKSPACE_PREPARE_METHOD,
  createExistingProjectAdoptionDecisionsResponse,
  createExistingProjectAdoptionPlanResponse,
  createExistingProjectWorkspacePrepareResponse,
  isExistingProjectAdoptionDecisionsMethod,
  isExistingProjectAdoptionPlanMethod,
  isExistingProjectDaemonMethod,
} from "@intentloom/protocol";
import type { DaemonCapability } from "@intentloom/protocol";
import {
  dispatchExistingProjectPreparedPlanRequest,
  existingProjectPreparedPlanCapabilities,
  isExistingProjectPreparedPlanRequest,
  type ExistingProjectPreparedPlanDaemonOptions,
} from "./existing-project-prepared-plan-handlers.js";

type ExistingProjectCoreRequest =
  | ExistingProjectWorkspacePrepareRequest
  | ExistingProjectAdoptionPlanRequest
  | ExistingProjectAdoptionDecisionsRequest;

type ExistingProjectCoreResponse =
  | ExistingProjectWorkspacePrepareResponse
  | ExistingProjectAdoptionPlanResponse
  | ExistingProjectAdoptionDecisionsResponse;

export interface ExistingProjectDaemonOptions extends ExistingProjectPreparedPlanDaemonOptions {
  readonly existingProjectWorkspacePrepare?: (
    request: ExistingProjectWorkspacePrepareRequest,
  ) => Promise<
    Omit<ExistingProjectWorkspacePrepareResponse["result"], "protocolVersion">
  >;
  readonly existingProjectAdoptionPlan?: (
    request: ExistingProjectAdoptionPlanRequest,
  ) => Promise<
    Omit<ExistingProjectAdoptionPlanResponse["result"], "protocolVersion">
  >;
  readonly existingProjectAdoptionDecisions?: (
    request: ExistingProjectAdoptionDecisionsRequest,
  ) => Promise<
    Omit<ExistingProjectAdoptionDecisionsResponse["result"], "protocolVersion">
  >;
}

function enabled(method: string, operation: string): DaemonCapability {
  return { method, operation, classification: "read-only" };
}

export function existingProjectCapabilities(
  options: ExistingProjectDaemonOptions,
): readonly DaemonCapability[] {
  return [
    ...existingProjectPreparedPlanCapabilities(options),
    ...(options.existingProjectWorkspacePrepare
      ? [
          enabled(
            EXISTING_PROJECT_WORKSPACE_PREPARE_METHOD,
            "existing-project.workspace.prepare",
          ),
        ]
      : []),
    ...(options.existingProjectAdoptionPlan
      ? [
          enabled(
            EXISTING_PROJECT_ADOPTION_PLAN_METHOD,
            "existing-project.adoption.plan",
          ),
        ]
      : []),
    ...(options.existingProjectAdoptionDecisions
      ? [
          enabled(
            EXISTING_PROJECT_ADOPTION_DECISIONS_METHOD,
            "existing-project.adoption.decisions",
          ),
        ]
      : []),
  ];
}

function isDecisionsRequest(
  request: ExistingProjectCoreRequest,
): request is ExistingProjectAdoptionDecisionsRequest {
  return isExistingProjectAdoptionDecisionsMethod(request.method);
}

function isPlanRequest(
  request: ExistingProjectCoreRequest,
): request is ExistingProjectAdoptionPlanRequest {
  return isExistingProjectAdoptionPlanMethod(request.method);
}

export async function dispatchExistingProjectRequest(
  request: { readonly method: string; readonly id: string | number },
  options: ExistingProjectDaemonOptions,
  canonicalProjectRoot: (root: string) => Promise<string>,
): Promise<ExistingProjectCoreResponse | PreparedPlanResponse | null> {
  if (isExistingProjectPreparedPlanRequest(request)) {
    return dispatchExistingProjectPreparedPlanRequest(
      request,
      options,
      canonicalProjectRoot,
    );
  }
  const typed = request as ExistingProjectCoreRequest;
  if (isDecisionsRequest(typed)) {
    const validate = options.existingProjectAdoptionDecisions;
    if (!validate) return null;
    const root = await canonicalProjectRoot(typed.params.root);
    const payload = await validate({
      ...typed,
      params: {
        protocolVersion: typed.params.protocolVersion,
        root,
        previewIdentity: typed.params.previewIdentity,
        decisions: typed.params.decisions,
        ...(typed.params.projectId !== undefined
          ? { projectId: typed.params.projectId }
          : {}),
      },
    });
    return createExistingProjectAdoptionDecisionsResponse(
      typed.id,
      payload.viewmodel,
    );
  }
  if (isPlanRequest(typed)) {
    const plan = options.existingProjectAdoptionPlan;
    if (!plan) return null;
    const root = await canonicalProjectRoot(typed.params.root);
    const payload = await plan({
      ...typed,
      params: {
        protocolVersion: typed.params.protocolVersion,
        root,
        ...(typed.params.projectId !== undefined
          ? { projectId: typed.params.projectId }
          : {}),
      },
    });
    return createExistingProjectAdoptionPlanResponse(
      typed.id,
      payload.viewmodel,
    );
  }
  if (!isExistingProjectDaemonMethod(typed.method)) return null;
  const prepare = options.existingProjectWorkspacePrepare;
  if (!prepare) return null;
  const workspace = typed as ExistingProjectWorkspacePrepareRequest;
  const root = await canonicalProjectRoot(workspace.params.root);
  const payload = await prepare({
    ...workspace,
    params: {
      protocolVersion: workspace.params.protocolVersion,
      root,
      ...(workspace.params.projectId !== undefined
        ? { projectId: workspace.params.projectId }
        : {}),
      ...(workspace.params.scope !== undefined
        ? { scope: workspace.params.scope }
        : {}),
    },
  });
  return createExistingProjectWorkspacePrepareResponse(
    workspace.id,
    payload.viewmodel,
  );
}

type PreparedPlanResponse = Awaited<
  ReturnType<typeof dispatchExistingProjectPreparedPlanRequest>
>;

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

export async function handleExistingProjectAdoptionPlan(
  request: ExistingProjectAdoptionPlanRequest,
): Promise<
  Omit<ExistingProjectAdoptionPlanResponse["result"], "protocolVersion">
> {
  const viewmodel = await prepareExistingProjectAdoptionPlan(
    {
      root: resolve(request.params.root),
      ...(request.params.projectId !== undefined
        ? { projectId: request.params.projectId }
        : {}),
    },
    nodeFileSystem,
  );
  return { viewmodel };
}

export async function handleExistingProjectAdoptionDecisions(
  request: ExistingProjectAdoptionDecisionsRequest,
): Promise<
  Omit<ExistingProjectAdoptionDecisionsResponse["result"], "protocolVersion">
> {
  const viewmodel = await validateExistingProjectAdoptionDecisions(
    {
      root: resolve(request.params.root),
      previewIdentity: request.params.previewIdentity,
      decisions: request.params.decisions,
      ...(request.params.projectId !== undefined
        ? { projectId: request.params.projectId }
        : {}),
    },
    nodeFileSystem,
  );
  return { viewmodel };
}

export function isExistingProjectRequest(request: {
  readonly method: string;
}): boolean {
  return (
    isExistingProjectDaemonMethod(request.method) ||
    isExistingProjectAdoptionPlanMethod(request.method) ||
    isExistingProjectAdoptionDecisionsMethod(request.method) ||
    isExistingProjectPreparedPlanRequest(request)
  );
}
