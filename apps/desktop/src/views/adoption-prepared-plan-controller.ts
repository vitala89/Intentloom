import type {
  ExistingProjectAdoptionPreparedPlan,
  ExistingProjectAdoptionPrepareViewModel,
  ExistingProjectAdoptionRevalidateViewModel,
  SelectedAdoptionDecision,
} from "@intentloom/protocol";

export interface AdoptionPreparedPlanClient {
  readonly existingProjectAdoptionPrepare: (
    root: string,
    previewIdentity: string,
    decisions: readonly SelectedAdoptionDecision[],
    projectId?: string,
    signal?: AbortSignal,
  ) => Promise<ExistingProjectAdoptionPrepareViewModel>;
  readonly existingProjectAdoptionRevalidate: (
    root: string,
    preparedPlan: ExistingProjectAdoptionPreparedPlan,
    signal?: AbortSignal,
  ) => Promise<ExistingProjectAdoptionRevalidateViewModel>;
}

function errorCode(error: unknown): string | null {
  if (typeof error !== "object" || error === null) return null;
  if (!("code" in error)) return null;
  return typeof error.code === "string" ? error.code : null;
}

export async function prepareAdoptionPlan(options: {
  readonly root: string | null;
  readonly previewIdentity: string | null;
  readonly projectId?: string;
  readonly decisions: readonly SelectedAdoptionDecision[];
  readonly client: AdoptionPreparedPlanClient;
  readonly signal?: AbortSignal;
}): Promise<{
  readonly status: "ready" | "invalid" | "error" | "disconnected" | "idle";
  readonly result: ExistingProjectAdoptionPrepareViewModel | null;
  readonly errorMessage: string | null;
  readonly invokedMethods: readonly string[];
}> {
  if (!options.root || !options.previewIdentity) {
    return {
      status: "idle",
      result: null,
      errorMessage: null,
      invokedMethods: [],
    };
  }
  try {
    const result = await options.client.existingProjectAdoptionPrepare(
      options.root,
      options.previewIdentity,
      options.decisions,
      options.projectId,
      options.signal,
    );
    if (result.applied || result.changesApplied !== 0 || result.approved) {
      return {
        status: "error",
        result: null,
        errorMessage: "Prepared plan reported approval or applied changes.",
        invokedMethods: ["existingProjectAdoptionPrepare"],
      };
    }
    return {
      status: result.status === "prepared" ? "ready" : "invalid",
      result,
      errorMessage: null,
      invokedMethods: ["existingProjectAdoptionPrepare"],
    };
  } catch (error: unknown) {
    return {
      status: errorCode(error) === "disconnected" ? "disconnected" : "error",
      result: null,
      errorMessage:
        error instanceof Error ? error.message : "Prepare plan failed",
      invokedMethods: ["existingProjectAdoptionPrepare"],
    };
  }
}

export async function revalidateAdoptionPlan(options: {
  readonly root: string | null;
  readonly plan: ExistingProjectAdoptionPreparedPlan | null;
  readonly client: AdoptionPreparedPlanClient;
  readonly signal?: AbortSignal;
}): Promise<{
  readonly status: "ready" | "error" | "disconnected" | "idle";
  readonly result: ExistingProjectAdoptionRevalidateViewModel | null;
  readonly errorMessage: string | null;
  readonly invokedMethods: readonly string[];
}> {
  if (!options.root || !options.plan) {
    return {
      status: "idle",
      result: null,
      errorMessage: null,
      invokedMethods: [],
    };
  }
  try {
    const result = await options.client.existingProjectAdoptionRevalidate(
      options.root,
      options.plan,
      options.signal,
    );
    if (result.applied || result.changesApplied !== 0 || result.approved) {
      return {
        status: "error",
        result: null,
        errorMessage: "Revalidation reported approval or applied changes.",
        invokedMethods: ["existingProjectAdoptionRevalidate"],
      };
    }
    return {
      status: "ready",
      result,
      errorMessage: null,
      invokedMethods: ["existingProjectAdoptionRevalidate"],
    };
  } catch (error: unknown) {
    return {
      status: errorCode(error) === "disconnected" ? "disconnected" : "error",
      result: null,
      errorMessage:
        error instanceof Error ? error.message : "Revalidate plan failed",
      invokedMethods: ["existingProjectAdoptionRevalidate"],
    };
  }
}
