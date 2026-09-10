import type { NeutronUsageBudget } from "../../protocol/src/neutron-runtime.js";
import type { NeutronNodeExecutionFailure } from "./neutron-node-errors.js";
import type { ExecuteNeutronTaskNodeResult } from "./neutron-node-execution.js";
import type { NeutronTaskLease } from "./neutron-scheduler-lease.js";
import type { NeutronRetryReason } from "./neutron-scheduler-retry.js";

export interface NeutronAttemptEvidence {
  readonly attempt: number;
  readonly leaseId: string;
  readonly startedAt: number;
  readonly completedAt: number;
  readonly state: "completed" | "failed" | "cancelled" | "timed-out" | "stale";
  readonly retryReason?: NeutronRetryReason;
  readonly error: NeutronNodeExecutionFailure | null;
  readonly usage?: NeutronUsageBudget;
}

export interface NeutronAttemptAuthority {
  current(): number;
  owns(attempt: number): boolean;
  advance(nextAttempt: number): void;
  invalidate(attempt: number): void;
}

export function createNeutronAttemptAuthority(
  initialAttempt: number,
): NeutronAttemptAuthority {
  let current = initialAttempt;
  const invalidated = new Set<number>();
  return {
    current() {
      return current;
    },
    owns(attempt: number) {
      return attempt === current && !invalidated.has(attempt);
    },
    advance(nextAttempt: number) {
      invalidated.add(current);
      current = nextAttempt;
    },
    invalidate(attempt: number) {
      invalidated.add(attempt);
    },
  };
}

export function buildNeutronAttemptEvidence(input: {
  readonly attempt: number;
  readonly lease: NeutronTaskLease;
  readonly startedAt: number;
  readonly completedAt: number;
  readonly execution?: ExecuteNeutronTaskNodeResult;
  readonly stale?: boolean;
  readonly retryReason?: NeutronRetryReason;
  readonly timedOut?: boolean;
}): NeutronAttemptEvidence {
  const error =
    input.execution !== undefined && input.execution.error !== null
      ? input.execution.error
      : null;
  return {
    attempt: input.attempt,
    leaseId: input.lease.leaseId,
    startedAt: input.startedAt,
    completedAt: input.completedAt,
    state: evidenceState(input, error),
    error,
    ...(input.retryReason === undefined
      ? {}
      : { retryReason: input.retryReason }),
    ...(input.execution !== undefined &&
    input.execution.executed &&
    input.execution.usage !== undefined
      ? { usage: input.execution.usage }
      : {}),
  };
}

function evidenceState(
  input: {
    readonly stale?: boolean;
    readonly timedOut?: boolean;
    readonly execution?: ExecuteNeutronTaskNodeResult;
  },
  error: NeutronNodeExecutionFailure | null,
): NeutronAttemptEvidence["state"] {
  if (input.stale === true) return "stale";
  if (input.timedOut === true || error?.code === "timeout") return "timed-out";
  if (error?.code === "cancelled") return "cancelled";
  if (error !== null) return "failed";
  if (input.execution?.executed === true && input.execution.error === null) {
    return "completed";
  }
  return "failed";
}
