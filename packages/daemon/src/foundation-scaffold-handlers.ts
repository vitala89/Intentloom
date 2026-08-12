import {
  compareProjectScaffoldPlan,
  getProjectScaffoldPlan,
  prepareProjectScaffold,
  validateProjectScaffoldPlan,
  applyFoundationProjectScaffold,
  rollbackFoundationProjectScaffold,
} from "@intentloom/application";
import type {
  DaemonCapability,
  FoundationScaffoldApplyRequest,
  FoundationScaffoldApplyResultPayload,
  FoundationScaffoldCompareRequest,
  FoundationScaffoldCompareResultPayload,
  FoundationScaffoldGetRequest,
  FoundationScaffoldGetResultPayload,
  FoundationScaffoldPrepareRequest,
  FoundationScaffoldPrepareResultPayload,
  FoundationScaffoldRollbackRequest,
  FoundationScaffoldRollbackResultPayload,
  FoundationScaffoldValidateRequest,
  FoundationScaffoldValidateResultPayload,
  FoundationViewmodelPayload,
} from "@intentloom/protocol";
import {
  FOUNDATION_SCAFFOLD_APPLY_METHOD,
  FOUNDATION_SCAFFOLD_COMPARE_METHOD,
  FOUNDATION_SCAFFOLD_GET_METHOD,
  FOUNDATION_SCAFFOLD_PREPARE_METHOD,
  FOUNDATION_SCAFFOLD_ROLLBACK_METHOD,
  FOUNDATION_SCAFFOLD_VALIDATE_METHOD,
  createFoundationScaffoldApplyResponse,
  createFoundationScaffoldCompareResponse,
  createFoundationScaffoldGetResponse,
  createFoundationScaffoldPrepareResponse,
  createFoundationScaffoldRollbackResponse,
  createFoundationScaffoldValidateResponse,
  isFoundationScaffoldDaemonMethod,
  type FoundationScaffoldDaemonRequest,
} from "@intentloom/protocol";

export interface FoundationScaffoldDaemonOptions {
  readonly foundationScaffoldPrepare?: (
    request: FoundationScaffoldPrepareRequest,
  ) => Promise<Omit<FoundationScaffoldPrepareResultPayload, "protocolVersion">>;
  readonly foundationScaffoldGet?: (
    request: FoundationScaffoldGetRequest,
  ) => Promise<Omit<FoundationScaffoldGetResultPayload, "protocolVersion">>;
  readonly foundationScaffoldCompare?: (
    request: FoundationScaffoldCompareRequest,
  ) => Promise<Omit<FoundationScaffoldCompareResultPayload, "protocolVersion">>;
  readonly foundationScaffoldValidate?: (
    request: FoundationScaffoldValidateRequest,
  ) => Promise<
    Omit<FoundationScaffoldValidateResultPayload, "protocolVersion">
  >;
  readonly foundationScaffoldApply?: (
    request: FoundationScaffoldApplyRequest,
  ) => Promise<Omit<FoundationScaffoldApplyResultPayload, "protocolVersion">>;
  readonly foundationScaffoldRollback?: (
    request: FoundationScaffoldRollbackRequest,
  ) => Promise<
    Omit<FoundationScaffoldRollbackResultPayload, "protocolVersion">
  >;
}

function vm(value: object): { readonly viewmodel: FoundationViewmodelPayload } {
  return { viewmodel: value as FoundationViewmodelPayload };
}

function enabled(method: string, operation: string): DaemonCapability {
  return { method, operation, classification: "read-only" };
}

function mutating(method: string, operation: string): DaemonCapability {
  return { method, operation, classification: "mutating" };
}

export function foundationScaffoldCapabilities(
  options: FoundationScaffoldDaemonOptions,
): readonly DaemonCapability[] {
  return [
    options.foundationScaffoldPrepare
      ? enabled(
          FOUNDATION_SCAFFOLD_PREPARE_METHOD,
          "foundation.scaffold.prepare",
        )
      : undefined,
    options.foundationScaffoldGet
      ? enabled(FOUNDATION_SCAFFOLD_GET_METHOD, "foundation.scaffold.get")
      : undefined,
    options.foundationScaffoldCompare
      ? enabled(
          FOUNDATION_SCAFFOLD_COMPARE_METHOD,
          "foundation.scaffold.compare",
        )
      : undefined,
    options.foundationScaffoldValidate
      ? enabled(
          FOUNDATION_SCAFFOLD_VALIDATE_METHOD,
          "foundation.scaffold.validate",
        )
      : undefined,
    options.foundationScaffoldApply
      ? mutating(FOUNDATION_SCAFFOLD_APPLY_METHOD, "foundation.scaffold.apply")
      : undefined,
    options.foundationScaffoldRollback
      ? mutating(
          FOUNDATION_SCAFFOLD_ROLLBACK_METHOD,
          "foundation.scaffold.rollback",
        )
      : undefined,
  ].filter((entry): entry is DaemonCapability => entry !== undefined);
}

