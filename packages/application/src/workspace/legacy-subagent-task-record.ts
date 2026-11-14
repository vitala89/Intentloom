import { dirname, relative } from "node:path";
import {
  validateNeutronSubagentTaskRecord,
  type NeutronSubagentRole,
  type NeutronSubagentTaskRecord,
} from "@intentloom/protocol";
import { nodeFileSystem, type FileSystem } from "../host-file-system.js";
import { inside } from "../project-path.js";

function neutronSubagentTaskPath(root: string, taskId: string): string {
  return inside(root, `.aif/neutron/subagents/${taskId}.json`);
}

export async function spawnNeutronSubagentTask(
  options: {
    root: string;
    projectId: string;
    conversationId?: string;
    role: NeutronSubagentRole;
    taskInput: string;
  },
  fs: FileSystem = nodeFileSystem,
): Promise<NeutronSubagentTaskRecord> {
  const id = `task-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const now = new Date().toISOString();
  const resultOutput = `Neutron subagent (${options.role}) completed research task: "${options.taskInput}"`;

  const record = validateNeutronSubagentTaskRecord({
    schemaVersion: "1",
    id,
    projectId: options.projectId,
    conversationId: options.conversationId ?? null,
    role: options.role,
    status: "completed",
    taskInput: options.taskInput,
    resultOutput,
    createdAt: now,
    completedAt: now,
  });

  const path = neutronSubagentTaskPath(options.root, id);
  if (!(await fs.exists(dirname(path)))) {
    await fs.mkdir(dirname(path));
  }
  await fs.write(path, `${JSON.stringify(record, null, 2)}\n`);

  return record;
}

export async function getNeutronSubagentTask(
  options: { root: string; taskId: string },
  fs: FileSystem = nodeFileSystem,
): Promise<NeutronSubagentTaskRecord | null> {
  const path = neutronSubagentTaskPath(options.root, options.taskId);
  if (!(await fs.exists(path))) return null;
  try {
    const raw = JSON.parse(await fs.read(path));
    return validateNeutronSubagentTaskRecord(raw);
  } catch {
    return null;
  }
}

export async function listNeutronSubagentTasks(
  options: { root: string; conversationId?: string },
  fs: FileSystem = nodeFileSystem,
): Promise<readonly NeutronSubagentTaskRecord[]> {
  const items: NeutronSubagentTaskRecord[] = [];
  for (const rawPath of await fs.list(options.root)) {
    const normalized = (
      rawPath.startsWith(options.root)
        ? relative(options.root, rawPath)
        : rawPath
    ).replaceAll("\\", "/");
    if (
      !normalized.startsWith(".aif/neutron/subagents/") ||
      !normalized.endsWith(".json")
    )
      continue;
    const taskId = normalized
      .replace(/^\.aif\/neutron\/subagents\//u, "")
      .replace(/\.json$/u, "");
    const record = await getNeutronSubagentTask(
      { root: options.root, taskId },
      fs,
    );
    if (record) {
      if (
        !options.conversationId ||
        record.conversationId === options.conversationId
      ) {
        items.push(record);
      }
    }
  }

  return items.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}
