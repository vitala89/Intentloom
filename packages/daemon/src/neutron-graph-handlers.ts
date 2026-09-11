import type {
  NeutronGraphCancelRequest,
  NeutronGraphExecuteRequest,
  NeutronGraphGetRequest,
  NeutronSessionCreateResponse,
} from "@intentloom/protocol";
import type { NeutronSessionRuntime } from "../../application/src/neutron-session-runtime.js";

export interface NeutronGraphDaemonOptions {
  readonly neutronGraphGet?: (
    request: NeutronGraphGetRequest,
  ) => Promise<Omit<NeutronSessionCreateResponse["result"], "protocolVersion">>;
  readonly neutronGraphExecute?: (
    request: NeutronGraphExecuteRequest,
  ) => Promise<Omit<NeutronSessionCreateResponse["result"], "protocolVersion">>;
  readonly neutronGraphCancel?: (
    request: NeutronGraphCancelRequest,
  ) => Promise<Omit<NeutronSessionCreateResponse["result"], "protocolVersion">>;
}

export function bindNeutronGraphHandlers(
  runtime: NeutronSessionRuntime,
): Required<NeutronGraphDaemonOptions> {
  return {
    neutronGraphGet: async (request) => ({
      viewmodel: await runtime.getGraph({
        root: request.params.root,
        sessionId: request.params.sessionId,
        projectId: request.params.projectId,
        ...(request.params.graphId === undefined
          ? {}
          : { graphId: request.params.graphId }),
      }),
    }),
    neutronGraphExecute: async (request) => ({
      viewmodel: await runtime.executeGraph({
        root: request.params.root,
        sessionId: request.params.sessionId,
        projectId: request.params.projectId,
        nodes: request.params.nodes,
        ...(request.params.graphId === undefined
          ? {}
          : { graphId: request.params.graphId }),
        ...(request.params.maxConcurrency === undefined
          ? {}
          : { maxConcurrency: request.params.maxConcurrency }),
      }),
    }),
    neutronGraphCancel: async (request) => ({
      viewmodel: await runtime.cancelGraph({
        root: request.params.root,
        sessionId: request.params.sessionId,
        projectId: request.params.projectId,
        ...(request.params.graphId === undefined
          ? {}
          : { graphId: request.params.graphId }),
      }),
    }),
  };
}
