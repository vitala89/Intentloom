import type {
  NeutronGraphAttemptSnapshot,
  NeutronGraphNodeSnapshot,
  NeutronTaskState,
} from "@intentloom/protocol";
import {
  NEUTRON_GRAPH_ATTEMPT_STATES,
  NEUTRON_GRAPH_RETRY_REASONS,
  NEUTRON_TASK_STATES,
} from "@intentloom/protocol";
import {
  failGraphParse,
  graphStrings,
  oneOfGraph,
  requiredGraphBoolean,
  requiredGraphInt,
  requiredGraphString,
  requireGraphFalse,
} from "./neutron-graph-parse-helpers.js";

export function parseGraphNode(
  value: unknown,
  index: number,
): NeutronGraphNodeSnapshot {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    failGraphParse(`graphSnapshot.nodes[${index}] must be an object`);
  }
  const record = value as Record<string, unknown>;
  const field = (name: string) => `nodes[${index}].${name}`;
  if (!Array.isArray(record.attempts)) {
    failGraphParse(`${field("attempts")} must be an array`);
  }
  const state = oneOfGraph(record.state, NEUTRON_TASK_STATES, field("state"));
  return {
    taskId: requiredGraphString(record.taskId, field("taskId")),
    parentId:
      record.parentId === null
        ? null
        : requiredGraphString(record.parentId, field("parentId")),
    role: requiredGraphString(record.role, field("role")),
    state: state as NeutronTaskState,
    dependencies: graphStrings(record.dependencies, field("dependencies")),
    blockingDependencyIds: graphStrings(
      record.blockingDependencyIds,
      field("blockingDependencyIds"),
    ),
    requestedCapabilities: graphStrings(
      record.requestedCapabilities,
      field("requestedCapabilities"),
    ),
    effectiveCapabilities: parseCapabilities(
      record.effectiveCapabilities,
      index,
    ),
    allowedTools: graphStrings(record.allowedTools, field("allowedTools")),
    attemptCount: requiredGraphInt(record.attemptCount, field("attemptCount")),
    authoritativeAttempt:
      record.authoritativeAttempt === null
        ? null
        : requiredGraphInt(
            record.authoritativeAttempt,
            field("authoritativeAttempt"),
          ),
    attempts: record.attempts.map((attempt, attemptIndex) =>
      parseAttempt(attempt, attemptIndex),
    ),
    resultStatus: oneOfGraph(
      record.resultStatus,
      NEUTRON_TASK_STATES,
      field("resultStatus"),
    ) as NeutronTaskState,
    outputDigestPresent: requiredGraphBoolean(
      record.outputDigestPresent,
      field("outputDigestPresent"),
    ),
    toolCount: requiredGraphInt(record.toolCount, field("toolCount")),
    contextAvailable: requiredGraphBoolean(
      record.contextAvailable,
      field("contextAvailable"),
    ),
    providerKind:
      record.providerKind === null
        ? null
        : requiredGraphString(record.providerKind, field("providerKind")),
    modelId:
      record.modelId === null
        ? null
        : requiredGraphString(record.modelId, field("modelId")),
    mutationAttempted: requireGraphFalse(
      record.mutationAttempted,
      field("mutationAttempted"),
    ),
    errorCode:
      record.errorCode === null
        ? null
        : requiredGraphString(record.errorCode, field("errorCode")),
  };
}

function parseAttempt(
  value: unknown,
  index: number,
): NeutronGraphAttemptSnapshot {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    failGraphParse(`attempts[${index}] must be an object`);
  }
  const record = value as Record<string, unknown>;
  return {
    attempt: requiredGraphInt(record.attempt, `attempts[${index}].attempt`),
    leaseId: requiredGraphString(record.leaseId, `attempts[${index}].leaseId`),
    state: oneOfGraph(
      record.state,
      NEUTRON_GRAPH_ATTEMPT_STATES,
      `attempts[${index}].state`,
    ),
    retryReason:
      record.retryReason === null
        ? null
        : oneOfGraph(
            record.retryReason,
            NEUTRON_GRAPH_RETRY_REASONS,
            `attempts[${index}].retryReason`,
          ),
    errorCode:
      record.errorCode === null
        ? null
        : requiredGraphString(record.errorCode, `attempts[${index}].errorCode`),
  };
}

function parseCapabilities(
  value: unknown,
  index: number,
): NeutronGraphNodeSnapshot["effectiveCapabilities"] {
  if (value === null) return null;
  if (typeof value !== "object" || Array.isArray(value)) {
    failGraphParse(`nodes[${index}].effectiveCapabilities must be an object`);
  }
  const record = value as Record<string, unknown>;
  if (record.readOnly !== true) {
    failGraphParse(
      `nodes[${index}].effectiveCapabilities.readOnly must be true`,
    );
  }
  if (record.allowNetwork !== false) {
    failGraphParse(
      `nodes[${index}].effectiveCapabilities.allowNetwork must be false`,
    );
  }
  return {
    readOnly: true,
    allowNetwork: false,
    allowedTools: graphStrings(
      record.allowedTools,
      `nodes[${index}].effectiveCapabilities.allowedTools`,
    ),
    maxBudget: requiredGraphInt(
      record.maxBudget,
      `nodes[${index}].effectiveCapabilities.maxBudget`,
    ),
  };
}
