import {
  createExistingProjectAdoptionApplyRequest,
  parseExistingProjectAdoptionApplyViewModel,
  type ExistingProjectAdoptionApplyViewModel,
  type ExistingProjectAdoptionApproval,
  type ExistingProjectAdoptionPreparedPlan,
} from "@intentloom/protocol";

type FoundationRequestFn = (
  request: object,
  signal?: AbortSignal,
) => Promise<Record<string, unknown>>;

export function existingProjectAdoptionApplyDesktopMethods(
  foundationRequest: FoundationRequestFn,
) {
  return {
    async existingProjectAdoptionApply(
      root: string,
      preparedPlan: ExistingProjectAdoptionPreparedPlan,
      approval: ExistingProjectAdoptionApproval,
      signal?: AbortSignal,
    ): Promise<ExistingProjectAdoptionApplyViewModel> {
      const request = createExistingProjectAdoptionApplyRequest(
        "desktop-existing-project-adoption-apply",
        root,
        preparedPlan.preparedPlanId,
        preparedPlan.planDigest,
        preparedPlan,
        approval,
      );
      const viewmodel = await foundationRequest(request, signal);
      return parseExistingProjectAdoptionApplyViewModel(viewmodel);
    },
  };
}
