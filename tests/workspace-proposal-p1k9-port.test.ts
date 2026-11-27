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
import type { AdoptionProposal } from "../packages/application/src/project-adoption/generated-file-adoption-contracts.js";
import { inside } from "../packages/application/src/project-path.ts";

const root = "/project/p1k9-port";

const dryRunAdoptOptions = {
  root,
  profile: "generic" as const,
  adapters: ["codex"] as const,
  dryRun: true,
};

const adoptFailError = new Error("adopt failed");
const adoptFail: WorkspaceProposalAdoption = async () => {
  throw adoptFailError;
};

function proposalPath(proposalId: string): string {
  return inside(root, `.aif/proposals/${proposalId}.json`);
}

function minimalAdoptionProposal(
  items: AdoptionProposal["items"] = [
    { path: ".aif/intentloom.yaml" } as AdoptionProposal["items"][number],
  ],
): AdoptionProposal {
  return {
    kind: "adoption-proposal",
    items,
    applied: false,
    applicationStatus: "not-requested",
    transactionOutcome: null,
  } as AdoptionProposal;
}

function trackAdoption(
  proposal: AdoptionProposal = minimalAdoptionProposal(),
): {
  adopt: WorkspaceProposalAdoption;
  calls: {
    options: Parameters<WorkspaceProposalAdoption>[0];
    fs: unknown;
    argc: number;
    transactionOptions?: Parameters<WorkspaceProposalAdoption>[2];
  }[];
} {
  const calls: {
    options: Parameters<WorkspaceProposalAdoption>[0];
    fs: unknown;
    argc: number;
    transactionOptions?: Parameters<WorkspaceProposalAdoption>[2];
  }[] = [];
  const adopt: WorkspaceProposalAdoption = async (options, adoptFs, tx) => {
    calls.push({
      options,
      fs: adoptFs,
      argc: tx === undefined ? 2 : 3,
      transactionOptions: tx,
    });
    return proposal;
  };
  return { adopt, calls };
}

