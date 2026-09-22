import type {
  NeutronMutationReviewGetRequest,
  NeutronMutationReviewGetResult,
  NeutronMutationReviewListRequest,
  NeutronMutationReviewListResult,
} from "@intentloom/protocol";
import {
  NEUTRON_MUTATION_REVIEW_GET_METHOD,
  NEUTRON_MUTATION_REVIEW_LIST_METHOD,
  createNeutronMutationReviewGetResponse,
  createNeutronMutationReviewListResponse,
  isNeutronMutationReviewDaemonMethod,
} from "@intentloom/protocol";
import type { DaemonCapability } from "@intentloom/protocol";
import type { NeutronSessionRuntime } from "../../application/src/neutron-session-runtime.js";

export interface NeutronMutationReviewDaemonOptions {
  readonly neutronMutationReviewList?: (
    request: NeutronMutationReviewListRequest,
  ) => Promise<NeutronMutationReviewListResult>;
  readonly neutronMutationReviewGet?: (
    request: NeutronMutationReviewGetRequest,
  ) => Promise<NeutronMutationReviewGetResult>;
}

export function neutronMutationReviewCapabilities(
  options: NeutronMutationReviewDaemonOptions,
): readonly DaemonCapability[] {
  const capabilities: DaemonCapability[] = [];
  if (options.neutronMutationReviewList) {
    capabilities.push({
      classification: "read-only",
      method: NEUTRON_MUTATION_REVIEW_LIST_METHOD,
      operation: "neutron.mutation.review.list",
    });
  }
  if (options.neutronMutationReviewGet) {
    capabilities.push({
      classification: "read-only",
      method: NEUTRON_MUTATION_REVIEW_GET_METHOD,
      operation: "neutron.mutation.review.get",
    });
  }
  return capabilities;
}

export function bindNeutronMutationReviewHandlers(
  runtime: NeutronSessionRuntime,
): Required<NeutronMutationReviewDaemonOptions> {
  return {
    neutronMutationReviewList: async (request) =>
      runtime.listMutationReviews({
        projectId: request.params.projectId,
        root: request.params.root,
        sessionId: request.params.sessionId,
        ...(request.params.graphId === undefined
          ? {}
          : { graphId: request.params.graphId }),
      }),
    neutronMutationReviewGet: async (request) =>
      runtime.getMutationReview({
        projectId: request.params.projectId,
        proposalId: request.params.proposalId,
        root: request.params.root,
        sessionId: request.params.sessionId,
        ...(request.params.graphId === undefined
          ? {}
          : { graphId: request.params.graphId }),
      }),
  };
}

export function isNeutronMutationReviewRequest(request: {
  readonly method: string;
}): request is
  NeutronMutationReviewListRequest | NeutronMutationReviewGetRequest {
  return isNeutronMutationReviewDaemonMethod(request.method);
}

export async function dispatchNeutronMutationReviewRequest(
  request: NeutronMutationReviewListRequest | NeutronMutationReviewGetRequest,
  options: NeutronMutationReviewDaemonOptions,
  canonicalProjectRoot: (root: string) => Promise<string>,
): Promise<
  | ReturnType<typeof createNeutronMutationReviewListResponse>
  | ReturnType<typeof createNeutronMutationReviewGetResponse>
  | null
> {
  const root = await canonicalProjectRoot(request.params.root);
  if (request.method === NEUTRON_MUTATION_REVIEW_LIST_METHOD) {
    const handler = options.neutronMutationReviewList;
    if (!handler) return null;
    const result = await handler({
      ...request,
      params: { ...request.params, root },
    });
    return createNeutronMutationReviewListResponse(request.id, result);
  }
  const handler = options.neutronMutationReviewGet;
  if (!handler) return null;
  const result = await handler({
    ...request,
    params: { ...request.params, root },
  });
  return createNeutronMutationReviewGetResponse(request.id, result);
}
