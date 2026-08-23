import { cwd } from "node:process";
import {
  appendWorkspaceMessage,
  applyWorkspaceProposal,
  getWorkspaceConversation,
  listWorkspaceConversations,
  nodeFileSystem,
  promoteWorkspaceConversationToProposal,
  reviewWorkspaceProposal,
  startWorkspaceConversation,
  type AgentWorkspaceMode,
  type FileSystem,
} from "@intentloom/application";
import { createCliArtifactValidator } from "./cli-project-metadata.js";
import { parseWorkspaceArguments } from "./workspace-parse.js";

export type WorkspaceCliExitCode = 0 | 2 | 3;

export interface WorkspaceCliIo {
  readonly stdout: (message: string) => void;
  readonly stderr: (message: string) => void;
}

export interface WorkspaceCliDependencies {
  readonly catalogRoot: string;
  readonly fileSystem?: FileSystem;
}

export async function runWorkspaceCommand(
  args: readonly string[],
  dependencies: WorkspaceCliDependencies,
  io: WorkspaceCliIo,
): Promise<WorkspaceCliExitCode> {
  const parsed = parseWorkspaceArguments(args);
  await createCliArtifactValidator(dependencies.catalogRoot);
  const fileSystem = dependencies.fileSystem ?? nodeFileSystem;
  const root = parsed.values.get("--root") ?? cwd();
  const json = parsed.flags.has("--json");
  const projectId = parsed.values.get("--project-id") ?? "project-local";

  if (parsed.subcommand === "start") {
    const mode = (parsed.values.get("--mode") ??
      "discuss") as AgentWorkspaceMode;
    const conv = await startWorkspaceConversation(
      { root, projectId, mode },
      fileSystem,
    );
    if (json) {
      io.stdout(JSON.stringify(conv, null, 2));
    } else {
      io.stdout(
        `Started workspace conversation: ${conv.id} [mode=${conv.mode}]`,
      );
    }
    return 0;
  }
  if (parsed.subcommand === "get") {
    const conversationId = parsed.values.get("--conversation-id") ?? "";
    const conv = await getWorkspaceConversation(
      { root, conversationId },
      fileSystem,
    );
    if (!conv) {
      const err = `Workspace conversation ${conversationId} not found`;
      if (json) io.stdout(JSON.stringify({ error: err }, null, 2));
      else io.stderr(err);
      return 3;
    }
    if (json) {
      io.stdout(JSON.stringify(conv, null, 2));
    } else {
      const lines = [
        `Conversation: ${conv.id} (Project: ${conv.projectId}, Mode: ${conv.mode})`,
        `Messages (${conv.messages.length}):`,
        ...conv.messages.map(
          (m) => `[${m.role.toUpperCase()} ${m.timestamp}]: ${m.content}`,
        ),
      ];
      io.stdout(lines.join("\n"));
    }
    return 0;
  }
  if (parsed.subcommand === "append") {
    const conversationId = parsed.values.get("--conversation-id") ?? "";
    const content = parsed.values.get("--content") ?? "";
    const conv = await appendWorkspaceMessage(
      { root, conversationId, role: "user", content },
      fileSystem,
    );
    if (json) {
      io.stdout(JSON.stringify(conv, null, 2));
    } else {
      io.stdout(
        `Appended message to conversation ${conv.id} (total messages: ${conv.messages.length})`,
      );
    }
    return 0;
  }
  if (parsed.subcommand === "list") {
    const list = await listWorkspaceConversations({ root }, fileSystem);
    if (json) {
      io.stdout(JSON.stringify(list, null, 2));
    } else {
      const lines = [
        `Workspace Conversations (${list.length}):`,
        ...list.map(
          (c) =>
            `- ${c.id} [mode=${c.mode}, messages=${c.messages.length}, updated=${c.updatedAt}]`,
        ),
      ];
      io.stdout(lines.join("\n"));
    }
    return 0;
  }
  if (parsed.subcommand === "promote") {
    const conversationId = parsed.values.get("--conversation-id") ?? "";
    const proposalId = parsed.values.get("--proposal-id");
    const proposal = await promoteWorkspaceConversationToProposal(
      {
        root,
        conversationId,
        ...(proposalId !== undefined ? { proposalId } : {}),
      },
      fileSystem,
    );
    if (json) {
      io.stdout(JSON.stringify(proposal, null, 2));
    } else {
      io.stdout(
        `Promoted conversation ${conversationId} to proposal ${proposalId ?? "default"} (items: ${proposal.items.length})`,
      );
    }
    return 0;
  }
  if (parsed.subcommand === "review") {
    const proposalId = parsed.values.get("--proposal-id") ?? "";
    const policyPath = parsed.values.get("--policy");
    const review = await reviewWorkspaceProposal(
      {
        root,
        proposalId,
        ...(policyPath !== undefined ? { policyPath } : {}),
      },
      fileSystem,
    );
    if (json) {
      io.stdout(JSON.stringify(review, null, 2));
    } else {
      const lines = [
        `Workspace Proposal Review (${review.proposalId}):`,
        `Items: ${review.itemsCount}`,
        `Affected Paths: ${review.affectedPaths.join(", ") || "none"}`,
        `Sandbox Evaluation: ${review.sandboxEvaluation.allowed ? "ALLOWED" : "BLOCKED"}`,
        `Ready To Apply: ${review.readyToApply}`,
      ];
      io.stdout(lines.join("\n"));
    }
    return (review.readyToApply ? 0 : 3) as WorkspaceCliExitCode;
  }
  if (parsed.subcommand === "apply") {
    const proposalId = parsed.values.get("--proposal-id") ?? "";
    const approvedBy = parsed.values.get("--approved-by") ?? "";
    const planFile = parsed.values.get("--plan-file");
    const dryRun = parsed.flags.has("--dry-run");
    const result = await applyWorkspaceProposal(
      {
        root,
        proposalId,
        approvedBy,
        ...(planFile !== undefined ? { planFile } : {}),
        dryRun,
      },
      fileSystem,
    );
    if (json) {
      io.stdout(JSON.stringify(result, null, 2));
    } else {
      io.stdout(
        `Applied workspace proposal ${proposalId} (status: ${result.applicationStatus ?? "applied"}, items: ${result.items.length})`,
      );
    }
    return (
      result.transactionOutcome?.status === "failed" ? 3 : 0
    ) as WorkspaceCliExitCode;
  }
  return 2;
}