describe("P1K.9 workspace proposal adoption port", () => {
  it("passes exact two-argument adoption calls for promote, review fallback, and apply", async () => {
    const fs = createMemoryFileSystem();
    await initProject({ root, adapters: ["codex"] }, fs);
    const conv = await startWorkspaceConversation(
      { root, projectId: "proj-port", mode: "plan" },
      fs,
    );
    const { adopt, calls } = trackAdoption();

    await promoteWorkspaceConversationToProposalOperation(
      { root, conversationId: conv.id, proposalId: "prop-port" },
      fs,
      adopt,
    );
    expect(calls).toHaveLength(1);
    expect(calls[0]?.fs).toBe(fs);
    expect(calls[0]?.argc).toBe(2);
    expect(calls[0]?.transactionOptions).toBeUndefined();
    expect(calls[0]?.options).toEqual({
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
    expect(calls[0]?.options).toEqual({
      root,
      profile: "generic",
      adapters: ["codex"],
      dryRun: true,
    });
    expect(calls[0]?.argc).toBe(2);

    calls.length = 0;
    await applyWorkspaceProposalOperation(
      { root, proposalId: "any", approvedBy: "lead", dryRun: true },
      fs,
      adopt,
    );
    expect(calls).toHaveLength(1);
    expect(calls[0]?.options).toEqual({
      root,
      profile: "generic",
      adapters: ["codex"],
      dryRun: true,
    });

    calls.length = 0;
    await applyWorkspaceProposalOperation(
      { root, proposalId: "any", approvedBy: "lead", dryRun: false },
      fs,
      adopt,
    );
    expect(calls[0]?.options).toEqual({
      root,
      profile: "generic",
      adapters: ["codex"],
      dryRun: false,
    });

    calls.length = 0;
    await applyWorkspaceProposalOperation(
      { root, proposalId: "any", approvedBy: "lead" },
      fs,
      adopt,
    );
    expect(calls[0]?.options).toEqual({
      root,
      profile: "generic",
      adapters: ["codex"],
      dryRun: false,
    });
    expect(calls).toHaveLength(1);
  });

  it("does not invoke adoption when reviewing a stored proposal", async () => {
    const fs = createMemoryFileSystem();
    await initProject({ root, adapters: ["codex"] }, fs);
    const stored = minimalAdoptionProposal();
    await fs.write(
      proposalPath("prop-stored"),
      `${JSON.stringify(stored, null, 2)}\n`,
    );
    const adopt = vi.fn<WorkspaceProposalAdoption>(async () => stored);
    const review = await reviewWorkspaceProposalOperation(
      { root, proposalId: "prop-stored" },
      fs,
      adopt,
    );
    expect(adopt).not.toHaveBeenCalled();
    expect(review.affectedPaths).toEqual(stored.items.map((i) => i.path));
  });

  it("propagates the same adoption error from promote, review fallback, and apply", async () => {
    const fs = createMemoryFileSystem();
    await initProject({ root, adapters: ["codex"] }, fs);
    const conv = await startWorkspaceConversation(
      { root, projectId: "proj-errors", mode: "plan" },
      fs,
    );
    await expect(
      promoteWorkspaceConversationToProposalOperation(
        { root, conversationId: conv.id, proposalId: "prop-fail" },
        fs,
        adoptFail,
      ),
    ).rejects.toBe(adoptFailError);

    await expect(
      reviewWorkspaceProposalOperation(
        { root, proposalId: "prop-missing" },
        fs,
        adoptFail,
      ),
    ).rejects.toBe(adoptFailError);

    await expect(
      applyWorkspaceProposalOperation(
        { root, proposalId: "any", approvedBy: "lead" },
        fs,
        adoptFail,
      ),
    ).rejects.toBe(adoptFailError);
  });

  it("does not invoke adoption when approval is blank", async () => {
    const fs = createMemoryFileSystem();
    await initProject({ root, adapters: ["codex"] }, fs);
    const adopt = vi.fn<WorkspaceProposalAdoption>(async () =>
      minimalAdoptionProposal(),
    );
    await expect(
      applyWorkspaceProposalOperation(
        { root, proposalId: "any", approvedBy: "" },
        fs,
        adopt,
      ),
    ).rejects.toThrow("human approval required (--approved-by USER)");
    await expect(
      applyWorkspaceProposalOperation(
        { root, proposalId: "any", approvedBy: "  " },
        fs,
        adopt,
      ),
    ).rejects.toThrow("human approval required (--approved-by USER)");
    expect(adopt).not.toHaveBeenCalled();
  });

  it("runs dry-run adoption before proposal-path traversal on promote", async () => {
    const fs = createMemoryFileSystem();
    await initProject({ root, adapters: ["codex"] }, fs);
    const conv = await startWorkspaceConversation(
      { root, projectId: "proj-order", mode: "plan" },
      fs,
    );
    const { adopt, calls } = trackAdoption();
    await expect(
      promoteWorkspaceConversationToProposalOperation(
        { root, conversationId: conv.id, proposalId: "../../../escape" },
        fs,
        adopt,
      ),
    ).rejects.toThrow(/path traversal/u);
    expect(calls).toHaveLength(1);
    expect(calls[0]?.options).toEqual(dryRunAdoptOptions);
    expect(await fs.exists(proposalPath("escape"))).toBe(false);
  });

  it("validates review proposal paths before fallback adoption and skips paths on apply", async () => {
    const fs = createMemoryFileSystem();
    await initProject({ root, adapters: ["codex"] }, fs);
    const adopt = vi.fn<WorkspaceProposalAdoption>(async () =>
      minimalAdoptionProposal(),
    );

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
    expect(adopt.mock.calls[0]?.length).toBe(2);
  });

  it("keeps public memory-filesystem wrappers compatible with port-injected adoptProject", async () => {
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
    expect(proposal.applied).toBe(false);
    expect(review.proposalId).toBe("prop-wrap");
    expect(dryApply.applied).toBe(false);
  });
});
