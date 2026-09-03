import {
  type NeutronTaskGraph,
  type NeutronTaskNode,
} from "../../protocol/src/neutron-runtime.js";
import { validateNeutronTaskGraph } from "../../validator/src/neutron-runtime.js";
import { NeutronSchedulerError } from "./neutron-scheduler-errors.js";
import {
  compareNeutronTaskIds,
  sortNeutronTaskIds,
} from "./neutron-scheduler-sort.js";

function buildNodeIndex(
  nodes: readonly NeutronTaskNode[],
): Map<string, NeutronTaskNode> {
  const index = new Map<string, NeutronTaskNode>();
  for (const node of nodes) {
    if (index.has(node.taskId)) {
      throw new NeutronSchedulerError(
        "duplicate-task-id",
        `duplicate graph node taskId: ${node.taskId}`,
        { taskId: node.taskId },
      );
    }
    index.set(node.taskId, node);
  }
  return index;
}

function validateDependencies(
  node: NeutronTaskNode,
  nodeIndex: Map<string, NeutronTaskNode>,
): void {
  const seen = new Set<string>();
  for (const dependencyId of node.dependencies) {
    if (dependencyId === node.taskId) {
      throw new NeutronSchedulerError(
        "self-dependency",
        `graph node ${node.taskId} cannot depend on itself`,
        { taskId: node.taskId, dependencyId },
      );
    }
    if (seen.has(dependencyId)) {
      throw new NeutronSchedulerError(
        "duplicate-dependency",
        `graph node ${node.taskId} has duplicate dependency ${dependencyId}`,
        { taskId: node.taskId, dependencyId },
      );
    }
    seen.add(dependencyId);
    if (!nodeIndex.has(dependencyId)) {
      throw new NeutronSchedulerError(
        "missing-dependency",
        `graph node ${node.taskId} depends on missing task ${dependencyId}`,
        { taskId: node.taskId, dependencyId },
      );
    }
  }
}

function validateParentIds(
  nodes: readonly NeutronTaskNode[],
  nodeIndex: Map<string, NeutronTaskNode>,
): void {
  for (const node of nodes) {
    if (node.parentId === null) continue;
    if (!nodeIndex.has(node.parentId)) {
      throw new NeutronSchedulerError(
        "invalid-parent",
        `graph node ${node.taskId} parentId ${node.parentId} does not exist`,
        { taskId: node.taskId, dependencyId: node.parentId },
      );
    }
  }
}

function detectCycleFromGraph(
  nodes: readonly NeutronTaskNode[],
): readonly string[] | null {
  const adjacency = new Map<string, readonly string[]>();
  for (const node of nodes) {
    adjacency.set(node.taskId, node.dependencies);
  }

  const sortedIds = sortNeutronTaskIds(nodes.map((node) => node.taskId));
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const stack: string[] = [];

  function reportCycle(repeatedId: string): readonly string[] {
    const start = stack.indexOf(repeatedId);
    return stack.slice(start).concat(repeatedId);
  }

  function visit(taskId: string): readonly string[] | null {
    if (visited.has(taskId)) return null;
    if (visiting.has(taskId)) return reportCycle(taskId);
    visiting.add(taskId);
    stack.push(taskId);
    for (const dependencyId of sortNeutronTaskIds(
      adjacency.get(taskId) ?? [],
    )) {
      const cycle = visit(dependencyId);
      if (cycle) return cycle;
    }
    stack.pop();
    visiting.delete(taskId);
    visited.add(taskId);
    return null;
  }

  for (const taskId of sortedIds) {
    const cycle = visit(taskId);
    if (cycle) return cycle;
  }
  return null;
}

export function validateNeutronTaskGraphForExecution(
  value: unknown,
): NeutronTaskGraph {
  const graph = validateNeutronTaskGraph(value);
  const nodeIndex = buildNodeIndex(graph.nodes);
  for (const node of graph.nodes) {
    validateDependencies(node, nodeIndex);
  }
  validateParentIds(graph.nodes, nodeIndex);
  const cyclePath = detectCycleFromGraph(graph.nodes);
  if (cyclePath) {
    throw new NeutronSchedulerError(
      "cycle-detected",
      `task graph contains a dependency cycle: ${cyclePath.join(" -> ")}`,
      { cyclePath },
    );
  }
  return graph;
}

export function compareNeutronTaskGraphNodes(
  left: NeutronTaskNode,
  right: NeutronTaskNode,
): number {
  return compareNeutronTaskIds(left.taskId, right.taskId);
}
