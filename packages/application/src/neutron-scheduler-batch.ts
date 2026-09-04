import type { AgentRoleCapabilities } from "../../protocol/src/index.js";
import type {
  NeutronRuntimeSession,
  NeutronTaskGraph,
} from "../../protocol/src/neutron-runtime.js";
import type { FileSystem } from "./index.js";
import type { ModelAdapter } from "./model-adapter.js";
import {
  executeNeutronTaskNode,
  type ExecuteNeutronTaskNodeInput,
  type ExecuteNeutronTaskNodeResult,
} from "./neutron-node-execution.js";
import {
  systemNeutronSchedulerClock,
  type NeutronSchedulerClock,
} from "./neutron-scheduler-clock.js";
import { NeutronSchedulerError } from "./neutron-scheduler-errors.js";
import { startNeutronLeaseHeartbeat } from "./neutron-scheduler-heartbeat.js";
import {
  neutronLeaseHeartbeatIntervalMs,
  resolveNeutronLeaseAttempt,
  resolveNeutronLeaseTtlMs,
  type NeutronTaskLease,
} from "./neutron-scheduler-lease.js";
import {
  acquireNeutronTaskLease,
  releaseNeutronTaskLease,
  renewNeutronTaskLease,
} from "./neutron-scheduler-lease-store.js";
import {
  planNeutronTaskScheduling,
  type NeutronSchedulingPlan,
} from "./neutron-scheduler-select.js";
import { sortNeutronTaskIds } from "./neutron-scheduler-sort.js";
import { validateNeutronTaskGraphForExecution } from "./neutron-scheduler-validate.js";

export interface ExecuteReadyNeutronTaskNodesInput {
  readonly graph: NeutronTaskGraph;
  readonly session: NeutronRuntimeSession;
  readonly projectId: string;
  readonly adapter: ModelAdapter;
  readonly fs: FileSystem;
  readonly sessionCapabilities: AgentRoleCapabilities;
  readonly fingerprintProject: () => Promise<string>;
  readonly inspect?: ExecuteNeutronTaskNodeInput["inspect"];
  readonly profileName?: string;
  readonly profileAllowedTools?: readonly string[];
  readonly signal?: AbortSignal;
  readonly maxTokens?: number;
  readonly maxItems?: number;
  readonly maxConcurrency?: number;
  readonly ownerId?: string;
  readonly attempt?: number;
  readonly clock?: NeutronSchedulerClock;
  readonly nodeTimeoutMs?: number;
  readonly heartbeatSchedule?: Parameters<
    typeof startNeutronLeaseHeartbeat
  >[0]["schedule"];
}

export interface NeutronReadyNodeLeaseFailure {
  readonly taskId: string;
  readonly admitted: true;
  readonly executed: false;
  readonly lease: null;
  readonly execution: null;
  readonly error: NeutronSchedulerError;
}

export interface NeutronReadyNodeExecutionOutcome {
  readonly taskId: string;
  readonly admitted: true;
  readonly executed: boolean;
  readonly lease: NeutronTaskLease;
  readonly execution: ExecuteNeutronTaskNodeResult;
  readonly error: null;
}

export type NeutronReadyNodeOutcome =
  NeutronReadyNodeLeaseFailure | NeutronReadyNodeExecutionOutcome;

