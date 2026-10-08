import type {
  ExternalQualityPackSource,
  ExternalSpecializedPackPreviewViewModel,
} from "@intentloom/protocol";
import type {
  ExternalSpecializedPackPreviewInput,
  ExternalSpecializedPackPreviewSurfaceState,
} from "./specialized-pack-external-preview-types.js";

const BIDI_CONTROLS = /[\u061C\u200E\u200F\u202A-\u202E\u2066-\u2069]/gu;
const MAX_VISIBLE = 512;

function stripControlCharacters(value: string): string {
  let output = "";
  for (const character of value) {
    const code = character.codePointAt(0) ?? 0;
    if (code <= 0x1f || (code >= 0x7f && code <= 0x9f)) continue;
    output += character;
  }
  return output;
}

export function sanitizeUntrustedDisplayText(
  value: string,
  maximum = MAX_VISIBLE,
): string {
  const normalized = value.normalize("NFC");
  const stripped = stripControlCharacters(normalized)
    .replace(BIDI_CONTROLS, "")
    .replace(/\s+/gu, " ")
    .trim();
  if (stripped.length <= maximum) return stripped;
  return `${stripped.slice(0, maximum)}…`;
}

export function formatCodeLikeValue(value: string): string {
  return sanitizeUntrustedDisplayText(value, 256);
}

export interface ExternalSpecializedPackPreviewClient {
  readonly specializedPacksExternalPreview: (
    root: string,
    params: {
      readonly payload: string;
      readonly source: ExternalQualityPackSource;
      readonly declaredPublisher: string;
      readonly declaredLicense: string;
    },
    signal?: AbortSignal,
  ) => Promise<ExternalSpecializedPackPreviewViewModel>;
}

function errorCode(error: unknown): string | null {
  if (typeof error !== "object" || error === null) return null;
  if (!("code" in error)) return null;
  return typeof error.code === "string" ? error.code : null;
}

function statusForError(
  error: unknown,
): ExternalSpecializedPackPreviewSurfaceState {
  const code = errorCode(error);
  if (code === "cancelled") return "cancelled";
  if (code === "disconnected") return "disconnected";
  return "error";
}

function buildSource(
  input: ExternalSpecializedPackPreviewInput,
): ExternalQualityPackSource {
  return {
    kind: input.sourceKind as ExternalQualityPackSource["kind"],
    locator: input.sourceLocator,
    pin: input.sourcePin,
    digest: input.sourceDigest,
  };
}

export interface ExternalSpecializedPackPreviewLoadResult {
  readonly status: ExternalSpecializedPackPreviewSurfaceState;
  readonly preview: ExternalSpecializedPackPreviewViewModel | null;
  readonly errorMessage: string | null;
  readonly previewRoot: string | null;
  readonly invokedMethods: readonly string[];
}

export async function loadExternalSpecializedPackPreview(options: {
  readonly root: string | null;
  readonly input: ExternalSpecializedPackPreviewInput;
  readonly client: ExternalSpecializedPackPreviewClient;
  readonly signal?: AbortSignal;
  readonly requestRoot?: string | null;
}): Promise<ExternalSpecializedPackPreviewLoadResult> {
  const invokedMethods = ["specializedPacksExternalPreview"] as const;
  if (!options.root) {
    return {
      status: "idle",
      preview: null,
      errorMessage: null,
      previewRoot: null,
      invokedMethods: [],
    };
  }
  if (!options.input.manifestJson.trim()) {
    return {
      status: "error",
      preview: null,
      errorMessage: "Manifest JSON is required.",
      previewRoot: options.root,
      invokedMethods: [],
    };
  }
  const requestRoot = options.requestRoot ?? options.root;
  try {
    const preview = await options.client.specializedPacksExternalPreview(
      requestRoot,
      {
        payload: options.input.manifestJson,
        source: buildSource(options.input),
        declaredPublisher: options.input.declaredPublisher,
        declaredLicense: options.input.declaredLicense,
      },
      options.signal,
    );
    if (options.root !== requestRoot) {
      return {
        status: "stale-root",
        preview: null,
        errorMessage:
          "The preview response arrived after the project root changed.",
        previewRoot: requestRoot,
        invokedMethods,
      };
    }
    return {
      status:
        preview.status === "ready-for-review" ? "ready-for-review" : "rejected",
      preview,
      errorMessage: null,
      previewRoot: requestRoot,
      invokedMethods,
    };
  } catch (error: unknown) {
    if (options.root !== requestRoot) {
      return {
        status: "stale-root",
        preview: null,
        errorMessage:
          "The preview response arrived after the project root changed.",
        previewRoot: requestRoot,
        invokedMethods,
      };
    }
    return {
      status: statusForError(error),
      preview: null,
      errorMessage:
        error instanceof Error ? error.message : "External pack preview failed",
      previewRoot: requestRoot,
      invokedMethods,
    };
  }
}

export function renderExternalSpecializedPackPreviewFields(
  preview: ExternalSpecializedPackPreviewViewModel,
): ReadonlyArray<{
  readonly label: string;
  readonly value: string;
  readonly code?: boolean;
}> {
  return [
    {
      label: "Pack ID declared by manifest",
      value: sanitizeUntrustedDisplayText(preview.packId),
    },
    {
      label: "Name declared by manifest",
      value: sanitizeUntrustedDisplayText(preview.name),
    },
    {
      label: "Version declared by manifest",
      value: sanitizeUntrustedDisplayText(preview.version),
    },
    {
      label: "Publisher declared by manifest",
      value: sanitizeUntrustedDisplayText(preview.publisher),
    },
    {
      label: "License declared for review",
      value: sanitizeUntrustedDisplayText(preview.declaredLicense),
    },
    {
      label: "Source kind",
      value: sanitizeUntrustedDisplayText(preview.source.kind),
    },
    {
      label: "Source locator",
      value: sanitizeUntrustedDisplayText(preview.source.locator),
    },
    {
      label: "Exact pin",
      value: formatCodeLikeValue(preview.source.pin),
      code: true,
    },
    {
      label: "Canonical digest",
      value: formatCodeLikeValue(preview.digest),
      code: true,
    },
    {
      label: "Trust level",
      value: sanitizeUntrustedDisplayText(preview.trustLevel),
    },
    {
      label: "Compatibility",
      value: preview.compatible ? "compatible" : "not compatible",
    },
    {
      label: "Extension plan status",
      value: sanitizeUntrustedDisplayText(preview.extensionPlanStatus),
    },
  ];
}

export const EXTERNAL_SPECIALIZED_PACK_APPROVE_ACTION_ID =
  "approve-external-specialized-pack" as const;
export const EXTERNAL_SPECIALIZED_PACK_ACTIVATE_ACTION_ID =
  "activate-external-specialized-pack" as const;
