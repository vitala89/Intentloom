import type {
  AdoptionDecisionKind,
  ExistingProjectAdoptionDecisionViewModel,
  SelectedAdoptionDecision,
} from "@intentloom/protocol";

export interface AdoptionDecisionClient {
  readonly existingProjectAdoptionDecisions: (
    root: string,
    previewIdentity: string,
    decisions: readonly SelectedAdoptionDecision[],
    projectId?: string,
    signal?: AbortSignal,
  ) => Promise<ExistingProjectAdoptionDecisionViewModel>;
}

export interface AdoptionDecisionLoadResult {
  readonly status: "idle" | "ready" | "stale" | "error" | "disconnected";
  readonly result: ExistingProjectAdoptionDecisionViewModel | null;
  readonly errorMessage: string | null;
  readonly invokedMethods: readonly string[];
  readonly selectedRoot: string | null;
}

function errorCode(error: unknown): string | null {
  if (typeof error !== "object" || error === null) return null;
  if (!("code" in error)) return null;
  return typeof error.code === "string" ? error.code : null;
}

export function selectedDecisionsFromMap(
  selections: ReadonlyMap<string, AdoptionDecisionKind>,
): readonly SelectedAdoptionDecision[] {
  return [...selections.entries()]
    .map(([path, kind]) => ({ path, kind }))
    .sort((left, right) => left.path.localeCompare(right.path));
}

export function clearStaleAdoptionDecisions(
  selectedRoot: string | null,
  previewRoot: string | null,
  previewIdentity: string | null,
  boundIdentity: string | null,
): boolean {
  if (selectedRoot === null || previewRoot === null) return true;
  if (selectedRoot !== previewRoot) return true;
  if (previewIdentity === null) return true;
  if (boundIdentity !== null && boundIdentity !== previewIdentity) return true;
  return false;
}

export async function validateAdoptionDecisions(options: {
  readonly root: string | null;
  readonly previewIdentity: string | null;
  readonly projectId?: string;
  readonly selections: ReadonlyMap<string, AdoptionDecisionKind>;
  readonly client: AdoptionDecisionClient;
  readonly signal?: AbortSignal;
}): Promise<AdoptionDecisionLoadResult> {
  const invokedMethods = ["existingProjectAdoptionDecisions"] as const;
  if (!options.root || !options.previewIdentity) {
    return {
      status: "idle",
      result: null,
      errorMessage: null,
      invokedMethods: [],
      selectedRoot: options.root,
    };
  }
  try {
    const result = await options.client.existingProjectAdoptionDecisions(
      options.root,
      options.previewIdentity,
      selectedDecisionsFromMap(options.selections),
      options.projectId,
      options.signal,
    );
    if (result.applied || result.changesApplied !== 0) {
      return {
        status: "error",
        result: null,
        errorMessage: "Decision validation reported applied changes.",
        invokedMethods,
        selectedRoot: options.root,
      };
    }
    if (result.root !== options.root || result.stalePreview) {
      return {
        status: "stale",
        result,
        errorMessage: "Selected decisions no longer match this preview.",
        invokedMethods,
        selectedRoot: options.root,
      };
    }
    return {
      status: "ready",
      result,
      errorMessage: null,
      invokedMethods,
      selectedRoot: options.root,
    };
  } catch (error: unknown) {
    const code = errorCode(error);
    const message =
      error instanceof Error
        ? error.message
        : "Adoption decision validation failed";
    return {
      status: code === "disconnected" ? "disconnected" : "error",
      result: null,
      errorMessage: message,
      invokedMethods,
      selectedRoot: options.root,
    };
  }
}
