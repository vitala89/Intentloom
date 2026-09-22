import type { Socket } from "node:net";
import type { ClientErrorCode, DaemonRequest } from "@intentloom/protocol";
import {
  dispatchNeutronSessionRequest,
  isNeutronSessionRequest,
} from "./neutron-session-handlers.js";
import {
  dispatchNeutronMutationReviewRequest,
  isNeutronMutationReviewRequest,
} from "./neutron-mutation-review-handlers.js";
import type { NeutronDaemonOptions } from "./neutron-session-handlers.js";

export async function dispatchNeutronWorkspaceRequest(
  request: DaemonRequest,
  options: NeutronDaemonOptions,
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
  if (isNeutronMutationReviewRequest(request)) {
    const reviewResponse = await dispatchNeutronMutationReviewRequest(
      request,
      options,
      canonicalProjectRoot,
    );
    if (!reviewResponse) {
      failure(
        socket,
        -32601,
        "unsupported neutron mutation review method",
        "unsupported_capability",
      );
      return true;
    }
    response(socket, reviewResponse);
    return true;
  }
  if (isNeutronSessionRequest(request)) {
    const neutronResponse = await dispatchNeutronSessionRequest(
      request,
      options,
      canonicalProjectRoot,
    );
    if (!neutronResponse) {
      failure(
        socket,
        -32601,
        "unsupported neutron method",
        "unsupported_capability",
      );
      return true;
    }
    response(socket, neutronResponse);
    return true;
  }
  return false;
}
