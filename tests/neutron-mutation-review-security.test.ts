import { symlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { createMemoryNeutronGraphMutationPayloadStore } from "../packages/application/src/neutron-scheduler.js";
import { getNeutronMutationReview } from "../packages/application/src/neutron-mutation-review-project.js";
import {
  neutronMutationReviewLeakKeys,
  neutronMutationReviewLeaksSecret,
} from "../packages/application/src/neutron-mutation-review-leak.js";
import { fingerprintNeutronProjectRoot } from "../packages/application/src/neutron-session-fingerprint.js";
import { projectNeutronMutationReviewFiles } from "../packages/application/src/neutron-mutation-review-files.js";
import { nodeFileSystem } from "../packages/application/src/index.js";
import { NEUTRON_MUTATION_PROPOSAL_CANDIDATE_SCHEMA_URN } from "../packages/protocol/src/neutron-mutation-proposal-candidate.js";
import {
  REVIEW_GRAPH_ID,
  SLICE5_CONTENT_Z,
  materializeReviewBundle,
  reviewCandidate,
  reviewInputBase,
  reviewProject,
} from "./neutron-mutation-review-support.js";
import { slice5Session } from "./neutron-mutation-slice5-support.js";

describe("Neutron mutation review D1 adversarial controls", () => {
  it("rejects preview, foreign, and mismatched bindings", async () => {
    const root = await reviewProject();
    const other = await reviewProject();
    const fingerprint = await fingerprintNeutronProjectRoot(root);
    const { bundle, store } = materializeReviewBundle({ fingerprint, root });
    const preview = await getNeutronMutationReview({
      ...reviewInputBase({ fingerprint, root }),
      previewProposal: bundle.proposal,
      previewSource: "preview",
      proposalId: bundle.proposal.proposalId,
    });
    expect(preview.outcome).toBe("preview-not-authoritative");
    const otherSession = await getNeutronMutationReview({
      ...reviewInputBase({ fingerprint, root, store }),
      proposalId: bundle.proposal.proposalId,
      request: {
        graphId: REVIEW_GRAPH_ID,
        projectId: slice5Session(root).projectId,
        root,
        sessionId: "session-other",
      },
      session: slice5Session(root),
    });
    expect(otherSession.outcome).toBe("session-mismatch");
    const otherProject = await getNeutronMutationReview({
      ...reviewInputBase({ fingerprint, root, store }),
      proposalId: bundle.proposal.proposalId,
      request: {
        projectId: "project-other",
        root,
        sessionId: slice5Session(root).sessionId,
      },
    });
    expect(otherProject.outcome).toBe("project-mismatch");
    const otherRoot = await getNeutronMutationReview({
      ...reviewInputBase({ fingerprint, root, store }),
      proposalId: bundle.proposal.proposalId,
      request: {
        projectId: slice5Session(root).projectId,
        root: other,
        sessionId: slice5Session(root).sessionId,
      },
    });
    expect(otherRoot.outcome).toBe("root-mismatch");
    const otherGraph = await getNeutronMutationReview({
      ...reviewInputBase({ fingerprint, root, store, graphId: "graph-other" }),
      proposalId: bundle.proposal.proposalId,
    });
    expect(otherGraph.outcome).toBe("graph-mismatch");
  });

  it("fails closed when the host payload no longer matches the review artifact", async () => {
    const root = await reviewProject();
    const fingerprint = await fingerprintNeutronProjectRoot(root);
    const { bundle, store } = materializeReviewBundle({ fingerprint, root });
    const inner = store.get(bundle.proposal.proposalId)!;
    const tampered = createMemoryNeutronGraphMutationPayloadStore();
    tampered.put({
      ...inner,
      files: inner.files.map((file, index) =>
        index === 0 ? { ...file, content: `${file.content}tampered` } : file,
      ),
    });
    const changed = await getNeutronMutationReview({
      ...reviewInputBase({ fingerprint, root, store: tampered }),
      proposalId: bundle.proposal.proposalId,
    });
    expect(changed.outcome).toBe("payload-mismatch");
    expect(changed.review).toBeUndefined();
    const extra = createMemoryNeutronGraphMutationPayloadStore();
    extra.put({
      ...inner,
      files: [
        ...inner.files,
        {
          checksum: "x",
          content: "extra\n",
          path: "src/extra.ts",
          sources: ["test"],
        },
      ],
    });
    expect(
      (
        await getNeutronMutationReview({
          ...reviewInputBase({ fingerprint, root, store: extra }),
          proposalId: bundle.proposal.proposalId,
        })
      ).outcome,
    ).toBe("payload-mismatch");
    const missing = createMemoryNeutronGraphMutationPayloadStore();
    missing.put({ ...inner, files: inner.files.slice(0, 1) });
    expect(
      (
        await getNeutronMutationReview({
          ...reviewInputBase({ fingerprint, root, store: missing }),
          proposalId: bundle.proposal.proposalId,
        })
      ).outcome,
    ).toBe("payload-mismatch");
    const duplicate = createMemoryNeutronGraphMutationPayloadStore();
    duplicate.put({
      ...inner,
      files: [inner.files[0]!, inner.files[0]!, inner.files[1]!],
    });
    expect(
      (
        await getNeutronMutationReview({
          ...reviewInputBase({ fingerprint, root, store: duplicate }),
          proposalId: bundle.proposal.proposalId,
        })
      ).outcome,
    ).toBe("payload-mismatch");
  });

  it("rejects traversal, absolute, symlink-escape, and undeclared client paths", async () => {
    const root = await reviewProject();
    const outside = await reviewProject({ "src/secret.ts": "outside\n" });
    const fingerprint = await fingerprintNeutronProjectRoot(root);
    await symlink(outside, join(root, "escaped-link"));
    const traversal = await projectNeutronMutationReviewFiles({
      files: [
        {
          checksum: "x",
          content: "nope\n",
          path: "../secret.ts",
          sources: ["t"],
        },
      ],
      fs: nodeFileSystem,
      root,
    });
    expect(traversal).toEqual({
      ok: false,
      outcome: "path-security-failed",
    });
    const absolute = await projectNeutronMutationReviewFiles({
      files: [
        {
          checksum: "x",
          content: "nope\n",
          path: join(outside, "src/secret.ts"),
          sources: ["t"],
        },
      ],
      fs: nodeFileSystem,
      root,
    });
    expect(absolute).toEqual({
      ok: false,
      outcome: "path-security-failed",
    });
    const escaped = materializeReviewBundle({
      candidate: reviewCandidate([
        { path: "escaped-link/src/secret.ts", content: "outside\n" },
        { path: "src/z.ts", content: SLICE5_CONTENT_Z },
      ]),
      fingerprint,
      root,
    });
    const escapedGet = await getNeutronMutationReview({
      ...reviewInputBase({ fingerprint, root, store: escaped.store }),
      proposalId: escaped.bundle.proposal.proposalId,
    });
    expect(escapedGet.outcome).toBe("path-security-failed");
    expect(escapedGet.review).toBeUndefined();
  });

  it("omits secret-like bodies and never serializes authority fields", async () => {
    const root = await reviewProject();
    await writeFile(join(root, ".env"), "SECRET=1\n");
    const fingerprint = await fingerprintNeutronProjectRoot(root);
    const { bundle, store } = materializeReviewBundle({
      candidate: {
        schemaVersion: NEUTRON_MUTATION_PROPOSAL_CANDIDATE_SCHEMA_URN,
        files: [
          { path: ".env", content: "SECRET=2\n" },
          { path: "src/z.ts", content: SLICE5_CONTENT_Z },
        ],
      },
      fingerprint,
      root,
    });
    const got = await getNeutronMutationReview({
      ...reviewInputBase({ fingerprint, root, store }),
      proposalId: bundle.proposal.proposalId,
    });
    const env = got.review?.files.find((file) => file.path === ".env");
    expect(env?.status).toBe("secret-path-unavailable");
    expect(env?.proposedContent).toBeUndefined();
    expect(env?.currentContent).toBeUndefined();
    expect(JSON.stringify(got)).not.toContain("SECRET=2");
    expect(JSON.stringify(got)).not.toContain("SECRET=1");
    expect(neutronMutationReviewLeakKeys(got)).toEqual([]);
    expect(neutronMutationReviewLeaksSecret(got, "approved:")).toBe(false);
    expect(JSON.stringify(got)).not.toContain("previousContent");
  });
});
