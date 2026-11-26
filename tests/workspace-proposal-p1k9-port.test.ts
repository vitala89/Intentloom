import { describe, expect, it, vi } from "vitest";
import {
  applyWorkspaceProposalOperation,
  promoteWorkspaceConversationToProposalOperation,
  reviewWorkspaceProposalOperation,
  type WorkspaceProposalAdoption,
} from "../packages/application/src/workspace/workspace-proposal-lifecycle.js";
import {
  applyWorkspaceProposal,
  createMemoryFileSystem,
  initProject,
  promoteWorkspaceConversationToProposal,
  reviewWorkspaceProposal,
  startWorkspaceConversation,
} from "@intentloom/application";
import { inside } from "../packages/application/src/project-path.ts";

const root = "/project/p1k9-port";

const adoptFail: WorkspaceProposalAdoption = async () => {
  throw new Error("adopt failed");
};

function proposalPath(proposalId: string): string {
  return inside(root, `.aif/proposals/${proposalId}.json`);
}

describe("P1K.9 workspace proposal adoption port", () => {
  it("passes exact adoption arguments and preserves filesystem identity", async () => {
    const fs = createMemoryFileSystem();
    await initProject({ root, adapters: ["codex"] }, fs);
    const conv = await startWorkspaceConversation(
      { root, projectId: "proj-port", mode: "plan" },
      fs,
    );

    const calls: {
      options: Parameters<WorkspaceProposalAdoption>[0];
      fs: unknown;
      transactionOptions?: Parameters<WorkspaceProposalAdoption>[2];
    }[] = [];
    const adopt: WorkspaceProposalAdoption = async (options, adoptFs, tx) => {
      calls.push({ options, fs: adoptFs, transactionOptions: tx });
      return {
        kind: "adoption-proposal",
        items: [{ path: ".aif/intentloom.yaml" }],
        applied: false,
        applicationStatus: "not-requested",
        transactionOutcome: null,
      } as Awaited<ReturnType<WorkspaceProposalAdoption>>;
    };

    await promoteWorkspaceConversationToProposalOperation(
      { root, conversationId: conv.id, proposalId: "prop-port" },
      fs,
      adopt,
    );
    expect(calls).toHaveLength(1);
    expect(calls[0]?.fs).toBe(fs);
    expect(calls[0]?.transactionOptions).toBeUndefined();
    expect(calls[0]?.options).toMatchObject({
      root,
      profile: "generic",
      adapters: ["codex"],
      dryRun: true,
    });

    calls.length = 0;
    await reviewWorkspaceProposalOperation(
      { root, proposalId: "prop-missing-port" },
      fs,
      adopt,
    );
    expect(calls).toHaveLength(1);
    expect(calls[0]?.options).toMatchObject({
      root,
      profile: "generic",
      adapters: ["codex"],
      dryRun: true,
    });

    calls.length = 0;
    await applyWorkspaceProposalOperation(
      { root, proposalId: "any", approvedBy: "lead", dryRun: true },
      fs,
      adopt,
    );
    expect(calls[0]?.options).toMatchObject({
      root,
      profile: "generic",
      adapters: ["codex"],
      dryRun: true,
    });

    calls.length = 0;
    await applyWorkspaceProposalOperation(
      { root, proposalId: "any", approvedBy: "lead" },
      fs,
      adopt,
    );
    expect(calls[0]?.options.dryRun).toBe(false);
  });

  it("propagates adoption failures and resolves proposal paths after adoption on promote", async () => {
    const fs = createMemoryFileSystem();
    await initProject({ root, adapters: ["codex"] }, fs);
    const conv = await startWorkspaceConversation(
      { root, projectId: "proj-fail", mode: "plan" },
      fs,
    );
    await expect(
      promoteWorkspaceConversationToProposalOperation(
        { root, conversationId: conv.id, proposalId: "prop-fail" },
        fs,
        adoptFail,
      ),
    ).rejects.toThrow("adopt failed");
    expect(await fs.exists(proposalPath("prop-fail"))).toBe(false);

    let invoked = 0;
    const adoptAfterTraversal: WorkspaceProposalAdoption = async () => {
      invoked += 1;
      return {
        kind: "adoption-proposal",
        items: [],
        applied: false,
        applicationStatus: "not-requested",
        transactionOutcome: null,
      } as Awaited<ReturnType<WorkspaceProposalAdoption>>;
    };
    await expect(
      promoteWorkspaceConversationToProposalOperation(
        { root, conversationId: conv.id, proposalId: "../../../escape" },
        fs,
        adoptAfterTraversal,
      ),
    ).rejects.toThrow(/path traversal/u);
    expect(invoked).toBe(1);
  });

  it("validates review proposal paths before fallback adoption and skips paths on apply", async () => {
    const fs = createMemoryFileSystem();
    await initProject({ root, adapters: ["codex"] }, fs);
    const adopt = vi.fn<WorkspaceProposalAdoption>(async () => {
      return {
        kind: "adoption-proposal",
        items: [{ path: ".aif/intentloom.yaml" }],
        applied: false,
        applicationStatus: "not-requested",
        transactionOutcome: null,
      } as Awaited<ReturnType<WorkspaceProposalAdoption>>;
    });

    await expect(
      reviewWorkspaceProposalOperation(
        { root, proposalId: "../../../escape" },
        fs,
        adopt,
      ),
    ).rejects.toThrow(/path traversal/u);
    expect(adopt).not.toHaveBeenCalled();

    await applyWorkspaceProposalOperation(
      { root, proposalId: "../../../escape", approvedBy: "op" },
      fs,
      adopt,
    );
    expect(adopt).toHaveBeenCalledTimes(1);
  });

  it("keeps public wrappers on the default filesystem with unchanged behavior", async () => {
    const fs = createMemoryFileSystem();
    await initProject({ root, adapters: ["codex"] }, fs);
    const conv = await startWorkspaceConversation(
      { root, projectId: "wrap", mode: "plan" },
      fs,
    );
    const proposal = await promoteWorkspaceConversationToProposal(
      { root, conversationId: conv.id, proposalId: "prop-wrap" },
      fs,
    );
    const review = await reviewWorkspaceProposal(
      { root, proposalId: "prop-wrap" },
      fs,
    );
    const dryApply = await applyWorkspaceProposal(
      { root, proposalId: "prop-wrap", approvedBy: "lead", dryRun: true },
      fs,
    );
    expect(proposal.kind).toBe("adoption-proposal");
    expect(review.proposalId).toBe("prop-wrap");
    expect(dryApply.applied).toBe(false);
  });
});
