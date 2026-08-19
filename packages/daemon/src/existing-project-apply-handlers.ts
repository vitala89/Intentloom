import { resolve } from "node:path";
import {
  applyExistingProjectAdoptionPreparedPlan,
  nodeFileSystem,
  withCanonicalProjectRootLock,
} from "@intentloom/application";
import type {
  ExistingProjectAdoptionApplyRequest,
  ExistingProjectAdoptionApplyResponse,
} from "@intentloom/protocol";
import {
  EXISTING_PROJECT_ADOPTION_APPLY_METHOD,
  createExistingProjectAdoptionApplyResponse,
  isExistingProjectAdoptionApplyMethod,
} from "@intentloom/protocol";
import type { DaemonCapability } from "@intentloom/protocol";

export interface ExistingProjectApplyDaemonOptions {
  readonly existingProjectAdoptionApply?: (
    request: ExistingProjectAdoptionApplyRequest,
  ) => Promise<
    Omit<ExistingProjectAdoptionApplyResponse["result"], "protocolVersion">
  >;
}

export function existingProjectApplyCapabilities(
  options: ExistingProjectApplyDaemonOptions,
): readonly DaemonCapability[] {
  if (!options.existingProjectAdoptionApply) return [];
  return [
    {
      method: EXISTING_PROJECT_ADOPTION_APPLY_METHOD,
      operation: "existing-project.adoption.apply",
      classification: "mutating",
    },
  ];
}

export function isExistingProjectApplyRequest(request: {
  readonly method: string;
}): request is ExistingProjectAdoptionApplyRequest {
  return isExistingProjectAdoptionApplyMethod(request.method);
}

export async function dispatchExistingProjectApplyRequest(
  request: ExistingProjectAdoptionApplyRequest,
  options: ExistingProjectApplyDaemonOptions,
  canonicalProjectRoot: (root: string) => Promise<string>,
): Promise<ExistingProjectAdoptionApplyResponse | null> {
  const apply = options.existingProjectAdoptionApply;
  if (!apply) return null;
  const root = await canonicalProjectRoot(request.params.root);
  return withCanonicalProjectRootLock(root, async () => {
    const payload = await apply({
      ...request,
      params: {
        protocolVersion: request.params.protocolVersion,
        root,
        preparedPlanId: request.params.preparedPlanId,
        planDigest: request.params.planDigest,
        preparedPlan: request.params.preparedPlan,
        approval: request.params.approval,
      },
    });
    return createExistingProjectAdoptionApplyResponse(
      request.id,
      payload.viewmodel,
    );
  });
}

export async function handleExistingProjectAdoptionApply(
  request: ExistingProjectAdoptionApplyRequest,
): Promise<
  Omit<ExistingProjectAdoptionApplyResponse["result"], "protocolVersion">
> {
  const viewmodel = await applyExistingProjectAdoptionPreparedPlan(
    {
      root: resolve(request.params.root),
      preparedPlanId: request.params.preparedPlanId,
      planDigest: request.params.planDigest,
      preparedPlan: request.params.preparedPlan,
      approval: request.params.approval,
    },
    nodeFileSystem,
  );
  return { viewmodel };
}
