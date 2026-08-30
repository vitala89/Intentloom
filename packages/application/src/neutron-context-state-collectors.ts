import type {
  PersistentMemoryItem,
  ProfileDefinition,
  TaskCheckpoint,
  TaskSummary,
  TrustClass,
} from "@intentloom/protocol";
import type { AssembleNeutronContextRequest } from "../../protocol/src/neutron-runtime.js";
import {
  getProfile,
  getTaskSummary,
  listTaskCheckpoints,
  searchPersistentMemory,
  type FileSystem,
} from "./index.js";
import {
  memoryRequested,
  type CollectionResult,
} from "./neutron-context-collectors.js";
import {
  N3_COLLECTOR_MAX_ITEMS,
  N3_PRIORITY,
  type AssemblyCandidate,
} from "./neutron-context-budget.js";
import {
  checkpointExcerpt,
  digestExcerpt,
  estimateTokens,
  profileExcerpt,
  summaryExcerpt,
} from "./neutron-context-state-excerpts.js";

export const N3_PROVENANCE_PROFILE = "intentloom.profile.v1";
export const N3_PROVENANCE_TASK_SUMMARY = "intentloom.task.summary.v1";
export const N3_PROVENANCE_TASK_CHECKPOINT = "intentloom.task.checkpoint.v1";
export const N3_PROVENANCE_MEMORY = "intentloom.memory.persistent.v1";

export const N3_WARNING_TASK_SUMMARY = "task summary unavailable";
export const N3_WARNING_TASK_CHECKPOINT = "task checkpoint unavailable";
export const N3_WARNING_MEMORY_EMPTY =
  "persistent memory search returned no accepted items";

export function profileNotFoundError(name: string): string {
  return `Profile not found: ${name}`;
}

export function roleNotAllowedError(role: string, name: string): string {
  return `Role [${role}] is not allowed by profile [${name}]`;
}

export async function collectSlice3StateCandidates(
  request: AssembleNeutronContextRequest,
  fs: FileSystem,
): Promise<CollectionResult> {
  const warnings: string[] = [];
  const candidates: AssemblyCandidate[] = [
    ...(await collectProfile(request, fs)),
    ...(await collectTask(request, fs, warnings)),
    ...(await collectMemory(request, fs, warnings)),
  ];
  return { candidates, excludedSecretCount: 0, warnings };
}

async function collectProfile(
  request: AssembleNeutronContextRequest,
  fs: FileSystem,
): Promise<readonly AssemblyCandidate[]> {
  if (request.profileName === undefined) return [];
  const profile = await getProfile(
    request.profileName,
    { root: request.root },
    fs,
  );
  if (profile === null) {
    throw new Error(profileNotFoundError(request.profileName));
  }
  if (
    request.role !== undefined &&
    !profile.activeRoles.includes(request.role)
  ) {
    throw new Error(roleNotAllowedError(request.role, profile.name));
  }
  return [mapProfile(profile)];
}

async function collectTask(
  request: AssembleNeutronContextRequest,
  fs: FileSystem,
  warnings: string[],
): Promise<readonly AssemblyCandidate[]> {
  if (request.taskId === undefined) return [];
  const options = { root: request.root };
  const summary = await getTaskSummary(request.taskId, options, fs);
  const latest = latestCheckpoint(
    await listTaskCheckpoints(
      { root: request.root, taskId: request.taskId },
      fs,
    ),
  );
  const candidates: AssemblyCandidate[] = [];
  if (summary === null) {
    warnings.push(N3_WARNING_TASK_SUMMARY);
    candidates.push(
      missingTask(`task-summary:${request.taskId}`, N3_PROVENANCE_TASK_SUMMARY),
    );
  } else {
    candidates.push(mapSummary(summary));
  }
  if (latest === undefined) {
    warnings.push(N3_WARNING_TASK_CHECKPOINT);
    candidates.push(
      missingTask(
        `task-checkpoint:${request.taskId}`,
        N3_PROVENANCE_TASK_CHECKPOINT,
      ),
    );
  } else {
    candidates.push(mapCheckpoint(latest));
  }
  return candidates;
}

