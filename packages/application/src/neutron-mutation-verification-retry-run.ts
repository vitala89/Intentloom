import type { NeutronMutationVerificationRetryQuery } from "../../protocol/src/neutron-mutation-verification-retry-rpc.js";
import {
  notEligibleVerificationRetry,
  type NeutronMutationVerificationRetryResult,
} from "../../protocol/src/neutron-mutation-verification-retry-result.js";
import type { FileSystem } from "./index.js";
import { durableTransactionRecordDigest } from "./neutron-mutation-apply-durable-record.js";
import { buildNeutronMutationApplyResult } from "./neutron-mutation-apply-result.js";
import { createPersistentNeutronMutationApprovalStore } from "./neutron-mutation-apply-durable-store.js";
import type { NeutronMutationTransactionRecord } from "./neutron-mutation-apply-store.js";
import { NeutronMutationStatusIndexError } from "./neutron-mutation-status-index.js";
import { publicNeutronMutationStatus } from "./neutron-mutation-status-public.js";
import { readNeutronMutationStatus } from "./neutron-mutation-status-read.js";
import { hiddenMetadataFromDiagnostics } from "./neutron-mutation-verification-hidden.js";
import { verifyNeutronMutationResult } from "./neutron-mutation-verification.js";
import { neutronMutationVerificationRetryEligible } from "./neutron-mutation-verification-retry-eligibility.js";

const tails = new Map<string, Promise<void>>();

export class NeutronMutationVerificationRetryCancelled extends Error {
  readonly code = "verification-retry-cancelled" as const;

  constructor() {
    super("verification-retry-cancelled");
    this.name = "NeutronMutationVerificationRetryCancelled";
  }
}

export interface NeutronMutationVerificationRetryInput {
  readonly directory: string | undefined;
  readonly query: NeutronMutationVerificationRetryQuery;
  readonly fs: FileSystem;
  readonly signal?: AbortSignal;
  readonly now?: () => number;
  /**
   * Same-process queue. Independent processes pass distinct maps. Correctness
   * does not depend on sharing one map.
   */
  readonly processGate?: Map<string, Promise<void>>;
  /** Runs after the eligible snapshot is taken and before verification. */
  readonly afterEligibleSnapshot?: (
    record: NeutronMutationTransactionRecord,
  ) => Promise<void>;
}

/**
 * Re-runs Slice 4 verification for an already applied transaction.
 * A process-local queue is only an optimization. Persistence re-reads the
 * canonical record under the approval-record gate and compare-and-sets the
 * Slice 3.1 digest of the eligible snapshot. Project content is only read.
 */
export async function retryAppliedNeutronMutationVerification(
  input: NeutronMutationVerificationRetryInput,
): Promise<NeutronMutationVerificationRetryResult> {
  throwIfCancelled(input.signal);
  const observed = await readNeutronMutationStatus({
    directory: input.directory,
    graphId: input.query.graphId,
    projectId: input.query.projectId,
    proposalId: input.query.proposalId,
    root: input.query.root,
    sessionId: input.query.sessionId,
    ...(input.query.transactionId === undefined
      ? {}
      : { transactionId: input.query.transactionId }),
    ...(input.signal === undefined ? {} : { signal: input.signal }),
  });
  if (observed.outcome !== "recorded" || observed.approvalId === undefined) {
    return observed.outcome === "recorded"
      ? notEligibleVerificationRetry({
          proposalId: input.query.proposalId,
          ...(input.query.transactionId === undefined
            ? {}
            : { transactionId: input.query.transactionId }),
        })
      : observed;
  }
  return withRetryGate(input.processGate ?? tails, observed.approvalId, () =>
    verifyAndPersist(input, observed.approvalId ?? ""),
  );
}

async function verifyAndPersist(
  input: NeutronMutationVerificationRetryInput,
  approvalId: string,
): Promise<NeutronMutationVerificationRetryResult> {
  throwIfCancelled(input.signal);
  const record = await loadRecord(input.directory ?? "", approvalId);
  if (
    record.transactionId !== input.query.transactionId &&
    input.query.transactionId !== undefined
  ) {
    throw new NeutronMutationStatusIndexError("durable-status-corrupt");
  }
  if (!neutronMutationVerificationRetryEligible(record)) {
    return notEligibleVerificationRetry({
      proposalId: input.query.proposalId,
      transactionId: record.transactionId,
    });
  }
  await input.afterEligibleSnapshot?.(record);
  throwIfCancelled(input.signal);
  const verified = await verifyCurrentTree(input, record);
  throwIfCancelled(input.signal);
  const stored = await persistVerification(input, record, verified);
  if (stored === undefined) {
    return notEligibleVerificationRetry({
      proposalId: input.query.proposalId,
      transactionId: record.transactionId,
    });
  }
  return publicNeutronMutationStatus({
    proposalId: input.query.proposalId,
    record: stored,
  });
}