export function isFoundationScaffoldRequest(
  request: object,
): request is FoundationScaffoldDaemonRequest {
  return (
    "method" in request &&
    typeof request.method === "string" &&
    isFoundationScaffoldDaemonMethod(request.method)
  );
}

export async function dispatchFoundationScaffoldRequest(
  request: FoundationScaffoldDaemonRequest,
  options: FoundationScaffoldDaemonOptions,
): Promise<object | undefined> {
  if (
    request.method === FOUNDATION_SCAFFOLD_PREPARE_METHOD &&
    options.foundationScaffoldPrepare
  ) {
    return createFoundationScaffoldPrepareResponse(
      request.id,
      await options.foundationScaffoldPrepare(request),
    );
  }
  if (
    request.method === FOUNDATION_SCAFFOLD_GET_METHOD &&
    options.foundationScaffoldGet
  ) {
    return createFoundationScaffoldGetResponse(
      request.id,
      await options.foundationScaffoldGet(request),
    );
  }
  if (
    request.method === FOUNDATION_SCAFFOLD_COMPARE_METHOD &&
    options.foundationScaffoldCompare
  ) {
    return createFoundationScaffoldCompareResponse(
      request.id,
      await options.foundationScaffoldCompare(request),
    );
  }
  if (
    request.method === FOUNDATION_SCAFFOLD_VALIDATE_METHOD &&
    options.foundationScaffoldValidate
  ) {
    return createFoundationScaffoldValidateResponse(
      request.id,
      await options.foundationScaffoldValidate(request),
    );
  }
  if (
    request.method === FOUNDATION_SCAFFOLD_APPLY_METHOD &&
    options.foundationScaffoldApply
  ) {
    return createFoundationScaffoldApplyResponse(
      request.id,
      await options.foundationScaffoldApply(request),
    );
  }
  if (
    request.method === FOUNDATION_SCAFFOLD_ROLLBACK_METHOD &&
    options.foundationScaffoldRollback
  ) {
    return createFoundationScaffoldRollbackResponse(
      request.id,
      await options.foundationScaffoldRollback(request),
    );
  }
  return undefined;
}

export async function handleFoundationScaffoldPrepare(
  request: FoundationScaffoldPrepareRequest,
): Promise<Omit<FoundationScaffoldPrepareResultPayload, "protocolVersion">> {
  return vm(
    prepareProjectScaffold(request.params.workshopId, request.params.root),
  );
}

export async function handleFoundationScaffoldGet(
  request: FoundationScaffoldGetRequest,
): Promise<Omit<FoundationScaffoldGetResultPayload, "protocolVersion">> {
  return vm(
    getProjectScaffoldPlan(request.params.workshopId, request.params.planId),
  );
}

export async function handleFoundationScaffoldCompare(
  request: FoundationScaffoldCompareRequest,
): Promise<Omit<FoundationScaffoldCompareResultPayload, "protocolVersion">> {
  return vm(
    compareProjectScaffoldPlan(
      request.params.workshopId,
      request.params.planId,
      request.params.existingPaths ?? [],
    ),
  );
}

export async function handleFoundationScaffoldValidate(
  request: FoundationScaffoldValidateRequest,
): Promise<Omit<FoundationScaffoldValidateResultPayload, "protocolVersion">> {
  return vm(
    validateProjectScaffoldPlan(
      request.params.workshopId,
      request.params.planId,
    ),
  );
}

export async function handleFoundationScaffoldApply(
  request: FoundationScaffoldApplyRequest,
): Promise<Omit<FoundationScaffoldApplyResultPayload, "protocolVersion">> {
  return vm(
    applyFoundationProjectScaffold(
      request.params.workshopId,
      request.params.planId,
      {
        ...(request.params.existingPaths !== undefined
          ? { existingPaths: request.params.existingPaths }
          : {}),
        grantedCapabilities: request.params.grantedCapabilities ?? [
          "filesystem.write",
          "scaffold.apply",
        ],
      },
    ),
  );
}

export async function handleFoundationScaffoldRollback(
  request: FoundationScaffoldRollbackRequest,
): Promise<Omit<FoundationScaffoldRollbackResultPayload, "protocolVersion">> {
  return vm(
    rollbackFoundationProjectScaffold(
      request.params.workshopId,
      request.params.planId,
    ),
  );
}
