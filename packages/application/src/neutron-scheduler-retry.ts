import type { NeutronNodeExecutionFailure } from "./neutron-node-errors.js";
import { NeutronSchedulerError } from "./neutron-scheduler-errors.js";

export const NEUTRON_RETRY_MAX_ATTEMPTS = 2;
export const NEUTRON_RETRY_ABSOLUTE_MAX_ATTEMPTS = 2;

const RETRYABLE_NODE_CODES = new Set(["timeout", "operation-failed"]);
const RETRYABLE_SCHEDULER_CODES = new Set([
  "lease-expired",
  "lease-lost",
  "invalid-owner",
]);

export type NeutronRetryReason =
  | "operation-failed"
  | "timeout"
  | "lease-expired"
  | "lease-lost"
  | "cancelled"
  | "budget-exceeded"
  | "non-retryable"
  | "retry-exhausted";

export interface ClassifyNeutronRetryInput {
  readonly attempt: number;
  readonly cancelled: boolean;
  readonly budgetExceeded?: boolean;
  readonly failure?: NeutronNodeExecutionFailure | null;
  readonly schedulerError?: NeutronSchedulerError | null;
  readonly maxAttempts?: number;
}

export interface NeutronRetryDecision {
  readonly retryable: boolean;
  readonly reason: NeutronRetryReason;
  readonly nextAttempt?: number;
}

export function resolveNeutronMaxAttempts(maxAttempts?: number): number {
  const resolved = maxAttempts ?? NEUTRON_RETRY_MAX_ATTEMPTS;
  if (!Number.isInteger(resolved) || resolved < 1) {
    throw new NeutronSchedulerError(
      "validation-failed",
      "maxAttempts must be an integer >= 1",
    );
  }
  return Math.min(resolved, NEUTRON_RETRY_ABSOLUTE_MAX_ATTEMPTS);
}

export function classifyNeutronRetry(
  input: ClassifyNeutronRetryInput,
): NeutronRetryDecision {
  const maxAttempts = resolveNeutronMaxAttempts(input.maxAttempts);
  if (input.cancelled) {
    return { retryable: false, reason: "cancelled" };
  }
  if (input.budgetExceeded === true) {
    return { retryable: false, reason: "budget-exceeded" };
  }
  const reason = retryReasonOf(input.failure, input.schedulerError);
  if (
    reason === "non-retryable" ||
    reason === "cancelled" ||
    reason === "budget-exceeded"
  ) {
    return { retryable: false, reason };
  }
  if (input.attempt >= maxAttempts) {
    return { retryable: false, reason: "retry-exhausted" };
  }
  return { retryable: true, reason, nextAttempt: input.attempt + 1 };
}

function retryReasonOf(
  failure: NeutronNodeExecutionFailure | null | undefined,
  schedulerError: NeutronSchedulerError | null | undefined,
): NeutronRetryReason {
  if (schedulerError !== undefined && schedulerError !== null) {
    if (RETRYABLE_SCHEDULER_CODES.has(schedulerError.code)) {
      if (schedulerError.code === "lease-expired") return "lease-expired";
      return "lease-lost";
    }
    if (schedulerError.code === "retry-exhausted") return "retry-exhausted";
    return "non-retryable";
  }
  if (failure === undefined || failure === null) return "non-retryable";
  if (failure.code === "cancelled") return "cancelled";
  if (failure.code === "budget-exceeded") return "budget-exceeded";
  if (RETRYABLE_NODE_CODES.has(failure.code)) {
    return failure.code === "timeout" ? "timeout" : "operation-failed";
  }
  return "non-retryable";
}
