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
import type { SpecializedPackDaemonOptions } from "./specialized-pack-handlers.js";
import {
  dispatchSpecializedPackRequest,
  isSpecializedPackRequest,
  specializedPackCapabilities,
} from "./specialized-pack-handlers.js";
import type { DaemonCapability } from "@intentloom/protocol";

export type WorkspaceDaemonOptions = SpecializedPackDaemonOptions &
  InceptionDaemonOptions &
  FoundationDaemonOptions;

export function workspaceDaemonCapabilities(
  options: WorkspaceDaemonOptions,
): readonly DaemonCapability[] {
  return [
    ...specializedPackCapabilities(options),
    ...inceptionCapabilities(options),
    ...foundationCapabilities(options),
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
  return false;
}
