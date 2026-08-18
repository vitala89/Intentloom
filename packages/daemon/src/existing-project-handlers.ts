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

type ExistingProjectRequest =
  | ExistingProjectWorkspacePrepareRequest
  | ExistingProjectAdoptionPlanRequest
  | ExistingProjectAdoptionDecisionsRequest;

type ExistingProjectResponse =
  | ExistingProjectWorkspacePrepareResponse
  | ExistingProjectAdoptionPlanResponse
  | ExistingProjectAdoptionDecisionsResponse;

export interface ExistingProjectDaemonOptions {
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

function isAdoptionDecisionsRequest(
  request: ExistingProjectRequest,
): request is ExistingProjectAdoptionDecisionsRequest {
  return isExistingProjectAdoptionDecisionsMethod(request.method);
}

function isAdoptionPlanRequest(
  request: ExistingProjectRequest,
): request is ExistingProjectAdoptionPlanRequest {
  return isExistingProjectAdoptionPlanMethod(request.method);
}

export async function dispatchExistingProjectRequest(
  request: ExistingProjectRequest,
  options: ExistingProjectDaemonOptions,
  canonicalProjectRoot: (root: string) => Promise<string>,
): Promise<ExistingProjectResponse | null> {
  if (isAdoptionDecisionsRequest(request)) {
    const validate = options.existingProjectAdoptionDecisions;
    if (!validate) return null;
    const root = await canonicalProjectRoot(request.params.root);
    const payload = await validate({
      ...request,
      params: {
        protocolVersion: request.params.protocolVersion,
        root,
        previewIdentity: request.params.previewIdentity,
        decisions: request.params.decisions,
        ...(request.params.projectId !== undefined
          ? { projectId: request.params.projectId }
          : {}),
      },
    });
    return createExistingProjectAdoptionDecisionsResponse(
      request.id,
      payload.viewmodel,
    );
  }
  if (isAdoptionPlanRequest(request)) {
    const plan = options.existingProjectAdoptionPlan;
    if (!plan) return null;
    const root = await canonicalProjectRoot(request.params.root);
    const payload = await plan({
      ...request,
      params: {
        protocolVersion: request.params.protocolVersion,
        root,
        ...(request.params.projectId !== undefined
          ? { projectId: request.params.projectId }
          : {}),
      },
    });
    return createExistingProjectAdoptionPlanResponse(
      request.id,
      payload.viewmodel,
    );
  }
  if (!isExistingProjectDaemonMethod(request.method)) return null;
  const prepare = options.existingProjectWorkspacePrepare;
  if (!prepare) return null;
  const root = await canonicalProjectRoot(request.params.root);
  const payload = await prepare({
    ...request,
    params: {
      protocolVersion: request.params.protocolVersion,
      root,
      ...(request.params.projectId !== undefined
        ? { projectId: request.params.projectId }
        : {}),
      ...(request.params.scope !== undefined
        ? { scope: request.params.scope }
        : {}),
    },
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
}): request is ExistingProjectRequest {
  return (
    isExistingProjectDaemonMethod(request.method) ||
    isExistingProjectAdoptionPlanMethod(request.method) ||
    isExistingProjectAdoptionDecisionsMethod(request.method)
  );
}
