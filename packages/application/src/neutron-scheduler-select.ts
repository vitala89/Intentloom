import {
  type NeutronTaskGraph,
  type NeutronTaskNode,
  type NeutronTaskState,
} from "../../protocol/src/neutron-runtime.js";
import { NeutronSchedulerError } from "./neutron-scheduler-errors.js";
import { sortNeutronTaskIds } from "./neutron-scheduler-sort.js";
import { isNeutronTaskTerminalState } from "./neutron-scheduler-transitions.js";

export const NEUTRON_SCHEDULER_DEFAULT_MAX_CONCURRENCY = 1 as const;
export const NEUTRON_SCHEDULER_HARD_MAX_CONCURRENCY = 4 as const;

export const NEUTRON_SCHEDULING_BLOCK_REASONS = [
  "dependency-pending",
  "dependency-ready",
  "dependency-running",
  "dependency-failed",
  "dependency-cancelled",
  "dependency-timed-out",
  "capacity-exhausted",
  "node-not-runnable",
] as const;

export type NeutronSchedulingBlockReason =
  (typeof NEUTRON_SCHEDULING_BLOCK_REASONS)[number];

export type NeutronSchedulingClassification =
  "ready" | "waiting" | "blocked" | "running" | "terminal";

export interface NeutronNodeSchedulingClassification {
  readonly taskId: string;
  readonly nodeState: NeutronTaskState;
  readonly classification: NeutronSchedulingClassification;
  readonly reasons: readonly NeutronSchedulingBlockReason[];
  readonly blockingDependencyIds: readonly string[];
}

export interface SelectReadyNodesInput {
  readonly graph: NeutronTaskGraph;
  readonly maxConcurrency?: number;
}

export interface NeutronSchedulingPlan {
  readonly readyTaskIds: readonly string[];
  readonly selectedReadyTaskIds: readonly string[];
  readonly waitingTaskIds: readonly string[];
  readonly blockedTaskIds: readonly string[];
  readonly runningTaskIds: readonly string[];
  readonly terminalTaskIds: readonly string[];
  readonly availableCapacity: number;
  readonly maxConcurrency: number;
  readonly runningCount: number;
  readonly classifications: readonly NeutronNodeSchedulingClassification[];
}

function resolveMaxConcurrency(value: number | undefined): number {
  const maxConcurrency = value ?? NEUTRON_SCHEDULER_DEFAULT_MAX_CONCURRENCY;
  if (
    !Number.isInteger(maxConcurrency) ||
    maxConcurrency < 1 ||
    maxConcurrency > NEUTRON_SCHEDULER_HARD_MAX_CONCURRENCY
  ) {
    throw new NeutronSchedulerError(
      "invalid-concurrency",
      `maxConcurrency must be an integer from 1 to ${NEUTRON_SCHEDULER_HARD_MAX_CONCURRENCY}`,
    );
  }
  return maxConcurrency;
}

function dependencyBlockReason(
  state: NeutronTaskState,
): NeutronSchedulingBlockReason {
  switch (state) {
    case "pending":
      return "dependency-pending";
    case "ready":
      return "dependency-ready";
    case "running":
      return "dependency-running";
    case "failed":
      return "dependency-failed";
    case "cancelled":
      return "dependency-cancelled";
    case "timed-out":
      return "dependency-timed-out";
    default:
      return "node-not-runnable";
  }
}

function classifyNode(
  node: NeutronTaskNode,
  nodeIndex: Map<string, NeutronTaskNode>,
): NeutronNodeSchedulingClassification {
  const nodeState = node.state;
  if (nodeState === "running") {
    return {
      taskId: node.taskId,
      nodeState,
      classification: "running",
      reasons: [],
      blockingDependencyIds: [],
    };
  }
  if (isNeutronTaskTerminalState(nodeState) || nodeState === "blocked") {
    return {
      taskId: node.taskId,
      nodeState,
      classification: "terminal",
      reasons: nodeState === "blocked" ? ["node-not-runnable"] : [],
      blockingDependencyIds: [],
    };
  }

  const blockingDependencyIds: string[] = [];
  const reasons = new Set<NeutronSchedulingBlockReason>();

  for (const dependencyId of sortNeutronTaskIds(node.dependencies)) {
    const dependency = nodeIndex.get(dependencyId);
    if (!dependency) continue;
    const dependencyState = dependency.state;
    if (dependencyState === "completed") continue;

    blockingDependencyIds.push(dependencyId);
    reasons.add(dependencyBlockReason(dependencyState));
  }

  if (blockingDependencyIds.length === 0) {
    return {
      taskId: node.taskId,
      nodeState,
      classification: "ready",
      reasons: [],
      blockingDependencyIds: [],
    };
  }

  const blockedByFailure = [...reasons].some(
    (reason) =>
      reason === "dependency-failed" ||
      reason === "dependency-cancelled" ||
      reason === "dependency-timed-out",
  );

  return {
    taskId: node.taskId,
    nodeState,
    classification: blockedByFailure ? "blocked" : "waiting",
    reasons: (() => {
      const ordered = [...reasons];
      ordered.sort((left, right) => (left < right ? -1 : left > right ? 1 : 0));
      return ordered;
    })(),
    blockingDependencyIds: sortNeutronTaskIds(blockingDependencyIds),
  };
}

function buildNodeIndex(
  nodes: readonly NeutronTaskNode[],
): Map<string, NeutronTaskNode> {
  return new Map(nodes.map((node) => [node.taskId, node]));
}

export function planNeutronTaskScheduling(
  input: SelectReadyNodesInput,
): NeutronSchedulingPlan {
  const maxConcurrency = resolveMaxConcurrency(input.maxConcurrency);
  const nodeIndex = buildNodeIndex(input.graph.nodes);
  const classifications = sortNeutronTaskIds(
    input.graph.nodes.map((node) => node.taskId),
  ).map((taskId) => classifyNode(nodeIndex.get(taskId)!, nodeIndex));

  const readyTaskIds = sortNeutronTaskIds(
    classifications
      .filter((entry) => entry.classification === "ready")
      .map((entry) => entry.taskId),
  );
  const waitingTaskIds = sortNeutronTaskIds(
    classifications
      .filter((entry) => entry.classification === "waiting")
      .map((entry) => entry.taskId),
  );
  const blockedTaskIds = sortNeutronTaskIds(
    classifications
      .filter((entry) => entry.classification === "blocked")
      .map((entry) => entry.taskId),
  );
  const runningTaskIds = sortNeutronTaskIds(
    classifications
      .filter((entry) => entry.classification === "running")
      .map((entry) => entry.taskId),
  );
  const terminalTaskIds = sortNeutronTaskIds(
    classifications
      .filter((entry) => entry.classification === "terminal")
      .map((entry) => entry.taskId),
  );

  const runningCount = runningTaskIds.length;
  const availableCapacity = Math.max(0, maxConcurrency - runningCount);
  const selectedReadyTaskIds = readyTaskIds.slice(0, availableCapacity);

  return {
    readyTaskIds,
    selectedReadyTaskIds,
    waitingTaskIds,
    blockedTaskIds,
    runningTaskIds,
    terminalTaskIds,
    availableCapacity,
    maxConcurrency,
    runningCount,
    classifications,
  };
}

export function selectReadyNodes(
  input: SelectReadyNodesInput,
): readonly string[] {
  return planNeutronTaskScheduling(input).selectedReadyTaskIds;
}
