import {
  NEUTRON_USAGE_BUDGET_SCHEMA_URN,
  type NeutronRuntimeSession,
  type NeutronTaskGraph,
  type NeutronUsageBudget,
} from "../../protocol/src/neutron-runtime.js";
import {
  classifyNeutronGraphStatus,
  digestNeutronGraphExecution,
  neutronGraphExecutionId,
  type NeutronGraphExecutionResult,
} from "./neutron-scheduler-graph-result.js";
import { buildNeutronGraphNodeRecord } from "./neutron-scheduler-provenance.js";
import { planNeutronTaskScheduling } from "./neutron-scheduler-select.js";
import {
  compareNeutronTaskIds,
  sortNeutronTaskIds,
} from "./neutron-scheduler-sort.js";
import {
  detectNeutronGraphStaleness,
  type NeutronGraphStaleBaseline,
  type NeutronGraphStaleReport,
  type NeutronGraphStaleSnapshot,
} from "./neutron-scheduler-stale.js";
import type { NeutronReadyNodeOutcome } from "./neutron-scheduler-wave-types.js";

export interface AggregateNeutronTaskGraphResultsInput {
  readonly graph: NeutronTaskGraph;
  readonly session: NeutronRuntimeSession;
  readonly outcomes?: readonly NeutronReadyNodeOutcome[];
  readonly stale?: NeutronGraphStaleReport;
  readonly graphId?: string;
}

export interface ReconcileNeutronTaskGraphExecutionInput extends AggregateNeutronTaskGraphResultsInput {
  readonly baseline: NeutronGraphStaleBaseline;
  readonly current: NeutronGraphStaleSnapshot;
}

export function aggregateNeutronTaskGraphResults(
  input: AggregateNeutronTaskGraphResultsInput,
): NeutronGraphExecutionResult {
  const stale = input.stale ?? null;
  const graphId = input.graphId ?? neutronGraphExecutionId(input.graph);
  const outcomes = indexOutcomes(input.outcomes ?? []);
  const plan = planNeutronTaskScheduling({ graph: input.graph });
  const classifications = new Map(
    plan.classifications.map((item) => [item.taskId, item]),
  );
  const nodes = sortNeutronTaskIds(
    input.graph.nodes.map((node) => node.taskId),
  ).map((taskId) => {
    const node = input.graph.nodes.find((item) => item.taskId === taskId);
    if (node === undefined) {
      throw new Error(`graph node not found: ${taskId}`);
    }
    const classification = classifications.get(taskId);
    const outcome = outcomes.get(taskId);
    return buildNeutronGraphNodeRecord({
      node,
      ...(classification === undefined ? {} : { classification }),
      ...(outcome === undefined ? {} : { outcome }),
    });
  });
  const status = classifyNeutronGraphStatus({
    nodeStates: nodes.map((node) => node.state),
    stale: stale !== null && !stale.accepted,
  });
  const usage = sumUsage(
    input.session.sessionId,
    nodes.flatMap((node) => node.attempts.map((attempt) => attempt.usage)),
  );
  const budgetExceeded =
    usage.limitExceeded ||
    nodes.some((node) => node.error?.code === "budget-exceeded");
  const warnings = collectWarnings(nodes, stale, budgetExceeded);
  return {
    accepted: status === "completed",
    budgetExceeded,
    digest: digestNeutronGraphExecution({
      graphId,
      nodes,
      session: input.session,
      stale,
      status,
      usage,
    }),
    graphId,
    mutationAttempted: false,
    nodes,
    partial:
      nodes.some((node) => node.state === "completed") &&
      status !== "completed",
    projectId: input.session.projectId,
    rerunAttempted: false,
    root: input.session.root,
    sessionId: input.session.sessionId,
    stale,
    status,
    usage,
    warnings,
  };
}

export function reconcileNeutronTaskGraphExecution(
  input: ReconcileNeutronTaskGraphExecutionInput,
): NeutronGraphExecutionResult {
  const stale = detectNeutronGraphStaleness({
    baseline: input.baseline,
    current: input.current,
  });
  return aggregateNeutronTaskGraphResults({
    graph: input.graph,
    session: input.session,
    stale,
    ...(input.outcomes === undefined ? {} : { outcomes: input.outcomes }),
    ...(input.graphId === undefined ? {} : { graphId: input.graphId }),
  });
}

function indexOutcomes(
  outcomes: readonly NeutronReadyNodeOutcome[],
): Map<string, NeutronReadyNodeOutcome> {
  const indexed = new Map<string, NeutronReadyNodeOutcome>();
  for (const taskId of sortNeutronTaskIds(
    outcomes.map((item) => item.taskId),
  )) {
    const matches = outcomes.filter((item) => item.taskId === taskId);
    indexed.set(taskId, matches[matches.length - 1]!);
  }
  return indexed;
}

function sumUsage(
  sessionId: string,
  parts: readonly (NeutronUsageBudget | undefined)[],
): NeutronUsageBudget {
  let inputTokens = 0;
  let outputTokens = 0;
  let contextTokens = 0;
  let tokenBudget = 0;
  let limitExceeded = false;
  for (const part of parts) {
    if (part === undefined) continue;
    inputTokens += part.inputTokens;
    outputTokens += part.outputTokens;
    contextTokens += part.contextTokens;
    tokenBudget += part.tokenBudget;
    limitExceeded = limitExceeded || part.limitExceeded;
  }
  return {
    contextTokens,
    inputTokens,
    limitExceeded,
    outputTokens,
    schemaVersion: NEUTRON_USAGE_BUDGET_SCHEMA_URN,
    sessionId,
    tokenBudget,
  };
}

function collectWarnings(
  nodes: NeutronGraphExecutionResult["nodes"],
  stale: NeutronGraphStaleReport | null,
  budgetExceeded: boolean,
): string[] {
  const warnings: string[] = [];
  if (stale !== null && !stale.accepted) {
    for (const kind of stale.kinds) warnings.push(`stale:${kind}`);
  }
  if (budgetExceeded) warnings.push("budget-exceeded");
  for (const node of nodes) {
    if (node.error?.code === "budget-exceeded") {
      warnings.push(`budget-exceeded:${node.taskId}`);
    }
  }
  return [...new Set(warnings)].sort(compareNeutronTaskIds);
}
