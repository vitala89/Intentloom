import type { DaemonCapability } from "@intentloom/protocol";
import type {
  NeutronMutationStatusGetRequest,
  NeutronMutationStatusGetResponse,
  NeutronMutationStatusResult,
} from "@intentloom/protocol";
import {
  NEUTRON_MUTATION_STATUS_GET_METHOD,
  createNeutronMutationStatusGetResponse,
  isNeutronMutationStatusGetMethod,
} from "@intentloom/protocol";
import type { NeutronSessionRuntime } from "../../application/src/neutron/session/neutron-session-runtime.js";

export interface NeutronMutationStatusDaemonOptions {
  readonly neutronMutationStatusGet?: (
    request: NeutronMutationStatusGetRequest,
  ) => Promise<NeutronMutationStatusResult>;
}

export function neutronMutationStatusCapabilities(
  options: NeutronMutationStatusDaemonOptions,
): readonly DaemonCapability[] {
  if (!options.neutronMutationStatusGet) return [];
  return [
    {
      classification: "read-only",
      method: NEUTRON_MUTATION_STATUS_GET_METHOD,
      operation: "neutron.mutation.status.get",
    },
  ];
}

export function bindNeutronMutationStatusHandlers(
  runtime: NeutronSessionRuntime,
): Required<NeutronMutationStatusDaemonOptions> {
  return {
    neutronMutationStatusGet: async (request) =>
      runtime.getNeutronMutationStatus(request.params),
  };
}

export function isNeutronMutationStatusRequest(request: {
  readonly method: string;
}): request is NeutronMutationStatusGetRequest {
  return isNeutronMutationStatusGetMethod(request.method);
}

export async function dispatchNeutronMutationStatusRequest(
  request: NeutronMutationStatusGetRequest,
  options: NeutronMutationStatusDaemonOptions,
  canonicalProjectRoot: (root: string) => Promise<string>,
): Promise<NeutronMutationStatusGetResponse | null> {
  const handler = options.neutronMutationStatusGet;
  if (!handler) return null;
  const root = await canonicalProjectRoot(request.params.root);
  const result = await handler({
    ...request,
    params: { ...request.params, root },
  });
  return createNeutronMutationStatusGetResponse(request.id, result);
}
