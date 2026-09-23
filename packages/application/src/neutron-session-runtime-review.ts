import type {
  NeutronMutationReviewGetResult,
  NeutronMutationReviewListResult,
} from "../../protocol/src/neutron-mutation-review-view.js";
import type { FileSystem } from "./index.js";
import {
  getStoredNeutronMutationReview,
  listStoredNeutronMutationReviews,
} from "./neutron-session-review.js";
import type { StoredNeutronSession } from "./neutron-session-turn.js";

export function bindNeutronSessionReviewOperations(input: {
  readonly sessions: Map<string, StoredNeutronSession>;
  readonly fs: FileSystem;
  readonly fingerprint: (root: string) => Promise<string>;
  readonly now: () => Date;
}): {
  listMutationReviews(request: {
    readonly root: string;
    readonly sessionId: string;
    readonly projectId: string;
    readonly graphId?: string;
  }): Promise<NeutronMutationReviewListResult>;
  getMutationReview(request: {
    readonly root: string;
    readonly sessionId: string;
    readonly projectId: string;
    readonly proposalId: string;
    readonly graphId?: string;
  }): Promise<NeutronMutationReviewGetResult>;
} {
  return {
    async listMutationReviews(request) {
      const currentProjectFingerprint = await input.fingerprint(request.root);
      return listStoredNeutronMutationReviews({
        currentProjectFingerprint,
        now: input.now().getTime(),
        stored: input.sessions.get(request.sessionId),
        ...request,
      });
    },
    async getMutationReview(request) {
      const currentProjectFingerprint = await input.fingerprint(request.root);
      return getStoredNeutronMutationReview({
        currentProjectFingerprint,
        fs: input.fs,
        now: input.now().getTime(),
        stored: input.sessions.get(request.sessionId),
        ...request,
      });
    },
  };
}
