import { dirname, relative } from "node:path";
import {
  validateAgentSessionExportResult,
  validateAgentSessionItem,
  type AgentSessionExportResult,
  type AgentSessionItem,
  type AgentSessionState,
  type RetentionState,
  type TrustClass,
} from "@intentloom/protocol";
import { nodeFileSystem, type FileSystem } from "../host-file-system.js";
import { inside, secretLikePath } from "../project-path.js";

function sessionFilePath(root: string, sessionId: string): string {
  return inside(root, `.aif/memory/sessions/${sessionId}.json`);
}

export async function startAgentSession(
  options: {
    root: string;
    projectId: string;
    sessionId?: string;
    activeTask: string;
    unresolvedQuestions?: readonly string[];
    decisions?: readonly string[];
    trustClass?: TrustClass;
    retentionPolicy?: RetentionState;
    metadata?: Record<string, unknown>;
  },
  fs: FileSystem = nodeFileSystem,
): Promise<AgentSessionItem> {
  const sessionId = options.sessionId ?? `session-${Date.now()}`;
  const path = sessionFilePath(options.root, sessionId);
  if (await fs.exists(path)) {
    throw new Error(`agent session already exists: ${sessionId}`);
  }
  const now = new Date().toISOString();
  const session: AgentSessionItem = validateAgentSessionItem({
    schemaVersion: "1",
    sessionId,
    projectId: options.projectId,
    state: "active",
    activeTask: secretLikePath(options.activeTask)
      ? "[REDACTED]"
      : options.activeTask,
    unresolvedQuestions: (options.unresolvedQuestions ?? []).map((q) =>
      secretLikePath(q) ? "[REDACTED]" : q,
    ),
    decisions: (options.decisions ?? []).map((d) =>
      secretLikePath(d) ? "[REDACTED]" : d,
    ),
    outcomes: [],
    trustClass: options.trustClass ?? "user-supplied",
    retentionPolicy: options.retentionPolicy ?? "project",
    createdAt: now,
    updatedAt: now,
    ...(options.metadata ? { metadata: options.metadata } : {}),
  });

  if (!(await fs.exists(dirname(path)))) {
    await fs.mkdir(dirname(path));
  }
  await fs.write(path, `${JSON.stringify(session, null, 2)}\n`);
  return session;
}

export async function getAgentSession(
  sessionId: string,
  options: { root: string },
  fs: FileSystem = nodeFileSystem,
): Promise<AgentSessionItem | null> {
  const path = sessionFilePath(options.root, sessionId);
  if (!(await fs.exists(path))) return null;
  try {
    const raw = JSON.parse(await fs.read(path));
    return validateAgentSessionItem(raw);
  } catch {
    return null;
  }
}

export async function listAgentSessions(
  options: { root: string; state?: AgentSessionState },
  fs: FileSystem = nodeFileSystem,
): Promise<readonly AgentSessionItem[]> {
  const items: AgentSessionItem[] = [];
  for (const rawPath of await fs.list(options.root)) {
    const normalized = (
      rawPath.startsWith(options.root)
        ? relative(options.root, rawPath)
        : rawPath
    ).replaceAll("\\", "/");
    if (
      !normalized.startsWith(".aif/memory/sessions/") ||
      !normalized.endsWith(".json")
    )
      continue;
    const sessionId = normalized
      .replace(/^\.aif\/memory\/sessions\//u, "")
      .replace(/\.json$/u, "");
    const session = await getAgentSession(sessionId, options, fs);
    if (session) {
      if (!options.state || session.state === options.state) {
        items.push(session);
      }
    }
  }
  return items.sort((a, b) => a.sessionId.localeCompare(b.sessionId));
}

export async function closeAgentSession(
  sessionId: string,
  options: {
    root: string;
    outcomes?: readonly string[];
    decisions?: readonly string[];
    state?: "closed" | "compacted" | "archived";
  },
  fs: FileSystem = nodeFileSystem,
): Promise<AgentSessionItem> {
  const existing = await getAgentSession(sessionId, options, fs);
  if (!existing) {
    throw new Error(`agent session not found: ${sessionId}`);
  }
  const now = new Date().toISOString();
  const updatedOutcomes = [
    ...existing.outcomes,
    ...(options.outcomes ?? []).map((o) =>
      secretLikePath(o) ? "[REDACTED]" : o,
    ),
  ];
  const updatedDecisions = [
    ...existing.decisions,
    ...(options.decisions ?? []).map((d) =>
      secretLikePath(d) ? "[REDACTED]" : d,
    ),
  ];
  const closed: AgentSessionItem = validateAgentSessionItem({
    ...existing,
    state: options.state ?? "closed",
    outcomes: updatedOutcomes,
    decisions: updatedDecisions,
    updatedAt: now,
    closedAt: now,
  });
  const path = sessionFilePath(options.root, sessionId);
  await fs.write(path, `${JSON.stringify(closed, null, 2)}\n`);
  return closed;
}

export async function deleteAgentSession(
  sessionId: string,
  options: { root: string },
  fs: FileSystem = nodeFileSystem,
): Promise<void> {
  const path = sessionFilePath(options.root, sessionId);
  if (await fs.exists(path)) {
    await fs.remove(path);
  }
}

export async function exportAgentSession(
  sessionId: string,
  options: { root: string; projectId: string; targetPath?: string },
  fs: FileSystem = nodeFileSystem,
): Promise<AgentSessionExportResult> {
  const session = await getAgentSession(sessionId, options, fs);
  if (!session) {
    throw new Error(`agent session not found: ${sessionId}`);
  }
  const exportResult = validateAgentSessionExportResult({
    schemaVersion: "1",
    projectId: options.projectId,
    exportedAt: new Date().toISOString(),
    session,
  });
  if (options.targetPath) {
    const dest = inside(options.root, options.targetPath);
    if (!(await fs.exists(dirname(dest)))) {
      await fs.mkdir(dirname(dest));
    }
    await fs.write(dest, `${JSON.stringify(exportResult, null, 2)}\n`);
  }
  return exportResult;
}
