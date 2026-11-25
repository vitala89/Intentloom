import { dirname, relative } from "node:path";
import {
  validateWorkspaceConversationRecord,
  type AgentWorkspaceMode,
  type WorkspaceConversationRecord,
  type WorkspaceMessage,
} from "@intentloom/protocol";
import { nodeFileSystem, type FileSystem } from "../host-file-system.js";
import { inside } from "../project-path.js";

function workspaceConversationPath(
  root: string,
  conversationId: string,
): string {
  return inside(root, `.aif/workspace/conversations/${conversationId}.json`);
}

export async function startWorkspaceConversation(
  options: {
    root: string;
    projectId: string;
    mode?: AgentWorkspaceMode;
  },
  fs: FileSystem = nodeFileSystem,
): Promise<WorkspaceConversationRecord> {
  const id = `conv-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const now = new Date().toISOString();
  const record = validateWorkspaceConversationRecord({
    schemaVersion: "1",
    id,
    projectId: options.projectId,
    mode: options.mode ?? "discuss",
    messages: [],
    createdAt: now,
    updatedAt: now,
  });

  const path = workspaceConversationPath(options.root, id);
  if (!(await fs.exists(dirname(path)))) {
    await fs.mkdir(dirname(path));
  }
  await fs.write(path, `${JSON.stringify(record, null, 2)}\n`);

  return record;
}

export async function getWorkspaceConversation(
  options: { root: string; conversationId: string },
  fs: FileSystem = nodeFileSystem,
): Promise<WorkspaceConversationRecord | null> {
  const path = workspaceConversationPath(options.root, options.conversationId);
  if (!(await fs.exists(path))) return null;
  try {
    const raw = JSON.parse(await fs.read(path));
    return validateWorkspaceConversationRecord(raw);
  } catch {
    return null;
  }
}

function redactWorkspaceSecrets(content: string): string {
  return content
    .replace(
      /(?:ghp_[a-zA-Z0-9]{36}|github_pat_[a-zA-Z0-9]{22}_[a-zA-Z0-9]{59}|sk-[a-zA-Z0-9]{32,})/g,
      "[REDACTED_SECRET]",
    )
    .replace(
      /(?:api[_-]?key|token|password|secret)\s*[:=]\s*[^\s]+/giu,
      "[REDACTED]",
    )
    .replace(
      /-----BEGIN [A-Z ]+ PRIVATE KEY-----[\s\S]*?-----END [A-Z ]+ PRIVATE KEY-----/gu,
      "[REDACTED PRIVATE KEY]",
    );
}

export async function appendWorkspaceMessage(
  options: {
    root: string;
    conversationId: string;
    role: "user" | "assistant";
    content: string;
  },
  fs: FileSystem = nodeFileSystem,
): Promise<WorkspaceConversationRecord> {
  const current = await getWorkspaceConversation(
    { root: options.root, conversationId: options.conversationId },
    fs,
  );
  if (!current)
    throw new Error(`Conversation ${options.conversationId} not found`);

  const redactedContent = redactWorkspaceSecrets(options.content);
  const newMessage: WorkspaceMessage = {
    id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    role: options.role,
    content: redactedContent,
    timestamp: new Date().toISOString(),
  };

  const updatedRecord = validateWorkspaceConversationRecord({
    ...current,
    messages: [...current.messages, newMessage],
    updatedAt: new Date().toISOString(),
  });

  const path = workspaceConversationPath(options.root, options.conversationId);
  await fs.write(path, `${JSON.stringify(updatedRecord, null, 2)}\n`);

  return updatedRecord;
}

export async function listWorkspaceConversations(
  options: { root: string },
  fs: FileSystem = nodeFileSystem,
): Promise<readonly WorkspaceConversationRecord[]> {
  const items: WorkspaceConversationRecord[] = [];
  for (const rawPath of await fs.list(options.root)) {
    const normalized = (
      rawPath.startsWith(options.root)
        ? relative(options.root, rawPath)
        : rawPath
    ).replaceAll("\\", "/");
    if (
      !normalized.startsWith(".aif/workspace/conversations/") ||
      !normalized.endsWith(".json")
    )
      continue;
    const conversationId = normalized
      .replace(/^\.aif\/workspace\/conversations\//u, "")
      .replace(/\.json$/u, "");
    const record = await getWorkspaceConversation(
      { root: options.root, conversationId },
      fs,
    );
    if (record) items.push(record);
  }

  return items.sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );
}
