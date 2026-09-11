import {
  NEUTRON_ERROR_CODES,
  NEUTRON_TASK_STATES,
  type NeutronErrorCode,
  type NeutronTaskState,
} from "../../protocol/src/neutron-runtime.js";
import {
  NEUTRON_GRAPH_ATTEMPT_STATES,
  NEUTRON_GRAPH_DEFAULT_CONCURRENCY,
  NEUTRON_GRAPH_HARD_MAX_CONCURRENCY,
  NEUTRON_GRAPH_RETRY_REASONS,
  NEUTRON_GRAPH_STALE_KINDS,
  type NeutronGraphAttemptSnapshot,
  type NeutronGraphCapabilitySummary,
  type NeutronGraphConcurrency,
  type NeutronGraphNodeCounts,
  type NeutronGraphNodeSnapshot,
  type NeutronGraphStaleMismatch,
  type NeutronGraphStaleSnapshot,
} from "../../protocol/src/neutron-graph.js";
import {
  finiteInt,
  isObject,
  nonEmpty,
  oneOf,
  strings,
} from "./neutron-runtime-helpers.js";

function requireBoolean(value: unknown, field: string): boolean {
  if (typeof value !== "boolean") {
    throw new Error(`${field} must be a boolean`);
  }
  return value;
}

function requireFalse(value: unknown, field: string): false {
  if (value !== false) {
    throw new Error(`${field} must be false`);
  }
  return false;
}

function optionalNullString(value: unknown, field: string): string | null {
  if (value === null) return null;
  return nonEmpty(value, field);
}

export function validateGraphStale(value: unknown): NeutronGraphStaleSnapshot {
  if (!isObject(value))
    throw new Error("graphSnapshot.stale must be an object");
  if (!Array.isArray(value.kinds)) {
    throw new Error("graphSnapshot.stale.kinds must be an array");
  }
  if (!Array.isArray(value.mismatches)) {
    throw new Error("graphSnapshot.stale.mismatches must be an array");
  }
  return {
    accepted: requireBoolean(value.accepted, "stale.accepted"),
    rerunAttempted: requireFalse(value.rerunAttempted, "stale.rerunAttempted"),
    kinds: value.kinds.map((kind, index) =>
      oneOf(kind, NEUTRON_GRAPH_STALE_KINDS, `stale.kinds[${index}]`),
    ),
    mismatches: value.mismatches.map((item, index) =>
      validateMismatch(item, index),
    ),
  };
}

function validateMismatch(
  value: unknown,
  index: number,
): NeutronGraphStaleMismatch {
  if (!isObject(value)) {
    throw new Error(`stale.mismatches[${index}] must be an object`);
  }
  const field = (name: string) => `stale.mismatches[${index}].${name}`;
  return {
    kind: oneOf(value.kind, NEUTRON_GRAPH_STALE_KINDS, field("kind")),
    expected: nonEmpty(value.expected, field("expected")),
    current: nonEmpty(value.current, field("current")),
  };
}

export function validateGraphCounts(value: unknown): NeutronGraphNodeCounts {
  if (!isObject(value)) throw new Error("nodeCounts must be an object");
  return {
    total: finiteInt(value.total, "nodeCounts.total"),
    pending: finiteInt(value.pending, "nodeCounts.pending"),
    ready: finiteInt(value.ready, "nodeCounts.ready"),
    running: finiteInt(value.running, "nodeCounts.running"),
    blocked: finiteInt(value.blocked, "nodeCounts.blocked"),
    cancelled: finiteInt(value.cancelled, "nodeCounts.cancelled"),
    timedOut: finiteInt(value.timedOut, "nodeCounts.timedOut"),
    failed: finiteInt(value.failed, "nodeCounts.failed"),
    completed: finiteInt(value.completed, "nodeCounts.completed"),
  };
}

export function validateGraphConcurrency(
  value: unknown,
): NeutronGraphConcurrency {
  if (!isObject(value)) throw new Error("concurrency must be an object");
  if (value.defaultConcurrency !== NEUTRON_GRAPH_DEFAULT_CONCURRENCY) {
    throw new Error("concurrency.defaultConcurrency must be 1");
  }
  if (value.hardMaximum !== NEUTRON_GRAPH_HARD_MAX_CONCURRENCY) {
    throw new Error("concurrency.hardMaximum must be 4");
  }
  const maxConcurrency = finiteInt(
    value.maxConcurrency,
    "concurrency.maxConcurrency",
  );
  if (
    maxConcurrency < NEUTRON_GRAPH_DEFAULT_CONCURRENCY ||
    maxConcurrency > NEUTRON_GRAPH_HARD_MAX_CONCURRENCY
  ) {
    throw new Error("concurrency.maxConcurrency is outside 1-4");
  }
  return {
    defaultConcurrency: NEUTRON_GRAPH_DEFAULT_CONCURRENCY,
    maxConcurrency,
    hardMaximum: NEUTRON_GRAPH_HARD_MAX_CONCURRENCY,
    runningCount: finiteInt(value.runningCount, "concurrency.runningCount"),
    availableCapacity: finiteInt(
      value.availableCapacity,
      "concurrency.availableCapacity",
    ),
  };
}

