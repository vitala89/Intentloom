import { resolve } from "node:path";
import {
  nodeFileSystem,
  prepareExistingProjectAdoptionPreparedPlan,
  revalidateExistingProjectAdoptionPreparedPlan,
} from "@intentloom/application";
import type {
  ExistingProjectAdoptionPrepareRequest,
  ExistingProjectAdoptionPrepareResponse,
  ExistingProjectAdoptionRevalidateRequest,
  ExistingProjectAdoptionRevalidateResponse,
} from "@intentloom/protocol";

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
