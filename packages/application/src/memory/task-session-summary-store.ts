import { dirname, relative } from "node:path";
import {
  validateSessionSummary,
  validateTaskSummary,
  type RetentionState,
  type SessionSummary,
  type TaskSummary,
  type TrustClass,
} from "@intentloom/protocol";
import { nodeFileSystem, type FileSystem } from "../host-file-system.js";
import { inside, secretLikePath } from "../project-path.js";

export async function recordTaskSummary(
  input: Omit<TaskSummary, "schemaVersion" | "createdAt"> & {
    createdAt?: string;
  },
  options: { root: string },
  fs: FileSystem = nodeFileSystem,
): Promise<TaskSummary> {
  const root = options.root;
  const createdAt = input.createdAt ?? new Date().toISOString();

  const sanitizedAffectedPaths = input.affectedPaths.filter(
    (path) => !secretLikePath(path),
  );

  const summary: TaskSummary = validateTaskSummary({
    schemaVersion: "1",
    id: input.id,
    root: input.root,
    intent: input.intent,
    ...(input.planRef !== undefined ? { planRef: input.planRef } : {}),
    affectedPaths: sanitizedAffectedPaths,
    validationOutcome: input.validationOutcome,
    evidenceReferences: input.evidenceReferences,
    usedSkills: input.usedSkills,
    unresolvedWork: input.unresolvedWork,
    provenance: input.provenance,
    trustClass: input.trustClass,
    retentionState: input.retentionState,
    createdAt,
  });

  const path = inside(root, `.aif/memory/tasks/${summary.id}.json`);
  const directory = dirname(path);
  if (!(await fs.exists(directory))) {
    await fs.mkdir(directory);
  }
  await fs.write(path, `${JSON.stringify(summary, null, 2)}\n`);
  return summary;
}

export async function listTaskSummaries(
  options: {
    root: string;
    trustClass?: TrustClass;
    retentionState?: RetentionState;
  },
  fs: FileSystem = nodeFileSystem,
): Promise<readonly TaskSummary[]> {
  const root = options.root;
  const allPaths = await fs.list(root);
  const results: TaskSummary[] = [];

  for (const rawPath of allPaths) {
    const rel = rawPath.startsWith(root) ? relative(root, rawPath) : rawPath;
    const normalized = rel.replaceAll("\\", "/");
    if (
      !normalized.startsWith(".aif/memory/tasks/") ||
      !normalized.endsWith(".json")
    )
      continue;

    const fullPath = rawPath.startsWith(root)
      ? rawPath
      : inside(root, normalized);
    try {
      const content = await fs.read(fullPath);
      const summary = validateTaskSummary(JSON.parse(content));
      if (
        options.trustClass !== undefined &&
        summary.trustClass !== options.trustClass
      )
        continue;
      if (
        options.retentionState !== undefined &&
        summary.retentionState !== options.retentionState
      )
        continue;
      results.push(summary);
    } catch {
      // Ignore corrupted memory records
    }
  }

  return results.sort((left, right) =>
    right.createdAt.localeCompare(left.createdAt),
  );
}

export async function getTaskSummary(
  id: string,
  options: { root: string },
  fs: FileSystem = nodeFileSystem,
): Promise<TaskSummary | null> {
  const root = options.root;
  const path = inside(root, `.aif/memory/tasks/${id}.json`);
  if (!(await fs.exists(path))) return null;
  try {
    const content = await fs.read(path);
    return validateTaskSummary(JSON.parse(content));
  } catch {
    return null;
  }
}

export async function recordSessionSummary(
  input: Omit<SessionSummary, "schemaVersion" | "createdAt"> & {
    createdAt?: string;
  },
  options: { root: string },
  fs: FileSystem = nodeFileSystem,
): Promise<SessionSummary> {
  const root = options.root;
  const createdAt = input.createdAt ?? new Date().toISOString();

  const summary: SessionSummary = validateSessionSummary({
    schemaVersion: "1",
    id: input.id,
    root: input.root,
    profile: input.profile,
    activeAdapters: input.activeAdapters,
    completedTaskIds: input.completedTaskIds,
    ...(input.summaryNotes !== undefined
      ? { summaryNotes: input.summaryNotes }
      : {}),
    createdAt,
  });

  const path = inside(root, `.aif/memory/sessions/${summary.id}.json`);
  const directory = dirname(path);
  if (!(await fs.exists(directory))) {
    await fs.mkdir(directory);
  }
  await fs.write(path, `${JSON.stringify(summary, null, 2)}\n`);
  return summary;
}

export async function listSessionSummaries(
  options: { root: string },
  fs: FileSystem = nodeFileSystem,
): Promise<readonly SessionSummary[]> {
  const root = options.root;
  const allPaths = await fs.list(root);
  const results: SessionSummary[] = [];

  for (const rawPath of allPaths) {
    const rel = rawPath.startsWith(root) ? relative(root, rawPath) : rawPath;
    const normalized = rel.replaceAll("\\", "/");
    if (
      !normalized.startsWith(".aif/memory/sessions/") ||
      !normalized.endsWith(".json")
    )
      continue;

    const fullPath = rawPath.startsWith(root)
      ? rawPath
      : inside(root, normalized);
    try {
      const content = await fs.read(fullPath);
      const summary = validateSessionSummary(JSON.parse(content));
      results.push(summary);
    } catch {
      // Ignore corrupted memory records
    }
  }

  return results.sort((left, right) =>
    right.createdAt.localeCompare(left.createdAt),
  );
}
