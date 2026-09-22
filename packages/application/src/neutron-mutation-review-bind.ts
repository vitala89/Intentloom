import type { NeutronRuntimeSession } from "../../protocol/src/neutron-runtime.js";
import type { NeutronMutationReviewOutcome } from "../../protocol/src/neutron-mutation-review-view.js";
import type { NeutronGraphMutationReviewBundle } from "./neutron-graph-mutation-store.js";

export interface NeutronMutationReviewBinding {
  readonly root: string;
  readonly sessionId: string;
  readonly projectId: string;
  readonly graphId?: string;
}

export function bindNeutronMutationReviewSession(input: {
  readonly request: NeutronMutationReviewBinding;
  readonly session: NeutronRuntimeSession | undefined;
}): NeutronMutationReviewOutcome | undefined {
  if (input.session === undefined) return "session-mismatch";
  if (input.session.sessionId !== input.request.sessionId) {
    return "session-mismatch";
  }
  if (input.session.root !== input.request.root) return "root-mismatch";
  if (input.session.projectId !== input.request.projectId) {
    return "project-mismatch";
  }
  return undefined;
}

export function bindNeutronMutationReviewBundle(input: {
  readonly request: NeutronMutationReviewBinding;
  readonly bundle: NeutronGraphMutationReviewBundle;
}): NeutronMutationReviewOutcome | undefined {
  const { request, bundle } = input;
  if (bundle.proposal.sessionId !== request.sessionId)
    return "session-mismatch";
  if (bundle.artifact.sessionId !== request.sessionId)
    return "session-mismatch";
  if (bundle.evidence.sessionId !== request.sessionId)
    return "session-mismatch";
  if (bundle.proposal.projectId !== request.projectId)
    return "project-mismatch";
  if (bundle.artifact.projectId !== request.projectId)
    return "project-mismatch";
  if (bundle.evidence.projectId !== request.projectId)
    return "project-mismatch";
  if (bundle.proposal.root !== request.root) return "root-mismatch";
  if (bundle.artifact.root !== request.root) return "root-mismatch";
  if (bundle.evidence.root !== request.root) return "root-mismatch";
  if (request.graphId !== undefined) {
    if (bundle.evidence.graphId !== request.graphId) return "graph-mismatch";
    if (bundle.proposal.graphId !== request.graphId) return "graph-mismatch";
    if (bundle.artifact.graphId !== request.graphId) return "graph-mismatch";
  }
  return undefined;
}
