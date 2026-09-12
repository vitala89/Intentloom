import {
  NEUTRON_GRAPH_DEFAULT_CONCURRENCY,
  NEUTRON_GRAPH_HARD_MAX_CONCURRENCY,
  NEUTRON_GRAPH_MAX_NODE_CONTEXT_SOURCE_IDS,
  NEUTRON_GRAPH_MAX_NODE_TOOL_INVOCATIONS,
  NEUTRON_GRAPH_MAX_WARNINGS,
  NEUTRON_GRAPH_SNAPSHOT_SCHEMA_URN,
  type NeutronGraphAttemptSnapshot,
  type NeutronGraphCapabilitySummary,
  type NeutronGraphNodeCounts,
  type NeutronGraphNodeSnapshot,
  type NeutronGraphSnapshot,
  type NeutronGraphStaleSnapshot,
  type NeutronGraphToolInvocationSnapshot,
  type NeutronGraphUsageSnapshot,
} from "../../protocol/src/neutron-graph.js";
import type { NeutronTaskState } from "../../protocol/src/neutron-runtime.js";
import type { NeutronGraphExecutionResult } from "./neutron-scheduler-graph-result.js";
import type { NeutronGraphNodeRecord } from "./neutron-scheduler-provenance.js";
import type { NeutronAttemptEvidence } from "./neutron-scheduler-attempt.js";
import type { NeutronGraphStaleReport } from "./neutron-scheduler-stale.js";
import type { NeutronSchedulingPlan } from "./neutron-scheduler-select.js";
import { sortNeutronTaskIds } from "./neutron-scheduler-sort.js";

const EMPTY_COUNTS: NeutronGraphNodeCounts = {
  blocked: 0,
  cancelled: 0,
  completed: 0,
  failed: 0,
  pending: 0,
  ready: 0,
  running: 0,
  timedOut: 0,
  total: 0,
};

export function projectNeutronGraphSnapshot(input: {
  readonly result: NeutronGraphExecutionResult;
  readonly plan?: NeutronSchedulingPlan;
  readonly cancellationAcknowledged?: boolean;
}): NeutronGraphSnapshot {
  const nodes = input.result.nodes.map(projectNode);
  return {
    schemaVersion: NEUTRON_GRAPH_SNAPSHOT_SCHEMA_URN,
    accepted: input.result.accepted,
    budgetExceeded: input.result.budgetExceeded,
    cancellationAcknowledged: input.cancellationAcknowledged === true,
    concurrency: projectConcurrency(input.plan),
    digestPresent: input.result.digest.length > 0,
    outputDigest: input.result.digest.length > 0 ? input.result.digest : null,
    usage: projectUsage(input.result.usage),
    graphId: input.result.graphId,
    mutationAttempted: false,
    nodeCounts: countNodes(nodes),
    nodes,
    partial: input.result.partial,
    projectId: input.result.projectId,
    rerunAttempted: false,
    root: input.result.root,
    sessionId: input.result.sessionId,
    stale: projectStale(input.result.stale),
    status: input.result.status,
    warnings: boundStrings(input.result.warnings, NEUTRON_GRAPH_MAX_WARNINGS),
  };
}

function projectUsage(
  usage: NeutronGraphExecutionResult["usage"],
): NeutronGraphUsageSnapshot {
  return {
    contextTokens: usage.contextTokens,
    inputTokens: usage.inputTokens,
    limitExceeded: usage.limitExceeded,
    outputTokens: usage.outputTokens,
    tokenBudget: usage.tokenBudget,
  };
}

function boundStrings(
  values: readonly string[],
  limit: number,
): readonly string[] {
  return [...values].slice(0, limit);
}

function projectConcurrency(
  plan: NeutronSchedulingPlan | undefined,
): NeutronGraphSnapshot["concurrency"] {
  const maxConcurrency =
    plan?.maxConcurrency ?? NEUTRON_GRAPH_DEFAULT_CONCURRENCY;
  return {
    availableCapacity: plan?.availableCapacity ?? maxConcurrency,
    defaultConcurrency: NEUTRON_GRAPH_DEFAULT_CONCURRENCY,
    hardMaximum: NEUTRON_GRAPH_HARD_MAX_CONCURRENCY,
    maxConcurrency,
    runningCount: plan?.runningCount ?? 0,
  };
}