export function validateGraphNode(
  value: unknown,
  index: number,
): NeutronGraphNodeSnapshot {
  if (!isObject(value)) {
    throw new Error(`graphSnapshot.nodes[${index}] must be an object`);
  }
  const field = (name: string) => `nodes[${index}].${name}`;
  if (!Array.isArray(value.attempts)) {
    throw new Error(`${field("attempts")} must be an array`);
  }
  const state = oneOf(
    value.state,
    NEUTRON_TASK_STATES,
    field("state"),
  ) as NeutronTaskState;
  return {
    taskId: nonEmpty(value.taskId, field("taskId")),
    parentId:
      value.parentId === null
        ? null
        : nonEmpty(value.parentId, field("parentId")),
    role: nonEmpty(value.role, field("role")),
    state,
    dependencies: strings(value.dependencies, field("dependencies")),
    blockingDependencyIds: strings(
      value.blockingDependencyIds,
      field("blockingDependencyIds"),
    ),
    requestedCapabilities: strings(
      value.requestedCapabilities,
      field("requestedCapabilities"),
    ),
    effectiveCapabilities: validateCapabilities(value.effectiveCapabilities),
    allowedTools: strings(value.allowedTools, field("allowedTools")),
    attemptCount: finiteInt(value.attemptCount, field("attemptCount")),
    authoritativeAttempt:
      value.authoritativeAttempt === null
        ? null
        : finiteInt(value.authoritativeAttempt, field("authoritativeAttempt")),
    attempts: value.attempts.map((attempt, attemptIndex) =>
      validateAttempt(attempt, attemptIndex),
    ),
    resultStatus: oneOf(
      value.resultStatus,
      NEUTRON_TASK_STATES,
      field("resultStatus"),
    ) as NeutronTaskState,
    outputDigestPresent: requireBoolean(
      value.outputDigestPresent,
      field("outputDigestPresent"),
    ),
    toolCount: finiteInt(value.toolCount, field("toolCount")),
    contextAvailable: requireBoolean(
      value.contextAvailable,
      field("contextAvailable"),
    ),
    providerKind: optionalNullString(value.providerKind, field("providerKind")),
    modelId: optionalNullString(value.modelId, field("modelId")),
    mutationAttempted: requireFalse(
      value.mutationAttempted,
      field("mutationAttempted"),
    ),
    errorCode: errorCode(value.errorCode, field("errorCode")),
  };
}

function validateAttempt(
  value: unknown,
  index: number,
): NeutronGraphAttemptSnapshot {
  if (!isObject(value)) {
    throw new Error(`nodes[${index}] attempts entry must be an object`);
  }
  const retryReason =
    value.retryReason === null
      ? null
      : oneOf(
          value.retryReason,
          NEUTRON_GRAPH_RETRY_REASONS,
          "attempt.retryReason",
        );
  return {
    attempt: finiteInt(value.attempt, "attempt.attempt"),
    leaseId: nonEmpty(value.leaseId, "attempt.leaseId"),
    state: oneOf(value.state, NEUTRON_GRAPH_ATTEMPT_STATES, "attempt.state"),
    retryReason,
    errorCode: optionalNullString(value.errorCode, "attempt.errorCode"),
  };
}

function validateCapabilities(
  value: unknown,
): NeutronGraphCapabilitySummary | null {
  if (value === null) return null;
  if (!isObject(value)) {
    throw new Error("effectiveCapabilities must be an object");
  }
  if (value.readOnly !== true) {
    throw new Error("effectiveCapabilities.readOnly must be true");
  }
  if (value.allowNetwork !== false) {
    throw new Error("effectiveCapabilities.allowNetwork must be false");
  }
  return {
    readOnly: true,
    allowNetwork: false,
    allowedTools: strings(
      value.allowedTools,
      "effectiveCapabilities.allowedTools",
    ),
    maxBudget: finiteInt(value.maxBudget, "effectiveCapabilities.maxBudget"),
  };
}

function errorCode(
  value: unknown,
  field: string,
): NeutronErrorCode | string | null {
  if (value === null) return null;
  const text = nonEmpty(value, field);
  if ((NEUTRON_ERROR_CODES as readonly string[]).includes(text)) {
    return text as NeutronErrorCode;
  }
  return text;
}
