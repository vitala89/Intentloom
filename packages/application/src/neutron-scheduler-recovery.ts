import type { ExecuteNeutronTaskNodeResult } from "./neutron-node-execution.js";
import {
  buildNeutronAttemptEvidence,
  createNeutronAttemptAuthority,
  type NeutronAttemptEvidence,
} from "./neutron-scheduler-attempt.js";
import { isNeutronSessionCancelled } from "./neutron-scheduler-cancellation.js";
import type { NeutronSchedulerClock } from "./neutron-scheduler-clock.js";
import { NeutronSchedulerError } from "./neutron-scheduler-errors.js";
import {
  neutronTaskLeaseId,
  type NeutronTaskLease,
} from "./neutron-scheduler-lease.js";
import { acquireNeutronTaskLease } from "./neutron-scheduler-lease-store.js";
import {
  classifyNeutronRetry,
  type NeutronRetryReason,
} from "./neutron-scheduler-retry.js";
import {
  executeNeutronRecoverableAttempt,
  type NeutronAttemptRun,
} from "./neutron-scheduler-run-attempt.js";
import type { ExecuteReadyNeutronTaskNodesInput } from "./neutron-scheduler-wave-types.js";

export interface RecoverableLease {
  readonly taskId: string;
  readonly lease: NeutronTaskLease;
  readonly attempt: number;
  readonly priorAttempts: readonly NeutronAttemptEvidence[];
}

export async function acquireRecoverableNodeLease(
  input: ExecuteReadyNeutronTaskNodesInput,
  clock: NeutronSchedulerClock,
  ownerId: string,
  taskId: string,
  maxAttempts: number,
): Promise<RecoverableLease> {
  try {
    const lease = await acquireLease(input, clock, ownerId, taskId, 1);
    return { taskId, lease, attempt: 1, priorAttempts: [] };
  } catch (error) {
    if (
      !(error instanceof NeutronSchedulerError) ||
      error.code !== "lease-expired"
    ) {
      throw error;
    }
    const retry = classifyNeutronRetry({
      attempt: 1,
      cancelled: isNeutronSessionCancelled(input.session, input.signal),
      schedulerError: error,
      maxAttempts,
    });
    if (retry.retryable !== true || retry.nextAttempt === undefined) {
      throw error;
    }
    const lease = await acquireLease(
      input,
      clock,
      ownerId,
      taskId,
      retry.nextAttempt,
    );
    return {
      taskId,
      lease,
      attempt: retry.nextAttempt,
      priorAttempts: [
        expiredAttemptEvidence(input, clock, taskId, error, retry.reason),
      ],
    };
  }
}

export async function runRecoverableAdmittedNode(
  input: ExecuteReadyNeutronTaskNodesInput,
  clock: NeutronSchedulerClock,
  ownerId: string,
  maxAttempts: number,
  acquired: RecoverableLease,
): Promise<{
  readonly taskId: string;
  readonly lease: NeutronTaskLease;
  readonly execution: ExecuteNeutronTaskNodeResult;
  readonly attempts: readonly NeutronAttemptEvidence[];
  readonly retryExhausted: boolean;
  readonly retryReason?: NeutronRetryReason;
}> {
  const authority = createNeutronAttemptAuthority(acquired.attempt);
  const attempts = [...acquired.priorAttempts];
  let attempt = acquired.attempt;
  let lease = acquired.lease;
  let ceiling: readonly string[] | undefined;
  let lastExecution: ExecuteNeutronTaskNodeResult | undefined;
  let retryReason: NeutronRetryReason | undefined;

  while (true) {
    const startedAt = clock.nowMs();
    const run = await executeNeutronRecoverableAttempt(
      input,
      clock,
      ownerId,
      attempt,
      lease,
      ceiling,
    );
    lastExecution = run.execution;
    const stale = !authority.owns(attempt) || run.untrustedSuccess;
    const decision = classifyAfterAttempt(attempt, maxAttempts, run);
    attempts.push(
      buildNeutronAttemptEvidence({
        attempt,
        lease,
        startedAt,
        completedAt: clock.nowMs(),
        execution: run.execution,
        stale,
        timedOut: run.timedOut,
        ...(decision.reason === undefined
          ? {}
          : { retryReason: decision.reason }),
      }),
    );
    if (stale && run.execution.executed && run.execution.error === null) {
      lastExecution = untrustedExecution(run.execution);
    }
    if (run.execution.executed && run.execution.error === null && !stale) {
      return finish(acquired.taskId, lease, lastExecution, attempts, false);
    }
    retryReason = decision.reason;
    if (decision.retryable !== true || decision.nextAttempt === undefined) {
      return finish(
        acquired.taskId,
        lease,
        lastExecution,
        attempts,
        decision.reason === "retry-exhausted",
        retryReason,
      );
    }
    authority.advance(decision.nextAttempt);
    ceiling = nextCeiling(ceiling, lastExecution);
    attempt = decision.nextAttempt;
    lease = await acquireLease(input, clock, ownerId, acquired.taskId, attempt);
  }
}