async function verifyCurrentTree(
  input: NeutronMutationVerificationRetryInput,
  record: NeutronMutationTransactionRecord,
) {
  const existing = record.result;
  const pending = existing?.verification;
  if (existing === undefined || pending === undefined) {
    throw new NeutronMutationStatusIndexError("durable-status-corrupt");
  }
  if (
    pending.rootIdentity !== input.query.root ||
    pending.projectId !== input.query.projectId
  ) {
    throw new NeutronMutationStatusIndexError("durable-status-corrupt");
  }
  return verifyNeutronMutationResult({
    transactionId: record.transactionId,
    approvalId: record.approvalId,
    reviewArtifactDigest: record.reviewArtifactDigest,
    planDigest: record.planDigest,
    projectId: pending.projectId,
    root: pending.rootIdentity,
    fs: input.fs,
    preApplyProjectStateDigest: pending.preApplyProjectStateDigest,
    approvedChangedPaths: pending.approvedChangedPaths,
    createdPaths: existing.createdPaths,
    updatedPaths: existing.updatedPaths,
    unchangedPaths: existing.unchangedPaths,
    fileBindings: pending.byteVerification.files.map((file) => ({
      path: file.path,
      contentDigest: file.expectedContentDigest,
    })),
    applied: true,
    rollback: pending.rollback,
    hiddenMetadataExistedBefore: hiddenMetadataFromDiagnostics(
      pending.diagnostics,
    ),
    ...(input.now !== undefined ? { now: input.now } : {}),
  });
}

async function persistVerification(
  input: NeutronMutationVerificationRetryInput,
  record: NeutronMutationTransactionRecord,
  verified: Awaited<ReturnType<typeof verifyNeutronMutationResult>>,
) {
  const existing = record.result;
  if (existing === undefined || input.directory === undefined) return undefined;
  const store = createPersistentNeutronMutationApprovalStore({
    directory: input.directory,
  });
  const result = buildNeutronMutationApplyResult({
    transactionId: record.transactionId,
    approvalId: record.approvalId,
    reviewArtifactDigest: record.reviewArtifactDigest,
    planDigest: record.planDigest,
    status: existing.status,
    applied: true,
    changedPaths: existing.changedPaths,
    createdPaths: existing.createdPaths,
    updatedPaths: existing.updatedPaths,
    unchangedPaths: existing.unchangedPaths,
    rollbackCompleted: existing.rollbackCompleted,
    reconciliationRequired: verified.reconciliationRequired,
    ...(existing.failureCode !== undefined
      ? { failureCode: existing.failureCode }
      : {}),
    diagnostics: [
      ...new Set([...existing.diagnostics, ...verified.diagnostics]),
    ],
    verification: verified,
  });
  return store.transition({
    approvalId: record.approvalId,
    expected: "applied",
    expectedRecordDigest: durableTransactionRecordDigest(record),
    expectedTransactionId: record.transactionId,
    next: "applied",
    result,
    updatedAt: input.now?.() ?? Date.now(),
  });
}

async function loadRecord(directory: string, approvalId: string) {
  try {
    const store = createPersistentNeutronMutationApprovalStore({ directory });
    const record = await store.getByApproval(approvalId);
    if (record === undefined || record.approvalId !== approvalId) {
      throw new NeutronMutationStatusIndexError("durable-status-corrupt");
    }
    return record;
  } catch (error) {
    if (error instanceof NeutronMutationStatusIndexError) throw error;
    throw new NeutronMutationStatusIndexError("durable-status-corrupt");
  }
}

function throwIfCancelled(signal: AbortSignal | undefined): void {
  if (signal?.aborted === true) {
    throw new NeutronMutationVerificationRetryCancelled();
  }
}

async function withRetryGate<T>(
  queue: Map<string, Promise<void>>,
  approvalId: string,
  operation: () => Promise<T>,
): Promise<T> {
  const box: { done?: () => void } = {};
  const current = new Promise<void>((ok) => {
    box.done = ok;
  });
  const previous = queue.get(approvalId) ?? Promise.resolve();
  queue.set(
    approvalId,
    previous.then(() => current),
  );
  await previous;
  try {
    return await operation();
  } finally {
    box.done?.();
  }
}
