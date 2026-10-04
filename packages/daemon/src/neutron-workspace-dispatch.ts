import type { Socket } from "node:net";
import type { ClientErrorCode, DaemonRequest } from "@intentloom/protocol";
import {
  dispatchNeutronSessionRequest,
  isNeutronSessionRequest,
  type NeutronDaemonOptions,
} from "./neutron-session-handlers.js";
import {
  dispatchNeutronMutationReviewRequest,
  isNeutronMutationReviewRequest,
} from "./neutron-mutation-review-handlers.js";
import {
  dispatchNeutronMutationApproveAndApplyRequest,
  isNeutronMutationApproveAndApplyRequest,
} from "./neutron-mutation-approve-apply-handlers.js";
import {
  dispatchNeutronMutationStatusRequest,
  isNeutronMutationStatusRequest,
} from "./neutron-mutation-status-handlers.js";
import {
  dispatchNeutronMutationVerificationRetryRequest,
  isNeutronMutationVerificationRetryRequest,
} from "./neutron-mutation-verification-retry-handlers.js";
import { resolveDaemonProjectRoot } from "./daemon-canonical-root.js";

export async function dispatchNeutronWorkspaceRequest(
  request: DaemonRequest,
  options: NeutronDaemonOptions & {
    readonly enforceCanonicalRoots?: boolean;
  },
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
  const resolveRoot = (root: string) =>
    resolveDaemonProjectRoot(
      root,
      options.enforceCanonicalRoots,
      canonicalProjectRoot,
    );
  if (isNeutronMutationVerificationRetryRequest(request)) {
    const retryResponse = await dispatchNeutronMutationVerificationRetryRequest(
      request,
      options,
      resolveRoot,
    );
    if (!retryResponse) {
      failure(
        socket,
        -32601,
        "unsupported neutron mutation verification retry method",
        "unsupported_capability",
      );
      return true;
    }
    response(socket, retryResponse);
    return true;
  }
  if (isNeutronMutationStatusRequest(request)) {
    const statusResponse = await dispatchNeutronMutationStatusRequest(
      request,
      options,
      resolveRoot,
    );
    if (!statusResponse) {
      failure(
        socket,
        -32601,
        "unsupported neutron mutation status method",
        "unsupported_capability",
      );
      return true;
    }
    response(socket, statusResponse);
    return true;
  }
  if (isNeutronMutationApproveAndApplyRequest(request)) {
    const applyResponse = await dispatchNeutronMutationApproveAndApplyRequest(
      request,
      options,
      resolveRoot,
    );
    if (!applyResponse) {
      failure(
        socket,
        -32601,
        "unsupported neutron mutation approve-and-apply method",
        "unsupported_capability",
      );
      return true;
    }
    response(socket, applyResponse);
    return true;
  }
  if (isNeutronMutationReviewRequest(request)) {
    const reviewResponse = await dispatchNeutronMutationReviewRequest(
      request,
      options,
      resolveRoot,
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
      resolveRoot,
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
