import {
  createExistingProjectAdoptionPlanRequest,
  parseExistingProjectAdoptionPlanViewModel,
  type ExistingProjectAdoptionPlanViewModel,
} from "@intentloom/protocol";

type FoundationRequestFn = (
  request: object,
  signal?: AbortSignal,
) => Promise<Record<string, unknown>>;

export function existingProjectAdoptionPlanDesktopMethods(
  foundationRequest: FoundationRequestFn,
) {
  return {
    async existingProjectAdoptionPlan(
      root: string,
      projectId?: string,
      signal?: AbortSignal,
    ): Promise<ExistingProjectAdoptionPlanViewModel> {
      const request = createExistingProjectAdoptionPlanRequest(
        "desktop-existing-project-adoption-plan",
        root,
        projectId,
      );
      const viewmodel = await foundationRequest(request, signal);
      return parseExistingProjectAdoptionPlanViewModel(viewmodel);
    },
  };
}
