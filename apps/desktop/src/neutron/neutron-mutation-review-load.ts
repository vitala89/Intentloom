import type {
  NeutronMutationReviewGetResult,
  NeutronMutationReviewListResult,
} from "@intentloom/protocol";
import {
  applyListedReviews,
  applyLoadedReview,
  failMutationReviewGet,
  failMutationReviewList,
  proposalIdToFetch,
  type NeutronMutationReviewPort,
  type NeutronMutationReviewScope,
  type NeutronMutationReviewUiState,
} from "./neutron-mutation-review-state.js";

export async function requestMutationReviewList(
  port: NeutronMutationReviewPort,
  scope: NeutronMutationReviewScope,
  signal?: AbortSignal,
): Promise<NeutronMutationReviewListResult> {
  return port.listNeutronMutationReviews(
    scope.root,
    scope.sessionId,
    scope.projectId,
    scope.graphId,
    signal,
  );
}

export async function requestMutationReviewGet(
  port: NeutronMutationReviewPort,
  scope: NeutronMutationReviewScope,
  proposalId: string,
  signal?: AbortSignal,
): Promise<NeutronMutationReviewGetResult> {
  return port.getNeutronMutationReview(
    scope.root,
    scope.sessionId,
    scope.projectId,
    proposalId,
    scope.graphId,
    signal,
  );
}

export async function orchestrateMutationReviewLoad(input: {
  readonly port: NeutronMutationReviewPort;
  readonly scope: NeutronMutationReviewScope;
  readonly previous: NeutronMutationReviewUiState;
  readonly signal?: AbortSignal;
}): Promise<NeutronMutationReviewUiState> {
  let listed: NeutronMutationReviewListResult;
  try {
    listed = await requestMutationReviewList(
      input.port,
      input.scope,
      input.signal,
    );
  } catch {
    if (input.signal?.aborted) return input.previous;
    return failMutationReviewList(input.previous);
  }
  if (input.signal?.aborted) return input.previous;
  const afterList = applyListedReviews(input.previous, listed);
  const proposalId = proposalIdToFetch(afterList);
  if (proposalId === null) return afterList;
  return loadSelectedReview({
    port: input.port,
    scope: input.scope,
    state: afterList,
    proposalId,
    ...(input.signal === undefined ? {} : { signal: input.signal }),
  });
}

export async function loadSelectedReview(input: {
  readonly port: NeutronMutationReviewPort;
  readonly scope: NeutronMutationReviewScope;
  readonly state: NeutronMutationReviewUiState;
  readonly proposalId: string;
  readonly signal?: AbortSignal;
}): Promise<NeutronMutationReviewUiState> {
  try {
    const result = await requestMutationReviewGet(
      input.port,
      input.scope,
      input.proposalId,
      input.signal,
    );
    if (input.signal?.aborted) return input.state;
    return applyLoadedReview(
      input.state,
      input.scope,
      input.proposalId,
      result,
    );
  } catch {
    if (input.signal?.aborted) return input.state;
    return failMutationReviewGet(input.state, input.proposalId);
  }
}
