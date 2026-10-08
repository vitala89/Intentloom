import type {
  ExternalQualityPackActivationApproval,
  ExternalSpecializedPackApplyViewModel,
  ExternalSpecializedPackPreviewViewModel,
} from "@intentloom/protocol";
import type { ExternalSpecializedPackPreviewInput } from "./specialized-pack-external-preview-types.js";
import {
  isExternalSpecializedPackReviewStale,
  type ExternalSpecializedPackReviewSnapshot,
} from "./specialized-pack-external-input-staleness.js";

export type ExternalSpecializedPackActivationSurfaceState =
  | "idle"
  | "approved"
  | "applying"
  | "applied"
  | "already-applied"
  | "conflict"
  | "denied"
  | "activation-failed"
  | "disconnected"
  | "cancelled"
  | "stale-root";

export interface ExternalSpecializedPackActivateClient {
  readonly specializedPacksExternalActivate: (
    root: string,
    params: {
      readonly payload: string;
      readonly source: ExternalSpecializedPackPreviewViewModel["source"];
      readonly declaredPublisher: string;
      readonly declaredLicense: string;
      readonly approval: ExternalQualityPackActivationApproval;
    },
    signal?: AbortSignal,
  ) => Promise<ExternalSpecializedPackApplyViewModel>;
}

function errorCode(error: unknown): string | null {
  if (typeof error !== "object" || error === null) return null;
  if (!("code" in error)) return null;
  return typeof error.code === "string" ? error.code : null;
}

function activationStateForApplyResult(
  result: ExternalSpecializedPackApplyViewModel,
): ExternalSpecializedPackActivationSurfaceState {
  switch (result.status) {
    case "applied":
      return "applied";
    case "already-applied":
      return "already-applied";
    case "conflict":
      return "conflict";
    case "denied":
      return "denied";
    case "failed":
      return "activation-failed";
  }
}

export function canApproveExternalSpecializedPack(options: {
  readonly root: string | null;
  readonly previewStatus: string;
  readonly preview: ExternalSpecializedPackPreviewViewModel | null;
  readonly snapshot: ExternalSpecializedPackReviewSnapshot | null;
  readonly input: ExternalSpecializedPackPreviewInput;
  readonly activationState: ExternalSpecializedPackActivationSurfaceState;
  readonly daemonConnected: boolean;
}): boolean {
  if (!options.root || !options.preview || !options.snapshot) return false;
  if (options.previewStatus !== "ready-for-review") return false;
  if (options.preview.status !== "ready-for-review") return false;
  if (options.activationState === "applying") return false;
  if (!options.daemonConnected) return false;
  return !isExternalSpecializedPackReviewStale({
    snapshot: options.snapshot,
    root: options.root,
    input: options.input,
  });
}

export function canActivateExternalSpecializedPack(options: {
  readonly root: string | null;
  readonly previewStatus: string;
  readonly preview: ExternalSpecializedPackPreviewViewModel | null;
  readonly snapshot: ExternalSpecializedPackReviewSnapshot | null;
  readonly input: ExternalSpecializedPackPreviewInput;
  readonly approval: ExternalQualityPackActivationApproval | null;
  readonly activationState: ExternalSpecializedPackActivationSurfaceState;
  readonly daemonConnected: boolean;
}): boolean {
  if (!canApproveExternalSpecializedPack(options)) return false;
  if (!options.approval) return false;
  if (options.activationState !== "approved") return false;
  return true;
}

export function externalSpecializedPackActivationStatusLabel(
  state: ExternalSpecializedPackActivationSurfaceState,
): string {
  switch (state) {
    case "idle":
      return "Not approved";
    case "approved":
      return "Approved for activation";
    case "applying":
      return "Activating";
    case "applied":
      return "Applied";
    case "already-applied":
      return "Already applied";
    case "conflict":
      return "Conflict";
    case "denied":
      return "Denied";
    case "activation-failed":
      return "Activation failed";
    case "disconnected":
      return "Daemon unavailable";
    case "cancelled":
      return "Cancelled";
    case "stale-root":
      return "Project root changed";
  }
}

export interface ExternalSpecializedPackActivateLoadResult {
  readonly status: ExternalSpecializedPackActivationSurfaceState;
  readonly result: ExternalSpecializedPackApplyViewModel | null;
  readonly errorMessage: string | null;
  readonly activationRoot: string | null;
  readonly invokedMethods: readonly string[];
}

export async function activateExternalSpecializedPackFromApproval(options: {
  readonly root: string | null;
  readonly input: ExternalSpecializedPackPreviewInput;
  readonly preview: ExternalSpecializedPackPreviewViewModel | null;
  readonly approval: ExternalQualityPackActivationApproval | null;
  readonly client: ExternalSpecializedPackActivateClient;
  readonly signal?: AbortSignal;
  readonly requestRoot?: string | null;
}): Promise<ExternalSpecializedPackActivateLoadResult> {
  const invokedMethods = ["specializedPacksExternalActivate"] as const;
  if (!options.root || !options.preview || !options.approval) {
    return {
      status: "idle",
      result: null,
      errorMessage: null,
      activationRoot: null,
      invokedMethods: [],
    };
  }
  const requestRoot = options.requestRoot ?? options.root;
  try {
    const result = await options.client.specializedPacksExternalActivate(
      requestRoot,
      {
        payload: options.input.manifestJson,
        source: options.preview.source,
        declaredPublisher: options.input.declaredPublisher,
        declaredLicense: options.input.declaredLicense,
        approval: options.approval,
      },
      options.signal,
    );
    if (options.root !== requestRoot) {
      return {
        status: "stale-root",
        result: null,
        errorMessage:
          "The activation response arrived after the project root changed.",
        activationRoot: requestRoot,
        invokedMethods,
      };
    }
    return {
      status: activationStateForApplyResult(result),
      result,
      errorMessage: null,
      activationRoot: requestRoot,
      invokedMethods,
    };
  } catch (error: unknown) {
    if (options.root !== requestRoot) {
      return {
        status: "stale-root",
        result: null,
        errorMessage:
          "The activation response arrived after the project root changed.",
        activationRoot: requestRoot,
        invokedMethods,
      };
    }
    const code = errorCode(error);
    return {
      status:
        code === "cancelled"
          ? "cancelled"
          : code === "disconnected"
            ? "disconnected"
            : "activation-failed",
      result: null,
      errorMessage:
        error instanceof Error
          ? error.message
          : "External pack activation failed",
      activationRoot: requestRoot,
      invokedMethods,
    };
  }
}
