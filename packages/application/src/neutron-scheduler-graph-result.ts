import { checksum } from "@intentloom/core";
import type {
  NeutronRuntimeSession,
  NeutronTaskGraph,
  NeutronTaskState,
  NeutronUsageBudget,
} from "../../protocol/src/neutron-runtime.js";
import {
  compareNeutronTaskIds,
  sortNeutronTaskIds,
} from "./neutron-scheduler-sort.js";
import type { NeutronGraphNodeRecord } from "./neutron-scheduler-provenance.js";
import type { NeutronGraphStaleReport } from "./neutron-scheduler-stale.js";

export const NEUTRON_GRAPH_STATUSES = [
  "completed",
  "failed",
  "cancelled",
  "timed-out",
  "incomplete",
  "stale",
] as const;

export type NeutronGraphStatus = (typeof NEUTRON_GRAPH_STATUSES)[number];

export interface NeutronGraphExecutionResult {
  readonly graphId: string;
  readonly sessionId: string;
  readonly root: string;
  readonly projectId: string;
  readonly status: NeutronGraphStatus;
  readonly partial: boolean;
  readonly accepted: boolean;
  readonly mutationAttempted: false;
  readonly rerunAttempted: false;
  readonly budgetExceeded: boolean;
  readonly nodes: readonly NeutronGraphNodeRecord[];
  readonly usage: NeutronUsageBudget;
  readonly digest: string;
  readonly stale: NeutronGraphStaleReport | null;
  readonly warnings: readonly string[];
}

const INCOMPLETE_STATES = new Set<NeutronTaskState>([
  "pending",
  "ready",
  "running",
]);

export function neutronGraphExecutionId(graph: NeutronTaskGraph): string {
  const identity = {
    root: graph.root.replaceAll("\\", "/"),
    sessionId: graph.sessionId,
    taskIds: sortNeutronTaskIds(graph.nodes.map((node) => node.taskId)),
  };
  return `sha256:${checksum(stableSerialize(identity))}`;
}

export function classifyNeutronGraphStatus(input: {
  readonly nodeStates: readonly NeutronTaskState[];
  readonly stale: boolean;
}): NeutronGraphStatus {
  if (input.stale) return "stale";
  if (input.nodeStates.some((state) => INCOMPLETE_STATES.has(state))) {
    return "incomplete";
  }
  if (input.nodeStates.some((state) => state === "cancelled")) {
    return "cancelled";
  }
  if (input.nodeStates.some((state) => state === "timed-out")) {
    return "timed-out";
  }
  if (
    input.nodeStates.some((state) => state === "failed" || state === "blocked")
  ) {
    return "failed";
  }
  return "completed";
}

export function digestNeutronGraphExecution(input: {
  readonly graphId: string;
  readonly session: NeutronRuntimeSession;
  readonly status: NeutronGraphStatus;
  readonly nodes: readonly NeutronGraphNodeRecord[];
  readonly usage: NeutronUsageBudget;
  readonly stale: NeutronGraphStaleReport | null;
}): string {
  return `sha256:${checksum(
    stableSerialize({
      budgetExceeded: input.usage.limitExceeded,
      graphId: input.graphId,
      nodes: input.nodes.map(logicalNode),
      projectId: input.session.projectId,
      root: input.session.root.replaceAll("\\", "/"),
      sessionId: input.session.sessionId,
      stale: input.stale === null ? null : logicalStale(input.stale),
      status: input.status,
      usage: {
        contextTokens: input.usage.contextTokens,
        inputTokens: input.usage.inputTokens,
        limitExceeded: input.usage.limitExceeded,
        outputTokens: input.usage.outputTokens,
        sessionId: input.usage.sessionId,
        tokenBudget: input.usage.tokenBudget,
      },
    }),
  )}`;
}

export function stableSerialize(value: unknown): string {
  return JSON.stringify(canonicalize(value));
}

function logicalNode(node: NeutronGraphNodeRecord): unknown {
  const { startedAt: _s, completedAt: _c, ...logical } = node;
  return {
    ...logical,
    attempts: node.attempts.map((attempt) => {
      const { startedAt: _as, completedAt: _ac, ...rest } = attempt;
      return rest;
    }),
  };
}

function logicalStale(report: NeutronGraphStaleReport): unknown {
  return {
    accepted: report.accepted,
    kinds: [...report.kinds],
    mismatches: report.mismatches.map((item) => ({
      current: item.current,
      expected: item.expected,
      kind: item.kind,
    })),
    rerunAttempted: report.rerunAttempted,
  };
}

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value === null || typeof value !== "object") return value;
  const record = value as Record<string, unknown>;
  const keys = Object.keys(record).sort(compareNeutronTaskIds);
  const next: Record<string, unknown> = {};
  for (const key of keys) {
    const item = record[key];
    if (item !== undefined) next[key] = canonicalize(item);
  }
  return next;
}
