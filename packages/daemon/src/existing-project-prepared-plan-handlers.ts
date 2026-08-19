import { resolve } from "node:path";
import {
  approveExistingProjectAdoptionPreparedPlan,
  nodeFileSystem,
  prepareExistingProjectAdoptionPreparedPlan,
  revalidateExistingProjectAdoptionPreparedPlan,
} from "@intentloom/application";
import type {
  ExistingProjectAdoptionApproveRequest,
  ExistingProjectAdoptionApproveResponse,
  ExistingProjectAdoptionPrepareRequest,
  ExistingProjectAdoptionPrepareResponse,
  ExistingProjectAdoptionRevalidateRequest,
  ExistingProjectAdoptionRevalidateResponse,
} from "@intentloom/protocol";
import {
  EXISTING_PROJECT_ADOPTION_APPROVE_METHOD,
  EXISTING_PROJECT_ADOPTION_PREPARE_METHOD,
  EXISTING_PROJECT_ADOPTION_REVALIDATE_METHOD,
  createExistingProjectAdoptionApproveResponse,
  createExistingProjectAdoptionPrepareResponse,
  createExistingProjectAdoptionRevalidateResponse,
  isExistingProjectAdoptionApproveMethod,
  isExistingProjectAdoptionPrepareMethod,
  isExistingProjectAdoptionRevalidateMethod,
} from "@intentloom/protocol";
import type { DaemonCapability } from "@intentloom/protocol";

export interface ExistingProjectPreparedPlanDaemonOptions {
  readonly existingProjectAdoptionPrepare?: (
    request: ExistingProjectAdoptionPrepareRequest,
  ) => Promise<
    Omit<ExistingProjectAdoptionPrepareResponse["result"], "protocolVersion">
  >;
  readonly existingProjectAdoptionRevalidate?: (
    request: ExistingProjectAdoptionRevalidateRequest,
  ) => Promise<
    Omit<ExistingProjectAdoptionRevalidateResponse["result"], "protocolVersion">
  >;
  readonly existingProjectAdoptionApprove?: (
    request: ExistingProjectAdoptionApproveRequest,
  ) => Promise<
    Omit<ExistingProjectAdoptionApproveResponse["result"], "protocolVersion">
  >;
}

type PreparedPlanRequest =
  | ExistingProjectAdoptionPrepareRequest
  | ExistingProjectAdoptionRevalidateRequest
  | ExistingProjectAdoptionApproveRequest;

type PreparedPlanResponse =
  | ExistingProjectAdoptionPrepareResponse
  | ExistingProjectAdoptionRevalidateResponse
  | ExistingProjectAdoptionApproveResponse;

function enabled(method: string, operation: string): DaemonCapability {
  return { method, operation, classification: "read-only" };
}

export function existingProjectPreparedPlanCapabilities(
  options: ExistingProjectPreparedPlanDaemonOptions,
): readonly DaemonCapability[] {
  return [
    ...(options.existingProjectAdoptionPrepare
      ? [
          enabled(
            EXISTING_PROJECT_ADOPTION_PREPARE_METHOD,
            "existing-project.adoption.prepare",
          ),
        ]
      : []),
    ...(options.existingProjectAdoptionRevalidate
      ? [
          enabled(
            EXISTING_PROJECT_ADOPTION_REVALIDATE_METHOD,
            "existing-project.adoption.revalidate",
          ),
        ]
      : []),
    ...(options.existingProjectAdoptionApprove
      ? [
          enabled(
            EXISTING_PROJECT_ADOPTION_APPROVE_METHOD,
            "existing-project.adoption.approve",
          ),
        ]
      : []),
  ];
}

export function isExistingProjectPreparedPlanRequest(request: {
  readonly method: string;
}): request is PreparedPlanRequest {
  return (
    isExistingProjectAdoptionPrepareMethod(request.method) ||
    isExistingProjectAdoptionRevalidateMethod(request.method) ||
    isExistingProjectAdoptionApproveMethod(request.method)
  );
}

function isApproveRequest(
  request: PreparedPlanRequest,
): request is ExistingProjectAdoptionApproveRequest {
  return isExistingProjectAdoptionApproveMethod(request.method);
}

function isPrepareRequest(
  request: PreparedPlanRequest,
): request is ExistingProjectAdoptionPrepareRequest {
  return isExistingProjectAdoptionPrepareMethod(request.method);
}

export async function dispatchExistingProjectPreparedPlanRequest(
  request: PreparedPlanRequest,
  options: ExistingProjectPreparedPlanDaemonOptions,
  canonicalProjectRoot: (root: string) => Promise<string>,
): Promise<PreparedPlanResponse | null> {
  if (isApproveRequest(request)) {
    const approve = options.existingProjectAdoptionApprove;
    if (!approve) return null;
    const root = await canonicalProjectRoot(request.params.root);
    const payload = await approve({
      ...request,
      params: {
        protocolVersion: request.params.protocolVersion,
        root,
        preparedPlanId: request.params.preparedPlanId,
        planDigest: request.params.planDigest,
        preparedPlan: request.params.preparedPlan,
        approvalSource: request.params.approvalSource,
      },
    });
    return createExistingProjectAdoptionApproveResponse(
      request.id,
      payload.viewmodel,
    );
  }
  if (isPrepareRequest(request)) {
    const prepare = options.existingProjectAdoptionPrepare;
    if (!prepare) return null;
    const root = await canonicalProjectRoot(request.params.root);
    const payload = await prepare({
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
    return createExistingProjectAdoptionPrepareResponse(
      request.id,
      payload.viewmodel,
    );
  }
  const revalidate = options.existingProjectAdoptionRevalidate;
  if (!revalidate) return null;
  const root = await canonicalProjectRoot(request.params.root);
  const payload = await revalidate({
    ...request,
    params: {
      protocolVersion: request.params.protocolVersion,
      root,
      preparedPlan: request.params.preparedPlan,
    },
  });
  return createExistingProjectAdoptionRevalidateResponse(
    request.id,
    payload.viewmodel,
  );
}

export async function handleExistingProjectAdoptionPrepare(
  request: ExistingProjectAdoptionPrepareRequest,
): Promise<
  Omit<ExistingProjectAdoptionPrepareResponse["result"], "protocolVersion">
> {
  const viewmodel = await prepareExistingProjectAdoptionPreparedPlan(
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

export async function handleExistingProjectAdoptionRevalidate(
  request: ExistingProjectAdoptionRevalidateRequest,
): Promise<
  Omit<ExistingProjectAdoptionRevalidateResponse["result"], "protocolVersion">
> {
  const viewmodel = await revalidateExistingProjectAdoptionPreparedPlan(
    {
      root: resolve(request.params.root),
      preparedPlan: request.params.preparedPlan,
    },
    nodeFileSystem,
  );
  return { viewmodel };
}

export async function handleExistingProjectAdoptionApprove(
  request: ExistingProjectAdoptionApproveRequest,
): Promise<
  Omit<ExistingProjectAdoptionApproveResponse["result"], "protocolVersion">
> {
  const viewmodel = await approveExistingProjectAdoptionPreparedPlan(
    {
      root: resolve(request.params.root),
      preparedPlanId: request.params.preparedPlanId,
      planDigest: request.params.planDigest,
      preparedPlan: request.params.preparedPlan,
    },
    nodeFileSystem,
  );
  return { viewmodel };
}
