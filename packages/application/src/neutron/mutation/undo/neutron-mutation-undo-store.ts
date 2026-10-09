import {
  acquireDirectoryGate,
  exclusiveCreateUtf8File,
  readUtf8FileIfPresent,
  releaseDirectoryGate,
  replaceUtf8FileAtomic,
} from "../apply/neutron-mutation-apply-durable-fs.js";
import { durableApprovalGatePath } from "../apply/neutron-mutation-apply-durable-record.js";
import {
  decodeUndoTransactionRecord,
  encodeUndoTransactionRecord,
  undoTransactionRecordPath,
  type NeutronMutationUndoTransactionRecord,
} from "./neutron-mutation-undo-record.js";

const RETRYABLE = new Set(["failed-before-write", "failed-rolled-back"]);

export type UndoTransactionClaim =
  | {
      readonly kind: "claimed";
      readonly record: NeutronMutationUndoTransactionRecord;
    }
  | {
      readonly kind: "already-undone";
      readonly record: NeutronMutationUndoTransactionRecord;
    }
  | {
      readonly kind: "in-flight";
      readonly record: NeutronMutationUndoTransactionRecord;
    }
  | {
      readonly kind: "reconciliation";
      readonly record: NeutronMutationUndoTransactionRecord;
    }
  | { readonly kind: "conflict" }
  | { readonly kind: "storage-failed" };

export async function readUndoTransaction(
  directory: string,
  originalTransactionId: string,
): Promise<NeutronMutationUndoTransactionRecord | undefined> {
  const raw = await readUtf8FileIfPresent(
    undoTransactionRecordPath(directory, originalTransactionId),
  );
  if (raw === undefined) return undefined;
  return decodeUndoTransactionRecord(raw);
}

export async function claimUndoTransaction(input: {
  readonly directory: string;
  readonly record: NeutronMutationUndoTransactionRecord;
}): Promise<UndoTransactionClaim> {
  const path = undoTransactionRecordPath(
    input.directory,
    input.record.originalTransactionId,
  );
  const created = await exclusiveCreateUtf8File(
    path,
    encodeUndoTransactionRecord(input.record),
  );
  if (created === "created") return { kind: "claimed", record: input.record };
  return classifyOrReplace(path, input.record);
}

export async function transitionUndoTransaction(input: {
  readonly directory: string;
  readonly expected: NeutronMutationUndoTransactionRecord;
  readonly next: NeutronMutationUndoTransactionRecord;
}): Promise<NeutronMutationUndoTransactionRecord | undefined> {
  const path = undoTransactionRecordPath(
    input.directory,
    input.expected.originalTransactionId,
  );
  const gate = durableApprovalGatePath(path);
  if (!(await acquireDirectoryGate(gate))) return undefined;
  try {
    return await replaceExpected(path, input.expected, input.next);
  } finally {
    await releaseDirectoryGate(gate);
  }
}

async function classifyOrReplace(
  path: string,
  incoming: NeutronMutationUndoTransactionRecord,
): Promise<UndoTransactionClaim> {
  const current = await loadRecord(path);
  if (current === undefined) return { kind: "storage-failed" };
  if (!sameUndoScope(current, incoming)) return { kind: "conflict" };
  const classified = classifyExisting(current);
  if (classified.kind !== "retryable") return classified;
  return replaceRetryable(path, incoming);
}

async function replaceRetryable(
  path: string,
  incoming: NeutronMutationUndoTransactionRecord,
): Promise<UndoTransactionClaim> {
  const gate = durableApprovalGatePath(path);
  if (!(await acquireDirectoryGate(gate))) return inFlightOrFailed(path);
  try {
    const current = await loadRecord(path);
    if (current === undefined) return { kind: "storage-failed" };
    if (!sameUndoScope(current, incoming)) return { kind: "conflict" };
    if (!RETRYABLE.has(current.state)) {
      const classified = classifyExisting(current);
      if (classified.kind === "retryable") {
        return { kind: "in-flight", record: current };
      }
      return classified;
    }
    await replaceUtf8FileAtomic(path, encodeUndoTransactionRecord(incoming));
    return { kind: "claimed", record: incoming };
  } finally {
    await releaseDirectoryGate(gate);
  }
}

async function replaceExpected(
  path: string,
  expected: NeutronMutationUndoTransactionRecord,
  next: NeutronMutationUndoTransactionRecord,
): Promise<NeutronMutationUndoTransactionRecord | undefined> {
  const current = await loadRecord(path);
  if (current === undefined) return undefined;
  if (
    current.undoTransactionId !== expected.undoTransactionId ||
    current.state !== expected.state ||
    current.attempt !== expected.attempt
  ) {
    return undefined;
  }
  await replaceUtf8FileAtomic(path, encodeUndoTransactionRecord(next));
  return next;
}

function classifyExisting(
  record: NeutronMutationUndoTransactionRecord,
): UndoTransactionClaim | { readonly kind: "retryable" } {
  if (record.state === "undone") return { kind: "already-undone", record };
  if (record.state === "claimed" || record.state === "executing") {
    return { kind: "in-flight", record };
  }
  if (record.state === "failed-needs-reconciliation") {
    return { kind: "reconciliation", record };
  }
  if (RETRYABLE.has(record.state)) return { kind: "retryable" };
  return { kind: "in-flight", record };
}

async function inFlightOrFailed(path: string): Promise<UndoTransactionClaim> {
  const current = await loadRecord(path);
  if (current === undefined) return { kind: "storage-failed" };
  const classified = classifyExisting(current);
  if (classified.kind === "retryable")
    return { kind: "in-flight", record: current };
  return classified;
}

async function loadRecord(
  path: string,
): Promise<NeutronMutationUndoTransactionRecord | undefined> {
  try {
    const raw = await readUtf8FileIfPresent(path);
    if (raw === undefined) return undefined;
    return decodeUndoTransactionRecord(raw);
  } catch {
    return undefined;
  }
}

function sameUndoScope(
  current: NeutronMutationUndoTransactionRecord,
  incoming: NeutronMutationUndoTransactionRecord,
): boolean {
  return (
    current.originalTransactionId === incoming.originalTransactionId &&
    current.root === incoming.root &&
    current.projectId === incoming.projectId &&
    current.sessionId === incoming.sessionId &&
    current.graphId === incoming.graphId &&
    current.proposalId === incoming.proposalId
  );
}
