import {
  createFoundationScaffoldCompareRequest,
  createFoundationScaffoldPrepareRequest,
  createFoundationScaffoldValidateRequest,
  type FoundationViewmodelPayload,
} from "@intentloom/protocol";

type FoundationRequestFn = (
  request: object,
  signal?: AbortSignal,
) => Promise<FoundationViewmodelPayload>;

export function foundationScaffoldDesktopMethods(
  foundationRequest: FoundationRequestFn,
) {
  return {
    async foundationScaffoldPrepare(
      workshopId: string,
      root?: string,
      signal?: AbortSignal,
    ): Promise<FoundationViewmodelPayload> {
      return foundationRequest(
        createFoundationScaffoldPrepareRequest(
          "desktop-foundation-scaffold-prepare",
          workshopId,
          root,
        ),
        signal,
      );
    },

    async foundationScaffoldCompare(
      workshopId: string,
      planId: string,
      existingPaths?: readonly string[],
      signal?: AbortSignal,
    ): Promise<FoundationViewmodelPayload> {
      return foundationRequest(
        createFoundationScaffoldCompareRequest(
          "desktop-foundation-scaffold-compare",
          workshopId,
          planId,
          existingPaths,
        ),
        signal,
      );
    },

    async foundationScaffoldValidate(
      workshopId: string,
      planId: string,
      signal?: AbortSignal,
    ): Promise<FoundationViewmodelPayload> {
      return foundationRequest(
        createFoundationScaffoldValidateRequest(
          "desktop-foundation-scaffold-validate",
          workshopId,
          planId,
        ),
        signal,
      );
    },
  };
}
