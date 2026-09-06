import type {
  NeutronTaskGraph,
  NeutronTaskState,
} from "../../protocol/src/neutron-runtime.js";
import type { ExecuteNeutronTaskNodeResult } from "./neutron-node-execution.js";
import { executeNeutronTaskNode } from "./neutron-node-execution.js";
import {
  composeNeutronAbortSignals,
  isNeutronSessionCancelled,
  neutronAbortKind,
} from "./neutron-scheduler-cancellation.js";
import type { NeutronSchedulerClock } from "./neutron-scheduler-clock.js";
import { startNeutronLeaseHeartbeat } from "./neutron-scheduler-heartbeat.js";
import {
  neutronLeaseHeartbeatIntervalMs,
  resolveNeutronLeaseTtlMs,
  type NeutronTaskLease,
} from "./neutron-scheduler-lease.js";
import {
  releaseNeutronTaskLease,
  renewNeutronTaskLease,
} from "./neutron-scheduler-lease-store.js";
import { startNeutronNodeTimeout } from "./neutron-scheduler-timeout.js";
import type { ExecuteReadyNeutronTaskNodesInput } from "./neutron-scheduler-wave-types.js";

export interface NeutronAttemptRun {
  readonly execution: ExecuteNeutronTaskNodeResult;
  readonly timedOut: boolean;
  readonly untrustedSuccess: boolean;
  readonly leaseLost: boolean;
  readonly cancelled: boolean;
  readonly budgetExceeded: boolean;
}

export async function executeNeutronRecoverableAttempt(
  input: ExecuteReadyNeutronTaskNodesInput,
  clock: NeutronSchedulerClock,
  ownerId: string,
  attempt: number,
  lease: NeutronTaskLease,
  ceiling: readonly string[] | undefined,
): Promise<NeutronAttemptRun> {
  const attemptAbort = new AbortController();
  const timeout =
    input.nodeTimeoutMs === undefined
      ? undefined
      : startNeutronNodeTimeout({
          timeoutMs: input.nodeTimeoutMs,
          ...(input.timeoutSchedule === undefined
            ? {}
            : { schedule: input.timeoutSchedule }),
        });
  let leaseLost = false;
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
        taskId: lease.taskId,
        ownerId,
        attempt,
        ...(input.nodeTimeoutMs === undefined
          ? {}
          : { nodeTimeoutMs: input.nodeTimeoutMs }),
      });
    },
    onError: () => {
      leaseLost = true;
      attemptAbort.abort("lease-lost");
    },
  });
  const signal = composeNeutronAbortSignals([
    input.signal,
    input.nodeSignals?.[lease.taskId],
    attemptAbort.signal,
    timeout?.signal,
  ]);
  try {
    const raw = await executeNeutronTaskNode({
      graph: input.graph,
      taskId: lease.taskId,
      session: input.session,
      projectId: input.projectId,
      adapter: input.adapter,
      fs: input.fs,
      sessionCapabilities: input.sessionCapabilities,
      fingerprintProject: input.fingerprintProject,
      allowConcurrentPeers: true,
      attempt,
      ...(ceiling === undefined ? {} : { capabilityCeiling: ceiling }),
      ...(input.inspect === undefined ? {} : { inspect: input.inspect }),
      ...(input.profileName === undefined
        ? {}
        : { profileName: input.profileName }),
      ...(input.profileAllowedTools === undefined
        ? {}
        : { profileAllowedTools: input.profileAllowedTools }),
      ...(signal === undefined ? {} : { signal }),
      ...(input.maxTokens === undefined ? {} : { maxTokens: input.maxTokens }),
      ...(input.maxItems === undefined ? {} : { maxItems: input.maxItems }),
    });
    const kind = neutronAbortKind(signal);
    const timedOut = timeout?.timedOut === true || kind === "timeout";
    const cancelled =
      kind === "cancelled" ||
      isNeutronSessionCancelled(input.session, input.signal);
    const untrustedSuccess =
      raw.executed && raw.error === null && (timedOut || leaseLost);
    const execution =
      timedOut || untrustedSuccess || leaseLost
        ? asTimedOutExecution(raw, input.graph, lease.taskId)
        : raw;
    return {
      execution,
      timedOut,
      untrustedSuccess,
      leaseLost,
      cancelled,
      budgetExceeded: raw.executed
        ? raw.usage?.limitExceeded === true
        : raw.error.code === "budget-exceeded",
    };
  } finally {
    timeout?.stop();
    heartbeat.stop();
    await releaseNeutronTaskLease({
      root: input.session.root,
      fs: input.fs,
      clock,
      sessionId: input.session.sessionId,
      taskId: lease.taskId,
      ownerId,
      attempt,
    }).catch(() => undefined);
  }
}

export function asTimedOutExecution(
  execution: ExecuteNeutronTaskNodeResult,
  fallbackGraph: NeutronTaskGraph,
  taskId: string,
): ExecuteNeutronTaskNodeResult {
  const error = {
    code: "timeout" as const,
    stage: "timeout" as const,
    message: "Node execution timed out",
  };
  if (!execution.executed) {
    return { ...execution, error };
  }
  const graph = forceNodeState(
    execution.graph ?? fallbackGraph,
    taskId,
    "timed-out",
  );
  const node = graph.nodes.find((entry) => entry.taskId === taskId)!;
  return { ...execution, graph, node, error };
}

function forceNodeState(
  graph: NeutronTaskGraph,
  taskId: string,
  state: NeutronTaskState,
): NeutronTaskGraph {
  return {
    ...graph,
    nodes: graph.nodes.map((node) =>
      node.taskId === taskId ? { ...node, state } : node,
    ),
  };
}
