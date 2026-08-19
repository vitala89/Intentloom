import {
  createExistingProjectAdoptionApproveRequest,
  createExistingProjectAdoptionPrepareRequest,
  createExistingProjectAdoptionRevalidateRequest,
  parseExistingProjectAdoptionApproveViewModel,
  parseExistingProjectAdoptionPrepareViewModel,
  parseExistingProjectAdoptionRevalidateViewModel,
  type ExistingProjectAdoptionApproveViewModel,
  type ExistingProjectAdoptionPreparedPlan,
  type ExistingProjectAdoptionPrepareViewModel,
  type ExistingProjectAdoptionRevalidateViewModel,
  type SelectedAdoptionDecision,
} from "@intentloom/protocol";

type FoundationRequestFn = (
  request: object,
  signal?: AbortSignal,
) => Promise<Record<string, unknown>>;

export function existingProjectAdoptionPreparedPlanDesktopMethods(
  foundationRequest: FoundationRequestFn,
) {
  return {
    async existingProjectAdoptionPrepare(
      root: string,
      previewIdentity: string,
      decisions: readonly SelectedAdoptionDecision[],
      projectId?: string,
      signal?: AbortSignal,
    ): Promise<ExistingProjectAdoptionPrepareViewModel> {
      const request = createExistingProjectAdoptionPrepareRequest(
        "desktop-existing-project-adoption-prepare",
        root,
        previewIdentity,
        decisions,
        projectId,
      );
      const viewmodel = await foundationRequest(request, signal);
      return parseExistingProjectAdoptionPrepareViewModel(viewmodel);
    },
    async existingProjectAdoptionRevalidate(
      root: string,
      preparedPlan: ExistingProjectAdoptionPreparedPlan,
      signal?: AbortSignal,
    ): Promise<ExistingProjectAdoptionRevalidateViewModel> {
      const request = createExistingProjectAdoptionRevalidateRequest(
        "desktop-existing-project-adoption-revalidate",
        root,
        preparedPlan,
      );
      const viewmodel = await foundationRequest(request, signal);
      return parseExistingProjectAdoptionRevalidateViewModel(viewmodel);
    },
    async existingProjectAdoptionApprove(
      root: string,
      preparedPlan: ExistingProjectAdoptionPreparedPlan,
      signal?: AbortSignal,
    ): Promise<ExistingProjectAdoptionApproveViewModel> {
      const request = createExistingProjectAdoptionApproveRequest(
        "desktop-existing-project-adoption-approve",
        root,
        preparedPlan.preparedPlanId,
        preparedPlan.planDigest,
        preparedPlan,
      );
      const viewmodel = await foundationRequest(request, signal);
      return parseExistingProjectAdoptionApproveViewModel(viewmodel);
    },
  };
}
