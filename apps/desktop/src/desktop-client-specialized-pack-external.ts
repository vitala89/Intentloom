import {
  createSpecializedPacksExternalPreviewRequest,
  parseExternalSpecializedPackPreviewViewModel,
  type ExternalQualityPackSource,
  type ExternalQualityPackSourceKind,
  type ExternalSpecializedPackPreviewViewModel,
} from "@intentloom/protocol";
import { invoke } from "@tauri-apps/api/core";
import { DesktopBridgeError } from "./desktop-client.js";

async function specializedPackPreviewCall<T>(
  request: object,
  signal?: AbortSignal,
): Promise<T> {
  if (signal?.aborted) {
    throw new DesktopBridgeError("Operation cancelled", "cancelled");
  }

  let abortReject!: (error: DesktopBridgeError) => void;
  const abortPromise = new Promise<never>((_, reject) => {
    abortReject = reject;
  });
  const onAbort = () =>
    abortReject(new DesktopBridgeError("Operation cancelled", "cancelled"));
  if (signal) signal.addEventListener("abort", onAbort, { once: true });

  try {
    return await Promise.race([
      invoke<{ result?: { viewmodel?: unknown } }>(
        "invoke_specialized_pack_preview_request",
        { request },
      )
        .then((response) => response as T)
        .catch((error: unknown) => {
          if (typeof error === "object" && error !== null) {
            const record = error as { code?: unknown; message?: unknown };
            if (typeof record.message === "string") {
              throw new DesktopBridgeError(
                record.message,
                typeof record.code === "string"
                  ? record.code
                  : "native_bridge_unavailable",
              );
            }
          }
          const message =
            error instanceof Error ? error.message : String(error);
          throw new DesktopBridgeError(message);
        }),
      abortPromise,
    ]);
  } finally {
    if (signal) signal.removeEventListener("abort", onAbort);
  }
}

export function specializedPackExternalDesktopMethods() {
  return {
    async specializedPacksExternalPreview(
      root: string,
      params: {
        readonly payload: string;
        readonly source: ExternalQualityPackSource;
        readonly declaredPublisher: string;
        readonly declaredLicense: string;
      },
      signal?: AbortSignal,
    ): Promise<ExternalSpecializedPackPreviewViewModel> {
      const request = createSpecializedPacksExternalPreviewRequest(
        "desktop-specialized-pack-external-preview",
        root,
        params,
      );
      const response = await specializedPackPreviewCall<{
        result?: { viewmodel?: unknown };
      }>(request, signal);
      const viewmodel = response.result?.viewmodel;
      if (typeof viewmodel !== "object" || viewmodel === null) {
        throw new DesktopBridgeError(
          "Specialized pack preview response did not include a viewmodel",
          "bounded_validation_failed",
        );
      }
      return parseExternalSpecializedPackPreviewViewModel(viewmodel);
    },
  };
}

export const EXTERNAL_QUALITY_PACK_SOURCE_KINDS: readonly ExternalQualityPackSourceKind[] =
  [
    "local",
    "git",
    "package",
    "organization-registry",
    "documentation-snapshot",
  ];
