import type { ExistingProjectAdoptionPlanViewModel } from "@intentloom/protocol";

export type AdoptionPreviewSurfaceState =
  | "idle"
  | "loading"
  | "ready"
  | "empty"
  | "unsupported"
  | "stale"
  | "disconnected"
  | "authentication-failure"
  | "error";

export interface AdoptionPreviewClient {
  readonly existingProjectAdoptionPlan: (
    root: string,
    projectId?: string,
    signal?: AbortSignal,
  ) => Promise<ExistingProjectAdoptionPlanViewModel>;
}

export interface AdoptionPreviewLoadResult {
  readonly status: AdoptionPreviewSurfaceState;
  readonly plan: ExistingProjectAdoptionPlanViewModel | null;
  readonly errorMessage: string | null;
  readonly invokedMethods: readonly string[];
  readonly selectedRoot: string | null;
}

function errorCode(error: unknown): string | null {
  if (typeof error !== "object" || error === null) return null;
  if (!("code" in error)) return null;
  return typeof error.code === "string" ? error.code : null;
}

function statusForError(error: unknown): AdoptionPreviewSurfaceState {
  const code = errorCode(error);
  if (code === "stale_root") return "stale";
  if (code === "unsupported_capability" || code === "protocol_incompatible") {
    return "unsupported";
  }
  if (code === "authentication_failed") return "authentication-failure";
  if (code === "disconnected") return "disconnected";
  return "error";
}

export async function loadAdoptionPreview(options: {
  readonly root: string | null;
  readonly client: AdoptionPreviewClient;
  readonly projectId?: string;
  readonly signal?: AbortSignal;
}): Promise<AdoptionPreviewLoadResult> {
  const invokedMethods = ["existingProjectAdoptionPlan"] as const;
  if (!options.root) {
    return {
      status: "idle",
      plan: null,
      errorMessage: null,
      invokedMethods: [],
      selectedRoot: null,
    };
  }
  try {
    const plan = await options.client.existingProjectAdoptionPlan(
      options.root,
      options.projectId,
      options.signal,
    );
    const staleRoot = plan.root !== options.root;
    return {
      status: staleRoot ? "stale" : plan.items.length === 0 ? "empty" : "ready",
      plan,
      errorMessage: staleRoot
        ? "The preview root does not match the selected project."
        : null,
      invokedMethods,
      selectedRoot: options.root,
    };
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Adoption preview failed";
    return {
      status: statusForError(error),
      plan: null,
      errorMessage: message,
      invokedMethods,
      selectedRoot: options.root,
    };
  }
}
