import { dirname } from "node:path";
import type { AdoptionProposal } from "../project-adoption/generated-file-adoption-contracts.js";
import type { FileSystem } from "../host-file-system.js";
import type { TransactionOptions } from "../generated-file/transaction-contracts.js";
import type { InitOptions } from "../project-lifecycle/project-lifecycle-contracts.js";
import { inside } from "../project-path.js";
import { evaluateProposalAgainstSandbox } from "../security/sandbox-proposal-evaluation.js";
import { getWorkspaceConversation } from "./workspace-conversation-store.js";

export type WorkspaceProposalAdoption = (
  options: InitOptions,
  fs: FileSystem,
  transactionOptions?: TransactionOptions,
) => Promise<AdoptionProposal>;

function workspaceProposalPath(root: string, proposalId: string): string {
  return inside(root, `.aif/proposals/${proposalId}.json`);
}

export async function promoteWorkspaceConversationToProposalOperation(
  options: {
    root: string;
    conversationId: string;
    proposalId?: string;
  },
  fs: FileSystem,
  adoptProject: WorkspaceProposalAdoption,
): Promise<AdoptionProposal> {
  const conv = await getWorkspaceConversation(
    { root: options.root, conversationId: options.conversationId },
    fs,
  );
  if (!conv)
    throw new Error(
      `Workspace conversation ${options.conversationId} not found`,
    );

  const proposalId = options.proposalId ?? `prop-${Date.now()}`;
  const proposalData = await adoptProject(
    {
      root: options.root,
      profile: "generic",
      adapters: ["codex"],
      dryRun: true,
    },
    fs,
  );
  const path = workspaceProposalPath(options.root, proposalId);

  if (!(await fs.exists(dirname(path)))) {
    await fs.mkdir(dirname(path));
  }
  await fs.write(path, `${JSON.stringify(proposalData, null, 2)}\n`);

  return proposalData;
}

export interface WorkspaceProposalReviewResult {
  readonly proposalId: string;
  readonly schemaVersion: number;
  readonly itemsCount: number;
  readonly affectedPaths: readonly string[];
  readonly sandboxEvaluation: Awaited<
    ReturnType<typeof evaluateProposalAgainstSandbox>
  >;
  readonly readyToApply: boolean;
}

export async function reviewWorkspaceProposalOperation(
  options: {
    root: string;
    proposalId: string;
    policyPath?: string;
  },
  fs: FileSystem,
  adoptProject: WorkspaceProposalAdoption,
): Promise<WorkspaceProposalReviewResult> {
  const path = workspaceProposalPath(options.root, options.proposalId);
  let proposalData: AdoptionProposal;
  if (await fs.exists(path)) {
    proposalData = JSON.parse(await fs.read(path));
  } else {
    proposalData = await adoptProject(
      {
        root: options.root,
        profile: "generic",
        adapters: ["codex"],
        dryRun: true,
      },
      fs,
    );
  }

  const affectedPaths = proposalData.items.map((i) => i.path);
  const sandboxEval = await evaluateProposalAgainstSandbox(
    { changes: affectedPaths.map((p) => ({ type: "modify", path: p })) },
    { root: options.root, projectId: options.proposalId },
    fs,
  );

  return {
    proposalId: options.proposalId,
    schemaVersion: 1,
    itemsCount: proposalData.items.length,
    affectedPaths,
    sandboxEvaluation: sandboxEval,
    readyToApply: sandboxEval.allowed,
  };
}

export async function applyWorkspaceProposalOperation(
  options: {
    root: string;
    proposalId: string;
    approvedBy: string;
    planFile?: string;
    dryRun?: boolean;
  },
  fs: FileSystem,
  adoptProject: WorkspaceProposalAdoption,
): Promise<AdoptionProposal> {
  if (!options.approvedBy || !options.approvedBy.trim()) {
    throw new Error("human approval required (--approved-by USER)");
  }

  return adoptProject(
    {
      root: options.root,
      profile: "generic",
      adapters: ["codex"],
      dryRun: options.dryRun ?? false,
    },
    fs,
  );
}