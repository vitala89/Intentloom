import { createHash } from "node:crypto";
import { mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { checksum } from "@intentloom/core";
import type { NeutronMutationTransactionState } from "../../../../../protocol/src/neutron-mutation-apply.js";
import { canonicalNeutronMutationJson } from "../../../../../validator/src/neutron-mutation-canonical.js";
import {
  acquireDirectoryGate,
  exclusiveCreateUtf8File,
  readUtf8FileIfPresent,
  releaseDirectoryGate,
  replaceUtf8FileAtomic,
} from "../apply/neutron-mutation-apply-durable-fs.js";
import { createPersistentNeutronMutationApprovalStore } from "../apply/neutron-mutation-apply-durable-store.js";

export const NEUTRON_MUTATION_STATUS_INDEX_SCHEMA_URN =
  "urn:intentloom:schema:neutron-mutation-status-index:1" as const;

const INDEX_RANK: Record<NeutronMutationTransactionState, number> = {
  claimed: 1,
  executing: 2,
  "failed-before-write": 3,
  "failed-needs-reconciliation": 4,
  applied: 5,
};

export class NeutronMutationStatusIndexError extends Error {
  readonly code: "durable-status-corrupt" | "durable-status-unavailable";

  constructor(code: NeutronMutationStatusIndexError["code"]) {
    super(code);
    this.name = "NeutronMutationStatusIndexError";
    this.code = code;
  }
}

export interface NeutronMutationStatusIdentity {
  readonly root: string;
  readonly sessionId: string;
  readonly projectId: string;
  readonly graphId: string;
  readonly proposalId: string;
}

export interface NeutronMutationStatusPointer {
  readonly schemaVersion: typeof NEUTRON_MUTATION_STATUS_INDEX_SCHEMA_URN;
  readonly root: string;
  readonly sessionId: string;
  readonly projectId: string;
  readonly graphId: string;
  readonly proposalId: string;
  readonly approvalId: string;
  readonly transactionId: string;
  readonly recordDigest: string;
}

export async function rememberNeutronMutationStatus(input: {
  readonly directory: string;
  readonly identity: NeutronMutationStatusIdentity;
  readonly approvalId: string;
  readonly transactionId: string;
}): Promise<void> {
  const path = statusIndexPath(input.directory, input.identity);
  await withIndexGate(path, async () => {
    const incoming = pointerFor(input.identity, input);
    const existing = await readPointer(path);
    if (existing === undefined) {
      await exclusiveCreateUtf8File(path, encodePointer(incoming));
      return;
    }
    if (samePointer(existing, incoming)) return;
    if (await incomingOutranks(input.directory, existing, incoming)) {
      await replaceUtf8FileAtomic(path, encodePointer(incoming));
    }
  });
}

export async function readNeutronMutationStatusPointer(
  directory: string,
  identity: NeutronMutationStatusIdentity,
): Promise<NeutronMutationStatusPointer | undefined> {
  const pointer = await readPointer(statusIndexPath(directory, identity));
  if (pointer === undefined) return undefined;
  assertPointerMatchesIdentity(pointer, identity);
  return pointer;
}

export function statusIndexPath(
  directory: string,
  identity: NeutronMutationStatusIdentity,
): string {
  const digest = createHash("sha256")
    .update(canonicalNeutronMutationJson(identity))
    .digest("hex");
  return join(directory, "proposal-index", `${digest}.json`);
}

async function incomingOutranks(
  directory: string,
  existing: NeutronMutationStatusPointer,
  incoming: NeutronMutationStatusPointer,
): Promise<boolean> {
  const store = createPersistentNeutronMutationApprovalStore({ directory });
  const current = await loadRanked(store, existing.approvalId);
  const next = await loadRanked(store, incoming.approvalId);
  return INDEX_RANK[next.state] > INDEX_RANK[current.state];
}

async function loadRanked(
  store: ReturnType<typeof createPersistentNeutronMutationApprovalStore>,
  approvalId: string,
) {
  try {
    const record = await store.getByApproval(approvalId);
    if (record === undefined) {
      throw new NeutronMutationStatusIndexError("durable-status-corrupt");
    }
    return record;
  } catch (error) {
    if (error instanceof NeutronMutationStatusIndexError) throw error;
    throw new NeutronMutationStatusIndexError("durable-status-corrupt");
  }
}

async function readPointer(
  path: string,
): Promise<NeutronMutationStatusPointer | undefined> {
  const raw = await readUtf8FileIfPresent(path);
  if (raw === undefined) return undefined;
  try {
    return decodePointer(raw);
  } catch (error) {
    if (error instanceof NeutronMutationStatusIndexError) throw error;
    throw new NeutronMutationStatusIndexError("durable-status-corrupt");
  }
}

function pointerFor(
  identity: NeutronMutationStatusIdentity,
  link: { readonly approvalId: string; readonly transactionId: string },
): NeutronMutationStatusPointer {
  const unsigned = {
    schemaVersion: NEUTRON_MUTATION_STATUS_INDEX_SCHEMA_URN,
    root: identity.root,
    sessionId: identity.sessionId,
    projectId: identity.projectId,
    graphId: identity.graphId,
    proposalId: identity.proposalId,
    approvalId: link.approvalId,
    transactionId: link.transactionId,
  };
  return {
    ...unsigned,
    recordDigest: `sha256:${checksum(canonicalNeutronMutationJson(unsigned))}`,
  };
}

function encodePointer(pointer: NeutronMutationStatusPointer): string {
  return `${JSON.stringify(pointer)}\n`;
}

function assertPointerMatchesIdentity(
  pointer: NeutronMutationStatusPointer,
  identity: NeutronMutationStatusIdentity,
): void {
  if (
    pointer.root !== identity.root ||
    pointer.sessionId !== identity.sessionId ||
    pointer.projectId !== identity.projectId ||
    pointer.graphId !== identity.graphId ||
    pointer.proposalId !== identity.proposalId
  ) {
    throw new NeutronMutationStatusIndexError("durable-status-corrupt");
  }
}

function decodePointer(raw: string): NeutronMutationStatusPointer {
  const parsed: unknown = JSON.parse(raw);
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new NeutronMutationStatusIndexError("durable-status-corrupt");
  }
  const record = parsed as Record<string, unknown>;
  rejectIndexSecrets(record);
  const unsigned = {
    schemaVersion: required(record.schemaVersion),
    root: required(record.root),
    sessionId: required(record.sessionId),
    projectId: required(record.projectId),
    graphId: required(record.graphId),
    proposalId: required(record.proposalId),
    approvalId: required(record.approvalId),
    transactionId: required(record.transactionId),
  };
  if (unsigned.schemaVersion !== NEUTRON_MUTATION_STATUS_INDEX_SCHEMA_URN) {
    throw new NeutronMutationStatusIndexError("durable-status-corrupt");
  }
  const recordDigest = required(record.recordDigest);
  const expected = `sha256:${checksum(canonicalNeutronMutationJson(unsigned))}`;
  if (recordDigest !== expected) {
    throw new NeutronMutationStatusIndexError("durable-status-corrupt");
  }
  if (Object.keys(record).length !== 9) {
    throw new NeutronMutationStatusIndexError("durable-status-corrupt");
  }
  return {
    ...unsigned,
    schemaVersion: NEUTRON_MUTATION_STATUS_INDEX_SCHEMA_URN,
    recordDigest,
  };
}

