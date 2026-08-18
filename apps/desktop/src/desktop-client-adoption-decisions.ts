import {
  createExistingProjectAdoptionDecisionsRequest,
  parseExistingProjectAdoptionDecisionViewModel,
  type ExistingProjectAdoptionDecisionViewModel,
  type SelectedAdoptionDecision,
} from "@intentloom/protocol";

type FoundationRequestFn = (
  request: object,
  signal?: AbortSignal,
) => Promise<Record<string, unknown>>;

export function existingProjectAdoptionDecisionsDesktopMethods(
  foundationRequest: FoundationRequestFn,
) {
  return {
    async existingProjectAdoptionDecisions(
      root: string,
      previewIdentity: string,
      decisions: readonly SelectedAdoptionDecision[],
      projectId?: string,
      signal?: AbortSignal,
    ): Promise<ExistingProjectAdoptionDecisionViewModel> {
      const request = createExistingProjectAdoptionDecisionsRequest(
        "desktop-existing-project-adoption-decisions",
        root,
        previewIdentity,
        decisions,
        projectId,
      );
      const viewmodel = await foundationRequest(request, signal);
      return parseExistingProjectAdoptionDecisionViewModel(viewmodel);
    },
  };
}
