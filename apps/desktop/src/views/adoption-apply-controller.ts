import type {
  ExistingProjectAdoptionApplyViewModel,
  ExistingProjectAdoptionApproval,
  ExistingProjectAdoptionPreparedPlan,
} from "@intentloom/protocol";

export interface AdoptionApplyClient {
  readonly existingProjectAdoptionApply: (
    root: string,
    preparedPlan: ExistingProjectAdoptionPreparedPlan,
    approval: ExistingProjectAdoptionApproval,
    signal?: AbortSignal,
  ) => Promise<ExistingProjectAdoptionApplyViewModel>;
}

function errorCode(error: unknown): string | null {
  if (typeof error !== "object" || error === null) return null;
  if (!("code" in error)) return null;
  return typeof error.code === "string" ? error.code : null;
}

export function canApplyApprovedPlan(
  approval: ExistingProjectAdoptionApproval | null,
  revalidationStatus: string | null,
): boolean {
  return approval !== null && revalidationStatus === "valid";
}

export async function applyApprovedAdoptionPlan(options: {
  readonly root: string | null;
  readonly plan: ExistingProjectAdoptionPreparedPlan | null;
  readonly approval: ExistingProjectAdoptionApproval | null;
  readonly client: AdoptionApplyClient;
  readonly signal?: AbortSignal;
}): Promise<{
  readonly status: "ready" | "error" | "disconnected" | "idle";
  readonly result: ExistingProjectAdoptionApplyViewModel | null;
  readonly errorMessage: string | null;
  readonly invokedMethods: readonly string[];
}> {
  if (!options.root || !options.plan || !options.approval) {
    return {
      status: "idle",
      result: null,
      errorMessage: null,
      invokedMethods: [],
    };
  }
  try {
    const result = await options.client.existingProjectAdoptionApply(
      options.root,
      options.plan,
      options.approval,
      options.signal,
    );
    return {
      status: "ready",
      result,
      errorMessage: null,
      invokedMethods: ["existingProjectAdoptionApply"],
    };
  } catch (error: unknown) {
    return {
      status: errorCode(error) === "disconnected" ? "disconnected" : "error",
      result: null,
      errorMessage: error instanceof Error ? error.message : "Apply failed",
      invokedMethods: ["existingProjectAdoptionApply"],
    };
  }
}

export function applyOutcomeLabel(
  result: ExistingProjectAdoptionApplyViewModel | null,
): string {
  if (!result) return "Not applied";
  if (result.status === "applied" && result.ready) return "Ready";
  if (result.status === "already-applied" && result.ready) {
    return "Already applied";
  }
  if (result.status === "applied-needs-attention") return "Needs attention";
  if (result.status === "rolled-back") return "Rolled back";
  if (result.status === "failed-incomplete") {
    return "Incomplete recovery required";
  }
  if (result.status === "denied") {
    return "Rejected because the plan became stale or expired";
  }
  return result.status;
}