function classifyAfterAttempt(
  attempt: number,
  maxAttempts: number,
  run: NeutronAttemptRun,
) {
  const schedulerError = run.leaseLost
    ? new NeutronSchedulerError("lease-lost", "lease renewal failed")
    : undefined;
  const failure = run.timedOut
    ? {
        code: "timeout" as const,
        stage: "timeout" as const,
        message: "Node execution timed out",
      }
    : run.execution.error;
  return classifyNeutronRetry({
    attempt,
    cancelled: run.cancelled,
    budgetExceeded: run.budgetExceeded,
    failure,
    ...(schedulerError === undefined ? {} : { schedulerError }),
    maxAttempts,
  });
}

async function acquireLease(
  input: ExecuteReadyNeutronTaskNodesInput,
  clock: NeutronSchedulerClock,
  ownerId: string,
  taskId: string,
  attempt: number,
): Promise<NeutronTaskLease> {
  return acquireNeutronTaskLease({
    root: input.session.root,
    fs: input.fs,
    clock,
    sessionId: input.session.sessionId,
    taskId,
    ownerId,
    attempt,
    ...(input.nodeTimeoutMs === undefined
      ? {}
      : { nodeTimeoutMs: input.nodeTimeoutMs }),
  });
}

function expiredAttemptEvidence(
  input: ExecuteReadyNeutronTaskNodesInput,
  clock: NeutronSchedulerClock,
  taskId: string,
  error: NeutronSchedulerError,
  reason: NeutronRetryReason,
): NeutronAttemptEvidence {
  const now = clock.nowMs();
  return {
    attempt: 1,
    leaseId: neutronTaskLeaseId(input.session.sessionId, taskId, 1),
    startedAt: now,
    completedAt: now,
    state: "timed-out",
    retryReason: reason,
    error: {
      code: "timeout",
      stage: "timeout",
      message: error.message,
    },
  };
}

function nextCeiling(
  current: readonly string[] | undefined,
  execution: ExecuteNeutronTaskNodeResult | undefined,
): readonly string[] | undefined {
  if (execution === undefined || !execution.executed) return current;
  const tools = execution.capabilities.allowedTools;
  if (current === undefined) return [...tools];
  return current.filter((tool) => tools.includes(tool));
}

function untrustedExecution(
  execution: ExecuteNeutronTaskNodeResult,
): ExecuteNeutronTaskNodeResult {
  if (!execution.executed) return execution;
  return {
    ...execution,
    error: {
      code: "timeout",
      stage: "timeout",
      message: "Stale attempt result was rejected after authority loss",
    },
  };
}

function finish(
  taskId: string,
  lease: NeutronTaskLease,
  execution: ExecuteNeutronTaskNodeResult | undefined,
  attempts: readonly NeutronAttemptEvidence[],
  retryExhausted: boolean,
  retryReason?: NeutronRetryReason,
) {
  if (execution === undefined) {
    throw new NeutronSchedulerError(
      "validation-failed",
      "recoverable node produced no execution",
      { taskId },
    );
  }
  return {
    taskId,
    lease,
    execution,
    attempts,
    retryExhausted,
    ...(retryReason === undefined ? {} : { retryReason }),
  };
}
