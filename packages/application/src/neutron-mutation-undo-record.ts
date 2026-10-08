import { createHash } from "node:crypto";
import { join } from "node:path";
import type { NeutronMutationUndoExecutionResult } from "../../protocol/src/neutron-mutation-undo-execution.js";
import { validateNeutronMutationUndoExecutionResult } from "../../protocol/src/neutron-mutation-undo-execution.js";

export const NEUTRON_MUTATION_UNDO_TRANSACTION_SCHEMA_URN =
  "urn:intentloom:schema:neutron-mutation-undo-transaction:1" as const;

export const NEUTRON_MUTATION_UNDO_TRANSACTION_STATES = [
  "claimed",
  "executing",
  "undone",
  "failed-before-write",
  "failed-rolled-back",
  "failed-needs-reconciliation",
] as const;

export type NeutronMutationUndoTransactionState =
  (typeof NEUTRON_MUTATION_UNDO_TRANSACTION_STATES)[number];

const DIGEST = /^sha256:[0-9a-f]{64}$/u;
const TERMINAL = new Set<NeutronMutationUndoTransactionState>([
  "undone",
  "failed-before-write",
  "failed-rolled-back",
  "failed-needs-reconciliation",
]);

/**
 * Durable Undo transaction. Separate from the Apply record. Digests only.
 */
export interface NeutronMutationUndoTransactionRecord {
  readonly schemaVersion: typeof NEUTRON_MUTATION_UNDO_TRANSACTION_SCHEMA_URN;
  readonly state: NeutronMutationUndoTransactionState;
  readonly undoTransactionId: string;
  readonly originalTransactionId: string;
  readonly snapshotManifestDigest: string;
  readonly pathSetDigest: string;
  readonly root: string;
  readonly projectId: string;
  readonly sessionId: string;
  readonly graphId: string;
  readonly proposalId: string;
  readonly approvalId: string;
  readonly approvalDigest: string;
  readonly claimedAt: number;
  readonly updatedAt: number;
  readonly attempt: number;
  readonly result?: NeutronMutationUndoExecutionResult;
}

export function undoTransactionRecordPath(
  directory: string,
  originalTransactionId: string,
): string {
  const digest = createHash("sha256")
    .update(originalTransactionId, "utf8")
    .digest("hex");
  return join(directory, "undo-transactions", digest, "record.json");
}

export function encodeUndoTransactionRecord(
  record: NeutronMutationUndoTransactionRecord,
): string {
  return `${JSON.stringify(recordBody(record))}\n`;
}

export function decodeUndoTransactionRecord(
  raw: string,
): NeutronMutationUndoTransactionRecord {
  const parsed: unknown = JSON.parse(raw);
  if (!isRecord(parsed)) throw new Error("undo transaction record is invalid");
  assertExactKeys(parsed);
  const state = parsed.state;
  if (!isState(state)) throw new Error("undo transaction state is invalid");
  const result = decodeResult(parsed.result);
  if (TERMINAL.has(state) && result === undefined) {
    throw new Error("undo transaction result is missing");
  }
  if (!TERMINAL.has(state) && result !== undefined) {
    throw new Error("undo transaction result is premature");
  }
  if (parsed.schemaVersion !== NEUTRON_MUTATION_UNDO_TRANSACTION_SCHEMA_URN) {
    throw new Error("undo transaction schema is invalid");
  }
  return {
    schemaVersion: NEUTRON_MUTATION_UNDO_TRANSACTION_SCHEMA_URN,
    state,
    undoTransactionId: requiredString(parsed.undoTransactionId),
    originalTransactionId: requiredString(parsed.originalTransactionId),
    snapshotManifestDigest: requiredDigest(parsed.snapshotManifestDigest),
    pathSetDigest: requiredDigest(parsed.pathSetDigest),
    root: requiredString(parsed.root),
    projectId: requiredString(parsed.projectId),
    sessionId: requiredString(parsed.sessionId),
    graphId: requiredString(parsed.graphId),
    proposalId: requiredString(parsed.proposalId),
    approvalId: requiredString(parsed.approvalId),
    approvalDigest: requiredDigest(parsed.approvalDigest),
    claimedAt: requiredTime(parsed.claimedAt),
    updatedAt: requiredTime(parsed.updatedAt),
    attempt: requiredAttempt(parsed.attempt),
    ...(result === undefined ? {} : { result }),
  };
}

function recordBody(record: NeutronMutationUndoTransactionRecord) {
  return {
    schemaVersion: record.schemaVersion,
    state: record.state,
    undoTransactionId: record.undoTransactionId,
    originalTransactionId: record.originalTransactionId,
    snapshotManifestDigest: record.snapshotManifestDigest,
    pathSetDigest: record.pathSetDigest,
    root: record.root,
    projectId: record.projectId,
    sessionId: record.sessionId,
    graphId: record.graphId,
    proposalId: record.proposalId,
    approvalId: record.approvalId,
    approvalDigest: record.approvalDigest,
    claimedAt: record.claimedAt,
    updatedAt: record.updatedAt,
    attempt: record.attempt,
    ...(record.result === undefined ? {} : { result: record.result }),
  };
}

function decodeResult(
  value: unknown,
): NeutronMutationUndoExecutionResult | undefined {
  if (value === undefined) return undefined;
  return validateNeutronMutationUndoExecutionResult(value);
}

function assertExactKeys(parsed: Record<string, unknown>): void {
  const allowed = new Set([
    "schemaVersion",
    "state",
    "undoTransactionId",
    "originalTransactionId",
    "snapshotManifestDigest",
    "pathSetDigest",
    "root",
    "projectId",
    "sessionId",
    "graphId",
    "proposalId",
    "approvalId",
    "approvalDigest",
    "claimedAt",
    "updatedAt",
    "attempt",
    "result",
  ]);
  for (const key of Object.keys(parsed)) {
    if (!allowed.has(key)) throw new Error("undo transaction key is invalid");
  }
}

function isState(value: unknown): value is NeutronMutationUndoTransactionState {
  return (
    typeof value === "string" &&
    NEUTRON_MUTATION_UNDO_TRANSACTION_STATES.includes(
      value as NeutronMutationUndoTransactionState,
    )
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requiredString(value: unknown): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error("undo transaction string is invalid");
  }
  return value;
}

function requiredDigest(value: unknown): string {
  if (typeof value !== "string" || !DIGEST.test(value)) {
    throw new Error("undo transaction digest is invalid");
  }
  return value;
}

function requiredTime(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error("undo transaction time is invalid");
  }
  return value;
}

function requiredAttempt(value: unknown): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 1) {
    throw new Error("undo transaction attempt is invalid");
  }
  return value;
}
