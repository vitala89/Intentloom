import { foundationScaffoldDesktopMethods } from "./desktop-client-foundation-scaffold.js";
import { featureIntentDesktopMethods } from "./desktop-client-feature-intent.js";
import { boundedExecutionDesktopMethods } from "./desktop-client-bounded-execution.js";
import { continuousLoopDesktopMethods } from "./desktop-client-continuous-loop.js";
import { existingProjectAdoptionPlanDesktopMethods } from "./desktop-client-adoption-plan.js";
import { existingProjectAdoptionDecisionsDesktopMethods } from "./desktop-client-adoption-decisions.js";
import { existingProjectAdoptionPreparedPlanDesktopMethods } from "./desktop-client-adoption-prepared-plan.js";

interface DesktopClientBase {
  foundationRequest(
    request: object,
    signal?: AbortSignal,
  ): Promise<Record<string, unknown>>;
}

export function composeDesktopClient<TBase extends DesktopClientBase>(
  base: TBase,
) {
  const foundationRequest = (request: object, signal?: AbortSignal) =>
    base.foundationRequest(request, signal);
  return {
    ...base,
    ...foundationScaffoldDesktopMethods(foundationRequest),
    ...featureIntentDesktopMethods(foundationRequest),
    ...boundedExecutionDesktopMethods(foundationRequest),
    ...continuousLoopDesktopMethods(foundationRequest),
    ...existingProjectAdoptionPlanDesktopMethods(foundationRequest),
    ...existingProjectAdoptionDecisionsDesktopMethods(foundationRequest),
    ...existingProjectAdoptionPreparedPlanDesktopMethods(foundationRequest),
  };
}
