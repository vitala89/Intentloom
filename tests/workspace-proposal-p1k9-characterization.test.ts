import { dirname, resolve } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  applyWorkspaceProposal,
  createMemoryFileSystem,
  initProject,
  promoteWorkspaceConversationToProposal,
  reviewWorkspaceProposal,
  startWorkspaceConversation,
  writeSandboxCapabilityPolicy,
  type FileSystem,
} from "@intentloom/application";
import { inside } from "../packages/application/src/project-path.ts";

const root = "/project/p1k9-proposals";

function proposalPath(proposalId: string): string {
  return inside(root, `.aif/proposals/${proposalId}.json`);
}

function conversationPath(conversationId: string): string {
  return inside(root, `.aif/workspace/conversations/${conversationId}.json`);
}

function filesystem(
  files: Map<string, string>,
  list: () => Promise<string[]>,
  overrides?: Partial<FileSystem>,
): FileSystem {
  return {
    async exists(path) {
      return files.has(path);
    },
    async read(path) {
      const content = files.get(path);
      if (content === undefined) throw new Error(`missing ${path}`);
      return content;
    },
    async write(path, content) {
      files.set(path, content);
    },
    async mkdir() {},
    async remove() {},
    list,
    async realpath(path) {
      return path;
    },
    async isSymbolicLink() {
      return false;
    },
    ...overrides,
  };
}

async function preparedRoot(fs: FileSystem): Promise<string> {
  await initProject({ root, adapters: ["codex"] }, fs);
  return root;
}

async function conversationReady(fs: FileSystem): Promise<string> {
  await preparedRoot(fs);
  const conv = await startWorkspaceConversation(
    { root, projectId: "proj-p1k9", mode: "plan" },
    fs,
  );
  return conv.id;
}

