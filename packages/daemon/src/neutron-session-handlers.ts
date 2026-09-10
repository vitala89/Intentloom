import type { DaemonCapability } from "@intentloom/protocol";
import type {
  NeutronDaemonRequest,
  NeutronSessionCancelRequest,
  NeutronSessionCreateRequest,
  NeutronSessionCreateResponse,
  NeutronSessionGetRequest,
  NeutronTurnExecuteRequest,
  NeutronSessionViewmodelPayload,
} from "@intentloom/protocol";
import {
  NEUTRON_SESSION_CANCEL_METHOD,
  NEUTRON_SESSION_CREATE_METHOD,
  NEUTRON_SESSION_GET_METHOD,
  NEUTRON_TURN_EXECUTE_METHOD,
  createNeutronSessionResponse,
  isNeutronSessionDaemonMethod,
} from "@intentloom/protocol";
import type { NeutronSessionRuntime } from "../../application/src/neutron-session-runtime.js";

export interface NeutronDaemonOptions {
  readonly neutronSessionCreate?: (
    request: NeutronSessionCreateRequest,
  ) => Promise<Omit<NeutronSessionCreateResponse["result"], "protocolVersion">>;
  readonly neutronSessionGet?: (
    request: NeutronSessionGetRequest,
  ) => Promise<Omit<NeutronSessionCreateResponse["result"], "protocolVersion">>;
  readonly neutronSessionCancel?: (
    request: NeutronSessionCancelRequest,
  ) => Promise<Omit<NeutronSessionCreateResponse["result"], "protocolVersion">>;
  readonly neutronTurnExecute?: (
    request: NeutronTurnExecuteRequest,
  ) => Promise<Omit<NeutronSessionCreateResponse["result"], "protocolVersion">>;
}

function enabled(method: string, operation: string): DaemonCapability {
  return { method, operation, classification: "read-only" };
}

export function neutronSessionCapabilities(
  options: NeutronDaemonOptions,
): readonly DaemonCapability[] {
  const capabilities: DaemonCapability[] = [];
  if (options.neutronSessionCreate) {
    capabilities.push(
      enabled(NEUTRON_SESSION_CREATE_METHOD, "neutron.session.create"),
    );
  }
  if (options.neutronSessionGet) {
    capabilities.push(
      enabled(NEUTRON_SESSION_GET_METHOD, "neutron.session.get"),
    );
  }
  if (options.neutronSessionCancel) {
    capabilities.push(
      enabled(NEUTRON_SESSION_CANCEL_METHOD, "neutron.session.cancel"),
    );
  }
  if (options.neutronTurnExecute) {
    capabilities.push(
      enabled(NEUTRON_TURN_EXECUTE_METHOD, "neutron.turn.execute"),
    );
  }
  return capabilities;
}

export function bindNeutronSessionHandlers(
  runtime: NeutronSessionRuntime,
): Required<NeutronDaemonOptions> {
  return {
    neutronSessionCreate: async (request) => ({
      viewmodel: await runtime.create({
        root: request.params.root,
        ...(request.params.projectId !== undefined
          ? { projectId: request.params.projectId }
          : {}),
      }),
    }),
    neutronSessionGet: async (request) => ({
      viewmodel: runtime.get({
        root: request.params.root,
        sessionId: request.params.sessionId,
        projectId: request.params.projectId,
      }),
    }),
    neutronSessionCancel: async (request) => ({
      viewmodel: await runtime.cancel({
        root: request.params.root,
        sessionId: request.params.sessionId,
        projectId: request.params.projectId,
      }),
    }),
    neutronTurnExecute: async (request) => ({
      viewmodel: await runtime.executeTurn({
        root: request.params.root,
        sessionId: request.params.sessionId,
        projectId: request.params.projectId,
        prompt: request.params.prompt,
      }),
    }),
  };
}

export async function dispatchNeutronSessionRequest(
  request: NeutronDaemonRequest,
  options: NeutronDaemonOptions,
  canonicalProjectRoot: (root: string) => Promise<string>,
): Promise<NeutronSessionCreateResponse | null> {
  if (!isNeutronSessionDaemonMethod(request.method)) return null;
  const root = await canonicalProjectRoot(request.params.root);
  const viewmodel = await invokeNeutron(request, options, root);
  if (viewmodel === null) return null;
  return createNeutronSessionResponse(request.id, viewmodel);
}

async function invokeNeutron(
  request: NeutronDaemonRequest,
  options: NeutronDaemonOptions,
  root: string,
): Promise<NeutronSessionViewmodelPayload | null> {
  if (request.method === NEUTRON_SESSION_CREATE_METHOD) {
    const handler = options.neutronSessionCreate;
    if (!handler) return null;
    const payload = await handler({
      ...request,
      params: { ...request.params, root },
    });
    return payload.viewmodel;
  }
  if (request.method === NEUTRON_SESSION_GET_METHOD) {
    const handler = options.neutronSessionGet;
    if (!handler) return null;
    const payload = await handler({
      ...request,
      params: { ...request.params, root },
    });
    return payload.viewmodel;
  }
  if (request.method === NEUTRON_SESSION_CANCEL_METHOD) {
    const handler = options.neutronSessionCancel;
    if (!handler) return null;
    const payload = await handler({
      ...request,
      params: { ...request.params, root },
    });
    return payload.viewmodel;
  }
  const handler = options.neutronTurnExecute;
  if (!handler) return null;
  const payload = await handler({
    ...request,
    params: { ...request.params, root },
  });
  return payload.viewmodel;
}

export function isNeutronSessionRequest(request: {
  readonly method: string;
}): request is NeutronDaemonRequest {
  return isNeutronSessionDaemonMethod(request.method);
}