export interface ExecuteReadyNeutronTaskNodesResult {
  readonly graph: NeutronTaskGraph;
  readonly plan: NeutronSchedulingPlan;
  readonly admittedTaskIds: readonly string[];
  readonly outcomes: readonly NeutronReadyNodeOutcome[];
  readonly attempt: number;
  readonly ownerId: string;
}

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
  const admittedTaskIds = [...plan.selectedReadyTaskIds];
  const acquired: Array<{
    readonly taskId: string;
    readonly lease: NeutronTaskLease;
  }> = [];
  const failures: NeutronReadyNodeLeaseFailure[] = [];

  for (const taskId of admittedTaskIds) {
    if (input.signal?.aborted === true) break;
    try {
      const lease = await acquireNeutronTaskLease({
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
      acquired.push({ taskId, lease });
    } catch (error) {
      failures.push({
        taskId,
        admitted: true,
        executed: false,
        lease: null,
        execution: null,
        error:
          error instanceof NeutronSchedulerError
            ? error
            : new NeutronSchedulerError(
                "validation-failed",
                error instanceof Error ? error.message : "lease acquire failed",
                { taskId },
              ),
      });
    }
  }

  const executed = await Promise.all(
    acquired.map((entry) =>
      runAdmittedNode(input, graph, clock, ownerId, attempt, entry),
    ),
  );
  const outcomes = sortOutcomes([...failures, ...executed]);
  return {
    graph: mergeExecutedGraph(graph, outcomes),
    plan,
    admittedTaskIds,
    outcomes,
    attempt,
    ownerId,
  };
}

async function runAdmittedNode(
  input: ExecuteReadyNeutronTaskNodesInput,
  graph: NeutronTaskGraph,
  clock: NeutronSchedulerClock,
  ownerId: string,
  attempt: number,
  entry: { readonly taskId: string; readonly lease: NeutronTaskLease },
): Promise<NeutronReadyNodeExecutionOutcome> {
  const ttlMs = resolveNeutronLeaseTtlMs(input.nodeTimeoutMs);
  const heartbeat = startNeutronLeaseHeartbeat({
    intervalMs: neutronLeaseHeartbeatIntervalMs(ttlMs),
    ...(input.heartbeatSchedule === undefined
      ? {}
      : { schedule: input.heartbeatSchedule }),
    renew: async () => {
      await renewNeutronTaskLease({
        root: input.session.root,
        fs: input.fs,
        clock,
        sessionId: input.session.sessionId,
        taskId: entry.taskId,
        ownerId,
        attempt,
        ...(input.nodeTimeoutMs === undefined
          ? {}
          : { nodeTimeoutMs: input.nodeTimeoutMs }),
      });
    },
  });
  try {
    const execution = await executeNeutronTaskNode({
      graph,
      taskId: entry.taskId,
      session: input.session,
      projectId: input.projectId,
      adapter: input.adapter,
      fs: input.fs,
      sessionCapabilities: input.sessionCapabilities,
      fingerprintProject: input.fingerprintProject,
      allowConcurrentPeers: true,
      ...(input.inspect === undefined ? {} : { inspect: input.inspect }),
      ...(input.profileName === undefined
        ? {}
        : { profileName: input.profileName }),
      ...(input.profileAllowedTools === undefined
        ? {}
        : { profileAllowedTools: input.profileAllowedTools }),
      ...(input.signal === undefined ? {} : { signal: input.signal }),
      ...(input.maxTokens === undefined ? {} : { maxTokens: input.maxTokens }),
      ...(input.maxItems === undefined ? {} : { maxItems: input.maxItems }),
    });
    return {
      taskId: entry.taskId,
      admitted: true,
      executed: execution.executed,
      lease: await releaseOwnedLease(
        input,
        clock,
        ownerId,
        attempt,
        entry.taskId,
      ),
      execution,
      error: null,
    };
  } finally {
    heartbeat.stop();
    await releaseOwnedLease(input, clock, ownerId, attempt, entry.taskId).catch(
      () => undefined,
    );
  }
}

async function releaseOwnedLease(
  input: ExecuteReadyNeutronTaskNodesInput,
  clock: NeutronSchedulerClock,
  ownerId: string,
  attempt: number,
  taskId: string,
): Promise<NeutronTaskLease> {
  return releaseNeutronTaskLease({
    root: input.session.root,
    fs: input.fs,
    clock,
    sessionId: input.session.sessionId,
    taskId,
    ownerId,
    attempt,
  });
}

function mergeExecutedGraph(
  graph: NeutronTaskGraph,
  outcomes: readonly NeutronReadyNodeOutcome[],
): NeutronTaskGraph {
  let nodes = graph.nodes;
  for (const outcome of outcomes) {
    if (outcome.execution?.executed !== true) continue;
    const next = outcome.execution.node;
    nodes = nodes.map((node) => (node.taskId === next.taskId ? next : node));
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