function rejectIndexSecrets(record: Record<string, unknown>): void {
  for (const key of [
    "approvalToken",
    "previousContent",
    "proposedContent",
    "currentContent",
    "content",
    "files",
    "prompt",
    "prompts",
    "reasoning",
  ]) {
    if (key in record) {
      throw new NeutronMutationStatusIndexError("durable-status-corrupt");
    }
  }
}

function required(value: unknown): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new NeutronMutationStatusIndexError("durable-status-corrupt");
  }
  return value;
}

function samePointer(
  existing: NeutronMutationStatusPointer,
  incoming: NeutronMutationStatusPointer,
): boolean {
  return (
    existing.approvalId === incoming.approvalId &&
    existing.transactionId === incoming.transactionId &&
    existing.proposalId === incoming.proposalId
  );
}

async function withIndexGate<T>(
  path: string,
  operation: () => Promise<T>,
): Promise<T> {
  const gate = `${path}.gate`;
  await mkdir(dirname(path), { recursive: true });
  for (let attempt = 0; attempt < 40; attempt += 1) {
    if (await acquireDirectoryGate(gate)) {
      try {
        return await operation();
      } finally {
        await releaseDirectoryGate(gate);
      }
    }
    await delay(5);
  }
  throw new NeutronMutationStatusIndexError("durable-status-unavailable");
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
