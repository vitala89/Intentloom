import type {
  NeutronMutationReviewGetResult,
  NeutronMutationReviewListResult,
} from "../../protocol/src/neutron-mutation-review-view.js";
import type { FileSystem } from "./index.js";
import {
  getNeutronMutationReview,
  listNeutronMutationReviews,
} from "./neutron-mutation-review-project.js";
import type { StoredNeutronSession } from "./neutron-session-turn.js";

export async function listStoredNeutronMutationReviews(input: {
  readonly stored: StoredNeutronSession | undefined;
  readonly root: string;
  readonly sessionId: string;
  readonly projectId: string;
  readonly graphId?: string;
  readonly currentProjectFingerprint: string;
  readonly now: number;
}): Promise<NeutronMutationReviewListResult> {
  return listNeutronMutationReviews({
    ...reviewProjectionInput(input),
    fs: unusedFs(),
  });
}

export async function getStoredNeutronMutationReview(input: {
  readonly stored: StoredNeutronSession | undefined;
  readonly root: string;
  readonly sessionId: string;
  readonly projectId: string;
  readonly proposalId: string;
  readonly graphId?: string;
  readonly currentProjectFingerprint: string;
  readonly now: number;
  readonly fs: FileSystem;
}): Promise<NeutronMutationReviewGetResult> {
  return getNeutronMutationReview({
    ...reviewProjectionInput(input),
    fs: input.fs,
    proposalId: input.proposalId,
  });
}

function reviewProjectionInput(input: {
  readonly stored: StoredNeutronSession | undefined;
  readonly root: string;
  readonly sessionId: string;
  readonly projectId: string;
  readonly graphId?: string;
  readonly currentProjectFingerprint: string;
  readonly now: number;
}) {
  return {
    currentProjectFingerprint: input.currentProjectFingerprint,
    now: input.now,
    previewProposal: input.stored?.mutationProposal ?? null,
    previewSource: input.stored?.mutationProposalSource ?? null,
    request: {
      projectId: input.projectId,
      root: input.root,
      sessionId: input.sessionId,
      ...(input.graphId === undefined ? {} : { graphId: input.graphId }),
    },
    session: input.stored?.session,
    store: input.stored?.mutationPayloadStore,
  };
}

function unusedFs(): FileSystem {
  return {
    exists: async () => false,
    isSymbolicLink: async () => false,
    list: async () => [],
    mkdir: async () => undefined,
    read: async () => "",
    realpath: async (path) => path,
    remove: async () => undefined,
    write: async () => undefined,
  };
}
