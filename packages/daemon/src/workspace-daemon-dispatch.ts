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
import type { ExistingProjectDaemonOptions } from "./existing-project-handlers.js";
import {
  dispatchExistingProjectRequest,
  existingProjectCapabilities,
  isExistingProjectRequest,
} from "./existing-project-handlers.js";
import type { DaemonCapability } from "@intentloom/protocol";

export type WorkspaceDaemonOptions = SpecializedPackDaemonOptions &
  InceptionDaemonOptions &
  FoundationDaemonOptions &
  FoundationScaffoldDaemonOptions &
  ExistingProjectDaemonOptions;

export function workspaceDaemonCapabilities(
  options: WorkspaceDaemonOptions,
): readonly DaemonCapability[] {
  return [
    ...specializedPackCapabilities(options),
    ...inceptionCapabilities(options),
    ...foundationCapabilities(options),
    ...foundationScaffoldCapabilities(options),
    ...existingProjectCapabilities(options),
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
  return false;
}
