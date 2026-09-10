import type { NeutronTaskGraph } from "../../protocol/src/neutron-runtime.js";
import { systemNeutronSchedulerClock } from "./neutron-scheduler-clock.js";
import { isNeutronSessionCancelled } from "./neutron-scheduler-cancellation.js";
import { NeutronSchedulerError } from "./neutron-scheduler-errors.js";
import { resolveNeutronLeaseAttempt } from "./neutron-scheduler-lease.js";
import {
  acquireRecoverableNodeLease,
  runRecoverableAdmittedNode,
} from "./neutron-scheduler-recovery.js";
import { resolveNeutronMaxAttempts } from "./neutron-scheduler-retry.js";
import {
  planNeutronTaskScheduling,
  type NeutronSchedulingPlan,
} from "./neutron-scheduler-select.js";
import { sortNeutronTaskIds } from "./neutron-scheduler-sort.js";
import { validateNeutronTaskGraphForExecution } from "./neutron-scheduler-validate.js";
import type {
  ExecuteReadyNeutronTaskNodesInput,
  ExecuteReadyNeutronTaskNodesResult,
  NeutronReadyNodeLeaseFailure,
  NeutronReadyNodeOutcome,
} from "./neutron-scheduler-wave-types.js";

export type {
  ExecuteReadyNeutronTaskNodesInput,
  ExecuteReadyNeutronTaskNodesResult,
  NeutronReadyNodeExecutionOutcome,
  NeutronReadyNodeLeaseFailure,
  NeutronReadyNodeOutcome,
} from "./neutron-scheduler-wave-types.js";

export async function executeReadyNeutronTaskNodes(
  input: ExecuteReadyNeutronTaskNodesInput,
): Promise<ExecuteReadyNeutronTaskNodesResult> {
  const graph = validateNeutronTaskGraphForExecution(input.graph);
  const plan = planNeutronTaskScheduling({
    graph,
    ...(input.maxConcurrency === undefined
      ? {}
      : { maxConcurrency: input.maxConcurrency }),
  });
  const attempt = resolveNeutronLeaseAttempt(input.attempt);
  const ownerId = input.ownerId ?? `scheduler:${input.session.sessionId}`;
  const clock = input.clock ?? systemNeutronSchedulerClock();
  const maxAttempts = resolveNeutronMaxAttempts(input.maxAttempts);
  if (isNeutronSessionCancelled(input.session, input.signal)) {
    return emptyWave(graph, plan, attempt, ownerId);
  }

  const acquired = [];
  const failures: NeutronReadyNodeLeaseFailure[] = [];
  for (const taskId of plan.selectedReadyTaskIds) {
    if (isNeutronSessionCancelled(input.session, input.signal)) break;
    try {
      acquired.push(
        await acquireRecoverableNodeLease(
          { ...input, graph },
          clock,
          ownerId,
          taskId,
          maxAttempts,
        ),
      );
    } catch (error) {
      failures.push(leaseFailure(taskId, error));
    }
  }
  await Promise.resolve();

  const executed = await Promise.all(
    acquired.map((entry) =>
      runRecoverableAdmittedNode(
        { ...input, graph },
        clock,
        ownerId,
        maxAttempts,
        entry,
      ).then((result) => ({
        taskId: result.taskId,
        admitted: true as const,
        executed: result.execution.executed,
        lease: result.lease,
        execution: result.execution,
        error: null,
        attempts: result.attempts,
        ...(result.retryExhausted ? { retryExhausted: true } : {}),
        ...(result.retryReason === undefined
          ? {}
          : { retryReason: result.retryReason }),
      })),
    ),
  );
  const outcomes = sortOutcomes([...failures, ...executed]);
  return {
    graph: mergeExecutedGraph(graph, outcomes),
    plan,
    admittedTaskIds: [...plan.selectedReadyTaskIds],
    outcomes,
    attempt,
    ownerId,
  };
}

function emptyWave(
  graph: NeutronTaskGraph,
  plan: NeutronSchedulingPlan,
  attempt: number,
  ownerId: string,
): ExecuteReadyNeutronTaskNodesResult {
  return {
    graph,
    plan,
    admittedTaskIds: [],
    outcomes: [],
    attempt,
    ownerId,
  };
}

function leaseFailure(
  taskId: string,
  error: unknown,
): NeutronReadyNodeLeaseFailure {
  return {
    taskId,
    admitted: true,
    executed: false,
    lease: null,
    execution: null,
    attempts: [],
    error:
      error instanceof NeutronSchedulerError
        ? error
        : new NeutronSchedulerError(
            "validation-failed",
            error instanceof Error ? error.message : "lease acquire failed",
            { taskId },
          ),
  };
}

function mergeExecutedGraph(
  graph: NeutronTaskGraph,
  outcomes: readonly NeutronReadyNodeOutcome[],
): NeutronTaskGraph {
  let nodes = graph.nodes;
  for (const outcome of outcomes) {
    if (outcome.execution?.executed === true) {
      const next = outcome.execution.node;
      nodes = nodes.map((node) => (node.taskId === next.taskId ? next : node));
      continue;
    }
    const last = outcome.attempts.at(-1);
    if (last === undefined) continue;
    const state =
      last.state === "stale" || last.state === "timed-out"
        ? "timed-out"
        : last.state === "cancelled"
          ? "cancelled"
          : last.state === "completed"
            ? "completed"
            : "failed";
    nodes = nodes.map((node) =>
      node.taskId === outcome.taskId ? { ...node, state } : node,
    );
  }
  return { ...graph, nodes };
}

function sortOutcomes(
  outcomes: readonly NeutronReadyNodeOutcome[],
): NeutronReadyNodeOutcome[] {
  const byId = new Map(
    outcomes.map((outcome) => [outcome.taskId, outcome] as const),
  );
  return sortNeutronTaskIds(outcomes.map((outcome) => outcome.taskId)).map(
    (taskId) => byId.get(taskId)!,
  );
}