describe("P1K.9 workspace proposal lifecycle (Stage A characterization)", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("promotes to formatted proposal JSON with a trailing newline", async () => {
    const fs = createMemoryFileSystem();
    const conversationId = await conversationReady(fs);
    const proposal = await promoteWorkspaceConversationToProposal(
      { root, conversationId, proposalId: "prop-exact" },
      fs,
    );
    const path = proposalPath("prop-exact");
    const stored = await fs.read(path);
    expect(stored).toBe(`${JSON.stringify(proposal, null, 2)}\n`);
    expect(proposal.kind).toBe("adoption-proposal");
    expect(proposal.applied).toBe(false);
    expect(proposal.applicationStatus).toBe("not-requested");
    expect(proposal.transactionOutcome).toBeNull();
  });

  it("generates prop-{timestamp} ids when proposalId is omitted", async () => {
    const fs = createMemoryFileSystem();
    const conversationId = await conversationReady(fs);
    vi.spyOn(Date, "now").mockReturnValue(1_900_000_000_000);
    try {
      await promoteWorkspaceConversationToProposal({ root, conversationId }, fs);
      expect(await fs.exists(proposalPath("prop-1900000000000"))).toBe(true);
    } finally {
      vi.restoreAllMocks();
    }
  });

  it("throws the exact not-found error when the conversation is absent", async () => {
    const fs = createMemoryFileSystem();
    await preparedRoot(fs);
    await expect(
      promoteWorkspaceConversationToProposal(
        { root, conversationId: "conv-missing" },
        fs,
      ),
    ).rejects.toThrow("Workspace conversation conv-missing not found");
    expect(
      [...fs.files.keys()].filter((p) => p.includes(".aif/proposals/")),
    ).toEqual([]);
  });

  it("maps malformed, invalid, and unreadable conversations to the not-found error", async () => {
    const fs = createMemoryFileSystem();
    await preparedRoot(fs);
    await fs.write(conversationPath("malformed"), "{");
    await fs.write(conversationPath("invalid"), '{"schemaVersion":"9"}');
    await expect(
      promoteWorkspaceConversationToProposal(
        { root, conversationId: "malformed" },
        fs,
      ),
    ).rejects.toThrow("Workspace conversation malformed not found");
    await expect(
      promoteWorkspaceConversationToProposal(
        { root, conversationId: "invalid" },
        fs,
      ),
    ).rejects.toThrow("Workspace conversation invalid not found");

    const files = new Map([[conversationPath("readable"), "{}"]]);
    const reading = filesystem(files, async () => []);
    reading.exists = async () => true;
    reading.read = async () => {
      throw new Error("read failed");
    };
    await expect(
      promoteWorkspaceConversationToProposal(
        { root, conversationId: "readable" },
        reading,
      ),
    ).rejects.toThrow("Workspace conversation readable not found");
  });

  it("propagates conversation path traversal and exists failures from promote", async () => {
    const fs = createMemoryFileSystem();
    await preparedRoot(fs);
    await expect(
      promoteWorkspaceConversationToProposal(
        { root, conversationId: "../../../../outside" },
        fs,
      ),
    ).rejects.toThrow(/path traversal/u);

    const existsFail = filesystem(new Map(), async () => []);
    existsFail.exists = async () => {
      throw new Error("exists failed");
    };
    await expect(
      promoteWorkspaceConversationToProposal(
        { root, conversationId: "conv-1" },
        existsFail,
      ),
    ).rejects.toThrow("exists failed");
  });

  it("creates the proposals parent directory only when absent", async () => {
    const proposalDir = dirname(proposalPath("unused"));
    const directories = new Set<string>();
    const files = new Map<string, string>();
    const convId = "conv-dir";
    files.set(
      conversationPath(convId),
      `${JSON.stringify({
        schemaVersion: "1",
        id: convId,
        projectId: "p",
        mode: "plan",
        messages: [],
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      })}\n`,
    );
    const fs = filesystem(files, async () => [], {
      async exists(path) {
        return files.has(path) || directories.has(path);
      },
      async mkdir(path) {
        directories.add(path);
      },
    });
    await initProject({ root, adapters: ["codex"] }, fs);
    let mkdirForProposals = 0;
    const mkdir = fs.mkdir.bind(fs);
    fs.mkdir = async (path) => {
      if (path === proposalDir) mkdirForProposals += 1;
      return mkdir(path);
    };
    await promoteWorkspaceConversationToProposal(
      { root, conversationId: convId, proposalId: "prop-a" },
      fs,
    );
    await promoteWorkspaceConversationToProposal(
      { root, conversationId: convId, proposalId: "prop-b" },
      fs,
    );
    expect(mkdirForProposals).toBe(1);
  });

  it("throws proposal path traversal after conversation load without writing the proposal file", async () => {
    const fs = createMemoryFileSystem();
    const conversationId = await conversationReady(fs);
    await expect(
      promoteWorkspaceConversationToProposal(
        { root, conversationId, proposalId: "../../../../escape" },
        fs,
      ),
    ).rejects.toThrow(/path traversal/u);
    expect(
      [...fs.files.keys()].filter((p) => p.includes(".aif/proposals/")),
    ).toEqual([]);
  });

  it("reviews a stored proposal and preserves its bytes", async () => {
    const fs = createMemoryFileSystem();
    const conversationId = await conversationReady(fs);
    await promoteWorkspaceConversationToProposal(
      { root, conversationId, proposalId: "prop-review" },
      fs,
    );
    const before = await fs.read(proposalPath("prop-review"));
    await writeSandboxCapabilityPolicy(
      {
        schemaVersion: "1",
        projectId: "project-local",
        mode: "mutating",
        pathRules: [{ pathPrefix: "*", allowWrite: true, allowDelete: true }],
        commandRules: [],
        allowNetwork: true,
        updatedAt: new Date().toISOString(),
      },
      { root },
      fs,
    );
    const review = await reviewWorkspaceProposal(
      { root, proposalId: "prop-review" },
      fs,
    );
    const after = await fs.read(proposalPath("prop-review"));
    expect(after).toBe(before);
    expect(review.proposalId).toBe("prop-review");
    expect(review.schemaVersion).toBe(1);
    expect(review.itemsCount).toBeGreaterThan(0);
    expect(review.affectedPaths.length).toBe(review.itemsCount);
    expect(review.sandboxEvaluation.projectId).toBe("prop-review");
    expect(review.readyToApply).toBe(review.sandboxEvaluation.allowed);
  });

  it("uses dry-run adoption for a missing proposal without persisting it", async () => {
    const fs = createMemoryFileSystem();
    await preparedRoot(fs);
    await writeSandboxCapabilityPolicy(
      {
        schemaVersion: "1",
        projectId: "project-local",
        mode: "mutating",
        pathRules: [{ pathPrefix: "*", allowWrite: true, allowDelete: true }],
        commandRules: [],
        allowNetwork: true,
        updatedAt: new Date().toISOString(),
      },
      { root },
      fs,
    );
    const review = await reviewWorkspaceProposal(
      { root, proposalId: "prop-missing" },
      fs,
    );
    expect(await fs.exists(proposalPath("prop-missing"))).toBe(false);
    expect(review.readyToApply).toBe(review.sandboxEvaluation.allowed);
  });

  it("reflects sandbox allow and deny in readyToApply", async () => {
    const fs = createMemoryFileSystem();
    await preparedRoot(fs);
    await fs.write(
      proposalPath("prop-deny"),
      `${JSON.stringify({ items: [{ path: "notes/readme.md" }] })}\n`,
    );
    await fs.write(
      proposalPath("prop-allow"),
      `${JSON.stringify({ items: [{ path: ".aif/intentloom.yaml" }] })}\n`,
    );
    const deny = await reviewWorkspaceProposal(
      { root, proposalId: "prop-deny" },
      fs,
    );
    const allow = await reviewWorkspaceProposal(
      { root, proposalId: "prop-allow" },
      fs,
    );
    expect(deny.readyToApply).toBe(false);
    expect(allow.readyToApply).toBe(allow.sandboxEvaluation.allowed);
  });

  it("accepts policyPath without changing review behavior", async () => {
    const fs = createMemoryFileSystem();
    await preparedRoot(fs);
    await fs.write(
      proposalPath("prop-policy"),
      `${JSON.stringify({ items: [{ path: ".aif/intentloom.yaml" }] })}\n`,
    );
    const baseline = await reviewWorkspaceProposal(
      { root, proposalId: "prop-policy" },
      fs,
    );
    const withPolicy = await reviewWorkspaceProposal(
      {
        root,
        proposalId: "prop-policy",
        policyPath: ".aif/custom-policy.json",
      },
      fs,
    );
    expect(withPolicy).toEqual(baseline);
  });

  it("propagates malformed proposal JSON and exists failures on review", async () => {
    const fs = createMemoryFileSystem();
    await preparedRoot(fs);
    await fs.write(proposalPath("prop-bad"), "{");
    await expect(
      reviewWorkspaceProposal({ root, proposalId: "prop-bad" }, fs),
    ).rejects.toThrow();

    const existsFail = filesystem(
      new Map([[proposalPath("prop-exists"), "{}"]]),
      async () => [],
    );
    existsFail.exists = async () => {
      throw new Error("review exists failed");
    };
    await expect(
      reviewWorkspaceProposal({ root, proposalId: "prop-exists" }, existsFail),
    ).rejects.toThrow("review exists failed");
  });

  it("throws review path traversal before read or adoption fallback", async () => {
    const fs = createMemoryFileSystem();
    await preparedRoot(fs);
    await expect(
      reviewWorkspaceProposal(
        { root, proposalId: "../../../../escape" },
        fs,
      ),
    ).rejects.toThrow(/path traversal/u);
  });

  it("enforces the human approval gate on apply", async () => {
    const fs = createMemoryFileSystem();
    await preparedRoot(fs);
    await expect(
      applyWorkspaceProposal(
        { root, proposalId: "prop-1", approvedBy: "" },
        fs,
      ),
    ).rejects.toThrow("human approval required (--approved-by USER)");
    await expect(
      applyWorkspaceProposal(
        { root, proposalId: "prop-1", approvedBy: "   " },
        fs,
      ),
    ).rejects.toThrow("human approval required (--approved-by USER)");
  });

  it("honors explicit dryRun on apply and defaults dryRun to false", async () => {
    const fs = createMemoryFileSystem();
    await preparedRoot(fs);
    const dry = await applyWorkspaceProposal(
      { root, proposalId: "unused", approvedBy: "lead", dryRun: true },
      fs,
    );
    expect(dry.applied).toBe(false);
    expect(dry.applicationStatus).toBe("not-requested");

    const wet = await applyWorkspaceProposal(
      { root, proposalId: "unused", approvedBy: "lead" },
      fs,
    );
    expect(wet.kind).toBe("adoption-proposal");
  });

  it("does not resolve proposal paths on apply, including traversal-shaped ids", async () => {
    const fs = createMemoryFileSystem();
    await preparedRoot(fs);
    const result = await applyWorkspaceProposal(
      {
        root,
        proposalId: "../../../../escape",
        approvedBy: "operator",
        planFile: ".aif/proposals/missing.json",
      },
      fs,
    );
    expect(result.kind).toBe("adoption-proposal");
    expect(
      [...fs.files.keys()].filter((p) => p.includes("escape")),
    ).toEqual([]);
  });

  it("propagates promote write failures", async () => {
    const fs = createMemoryFileSystem();
    const conversationId = await conversationReady(fs);
    fs.write = async () => {
      throw new Error("promote write failed");
    };
    await expect(
      promoteWorkspaceConversationToProposal(
        { root, conversationId, proposalId: "prop-write" },
        fs,
      ),
    ).rejects.toThrow("promote write failed");
  });
});