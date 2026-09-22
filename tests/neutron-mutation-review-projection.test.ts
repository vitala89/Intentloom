import { describe, expect, it } from "vitest";
import { createMemoryNeutronGraphMutationPayloadStore } from "../packages/application/src/neutron-scheduler.js";
import {
  getNeutronMutationReview,
  listNeutronMutationReviews,
} from "../packages/application/src/neutron-mutation-review-project.js";
import { neutronMutationReviewLeakKeys } from "../packages/application/src/neutron-mutation-review-leak.js";
import { fingerprintNeutronProjectRoot } from "../packages/application/src/neutron-session-fingerprint.js";
import { digestGeneratedFileContent } from "../packages/validator/src/neutron-mutation.js";
import { NEUTRON_READ_ONLY_TOOLS } from "../packages/protocol/src/neutron-runtime.js";
import {
  REVIEW_GRAPH_ID,
  SLICE5_CONTENT_A,
  SLICE5_CONTENT_Z,
  materializeReviewBundle,
  reviewCandidate,
  reviewInputBase,
  reviewProject,
} from "./neutron-mutation-review-support.js";
import { slice5Session } from "./neutron-mutation-slice5-support.js";

describe("Neutron mutation review D1 projection", () => {
  it("returns exact host-held proposed bytes and classifies current files", async () => {
    const root = await reviewProject({
      "src/z.ts": SLICE5_CONTENT_Z,
    });
    const fingerprint = await fingerprintNeutronProjectRoot(root);
    const { bundle, store } = materializeReviewBundle({
      fingerprint,
      root,
    });
    const listed = listNeutronMutationReviews(
      reviewInputBase({ fingerprint, root, store, graphId: REVIEW_GRAPH_ID }),
    );
    expect(listed.outcome).toBe("ok");
    expect(listed.reviews).toHaveLength(1);
    expect(listed.reviews[0]?.proposalId).toBe(bundle.proposal.proposalId);
    const got = await getNeutronMutationReview({
      ...reviewInputBase({
        fingerprint,
        root,
        store,
        graphId: REVIEW_GRAPH_ID,
      }),
      proposalId: bundle.proposal.proposalId,
    });
    expect(got.outcome).toBe("ok");
    const files = got.review?.files ?? [];
    const created = files.find((file) => file.path === "src/a.ts");
    const unchanged = files.find((file) => file.path === "src/z.ts");
    expect(created?.operation).toBe("create");
    expect(created?.proposedContent).toBe(SLICE5_CONTENT_A);
    expect(created?.proposedContent).toBe(
      bundle.files.find((file) => file.path === "src/a.ts")?.content,
    );
    expect(created?.proposedContentDigest).toBe(
      digestGeneratedFileContent(SLICE5_CONTENT_A),
    );
    expect(unchanged?.operation).toBe("unchanged");
    expect(unchanged?.currentContent).toBe(SLICE5_CONTENT_Z);
    expect(got.review?.proposalDigest).toBe(bundle.proposal.proposalDigest);
    expect(got.review?.reviewArtifactDigest).toBe(
      bundle.artifact.artifactDigest,
    );
    expect(got.review?.currentness).toBe("current");
    expect(neutronMutationReviewLeakKeys(got)).toEqual([]);
  });

  it("classifies an existing differing file as update", async () => {
    const root = await reviewProject({
      "src/a.ts": "old a\n",
      "src/z.ts": SLICE5_CONTENT_Z,
    });
    const fingerprint = await fingerprintNeutronProjectRoot(root);
    const { bundle, store } = materializeReviewBundle({ fingerprint, root });
    const got = await getNeutronMutationReview({
      ...reviewInputBase({ fingerprint, root, store }),
      proposalId: bundle.proposal.proposalId,
    });
    expect(
      got.review?.files.find((file) => file.path === "src/a.ts")?.operation,
    ).toBe("update");
  });

  it("reports stale currentness without rebasing digests or files", async () => {
    const root = await reviewProject();
    const fingerprint = await fingerprintNeutronProjectRoot(root);
    const { bundle, store } = materializeReviewBundle({ fingerprint, root });
    const before = {
      proposalDigest: bundle.proposal.proposalDigest,
      reviewArtifactDigest: bundle.artifact.artifactDigest,
      projectStateDigest: bundle.proposal.plan.projectStateDigest,
      files: bundle.files.map((file) => file.content),
    };
    const got = await getNeutronMutationReview({
      ...reviewInputBase({
        fingerprint: `${fingerprint}ff`,
        root,
        store,
      }),
      proposalId: bundle.proposal.proposalId,
    });
    expect(got.review?.currentness).toBe("stale");
    expect(got.review?.proposalDigest).toBe(before.proposalDigest);
    expect(got.review?.reviewArtifactDigest).toBe(before.reviewArtifactDigest);
    expect(got.review?.projectStateDigest).toBe(before.projectStateDigest);
    expect(got.review?.files.map((file) => file.proposedContent)).toEqual(
      before.files,
    );
    expect(store.get(bundle.proposal.proposalId)?.files).toEqual(bundle.files);
  });

  it("lists multiple proposals and requires an explicit proposalId", async () => {
    const root = await reviewProject();
    const fingerprint = await fingerprintNeutronProjectRoot(root);
    const store = createMemoryNeutronGraphMutationPayloadStore();
    const first = materializeReviewBundle({
      fingerprint,
      root,
      store,
      taskId: "task-a",
    });
    const second = materializeReviewBundle({
      candidate: reviewCandidate([
        { path: "src/a.ts", content: "export const a = 9;\n" },
        { path: "src/z.ts", content: SLICE5_CONTENT_Z },
      ]),
      fingerprint,
      root,
      store,
      taskId: "task-b",
    });
    const listed = listNeutronMutationReviews(
      reviewInputBase({ fingerprint, root, store }),
    );
    expect(listed.reviews.map((item) => item.proposalId)).toEqual([
      first.bundle.proposal.proposalId,
      second.bundle.proposal.proposalId,
    ]);
    const missing = await getNeutronMutationReview({
      ...reviewInputBase({ fingerprint, root, store }),
      proposalId: "not-a-proposal",
    });
    expect(missing.outcome).toBe("proposal-not-found");
    expect(missing.review).toBeUndefined();
  });

  it("does not reconstruct a missing payload store", async () => {
    const root = await reviewProject();
    const fingerprint = await fingerprintNeutronProjectRoot(root);
    const { bundle } = materializeReviewBundle({ fingerprint, root });
    const missing = await getNeutronMutationReview({
      ...reviewInputBase({ fingerprint, root }),
      previewProposal: bundle.proposal,
      previewSource: "preview",
      proposalId: bundle.proposal.proposalId,
    });
    expect(missing.outcome).toBe("preview-not-authoritative");
    const unavailable = await getNeutronMutationReview({
      ...reviewInputBase({ fingerprint, root }),
      proposalId: bundle.proposal.proposalId,
    });
    expect(unavailable.outcome).toBe("review-unavailable");
    expect(NEUTRON_READ_ONLY_TOOLS).toHaveLength(7);
    expect(slice5Session(root).mutationAllowed).toBe(false);
  });

  it("leaves the project fingerprint unchanged after review", async () => {
    const root = await reviewProject();
    const fingerprint = await fingerprintNeutronProjectRoot(root);
    const { bundle, store } = materializeReviewBundle({ fingerprint, root });
    await getNeutronMutationReview({
      ...reviewInputBase({ fingerprint, root, store }),
      proposalId: bundle.proposal.proposalId,
    });
    expect(await fingerprintNeutronProjectRoot(root)).toBe(fingerprint);
  });
});
