import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  applyWorkspaceProposal,
  createMemoryFileSystem,
  initProject,
  promoteWorkspaceConversationToProposal,
  reviewWorkspaceProposal,
  startWorkspaceConversation,
  writeSandboxCapabilityPolicy,
} from "@intentloom/application";
import { runCli } from "../packages/cli/src/command.js";

describe("Agent Workspace: Plan, Review, and Transactional Apply Modes", () => {
  it("promotes workspace conversation to proposal in plan mode", async () => {
    const fs = createMemoryFileSystem();
    const root = "/project";
    await initProject({ root, adapters: ["codex"] }, fs);

    const conv = await startWorkspaceConversation(
      { root, projectId: "p-agent", mode: "plan" },
      fs,
    );

    const proposal = await promoteWorkspaceConversationToProposal(
      { root, conversationId: conv.id, proposalId: "prop-100" },
      fs,
    );

    expect(proposal.kind).toBe("adoption-proposal");
    expect(await fs.exists(`${root}/.aif/proposals/prop-100.json`)).toBe(true);
  });

  it("reviews proposal in review mode without codebase mutation", async () => {
    const fs = createMemoryFileSystem();
    const root = "/project";
    await initProject({ root, adapters: ["codex"] }, fs);
    await writeSandboxCapabilityPolicy(
      {
        schemaVersion: "1",
        projectId: "p-agent",
        mode: "mutating",
        pathRules: [{ pathPrefix: "*", allowWrite: true, allowDelete: true }],
        commandRules: [],
        allowNetwork: true,
        updatedAt: new Date().toISOString(),
      },
      { root },
      fs,
    );

    const conv = await startWorkspaceConversation(
      { root, projectId: "p-agent", mode: "plan" },
      fs,
    );
    await promoteWorkspaceConversationToProposal(
      { root, conversationId: conv.id, proposalId: "prop-100" },
      fs,
    );

    const beforeFiles = new Set(await fs.list(root));
    const review = await reviewWorkspaceProposal(
      { root, proposalId: "prop-100" },
      fs,
    );
    const afterFiles = new Set(await fs.list(root));

    expect(review.proposalId).toBe("prop-100");
    expect(review.readyToApply).toBe(true);
    expect(afterFiles).toEqual(beforeFiles);
  });

  it("enforces human approval gate for workspace apply mode", async () => {
    const fs = createMemoryFileSystem();
    const root = "/project";
    await initProject({ root, adapters: ["codex"] }, fs);

    const conv = await startWorkspaceConversation(
      { root, projectId: "p-agent", mode: "plan" },
      fs,
    );
    await promoteWorkspaceConversationToProposal(
      { root, conversationId: conv.id, proposalId: "prop-100" },
      fs,
    );

    await expect(
      applyWorkspaceProposal(
        {
          root,
          proposalId: "prop-100",
          approvedBy: "",
          planFile: ".aif/proposals/prop-100.json",
        },
        fs,
      ),
    ).rejects.toThrow("human approval required");
  });

  it("routes workspace promote, review, and apply subcommands via CLI", async () => {
    const fs = createMemoryFileSystem();
    const root = "/project";
    await initProject({ root, adapters: ["codex"] }, fs);
    await writeSandboxCapabilityPolicy(
      {
        schemaVersion: "1",
        projectId: "p-agent",
        mode: "mutating",
        pathRules: [{ pathPrefix: "*", allowWrite: true, allowDelete: true }],
        commandRules: [],
        allowNetwork: true,
        updatedAt: new Date().toISOString(),
      },
      { root },
      fs,
    );

    const conv = await startWorkspaceConversation(
      { root, projectId: "p-agent", mode: "plan" },
      fs,
    );

    const dependencies = { catalogRoot: resolve("catalog"), fileSystem: fs };

    let promoteOut = "";
    const exitCodePromote = await runCli(
      [
        "workspace",
        "promote",
        "--conversation-id",
        conv.id,
        "--proposal-id",
        "prop-200",
        "--root",
        root,
        "--json",
      ],
      dependencies,
      { stdout: (m) => (promoteOut += `${m}\n`), stderr: () => undefined },
    );
    expect(exitCodePromote).toBe(0);

    let reviewOut = "";
    const exitCodeReview = await runCli(
      [
        "workspace",
        "review",
        "--proposal-id",
        "prop-200",
        "--root",
        root,
        "--json",
      ],
      dependencies,
      { stdout: (m) => (reviewOut += `${m}\n`), stderr: () => undefined },
    );
    expect(exitCodeReview).toBe(0);
    const reviewData = JSON.parse(reviewOut);
    expect(reviewData.readyToApply).toBe(true);

    let applyOut = "";
    const exitCodeApply = await runCli(
      [
        "workspace",
        "apply",
        "--proposal-id",
        "prop-200",
        "--plan-file",
        ".aif/proposals/prop-200.json",
        "--approved-by",
        "lead-engineer",
        "--dry-run",
        "--root",
        root,
        "--json",
      ],
      dependencies,
      { stdout: (m) => (applyOut += `${m}\n`), stderr: () => undefined },
    );
    expect(exitCodeApply).toBe(0);
    const applyData = JSON.parse(applyOut);
    expect(applyData.kind).toBe("adoption-proposal");
  });
});