function projectStale(
  stale: NeutronGraphStaleReport | null,
): NeutronGraphStaleSnapshot | null {
  if (stale === null) return null;
  return {
    accepted: stale.accepted,
    kinds: [...stale.kinds],
    mismatches: stale.mismatches.map((item) => ({
      current: item.current,
      expected: item.expected,
      kind: item.kind,
    })),
    rerunAttempted: false,
  };
}

function projectNode(node: NeutronGraphNodeRecord): NeutronGraphNodeSnapshot {
  const attempts = node.attempts.map(projectAttempt);
  return {
    allowedTools: [...node.allowedTools],
    attemptCount: attempts.length,
    attempts,
    authoritativeAttempt: node.authoritativeAttempt,
    blockingDependencyIds: sortNeutronTaskIds(node.blockingDependencyIds),
    contextAvailable: node.context !== null,
    dependencies: sortNeutronTaskIds(node.dependencies),
    effectiveCapabilities: projectCapabilities(node),
    errorCode: node.error?.code ?? null,
    modelId: node.adapter?.modelId ?? null,
    mutationAttempted: false,
    outputDigestPresent: node.outputDigest !== null,
    parentId: node.parentId,
    providerKind: node.adapter?.providerKind ?? null,
    requestedCapabilities: [...node.requestedCapabilities],
    resultStatus: node.state,
    role: node.role,
    state: node.state,
    taskId: node.taskId,
    toolCount: node.tools.length,
    contextSourceIds: boundStrings(
      node.context?.sourceIds ?? [],
      NEUTRON_GRAPH_MAX_NODE_CONTEXT_SOURCE_IDS,
    ),
    toolInvocations: node.tools
      .slice(0, NEUTRON_GRAPH_MAX_NODE_TOOL_INVOCATIONS)
      .map(projectToolInvocation),
  };
}

function projectToolInvocation(
  tool: NeutronGraphNodeRecord["tools"][number],
): NeutronGraphToolInvocationSnapshot {
  return {
    invocationId: tool.invocationId,
    payloadDigestPresent: tool.payloadDigest !== null,
    toolName: tool.toolName,
  };
}

function projectAttempt(
  attempt: NeutronAttemptEvidence,
): NeutronGraphAttemptSnapshot {
  return {
    attempt: attempt.attempt,
    errorCode: attempt.error?.code ?? null,
    leaseId: sanitizeLeaseId(attempt.leaseId),
    retryReason: attempt.retryReason ?? null,
    state: attempt.state,
  };
}

function projectCapabilities(
  node: NeutronGraphNodeRecord,
): NeutronGraphCapabilitySummary | null {
  if (node.effectiveCapabilities === null) return null;
  return {
    allowNetwork: false,
    allowedTools: [...node.effectiveCapabilities.allowedTools],
    maxBudget: node.effectiveCapabilities.maxBudget,
    readOnly: true,
  };
}

function sanitizeLeaseId(leaseId: string): string {
  if (
    leaseId.includes("/") ||
    leaseId.includes("\\") ||
    leaseId.includes(".aif")
  ) {
    return leaseId.split(/[/\\]/u).at(-1) ?? leaseId;
  }
  return leaseId;
}

function countNodes(
  nodes: readonly NeutronGraphNodeSnapshot[],
): NeutronGraphNodeCounts {
  const counts = { ...EMPTY_COUNTS, total: nodes.length };
  for (const node of nodes) incrementCount(counts, node.state);
  return counts;
}

function incrementCount(
  counts: NeutronGraphNodeCounts,
  state: NeutronTaskState,
): void {
  const mutable = counts as {
    -readonly [K in keyof NeutronGraphNodeCounts]: number;
  };
  if (state === "timed-out") {
    mutable.timedOut += 1;
    return;
  }
  mutable[state] += 1;
}
