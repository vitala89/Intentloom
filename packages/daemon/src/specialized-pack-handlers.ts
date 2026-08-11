import { isAbsolute } from "node:path";
import {
  assertCanonicalProjectRoot,
  buildSpecializedPackCatalogViewModel,
  buildSpecializedPackChecksViewModel,
  buildSpecializedPackDetectionViewModel,
  getFirstPartySpecializedPackEntries,
  nodeFileSystem,
  ProjectRootError,
  resolveFirstPartySpecializedPackChecks,
  resolveFirstPartySpecializedPackDetection,
  validateFirstPartySpecializedPackCatalog,
} from "@intentloom/application";
import type {
  DaemonCapability,
  SpecializedPackViewmodelPayload,
  SpecializedPacksCatalogRequest,
  SpecializedPacksCatalogResultPayload,
  SpecializedPacksDetectRequest,
  SpecializedPacksDetectResultPayload,
  SpecializedPacksChecksRequest,
  SpecializedPacksChecksResultPayload,
} from "@intentloom/protocol";
import {
  SPECIALIZED_PACKS_CATALOG_METHOD,
  SPECIALIZED_PACKS_CHECKS_METHOD,
  SPECIALIZED_PACKS_DETECT_METHOD,
  createSpecializedPacksCatalogResponse,
  createSpecializedPacksChecksResponse,
  createSpecializedPacksDetectResponse,
} from "@intentloom/protocol";

export interface SpecializedPackDaemonOptions {
  readonly specializedPacksCatalog?: (
    request: SpecializedPacksCatalogRequest,
  ) => Promise<Omit<SpecializedPacksCatalogResultPayload, "protocolVersion">>;
  readonly specializedPacksDetect?: (
    request: SpecializedPacksDetectRequest,
  ) => Promise<Omit<SpecializedPacksDetectResultPayload, "protocolVersion">>;
  readonly specializedPacksChecks?: (
    request: SpecializedPacksChecksRequest,
  ) => Promise<Omit<SpecializedPacksChecksResultPayload, "protocolVersion">>;
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
  readonly viewmodel: SpecializedPackViewmodelPayload;
} {
  return { viewmodel: viewmodel as SpecializedPackViewmodelPayload };
}

function enabledCapability(
  method: string,
  operation: string,
): DaemonCapability {
  return { method, operation, classification: "read-only" };
}

export function specializedPackCapabilities(
  options: SpecializedPackDaemonOptions,
): readonly DaemonCapability[] {
  return [
    options.specializedPacksCatalog
      ? enabledCapability(
          SPECIALIZED_PACKS_CATALOG_METHOD,
          "specialized-packs.catalog",
        )
      : undefined,
    options.specializedPacksDetect
      ? enabledCapability(
          SPECIALIZED_PACKS_DETECT_METHOD,
          "specialized-packs.detect",
        )
      : undefined,
    options.specializedPacksChecks
      ? enabledCapability(
          SPECIALIZED_PACKS_CHECKS_METHOD,
          "specialized-packs.checks",
        )
      : undefined,
  ].filter((entry): entry is DaemonCapability => entry !== undefined);
}

type SpecializedPackRequest =
  | SpecializedPacksCatalogRequest
  | SpecializedPacksDetectRequest
  | SpecializedPacksChecksRequest;

export function isSpecializedPackRequest(
  request: object,
): request is SpecializedPackRequest {
  return (
    "method" in request &&
    (request.method === SPECIALIZED_PACKS_CATALOG_METHOD ||
      request.method === SPECIALIZED_PACKS_DETECT_METHOD ||
      request.method === SPECIALIZED_PACKS_CHECKS_METHOD)
  );
}

export async function dispatchSpecializedPackRequest(
  request: SpecializedPackRequest,
  options: SpecializedPackDaemonOptions & {
    readonly enforceCanonicalRoots?: boolean;
  },
  canonicalProjectRoot: (root: string) => Promise<string>,
): Promise<object | undefined> {
  const root = options.enforceCanonicalRoots
    ? await canonicalProjectRoot(request.params.root)
    : request.params.root;
  if (
    request.method === SPECIALIZED_PACKS_CATALOG_METHOD &&
    options.specializedPacksCatalog
  ) {
    return createSpecializedPacksCatalogResponse(
      request.id,
      await options.specializedPacksCatalog({
        ...request,
        params: { ...request.params, root },
      }),
    );
  }
  if (
    request.method === SPECIALIZED_PACKS_DETECT_METHOD &&
    options.specializedPacksDetect
  ) {
    return createSpecializedPacksDetectResponse(
      request.id,
      await options.specializedPacksDetect({
        ...request,
        params: { ...request.params, root },
      }),
    );
  }
  if (
    request.method === SPECIALIZED_PACKS_CHECKS_METHOD &&
    options.specializedPacksChecks
  ) {
    return createSpecializedPacksChecksResponse(
      request.id,
      await options.specializedPacksChecks({
        ...request,
        params: { ...request.params, root },
      }),
    );
  }
  return undefined;
}

export async function handleSpecializedPacksCatalog(
  _request: SpecializedPacksCatalogRequest,
  root: string,
): Promise<Omit<SpecializedPacksCatalogResultPayload, "protocolVersion">> {
  await validatedRoot(root);
  const catalog = validateFirstPartySpecializedPackCatalog(
    getFirstPartySpecializedPackEntries(),
  );
  return result(buildSpecializedPackCatalogViewModel(catalog.entries));
}

export async function handleSpecializedPacksDetect(
  _request: SpecializedPacksDetectRequest,
  root: string,
): Promise<Omit<SpecializedPacksDetectResultPayload, "protocolVersion">> {
  const canonicalRoot = await validatedRoot(root);
  const projectPaths = (await nodeFileSystem.list(canonicalRoot)).slice(
    0,
    5000,
  );
  const resolution = resolveFirstPartySpecializedPackDetection({
    projectPaths,
    entries: getFirstPartySpecializedPackEntries(),
  });
  return result(buildSpecializedPackDetectionViewModel(resolution));
}

export async function handleSpecializedPacksChecks(
  _request: SpecializedPacksChecksRequest,
  root: string,
): Promise<Omit<SpecializedPacksChecksResultPayload, "protocolVersion">> {
  const canonicalRoot = await validatedRoot(root);
  const projectPaths = (await nodeFileSystem.list(canonicalRoot)).slice(
    0,
    5000,
  );
  const report = resolveFirstPartySpecializedPackChecks({
    projectPaths,
    entries: getFirstPartySpecializedPackEntries(),
  });
  return result(buildSpecializedPackChecksViewModel(report));
}
