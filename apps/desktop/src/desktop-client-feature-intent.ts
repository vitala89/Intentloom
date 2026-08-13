import {
  createFeatureIntentWorkspaceAnalyzeRequest,
  createFeatureIntentWorkspacePrepareRequest,
  type FeatureIntentViewmodelPayload,
} from "@intentloom/protocol";

type FoundationRequestFn = (
  request: object,
  signal?: AbortSignal,
) => Promise<FeatureIntentViewmodelPayload>;

export function featureIntentDesktopMethods(
  foundationRequest: FoundationRequestFn,
) {
  return {
    async featureIntentWorkspacePrepare(
      root: string,
      title: string,
      summary: string,
      projectId?: string,
      signal?: AbortSignal,
    ): Promise<FeatureIntentViewmodelPayload> {
      return foundationRequest(
        createFeatureIntentWorkspacePrepareRequest(
          "desktop-feature-intent-prepare",
          root,
          title,
          summary,
          projectId,
        ),
        signal,
      );
    },

    async featureIntentWorkspaceAnalyze(
      root: string,
      title: string,
      summary: string,
      projectId?: string,
      signal?: AbortSignal,
    ): Promise<FeatureIntentViewmodelPayload> {
      return foundationRequest(
        createFeatureIntentWorkspaceAnalyzeRequest(
          "desktop-feature-intent-analyze",
          root,
          title,
          summary,
          projectId,
        ),
        signal,
      );
    },
  };
}