async function collectMemory(
  request: AssembleNeutronContextRequest,
  fs: FileSystem,
  warnings: string[],
): Promise<readonly AssemblyCandidate[]> {
  if (!memoryRequested(request)) return [];
  const result = await searchPersistentMemory(
    memoryQuery(request),
    {
      root: request.root,
      projectId: request.projectId,
      maxItems: N3_COLLECTOR_MAX_ITEMS,
    },
    fs,
  );
  if (result.items.length === 0) {
    warnings.push(N3_WARNING_MEMORY_EMPTY);
    return [];
  }
  return result.items.map((item, rank) => mapMemory(item, rank));
}

function memoryQuery(request: AssembleNeutronContextRequest): string {
  return request.query ?? request.taskId ?? "";
}

function latestCheckpoint(
  checkpoints: readonly TaskCheckpoint[],
): TaskCheckpoint | undefined {
  return checkpoints.slice().sort((left, right) => {
    const time = right.updatedAt.localeCompare(left.updatedAt);
    if (time !== 0) return time;
    if (left.id < right.id) return -1;
    if (left.id > right.id) return 1;
    return 0;
  })[0];
}

function mapProfile(profile: ProfileDefinition): AssemblyCandidate {
  const excerpt = profileExcerpt(profile);
  return {
    sourceId: `profile:${profile.name}`,
    kind: "policy",
    trustClass: "user",
    provenance: N3_PROVENANCE_PROFILE,
    tokenCost: estimateTokens(excerpt),
    priority: N3_PRIORITY.profile,
    sourceClass: "profile",
    contentDigest: digestExcerpt(excerpt),
  };
}

function mapSummary(summary: TaskSummary): AssemblyCandidate {
  const excerpt = summaryExcerpt(summary);
  return {
    sourceId: `task-summary:${summary.id}`,
    kind: "task",
    trustClass: mapRecordTrust(summary.trustClass),
    provenance: N3_PROVENANCE_TASK_SUMMARY,
    tokenCost: estimateTokens(excerpt),
    priority: N3_PRIORITY.task,
    sourceClass: "task",
    contentDigest: digestExcerpt(excerpt),
  };
}

function mapCheckpoint(checkpoint: TaskCheckpoint): AssemblyCandidate {
  const excerpt = checkpointExcerpt(checkpoint);
  return {
    sourceId: `task-checkpoint:${checkpoint.id}`,
    kind: "task",
    trustClass: "derived",
    provenance: N3_PROVENANCE_TASK_CHECKPOINT,
    tokenCost: estimateTokens(excerpt),
    priority: N3_PRIORITY.task,
    sourceClass: "task",
    contentDigest: digestExcerpt(excerpt),
  };
}

function mapMemory(
  item: PersistentMemoryItem,
  rank: number,
): AssemblyCandidate {
  return {
    sourceId: `memory:${item.id}`,
    kind: "memory",
    trustClass: mapRecordTrust(item.trustClass),
    provenance: N3_PROVENANCE_MEMORY,
    tokenCost: estimateTokens(item.content),
    priority: N3_PRIORITY.memory,
    sourceClass: "memory",
    rank,
    contentDigest: digestExcerpt(item.content),
  };
}

function missingTask(sourceId: string, provenance: string): AssemblyCandidate {
  return {
    sourceId,
    kind: "task",
    trustClass: "derived",
    provenance,
    tokenCost: 0,
    priority: N3_PRIORITY.task,
    sourceClass: "task",
    exclusionReason: "record-missing",
  };
}

function mapRecordTrust(
  trust: TrustClass,
): "project" | "catalog" | "user" | "derived" {
  if (trust === "user-supplied") return "user";
  if (trust === "agent-generated") return "derived";
  return "project";
}
