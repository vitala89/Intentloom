import { resolve } from "node:path";
import {
  buildFeatureIntentWorkspaceViewModel,
  prepareFeatureIntentWorkspace,
} from "@intentloom/application";
import type {
  FeatureIntentDaemonRequest,
  FeatureIntentViewmodelPayload,
  FeatureIntentWorkspaceAnalyzeRequest,
  FeatureIntentWorkspaceAnalyzeResponse,
  FeatureIntentWorkspacePrepareRequest,
  FeatureIntentWorkspacePrepareResponse,
} from "@intentloom/protocol";
import {
  FEATURE_INTENT_WORKSPACE_ANALYZE_METHOD,
  FEATURE_INTENT_WORKSPACE_PREPARE_METHOD,
  createFeatureIntentWorkspaceAnalyzeResponse,
  createFeatureIntentWorkspacePrepareResponse,
  isFeatureIntentDaemonMethod,
} from "@intentloom/protocol";
import type { DaemonCapability } from "@intentloom/protocol";
import { nodeFileSystem } from "@intentloom/application";

export interface FeatureIntentDaemonOptions {
  readonly featureIntentWorkspacePrepare?: (
    request: FeatureIntentWorkspacePrepareRequest,
  ) => Promise<
    Omit<FeatureIntentWorkspacePrepareResponse["result"], "protocolVersion">
  >;
  readonly featureIntentWorkspaceAnalyze?: (
    request: FeatureIntentWorkspaceAnalyzeRequest,
  ) => Promise<
    Omit<FeatureIntentWorkspaceAnalyzeResponse["result"], "protocolVersion">
  >;
}

function enabled(method: string, operation: string): DaemonCapability {
  return { method, operation, classification: "read-only" };
}

export function featureIntentCapabilities(
  options: FeatureIntentDaemonOptions,
): readonly DaemonCapability[] {
  const capabilities: DaemonCapability[] = [];
  if (options.featureIntentWorkspacePrepare) {
    capabilities.push(
      enabled(
        FEATURE_INTENT_WORKSPACE_PREPARE_METHOD,
        "feature-intent.workspace.prepare",
      ),
    );
  }
  if (options.featureIntentWorkspaceAnalyze) {
    capabilities.push(
      enabled(
        FEATURE_INTENT_WORKSPACE_ANALYZE_METHOD,
        "feature-intent.workspace.analyze",
      ),
    );
  }
  return capabilities;
}

export async function dispatchFeatureIntentRequest(
  request: FeatureIntentDaemonRequest,
  options: FeatureIntentDaemonOptions,
  canonicalProjectRoot: (root: string) => Promise<string>,
): Promise<
  | FeatureIntentWorkspacePrepareResponse
  | FeatureIntentWorkspaceAnalyzeResponse
  | null
> {
  if (!isFeatureIntentDaemonMethod(request.method)) return null;
  const root = await canonicalProjectRoot(request.params.root);
  if (request.method === FEATURE_INTENT_WORKSPACE_ANALYZE_METHOD) {
    const analyze = options.featureIntentWorkspaceAnalyze;
    if (!analyze) return null;
    const payload = await analyze({
      ...request,
      params: { ...request.params, root },
    });
    return createFeatureIntentWorkspaceAnalyzeResponse(
      request.id,
      payload.viewmodel,
    );
  }
  const prepare = options.featureIntentWorkspacePrepare;
  if (!prepare) return null;
  const payload = await prepare({
    ...request,
    params: { ...request.params, root },
  });
  return createFeatureIntentWorkspacePrepareResponse(
    request.id,
    payload.viewmodel,
  );
}

async function overviewViewmodel(
  request: FeatureIntentDaemonRequest,
): Promise<FeatureIntentViewmodelPayload> {
  const overview = await prepareFeatureIntentWorkspace(
    {
      root: resolve(request.params.root),
      title: request.params.title,
      summary: request.params.summary,
      ...(request.params.projectId !== undefined
        ? { projectId: request.params.projectId }
        : {}),
    },
    nodeFileSystem,
  );
  return buildFeatureIntentWorkspaceViewModel(
    overview,
    "ready",
  ) as unknown as FeatureIntentViewmodelPayload;
}

export async function handleFeatureIntentWorkspacePrepare(
  request: FeatureIntentWorkspacePrepareRequest,
): Promise<
  Omit<FeatureIntentWorkspacePrepareResponse["result"], "protocolVersion">
> {
  return { viewmodel: await overviewViewmodel(request) };
}

export async function handleFeatureIntentWorkspaceAnalyze(
  request: FeatureIntentWorkspaceAnalyzeRequest,
): Promise<
  Omit<FeatureIntentWorkspaceAnalyzeResponse["result"], "protocolVersion">
> {
  const viewmodel = await overviewViewmodel(request);
  return {
    viewmodel: {
      intentId: viewmodel.intentId,
      title: viewmodel.title,
      impactSummary: viewmodel.impactSummary,
      packages: viewmodel.packages,
      publicApiChangeRisk: viewmodel.publicApiChangeRisk,
      assessmentFindingsCount: viewmodel.assessmentFindingsCount,
      debtItemCount: viewmodel.debtItemCount,
      mutationAllowed: viewmodel.mutationAllowed,
    },
  };
}

export function isFeatureIntentRequest(request: {
  readonly method: string;
}): request is FeatureIntentDaemonRequest {
  return isFeatureIntentDaemonMethod(request.method);
}
