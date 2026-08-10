import { isAbsolute } from "node:path";
import {
  assertCanonicalProjectRoot,
  buildQualityCatalogViewModel,
  buildQualityCheckersViewModel,
  buildQualityGraphViewModel,
  buildQualityStandardsViewModel,
  FIRST_PARTY_CATALOG_ENTRIES,
  getEffectiveEngineeringQualityPolicy,
  loadQualityGraphSnapshot,
  nodeFileSystem,
  QUALITY_CHECKER_ADAPTERS,
} from "@intentloom/application";
import type {
  DaemonCapability,
  QualityCatalogRequest,
  QualityCatalogResultPayload,
  QualityCheckersRequest,
  QualityCheckersResultPayload,
  QualityGraphRequest,
  QualityGraphResultPayload,
  QualityStandardsRequest,
  QualityStandardsResultPayload,
  QualityViewmodelPayload,
} from "@intentloom/protocol";
import {
  QUALITY_CATALOG_METHOD,
  QUALITY_CHECKERS_METHOD,
  QUALITY_GRAPH_METHOD,
  QUALITY_STANDARDS_METHOD,
  createQualityCatalogResponse,
  createQualityCheckersResponse,
  createQualityGraphResponse,
  createQualityStandardsResponse,
} from "@intentloom/protocol";
import { ProjectRootError } from "@intentloom/application";

export interface QualityDaemonOptions {
  readonly qualityStandards?: (
    request: QualityStandardsRequest,
  ) => Promise<Omit<QualityStandardsResultPayload, "protocolVersion">>;
  readonly qualityCatalog?: (
    request: QualityCatalogRequest,
  ) => Promise<Omit<QualityCatalogResultPayload, "protocolVersion">>;
  readonly qualityCheckers?: (
    request: QualityCheckersRequest,
  ) => Promise<Omit<QualityCheckersResultPayload, "protocolVersion">>;
  readonly qualityGraph?: (
    request: QualityGraphRequest,
  ) => Promise<Omit<QualityGraphResultPayload, "protocolVersion">>;
}

async function validatedRoot(root: string): Promise<string> {
  if (!isAbsolute(root))
    throw new ProjectRootError(
      "invalid_root",
      "project root must be an absolute path",
    );
  return assertCanonicalProjectRoot(root, nodeFileSystem);
}

function result(viewmodel: object): {
  readonly viewmodel: QualityViewmodelPayload;
} {
  return { viewmodel: viewmodel as QualityViewmodelPayload };
}

function enabledCapability(
  method: string,
  operation: string,
): DaemonCapability {
  return { method, operation, classification: "read-only" };
}

export function qualityCapabilities(
  options: QualityDaemonOptions,
): readonly DaemonCapability[] {
  return [
    options.qualityStandards
      ? enabledCapability(QUALITY_STANDARDS_METHOD, "quality.standards")
      : undefined,
    options.qualityCatalog
      ? enabledCapability(QUALITY_CATALOG_METHOD, "quality.catalog")
      : undefined,
    options.qualityCheckers
      ? enabledCapability(QUALITY_CHECKERS_METHOD, "quality.checkers")
      : undefined,
    options.qualityGraph
      ? enabledCapability(QUALITY_GRAPH_METHOD, "quality.graph")
      : undefined,
  ].filter((entry): entry is DaemonCapability => entry !== undefined);
}

type QualityRequest =
  | QualityStandardsRequest
  | QualityCatalogRequest
  | QualityCheckersRequest
  | QualityGraphRequest;

export function isQualityRequest(request: object): request is QualityRequest {
  return (
    "method" in request &&
    (request.method === QUALITY_STANDARDS_METHOD ||
      request.method === QUALITY_CATALOG_METHOD ||
      request.method === QUALITY_CHECKERS_METHOD ||
      request.method === QUALITY_GRAPH_METHOD)
  );
}

export async function dispatchQualityRequest(
  request: QualityRequest,
  options: QualityDaemonOptions & {
    readonly enforceCanonicalRoots?: boolean;
  },
  canonicalProjectRoot: (root: string) => Promise<string>,
): Promise<object | undefined> {
  const root = options.enforceCanonicalRoots
    ? await canonicalProjectRoot(request.params.root)
    : request.params.root;
  if (request.method === QUALITY_STANDARDS_METHOD && options.qualityStandards)
    return createQualityStandardsResponse(
      request.id,
      await options.qualityStandards({
        ...request,
        params: { ...request.params, root },
      }),
    );
  if (request.method === QUALITY_CATALOG_METHOD && options.qualityCatalog)
    return createQualityCatalogResponse(
      request.id,
      await options.qualityCatalog({
        ...request,
        params: { ...request.params, root },
      }),
    );
  if (request.method === QUALITY_CHECKERS_METHOD && options.qualityCheckers)
    return createQualityCheckersResponse(
      request.id,
      await options.qualityCheckers({
        ...request,
        params: { ...request.params, root },
      }),
    );
  if (request.method === QUALITY_GRAPH_METHOD && options.qualityGraph)
    return createQualityGraphResponse(
      request.id,
      await options.qualityGraph({
        ...request,
        params: { ...request.params, root },
      }),
    );
  return undefined;
}

export async function handleQualityStandards(
  request: QualityStandardsRequest,
  root: string,
): Promise<Omit<QualityStandardsResultPayload, "protocolVersion">> {
  await validatedRoot(root);
  return result(
    buildQualityStandardsViewModel({
      policy: getEffectiveEngineeringQualityPolicy(),
    }),
  );
}

export async function handleQualityCatalog(
  request: QualityCatalogRequest,
  root: string,
): Promise<Omit<QualityCatalogResultPayload, "protocolVersion">> {
  await validatedRoot(root);
  return result(buildQualityCatalogViewModel(FIRST_PARTY_CATALOG_ENTRIES));
}

export async function handleQualityCheckers(
  request: QualityCheckersRequest,
  root: string,
): Promise<Omit<QualityCheckersResultPayload, "protocolVersion">> {
  await validatedRoot(root);
  return result(
    buildQualityCheckersViewModel({ adapters: QUALITY_CHECKER_ADAPTERS }),
  );
}

export async function handleQualityGraph(
  request: QualityGraphRequest,
  root: string,
): Promise<Omit<QualityGraphResultPayload, "protocolVersion">> {
  const canonicalRoot = await validatedRoot(root);
  const snapshot = await loadQualityGraphSnapshot(
    canonicalRoot,
    nodeFileSystem,
  );
  return result(buildQualityGraphViewModel({ snapshot }));
}
