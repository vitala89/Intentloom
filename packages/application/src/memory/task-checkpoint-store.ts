import { createHash } from "node:crypto";
import { dirname, relative } from "node:path";
import {
  validateTaskCheckpoint,
  type TaskCheckpoint,
  type TaskResumeResult,
} from "@intentloom/protocol";
import { nodeFileSystem, type FileSystem } from "../host-file-system.js";
import { inside } from "../project-path.js";

export async function createTaskCheckpoint(
  taskId: string,
  options: {
    root: string;
    completedSteps?: readonly string[];
    unresolvedWork?: readonly string[];
  },
  fs: FileSystem = nodeFileSystem,
): Promise<TaskCheckpoint> {
  const id = `chk-${taskId}-${Date.now()}`;
  const path = inside(options.root, `.aif/memory/checkpoints/${id}.json`);
  const snapshotChecksum = createHash("sha256")
    .update(`${id}:${taskId}:${options.root}:${Date.now()}`)
    .digest("hex");

  const checkpoint = validateTaskCheckpoint({
    schemaVersion: "1",
    id,
    taskId,
    state: "active",
    completedSteps: options.completedSteps ?? [],
    unresolvedWork: options.unresolvedWork ?? [],
    createdSnapshotChecksum: snapshotChecksum,
    invalidatedPlans: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  const dir = dirname(path);
  if (!(await fs.exists(dir))) {
    await fs.mkdir(dir);
  }
  await fs.write(path, `${JSON.stringify(checkpoint, null, 2)}\n`);
  return checkpoint;
}

export async function getTaskCheckpoint(
  id: string,
  options: { root: string },
  fs: FileSystem = nodeFileSystem,
): Promise<TaskCheckpoint | null> {
  const path = inside(options.root, `.aif/memory/checkpoints/${id}.json`);
  if (!(await fs.exists(path))) return null;
  try {
    const content = await fs.read(path);
    return validateTaskCheckpoint(JSON.parse(content));
  } catch {
    return null;
  }
}

export async function listTaskCheckpoints(
  options: { root: string; taskId?: string },
  fs: FileSystem = nodeFileSystem,
): Promise<readonly TaskCheckpoint[]> {
  const root = options.root;
  const allPaths = await fs.list(root);
  const results: TaskCheckpoint[] = [];

  for (const rawPath of allPaths) {
    const rel = rawPath.startsWith(root) ? relative(root, rawPath) : rawPath;
    const normalized = rel.replaceAll("\\", "/");
    if (
      !normalized.startsWith(".aif/memory/checkpoints/") ||
      !normalized.endsWith(".json")
    )
      continue;

    const fullPath = rawPath.startsWith(root)
      ? rawPath
      : inside(root, normalized);
    try {
      const content = await fs.read(fullPath);
      const chk = validateTaskCheckpoint(JSON.parse(content));
      if (options.taskId !== undefined && chk.taskId !== options.taskId)
        continue;
      results.push(chk);
    } catch {
      // Ignore corrupted checkpoint files
    }
  }

  return results.sort((l, r) => r.updatedAt.localeCompare(l.updatedAt));
}

export async function pauseTask(
  checkpointId: string,
  options: { root: string },
  fs: FileSystem = nodeFileSystem,
): Promise<TaskCheckpoint> {
  const existing = await getTaskCheckpoint(checkpointId, options, fs);
  if (!existing) throw new Error(`Task checkpoint not found: ${checkpointId}`);

  const updated = validateTaskCheckpoint({
    ...existing,
    state: "paused",
    updatedAt: new Date().toISOString(),
  });

  const path = inside(
    options.root,
    `.aif/memory/checkpoints/${checkpointId}.json`,
  );
  await fs.write(path, `${JSON.stringify(updated, null, 2)}\n`);
  return updated;
}

export async function cancelTask(
  checkpointId: string,
  options: { root: string },
  fs: FileSystem = nodeFileSystem,
): Promise<TaskCheckpoint> {
  const existing = await getTaskCheckpoint(checkpointId, options, fs);
  if (!existing) throw new Error(`Task checkpoint not found: ${checkpointId}`);

  const updated = validateTaskCheckpoint({
    ...existing,
    state: "cancelled",
    updatedAt: new Date().toISOString(),
  });

  const path = inside(
    options.root,
    `.aif/memory/checkpoints/${checkpointId}.json`,
  );
  await fs.write(path, `${JSON.stringify(updated, null, 2)}\n`);
  return updated;
}

export async function redirectTask(
  checkpointId: string,
  newIntent: string,
  options: { root: string; reason?: string },
  fs: FileSystem = nodeFileSystem,
): Promise<TaskCheckpoint> {
  const existing = await getTaskCheckpoint(checkpointId, options, fs);
  if (!existing) throw new Error(`Task checkpoint not found: ${checkpointId}`);

  const invalidatedPlans = [
    ...existing.invalidatedPlans,
    `plan-invalidated-${Date.now()}`,
  ];

  const updated = validateTaskCheckpoint({
    ...existing,
    state: "redirected",
    unresolvedWork: [...existing.unresolvedWork, `Redirected: ${newIntent}`],
    invalidatedPlans,
    updatedAt: new Date().toISOString(),
  });

  const path = inside(
    options.root,
    `.aif/memory/checkpoints/${checkpointId}.json`,
  );
  await fs.write(path, `${JSON.stringify(updated, null, 2)}\n`);
  return updated;
}

export async function resumeTask(
  checkpointId: string,
  options: { root: string },
  fs: FileSystem = nodeFileSystem,
): Promise<TaskResumeResult> {
  const existing = await getTaskCheckpoint(checkpointId, options, fs);
  if (!existing) throw new Error(`Task checkpoint not found: ${checkpointId}`);

  if (existing.state === "cancelled") {
    throw new Error(`Cannot resume cancelled task checkpoint: ${checkpointId}`);
  }

  const updated = validateTaskCheckpoint({
    ...existing,
    state: "resumed",
    updatedAt: new Date().toISOString(),
  });

  const path = inside(
    options.root,
    `.aif/memory/checkpoints/${checkpointId}.json`,
  );
  await fs.write(path, `${JSON.stringify(updated, null, 2)}\n`);

  return {
    checkpointId,
    verifiedRoot: options.root,
    valid: true,
    invalidatedCount: existing.invalidatedPlans.length,
    resumedAt: new Date().toISOString(),
  };
}

export async function deleteTaskCheckpoint(
  id: string,
  options: { root: string },
  fs: FileSystem = nodeFileSystem,
): Promise<boolean> {
  const path = inside(options.root, `.aif/memory/checkpoints/${id}.json`);
  if (!(await fs.exists(path))) return false;
  await fs.remove(path);
  return true;
}
