import type { Socket } from "node:net";
import type { ClientErrorCode, DaemonRequest } from "@intentloom/protocol";
import type { InceptionDaemonOptions } from "./inception-handlers.js";
import {
  dispatchInceptionRequest,
  inceptionCapabilities,
  isInceptionRequest,
} from "./inception-handlers.js";
import type { FoundationDaemonOptions } from "./foundation-handlers.js";
import {
  dispatchFoundationRequest,
  foundationCapabilities,
  isFoundationRequest,
} from "./foundation-handlers.js";
import type { FoundationScaffoldDaemonOptions } from "./foundation-scaffold-handlers.js";
import {
  dispatchFoundationScaffoldRequest,
  foundationScaffoldCapabilities,
  isFoundationScaffoldRequest,
} from "./foundation-scaffold-handlers.js";
import type { SpecializedPackDaemonOptions } from "./specialized-pack-handlers.js";
import {
  dispatchSpecializedPackRequest,
  isSpecializedPackRequest,
  specializedPackCapabilities,
} from "./specialized-pack-handlers.js";
import type { SpecializedPackExternalDaemonOptions } from "./specialized-pack-external-handlers.js";
import {
  dispatchSpecializedPackExternalRequest,
  isSpecializedPackExternalRequest,
  specializedPackExternalCapabilities,
} from "./specialized-pack-external-handlers.js";
import type { ExistingProjectDaemonOptions } from "./existing-project-handlers.js";
import {
  dispatchExistingProjectRequest,
  existingProjectCapabilities,
  isExistingProjectRequest,
} from "./existing-project-handlers.js";
import type { FeatureIntentDaemonOptions } from "./feature-intent-handlers.js";
import {
  dispatchFeatureIntentRequest,
  featureIntentCapabilities,
  isFeatureIntentRequest,
} from "./feature-intent-handlers.js";
import type { BoundedExecutionDaemonOptions } from "./bounded-execution-handlers.js";
import {
  boundedExecutionCapabilities,
  dispatchBoundedExecutionRequest,
  isBoundedExecutionRequest,
} from "./bounded-execution-handlers.js";
import type { ContinuousLoopDaemonOptions } from "./continuous-loop-handlers.js";
import {
  continuousLoopCapabilities,
  dispatchContinuousLoopRequest,
  isContinuousLoopRequest,
} from "./continuous-loop-handlers.js";
import type { DaemonCapability } from "@intentloom/protocol";

export type WorkspaceDaemonOptions = SpecializedPackDaemonOptions &
  SpecializedPackExternalDaemonOptions &
  InceptionDaemonOptions &
  FoundationDaemonOptions &
  FoundationScaffoldDaemonOptions &
  ExistingProjectDaemonOptions &
  FeatureIntentDaemonOptions &
  BoundedExecutionDaemonOptions &
  ContinuousLoopDaemonOptions;

export function workspaceDaemonCapabilities(
  options: WorkspaceDaemonOptions,
): readonly DaemonCapability[] {
  return [
    ...specializedPackCapabilities(options),
    ...specializedPackExternalCapabilities(options),
    ...inceptionCapabilities(options),
    ...foundationCapabilities(options),
    ...foundationScaffoldCapabilities(options),
    ...existingProjectCapabilities(options),
    ...featureIntentCapabilities(options),
    ...boundedExecutionCapabilities(options),
    ...continuousLoopCapabilities(options),
  ];
}

export async function dispatchWorkspaceDaemonRequest(
  request: DaemonRequest,
  options: WorkspaceDaemonOptions,
  canonicalProjectRoot: (root: string) => Promise<string>,
  response: (socket: Socket, value: object) => void,
  failure: (
    socket: Socket,
    code: -32600 | -32601 | -32602,
    message: string,
    clientErrorCode?: ClientErrorCode,
  ) => void,
  socket: Socket,
): Promise<boolean> {
  if (isSpecializedPackExternalRequest(request)) {
    const externalResponse = await dispatchSpecializedPackExternalRequest(
      request,
      options,
      canonicalProjectRoot,
    );
    if (!externalResponse) {
      failure(
        socket,
        -32601,
        "unsupported specialized pack external method",
        "unsupported_capability",
      );
      return true;
    }
    response(socket, externalResponse);
    return true;
  }
  if (isSpecializedPackRequest(request)) {
    const specializedResponse = await dispatchSpecializedPackRequest(
      request,
      options,
      canonicalProjectRoot,
    );
    if (!specializedResponse) {
      failure(
        socket,
        -32601,
        "unsupported specialized pack method",
        "unsupported_capability",
      );
      return true;
    }
    response(socket, specializedResponse);
    return true;
  }
  if (isInceptionRequest(request)) {
    const inceptionResponse = await dispatchInceptionRequest(request, options);
    if (!inceptionResponse) {
      failure(
        socket,
        -32601,
        "unsupported inception method",
        "unsupported_capability",
      );
      return true;
    }
    response(socket, inceptionResponse);
    return true;
  }
  if (isFoundationRequest(request)) {
    const foundationResponse = await dispatchFoundationRequest(
      request,
      options,
    );
    if (!foundationResponse) {
      failure(
        socket,
        -32601,
        "unsupported foundation method",
        "unsupported_capability",
      );
      return true;
    }
    response(socket, foundationResponse);
    return true;
  }
  if (isFoundationScaffoldRequest(request)) {
    const scaffoldResponse = await dispatchFoundationScaffoldRequest(
      request,
      options,
    );
    if (!scaffoldResponse) {
      failure(
        socket,
        -32601,
        "unsupported foundation scaffold method",
        "unsupported_capability",
      );
      return true;
    }
    response(socket, scaffoldResponse);
    return true;
  }
  if (isExistingProjectRequest(request)) {
    const existingProjectResponse = await dispatchExistingProjectRequest(
      request,
      options,
      canonicalProjectRoot,
    );
    if (!existingProjectResponse) {
      failure(
        socket,
        -32601,
        "unsupported existing project method",
        "unsupported_capability",
      );
      return true;
    }
    response(socket, existingProjectResponse);
    return true;
  }
  if (isFeatureIntentRequest(request)) {
    const featureIntentResponse = await dispatchFeatureIntentRequest(
      request,
      options,
      canonicalProjectRoot,
    );
    if (!featureIntentResponse) {
      failure(
        socket,
        -32601,
        "unsupported feature intent method",
        "unsupported_capability",
      );
      return true;
    }
    response(socket, featureIntentResponse);
    return true;
  }
  if (isBoundedExecutionRequest(request)) {
    const boundedExecutionResponse = await dispatchBoundedExecutionRequest(
      request,
      options,
      canonicalProjectRoot,
    );
    if (!boundedExecutionResponse) {
      failure(
        socket,
        -32601,
        "unsupported bounded execution method",
        "unsupported_capability",
      );
      return true;
    }
    response(socket, boundedExecutionResponse);
    return true;
  }
  if (isContinuousLoopRequest(request)) {
    const continuousLoopResponse = await dispatchContinuousLoopRequest(
      request,
      options,
      canonicalProjectRoot,
    );
    if (!continuousLoopResponse) {
      failure(
        socket,
        -32601,
        "unsupported continuous loop method",
        "unsupported_capability",
      );
      return true;
    }
    response(socket, continuousLoopResponse);
    return true;
  }
  return false;
}
