import { isAbsolute } from "node:path";
import {
  activateExternalSpecializedPack,
  applyExternalSpecializedPackActivation,
  assertCanonicalProjectRoot,
  buildExternalSpecializedPackApplyViewModel,
  buildExternalSpecializedPackPreviewViewModel,
  nodeFileSystem,
  previewExternalSpecializedPack,
  ProjectRootError,
  withCanonicalProjectRootLock,
} from "@intentloom/application";
import type {
  DaemonCapability,
  SpecializedPacksExternalActivateRequest,
  SpecializedPacksExternalPreviewRequest,
} from "@intentloom/protocol";
import {
  SPECIALIZED_PACKS_EXTERNAL_ACTIVATE_METHOD,
  SPECIALIZED_PACKS_EXTERNAL_PREVIEW_METHOD,
  createSpecializedPacksExternalActivateResponse,
  createSpecializedPacksExternalPreviewResponse,
} from "@intentloom/protocol";

export interface SpecializedPackExternalDaemonOptions {
  readonly specializedPacksExternalPreview?: (
    request: SpecializedPacksExternalPreviewRequest,
  ) => Promise<Record<string, unknown>>;
  readonly specializedPacksExternalActivate?: (
    request: SpecializedPacksExternalActivateRequest,
  ) => Promise<Record<string, unknown>>;
}

async function validatedRoot(root: string): Promise<string> {
  if (!isAbsolute(root)) {
    throw new ProjectRootError(
      "invalid_root",
      "project root must be an absolute path",
    );
  }
  return assertCanonicalProjectRoot(root, nodeFileSystem);
}

function enabledCapability(
  method: string,
  operation: string,
  classification: DaemonCapability["classification"],
): DaemonCapability {
  return { method, operation, classification };
}

export function specializedPackExternalCapabilities(
  options: SpecializedPackExternalDaemonOptions,
): readonly DaemonCapability[] {
  return [
    options.specializedPacksExternalPreview
      ? enabledCapability(
          SPECIALIZED_PACKS_EXTERNAL_PREVIEW_METHOD,
          "specialized-packs.external.preview",
          "read-only",
        )
      : undefined,
    options.specializedPacksExternalActivate
      ? enabledCapability(
          SPECIALIZED_PACKS_EXTERNAL_ACTIVATE_METHOD,
          "specialized-packs.external.activate",
          "mutating",
        )
      : undefined,
  ].filter((entry): entry is DaemonCapability => entry !== undefined);
}

type SpecializedPackExternalRequest =
  | SpecializedPacksExternalPreviewRequest
  | SpecializedPacksExternalActivateRequest;

export function isSpecializedPackExternalRequest(
  request: object,
): request is SpecializedPackExternalRequest {
  return (
    "method" in request &&
    (request.method === SPECIALIZED_PACKS_EXTERNAL_PREVIEW_METHOD ||
      request.method === SPECIALIZED_PACKS_EXTERNAL_ACTIVATE_METHOD)
  );
}

export async function dispatchSpecializedPackExternalRequest(
  request: SpecializedPackExternalRequest,
  options: SpecializedPackExternalDaemonOptions & {
    readonly enforceCanonicalRoots?: boolean;
  },
  canonicalProjectRoot: (root: string) => Promise<string>,
): Promise<object | undefined> {
  const root = options.enforceCanonicalRoots
    ? await canonicalProjectRoot(request.params.root)
    : request.params.root;
  if (
    request.method === SPECIALIZED_PACKS_EXTERNAL_PREVIEW_METHOD &&
    options.specializedPacksExternalPreview
  ) {
    return createSpecializedPacksExternalPreviewResponse(
      request.id,
      await options.specializedPacksExternalPreview({
        ...request,
        params: { ...request.params, root },
      }),
    );
  }
  if (
    request.method === SPECIALIZED_PACKS_EXTERNAL_ACTIVATE_METHOD &&
    options.specializedPacksExternalActivate
  ) {
    return createSpecializedPacksExternalActivateResponse(
      request.id,
      await options.specializedPacksExternalActivate({
        ...request,
        params: { ...request.params, root },
      }),
    );
  }
  return undefined;
}

export async function handleSpecializedPacksExternalPreview(
  request: SpecializedPacksExternalPreviewRequest,
  root: string,
): Promise<Record<string, unknown>> {
  await validatedRoot(root);
  const preview = previewExternalSpecializedPack({
    payload: request.params.payload,
    source: request.params.source,
    declaredPublisher: request.params.declaredPublisher,
    declaredLicense: request.params.declaredLicense,
  });
  return buildExternalSpecializedPackPreviewViewModel(
    preview,
  ) as unknown as Record<string, unknown>;
}

export async function handleSpecializedPacksExternalActivate(
  request: SpecializedPacksExternalActivateRequest,
  root: string,
): Promise<Record<string, unknown>> {
  const canonicalRoot = await validatedRoot(root);
  return withCanonicalProjectRootLock(canonicalRoot, async () => {
    let packId = "unknown";
    let digest = request.params.source.digest;
    let pin = request.params.source.pin;
    try {
      const preview = previewExternalSpecializedPack({
        payload: request.params.payload,
        source: request.params.source,
        declaredPublisher: request.params.declaredPublisher,
        declaredLicense: request.params.declaredLicense,
      });
      packId = preview.manifest.id;
      digest = preview.digest;
      pin = preview.source.pin;
      const activation = activateExternalSpecializedPack(
        preview,
        request.params.approval,
      );
      const result = await applyExternalSpecializedPackActivation(
        {
          root: canonicalRoot,
          activation,
          approval: request.params.approval,
          declaredLicense: request.params.declaredLicense,
        },
        nodeFileSystem,
      );
      return buildExternalSpecializedPackApplyViewModel(
        result,
      ) as unknown as Record<string, unknown>;
    } catch (error) {
      return buildExternalSpecializedPackApplyViewModel({
        status: "denied",
        projectRoot: canonicalRoot,
        extensionId: packId,
        digest,
        pin,
        changedPaths: [],
        writes: 0,
        diagnostics: [error instanceof Error ? error.message : String(error)],
        rollbackAttempted: false,
        rollbackCompleted: true,
        rollbackFailures: [],
      }) as unknown as Record<string, unknown>;
    }
  });
}
