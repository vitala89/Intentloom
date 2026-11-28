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
  type FileSystem,
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

function captureAdoption(
  proposal: AdoptionProposal = minimalAdoptionProposal(),
): ReturnType<typeof vi.fn<WorkspaceProposalAdoption>> {
  return vi.fn<WorkspaceProposalAdoption>(async (options, adoptFs) => {
    void options;
    void adoptFs;
    return proposal;
  });
}

function instrumentFilesystemIO(fs: FileSystem): {
  existsSpy: ReturnType<typeof vi.spyOn>;
  readSpy: ReturnType<typeof vi.spyOn>;
} {
  return {
    existsSpy: vi.spyOn(fs, "exists"),
    readSpy: vi.spyOn(fs, "read"),
  };
}

describe("P1K.9 workspace proposal adoption port", () => {
  it("passes exact two-argument adoption calls for promote, review fallback, and apply", async () => {
    const fs = createMemoryFileSystem();
    await initProject({ root, adapters: ["codex"] }, fs);
    const conv = await startWorkspaceConversation(
      { root, projectId: "proj-port", mode: "plan" },
      fs,
    );
    const adopt = captureAdoption();

    await promoteWorkspaceConversationToProposalOperation(
      { root, conversationId: conv.id, proposalId: "prop-port" },
      fs,
      adopt,
    );
    expect(adopt).toHaveBeenCalledTimes(1);
    expect(adopt.mock.calls[0]).toHaveLength(2);
    expect(adopt.mock.calls[0]?.[1]).toBe(fs);
    expect(adopt.mock.calls[0]?.[0]).toEqual({
      root,
      profile: "generic",
      adapters: ["codex"],
      dryRun: true,
    });

    adopt.mockClear();
    await reviewWorkspaceProposalOperation(
      { root, proposalId: "prop-missing-port" },
      fs,
      adopt,
    );
    expect(adopt).toHaveBeenCalledTimes(1);
    expect(adopt.mock.calls[0]).toHaveLength(2);
    expect(adopt.mock.calls[0]?.[0]).toEqual({
      root,
      profile: "generic",
      adapters: ["codex"],
      dryRun: true,
    });

    adopt.mockClear();
    await applyWorkspaceProposalOperation(
      { root, proposalId: "any", approvedBy: "lead", dryRun: true },
      fs,
      adopt,
    );
    expect(adopt).toHaveBeenCalledTimes(1);
    expect(adopt.mock.calls[0]).toHaveLength(2);
    expect(adopt.mock.calls[0]?.[0]).toEqual({
      root,
      profile: "generic",
      adapters: ["codex"],
      dryRun: true,
    });

    adopt.mockClear();
    await applyWorkspaceProposalOperation(
      { root, proposalId: "any", approvedBy: "lead", dryRun: false },
      fs,
      adopt,
    );
    expect(adopt).toHaveBeenCalledTimes(1);
    expect(adopt.mock.calls[0]).toHaveLength(2);
    expect(adopt.mock.calls[0]?.[0]).toEqual({
      root,
      profile: "generic",
      adapters: ["codex"],
      dryRun: false,
    });

    adopt.mockClear();
    await applyWorkspaceProposalOperation(
      { root, proposalId: "any", approvedBy: "lead" },
      fs,
      adopt,
    );
    expect(adopt).toHaveBeenCalledTimes(1);
    expect(adopt.mock.calls[0]).toHaveLength(2);
    expect(adopt.mock.calls[0]?.[0]).toEqual({
      root,
      profile: "generic",
      adapters: ["codex"],
      dryRun: false,
    });
  });

  it("does not invoke adoption when reviewing a stored proposal", async () => {
    const fs = createMemoryFileSystem();
    await initProject({ root, adapters: ["codex"] }, fs);
    const stored = minimalAdoptionProposal();
    await fs.write(
      proposalPath("prop-stored"),
      `${JSON.stringify(stored, null, 2)}\n`,
    );
    const adopt = captureAdoption(stored);
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

  it("does not invoke adoption or filesystem reads when approval is blank", async () => {
    const fs = createMemoryFileSystem();
    await initProject({ root, adapters: ["codex"] }, fs);
    await fs.write(
      proposalPath("prop-stored"),
      `${JSON.stringify(minimalAdoptionProposal(), null, 2)}\n`,
    );
    const adopt = captureAdoption();
    const { existsSpy, readSpy } = instrumentFilesystemIO(fs);
    await expect(
      applyWorkspaceProposalOperation(
        { root, proposalId: "prop-stored", approvedBy: "" },
        fs,
        adopt,
      ),
    ).rejects.toThrow("human approval required (--approved-by USER)");
    await expect(
      applyWorkspaceProposalOperation(
        { root, proposalId: "prop-stored", approvedBy: "  " },
        fs,
        adopt,
      ),
    ).rejects.toThrow("human approval required (--approved-by USER)");
    expect(adopt).not.toHaveBeenCalled();
    expect(existsSpy).not.toHaveBeenCalled();
    expect(readSpy).not.toHaveBeenCalled();
  });

  it("runs dry-run adoption before proposal-path traversal on promote", async () => {
    const fs = createMemoryFileSystem();
    await initProject({ root, adapters: ["codex"] }, fs);
    const conv = await startWorkspaceConversation(
      { root, projectId: "proj-order", mode: "plan" },
      fs,
    );
    const adopt = captureAdoption();
    await expect(
      promoteWorkspaceConversationToProposalOperation(
        { root, conversationId: conv.id, proposalId: "../../../escape" },
        fs,
        adopt,
      ),
    ).rejects.toThrow(/path traversal/u);
    expect(adopt).toHaveBeenCalledTimes(1);
    expect(adopt.mock.calls[0]).toHaveLength(2);
    expect(adopt.mock.calls[0]?.[0]).toEqual(dryRunAdoptOptions);
    expect(await fs.exists(proposalPath("escape"))).toBe(false);
  });

  it("rejects review traversal before filesystem access and fallback adoption", async () => {
    const fs = createMemoryFileSystem();
    await initProject({ root, adapters: ["codex"] }, fs);
    const adopt = captureAdoption();
    const { existsSpy, readSpy } = instrumentFilesystemIO(fs);

    await expect(
      reviewWorkspaceProposalOperation(
        { root, proposalId: "../../../escape" },
        fs,
        adopt,
      ),
    ).rejects.toThrow(/path traversal/u);
    expect(adopt).not.toHaveBeenCalled();
    expect(existsSpy).not.toHaveBeenCalled();
    expect(readSpy).not.toHaveBeenCalled();
  });

  it("apply does not resolve or read stored proposals regardless of proposal id", async () => {
    const fs = createMemoryFileSystem();
    await initProject({ root, adapters: ["codex"] }, fs);
    await fs.write(
      proposalPath("prop-on-disk"),
      `${JSON.stringify(minimalAdoptionProposal(), null, 2)}\n`,
    );
    const adopt = captureAdoption();
    const { existsSpy, readSpy } = instrumentFilesystemIO(fs);

    await applyWorkspaceProposalOperation(
      { root, proposalId: "prop-on-disk", approvedBy: "op" },
      fs,
      adopt,
    );
    expect(adopt).toHaveBeenCalledTimes(1);
    expect(adopt.mock.calls[0]).toHaveLength(2);
    expect(existsSpy).not.toHaveBeenCalled();
    expect(readSpy).not.toHaveBeenCalled();

    adopt.mockClear();
    existsSpy.mockClear();
    readSpy.mockClear();

    await applyWorkspaceProposalOperation(
      { root, proposalId: "../../../escape", approvedBy: "op" },
      fs,
      adopt,
    );
    expect(adopt).toHaveBeenCalledTimes(1);
    expect(adopt.mock.calls[0]).toHaveLength(2);
    expect(existsSpy).not.toHaveBeenCalled();
    expect(readSpy).not.toHaveBeenCalled();
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
