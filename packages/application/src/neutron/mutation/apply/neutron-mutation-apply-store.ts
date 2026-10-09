import type {
  NeutronMutationApplyResult,
  NeutronMutationTransactionState,
} from "../../../../../protocol/src/neutron-mutation-apply.js";
import type { NeutronMutationUndoRestorationClaim } from "../../../../../protocol/src/neutron-mutation-undo-snapshot.js";
import { durableTransactionRecordDigest } from "./neutron-mutation-apply-durable-record.js";
import { neutronMutationVerificationRetryEligible } from "../verification/neutron-mutation-verification-retry-eligibility.js";

export interface NeutronMutationTransactionRecord {
  readonly transactionId: string;
  readonly approvalId: string;
  readonly approvalDigest: string;
  readonly reviewArtifactDigest: string;
  readonly planDigest: string;
  readonly lockKey: string;
  readonly state: NeutronMutationTransactionState;
  readonly claimedAt: number;
  readonly updatedAt: number;
  readonly result?: NeutronMutationApplyResult;
  readonly undoRestoration?: NeutronMutationUndoRestorationClaim;
}

export type NeutronMutationClaimOutcome =
  | {
      readonly kind: "claimed";
      readonly record: NeutronMutationTransactionRecord;
    }
  | {
      readonly kind: "replay";
      readonly record: NeutronMutationTransactionRecord;
    }
  | {
      readonly kind: "conflict";
      readonly record: NeutronMutationTransactionRecord;
      readonly code: "approval-already-claimed" | "approval-consumed";
    }
  | {
      readonly kind: "in-flight";
      readonly record: NeutronMutationTransactionRecord;
    }
  | {
      readonly kind: "storage-failed";
    };

export interface NeutronMutationTransitionInput {
  readonly approvalId: string;
  readonly expected: NeutronMutationTransactionState;
  readonly next: NeutronMutationTransactionState;
  readonly result?: NeutronMutationApplyResult;
  readonly updatedAt: number;
  /**
   * When set, the write compare-and-sets the Slice 3.1 record digest.
   * Transaction state alone stays true after a verification update, so a
   * stale cross-process retry must also match this digest.
   */
  readonly expectedRecordDigest?: string;
  readonly expectedTransactionId?: string;
  readonly undoRestoration?: NeutronMutationUndoRestorationClaim;
}

export interface NeutronMutationApprovalStore {
  getByApproval(
    approvalId: string,
  ): Promise<NeutronMutationTransactionRecord | undefined>;
  claim(
    record: NeutronMutationTransactionRecord,
  ): Promise<NeutronMutationClaimOutcome>;
  transition(
    input: NeutronMutationTransitionInput,
  ): Promise<NeutronMutationTransactionRecord | undefined>;
}

const TERMINAL_CONSUMED = new Set<NeutronMutationTransactionState>([
  "applied",
  "failed-before-write",
  "failed-needs-reconciliation",
]);

/** Test-only process memory. Not production authority. */
export function createMemoryNeutronMutationApprovalStore(): NeutronMutationApprovalStore {
  const records = new Map<string, NeutronMutationTransactionRecord>();
  const tails = new Map<string, Promise<void>>();
  return {
    async getByApproval(approvalId) {
      return records.get(approvalId);
    },
    async claim(record) {
      return withApprovalGate(tails, record.approvalId, async () => {
        const existing = records.get(record.approvalId);
        if (existing === undefined) {
          records.set(record.approvalId, record);
          return { kind: "claimed", record };
        }
        return classifyExistingClaim(existing, record);
      });
    },
    async transition(input) {
      return withApprovalGate(tails, input.approvalId, async () => {
        const existing = records.get(input.approvalId);
        if (
          existing === undefined ||
          !verificationSnapshotCurrent(existing, input)
        ) {
          return undefined;
        }
        const next: NeutronMutationTransactionRecord = {
          ...existing,
          state: input.next,
          updatedAt: input.updatedAt,
          ...(input.result !== undefined ? { result: input.result } : {}),
          ...(input.undoRestoration !== undefined
            ? { undoRestoration: input.undoRestoration }
            : {}),
        };
        records.set(input.approvalId, next);
        return next;
      });
    },
  };
}

/**
 * Apply transitions compare transaction state only. Verification retry also
 * requires the re-read record to still be retry-eligible and to match the
 * snapshot digest captured before verification.
 */
export function verificationSnapshotCurrent(
  record: NeutronMutationTransactionRecord,
  input: NeutronMutationTransitionInput,
): boolean {
  if (record.state !== input.expected) return false;
  if (input.expectedRecordDigest === undefined) return true;
  if (record.approvalId !== input.approvalId) return false;
  if (
    input.expectedTransactionId !== undefined &&
    record.transactionId !== input.expectedTransactionId
  ) {
    return false;
  }
  if (!neutronMutationVerificationRetryEligible(record)) return false;
  return durableTransactionRecordDigest(record) === input.expectedRecordDigest;
}

export function classifyExistingClaim(
  existing: NeutronMutationTransactionRecord,
  incoming: NeutronMutationTransactionRecord,
): NeutronMutationClaimOutcome {
  if (sameTransactionIdentity(existing, incoming)) {
    if (existing.state === "applied" && existing.result !== undefined) {
      return { kind: "replay", record: existing };
    }
    if (existing.state === "claimed" || existing.state === "executing") {
      return { kind: "in-flight", record: existing };
    }
  }
  if (TERMINAL_CONSUMED.has(existing.state) || existing.state === "applied") {
    return { kind: "conflict", record: existing, code: "approval-consumed" };
  }
  return {
    kind: "conflict",
    record: existing,
    code: "approval-already-claimed",
  };
}

export function sameTransactionIdentity(
  left: Pick<
    NeutronMutationTransactionRecord,
    "transactionId" | "approvalId" | "reviewArtifactDigest" | "planDigest"
  >,
  right: Pick<
    NeutronMutationTransactionRecord,
    "transactionId" | "approvalId" | "reviewArtifactDigest" | "planDigest"
  >,
): boolean {
  return (
    left.transactionId === right.transactionId &&
    left.approvalId === right.approvalId &&
    left.reviewArtifactDigest === right.reviewArtifactDigest &&
    left.planDigest === right.planDigest
  );
}

async function withApprovalGate<T>(
  tails: Map<string, Promise<void>>,
  approvalId: string,
  operation: () => Promise<T>,
): Promise<T> {
  const box: { done?: () => void } = {};
  const current = new Promise<void>((ok) => {
    box.done = ok;
  });
  const previous = tails.get(approvalId) ?? Promise.resolve();
  tails.set(
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
