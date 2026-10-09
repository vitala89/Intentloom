import type { FileSystem } from "../../../index.js";
import {
  parseNeutronMutationUndoRequest,
  type NeutronMutationUndoRequest,
} from "../../../../../protocol/src/neutron-mutation-undo-request.js";
import type { NeutronMutationUndoExecutionResult } from "../../../../../protocol/src/neutron-mutation-undo-execution.js";
import { preflightNeutronMutationUndo } from "./neutron-mutation-undo-preflight.js";
import { undoUnderProjectLock } from "./neutron-mutation-undo-commit.js";
import { undoPreflightIntent } from "./neutron-mutation-undo-locate.js";
import {
  closedUndoExecution,
  executionFromPreflight,
  replayExecution,
} from "./neutron-mutation-undo-public.js";
import type { NeutronMutationUndoTransactionRecord } from "./neutron-mutation-undo-record.js";
import { readUndoTransaction } from "./neutron-mutation-undo-store.js";

export interface ApproveAndUndoNeutronMutationInput {
  readonly directory: string | undefined;
  readonly intent: unknown;
  readonly fs: FileSystem;
  readonly now?: number;
  readonly beforeMutation?: () => Promise<void>;
  readonly failAt?: "before-write" | "after-first-mutation" | "rollback";
}

/**
 * Combined host operation. Re-resolves the original Apply, issues a new
 * Undo approval internally, and executes one transaction. The approval
 * token is not returned. Original Apply approval is not an input.
 */
export async function approveAndUndoNeutronMutation(
  input: ApproveAndUndoNeutronMutationInput,
): Promise<NeutronMutationUndoExecutionResult> {
  const intent = parseRequest(input.intent);
  if (intent === undefined) return rejectedIntent(input.intent);
  const directory = input.directory?.trim() ?? "";
  if (directory === "") {
    return closedUndoExecution(intent, "transaction-not-found");
  }
  const prior = await readPrior(directory, intent.transactionId);
  if (prior.kind === "corrupt") {
    return closedUndoExecution(intent, "integrity-failure");
  }
  const early = priorResult(prior.record, intent);
  if (early !== undefined) return early;
  const preview = await preflightNeutronMutationUndo({
    directory,
    fs: input.fs,
    intent: undoPreflightIntent(intent),
  });
  if (preview.outcome !== "eligible") return executionFromPreflight(preview);
  return undoUnderProjectLock({
    directory,
    intent,
    fs: input.fs,
    now: input.now ?? Date.now(),
    unchangedPathCount: preview.unchangedPathCount,
    attempt: nextAttempt(prior.record),
    ...(input.beforeMutation === undefined
      ? {}
      : { beforeMutation: input.beforeMutation }),
    ...(input.failAt === undefined ? {} : { failAt: input.failAt }),
  });
}

/**
 * Read-only recovery of one exact Undo transaction. It does not approve,
 * lock, or write the project.
 */
export async function readNeutronMutationUndoExecution(input: {
  readonly directory: string | undefined;
  readonly intent: unknown;
}): Promise<NeutronMutationUndoExecutionResult> {
  const intent = parseRequest(input.intent);
  if (intent === undefined) return rejectedIntent(input.intent);
  const directory = input.directory?.trim() ?? "";
  if (directory === "") {
    return closedUndoExecution(intent, "transaction-not-found");
  }
  const prior = await readPrior(directory, intent.transactionId);
  if (prior.kind === "corrupt") {
    return closedUndoExecution(intent, "integrity-failure");
  }
  return statusResult(prior.record, intent);
}

function statusResult(
  record: NeutronMutationUndoTransactionRecord | undefined,
  intent: NeutronMutationUndoRequest,
): NeutronMutationUndoExecutionResult {
  if (record === undefined) {
    return closedUndoExecution(intent, "transaction-not-found");
  }
  if (!sameScope(record, intent)) {
    return closedUndoExecution(intent, "integrity-failure");
  }
  if (record.result !== undefined) return record.result;
  if (record.state === "claimed" || record.state === "executing") {
    return closedUndoExecution(intent, "in-flight", true);
  }
  return closedUndoExecution(intent, "integrity-failure", true);
}

function priorResult(
  record: NeutronMutationUndoTransactionRecord | undefined,
  intent: NeutronMutationUndoRequest,
): NeutronMutationUndoExecutionResult | undefined {
  if (record === undefined) return undefined;
  if (!sameScope(record, intent)) {
    return closedUndoExecution(intent, "integrity-failure");
  }
  if (record.state === "undone" && record.result !== undefined) {
    return replayExecution(record.result, "replay");
  }
  if (record.state === "claimed" || record.state === "executing") {
    return closedUndoExecution(intent, "in-flight", true);
  }
  if (record.state === "failed-needs-reconciliation") {
    return (
      record.result ??
      closedUndoExecution(intent, "reconciliation-required", true)
    );
  }
  return undefined;
}

function sameScope(
  record: NeutronMutationUndoTransactionRecord,
  intent: NeutronMutationUndoRequest,
): boolean {
  return (
    record.originalTransactionId === intent.transactionId &&
    record.root === intent.root &&
    record.projectId === intent.projectId &&
    record.sessionId === intent.sessionId &&
    record.graphId === intent.graphId &&
    record.proposalId === intent.proposalId
  );
}

function nextAttempt(
  record: NeutronMutationUndoTransactionRecord | undefined,
): number {
  if (
    record?.state === "failed-before-write" ||
    record?.state === "failed-rolled-back"
  ) {
    return record.attempt + 1;
  }
  return 1;
}

async function readPrior(
  directory: string,
  originalTransactionId: string,
): Promise<
  | {
      readonly kind: "ok";
      readonly record: NeutronMutationUndoTransactionRecord | undefined;
    }
  | { readonly kind: "corrupt" }
> {
  try {
    return {
      kind: "ok",
      record: await readUndoTransaction(directory, originalTransactionId),
    };
  } catch {
    return { kind: "corrupt" };
  }
}

function parseRequest(value: unknown): NeutronMutationUndoRequest | undefined {
  try {
    return parseNeutronMutationUndoRequest(value);
  } catch {
    return undefined;
  }
}

function rejectedIntent(value: unknown): NeutronMutationUndoExecutionResult {
  return closedUndoExecution(
    {
      proposalId: boundedId(value, "proposalId"),
      transactionId: boundedId(value, "transactionId"),
    },
    "intent-rejected",
  );
}

function boundedId(
  value: unknown,
  field: "proposalId" | "transactionId",
): string {
  if (typeof value !== "object" || value === null) return "invalid";
  const id = (value as Record<string, unknown>)[field];
  return typeof id === "string" && id.length > 0 && id.length <= 4096
    ? id
    : "invalid";
}
