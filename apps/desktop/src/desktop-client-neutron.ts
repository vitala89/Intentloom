import {
  createNeutronGraphCancelRequest,
  createNeutronGraphExecuteRequest,
  createNeutronGraphGetRequest,
  createNeutronSessionCancelRequest,
  createNeutronSessionCreateRequest,
  createNeutronSessionGetRequest,
  createNeutronTurnExecuteRequest,
  type NeutronSessionViewmodelPayload,
  type NeutronTaskNode,
} from "@intentloom/protocol";

type NeutronRequestFn = (
  request: object,
  signal?: AbortSignal,
) => Promise<NeutronSessionViewmodelPayload>;

export function neutronDesktopMethods(neutronRequest: NeutronRequestFn) {
  return {
    async neutronSessionCreate(
      root: string,
      projectId?: string,
      signal?: AbortSignal,
    ): Promise<NeutronSessionViewmodelPayload> {
      return neutronRequest(
        createNeutronSessionCreateRequest(
          "desktop-neutron-create",
          root,
          projectId,
        ),
        signal,
      );
    },

    async neutronSessionGet(
      root: string,
      sessionId: string,
      projectId: string,
      signal?: AbortSignal,
    ): Promise<NeutronSessionViewmodelPayload> {
      return neutronRequest(
        createNeutronSessionGetRequest(
          "desktop-neutron-get",
          root,
          sessionId,
          projectId,
        ),
        signal,
      );
    },

    async neutronSessionCancel(
      root: string,
      sessionId: string,
      projectId: string,
      signal?: AbortSignal,
    ): Promise<NeutronSessionViewmodelPayload> {
      return neutronRequest(
        createNeutronSessionCancelRequest(
          "desktop-neutron-cancel",
          root,
          sessionId,
          projectId,
        ),
        signal,
      );
    },

    async neutronTurnExecute(
      root: string,
      sessionId: string,
      projectId: string,
      prompt: string,
      signal?: AbortSignal,
    ): Promise<NeutronSessionViewmodelPayload> {
      return neutronRequest(
        createNeutronTurnExecuteRequest(
          "desktop-neutron-turn",
          root,
          sessionId,
          projectId,
          prompt,
        ),
        signal,
      );
    },

    async neutronGraphGet(
      root: string,
      sessionId: string,
      projectId: string,
      graphId?: string,
      signal?: AbortSignal,
    ): Promise<NeutronSessionViewmodelPayload> {
      return neutronRequest(
        createNeutronGraphGetRequest(
          "desktop-neutron-graph-get",
          root,
          sessionId,
          projectId,
          graphId,
        ),
        signal,
      );
    },

    async neutronGraphExecute(
      root: string,
      sessionId: string,
      projectId: string,
      nodes: readonly NeutronTaskNode[],
      options: {
        readonly graphId?: string;
        readonly maxConcurrency?: number;
      } = {},
      signal?: AbortSignal,
    ): Promise<NeutronSessionViewmodelPayload> {
      return neutronRequest(
        createNeutronGraphExecuteRequest(
          "desktop-neutron-graph-execute",
          root,
          sessionId,
          projectId,
          nodes,
          options,
        ),
        signal,
      );
    },

    async neutronGraphCancel(
      root: string,
      sessionId: string,
      projectId: string,
      graphId?: string,
      signal?: AbortSignal,
    ): Promise<NeutronSessionViewmodelPayload> {
      return neutronRequest(
        createNeutronGraphCancelRequest(
          "desktop-neutron-graph-cancel",
          root,
          sessionId,
          projectId,
          graphId,
        ),
        signal,
      );
    },
  };
}
