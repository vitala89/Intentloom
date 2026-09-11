import { describe, expect, it } from "vitest";
import {
  NEUTRON_GRAPH_DEFAULT_CONCURRENCY,
  NEUTRON_GRAPH_HARD_MAX_CONCURRENCY,
  NEUTRON_GRAPH_SNAPSHOT_SCHEMA_URN,
  NEUTRON_GRAPH_STATUS_PRECEDENCE,
  NEUTRON_RUNTIME_SESSION_SCHEMA_URN,
  NEUTRON_TASK_GRAPH_SCHEMA_URN,
} from "@intentloom/protocol";
import type {
  NeutronRuntimeSession,
  NeutronTaskGraph,
  NeutronTaskNode,
  NeutronTaskState,
} from "@intentloom/protocol";
import { validateNeutronGraphSnapshot } from "../packages/validator/src/neutron-graph.js";
import { projectNeutronGraphSnapshot } from "../packages/application/src/neutron-graph-projection.js";
import {
  aggregateNeutronTaskGraphResults,
  classifyNeutronGraphStatus,
} from "../packages/application/src/neutron-scheduler.js";
import type { NeutronAttemptEvidence } from "../packages/application/src/neutron-scheduler-attempt.js";
import type { NeutronReadyNodeOutcome } from "../packages/application/src/neutron-scheduler-wave-types.js";
import { NeutronSchedulerError } from "../packages/application/src/neutron-scheduler-errors.js";

const ROOT = "/project";
const SESSION = "session-n6-g";
const PROJECT = "project-n6-g";

function session(): NeutronRuntimeSession {
  return {
    createdAt: "2026-09-11T00:00:00.000Z",
    mutationAllowed: false,
    projectId: PROJECT,
    root: ROOT,
    schemaVersion: NEUTRON_RUNTIME_SESSION_SCHEMA_URN,
    sessionId: SESSION,
    state: "planning",
  };
}

function node(
  taskId: string,
  overrides: Partial<NeutronTaskNode> = {},
): NeutronTaskNode {
  return {
    dependencies: [],
    expectedOutput: `Complete ${taskId}`,
    parentId: null,
    requiredCapabilities: ["inspect"],
    role: "context-scout",
    state: "ready",
    taskId,
    ...overrides,
  };
}

function graph(nodes: NeutronTaskNode[]): NeutronTaskGraph {
  return {
    nodes,
    root: ROOT,
    schemaVersion: NEUTRON_TASK_GRAPH_SCHEMA_URN,
    sessionId: SESSION,
  };
}

function attempt(
  taskId: string,
  number: number,
  state: NeutronAttemptEvidence["state"],
  retryReason?: NeutronAttemptEvidence["retryReason"],
): NeutronAttemptEvidence {
  return {
    attempt: number,
    completedAt: number * 20,
    error:
      state === "completed" || state === "stale"
        ? null
        : {
            code:
              state === "timed-out"
                ? "timeout"
                : state === "cancelled"
                  ? "cancelled"
                  : "operation-failed",
            message: state,
            stage: state === "timed-out" ? "timeout" : "model",
          },
    leaseId: `${SESSION}:${taskId}:${number}`,
    startedAt: number * 10,
    state,
    ...(retryReason === undefined ? {} : { retryReason }),
  };
}

function outcome(
  taskId: string,
  attempts: readonly NeutronAttemptEvidence[],
): NeutronReadyNodeOutcome {
  return {
    admitted: true,
    attempts,
    error: new NeutronSchedulerError("validation-failed", "synthetic"),
    executed: false,
    execution: null,
    lease: null,
    taskId,
  };
}

function snapshotFor(
  nodes: NeutronTaskNode[],
  outcomes: readonly NeutronReadyNodeOutcome[] = [],
  stale?: Parameters<typeof aggregateNeutronTaskGraphResults>[0]["stale"],
) {
  const result = aggregateNeutronTaskGraphResults({
    graph: graph(nodes),
    outcomes,
    session: session(),
    ...(stale === undefined ? {} : { stale }),
  });
  return validateNeutronGraphSnapshot(projectNeutronGraphSnapshot({ result }));
}

describe("Neutron N6 Slice 3 graph projection", () => {
  it("orders nodes by code-point ascending taskId", () => {
    const snapshot = snapshotFor([
      node("task-c"),
      node("task-a"),
      node("task-b"),
    ]);
    expect(snapshot.nodes.map((item) => item.taskId)).toEqual([
      "task-a",
      "task-b",
      "task-c",
    ]);
  });

  it("uses canonical graph status precedence", () => {
    expect(NEUTRON_GRAPH_STATUS_PRECEDENCE).toEqual([
      "stale",
      "incomplete",
      "cancelled",
      "timed-out",
      "failed",
      "completed",
    ]);
    expect(
      classifyNeutronGraphStatus({
        nodeStates: ["completed", "failed", "cancelled"],
        stale: true,
      }),
    ).toBe("stale");
    expect(
      classifyNeutronGraphStatus({
        nodeStates: ["pending", "failed"],
        stale: false,
      }),
    ).toBe("incomplete");
  });

  it("preserves attempt 1 after attempt 2 completes", () => {
    const snapshot = snapshotFor(
      [node("task-a")],
      [
        outcome("task-a", [
          attempt("task-a", 1, "failed", "operation-failed"),
          attempt("task-a", 2, "completed"),
        ]),
      ],
    );
    expect(snapshot.nodes[0]?.attempts.map((item) => item.attempt)).toEqual([
      1, 2,
    ]);
    expect(snapshot.nodes[0]?.attempts[0]?.state).toBe("failed");
    expect(snapshot.nodes[0]?.attempts[1]?.state).toBe("completed");
  });

  it("keeps timed-out distinct from failed", () => {
    const timedOut = snapshotFor(
      [node("task-a", { state: "timed-out" })],
      [outcome("task-a", [attempt("task-a", 1, "timed-out", "timeout")])],
    );
    const failed = snapshotFor(
      [node("task-b", { state: "failed" })],
      [outcome("task-b", [attempt("task-b", 1, "failed")])],
    );
    expect(timedOut.status).toBe("timed-out");
    expect(failed.status).toBe("failed");
    expect(timedOut.nodes[0]?.attempts[0]?.state).toBe("timed-out");
  });

  it("projects cancellation and stale kinds without rerun", () => {
    const cancelled = snapshotFor(
      [node("task-a", { state: "cancelled" })],
      [outcome("task-a", [attempt("task-a", 1, "cancelled", "cancelled")])],
    );
    expect(cancelled.status).toBe("cancelled");
    const stale = snapshotFor([node("task-a", { state: "completed" })], [], {
      accepted: false,
      kinds: ["project", "checkpoint", "profile"],
      mismatches: [
        { current: "c", expected: "p", kind: "project" },
        { current: "c", expected: "k", kind: "checkpoint" },
        { current: "c", expected: "f", kind: "profile" },
      ],
      rerunAttempted: false,
    });
    expect(stale.status).toBe("stale");
    expect(stale.accepted).toBe(false);
    expect(stale.rerunAttempted).toBe(false);
    expect(stale.stale?.kinds).toEqual(["project", "checkpoint", "profile"]);
  });

  it("binds concurrency to the canonical 1-4 range", () => {
    const snapshot = snapshotFor([node("task-a")]);
    expect(snapshot.concurrency.defaultConcurrency).toBe(
      NEUTRON_GRAPH_DEFAULT_CONCURRENCY,
    );
    expect(snapshot.concurrency.hardMaximum).toBe(
      NEUTRON_GRAPH_HARD_MAX_CONCURRENCY,
    );
    expect(snapshot.concurrency.maxConcurrency).toBeLessThanOrEqual(4);
    expect(snapshot.schemaVersion).toBe(NEUTRON_GRAPH_SNAPSHOT_SCHEMA_URN);
  });

  it("clamps projected child capabilities to read-only intersection", () => {
    expect(() =>
      validateNeutronGraphSnapshot({
        ...snapshotFor([node("task-a")]),
        nodes: [
          {
            ...snapshotFor([node("task-a")]).nodes[0],
            effectiveCapabilities: {
              allowNetwork: true,
              allowedTools: ["writeFile"],
              maxBudget: 99,
              readOnly: false,
            },
          },
        ],
      }),
    ).toThrow(/readOnly must be true/);
  });

  it("renders canonical dependencies rather than inferred names", () => {
    const snapshot = snapshotFor([
      node("task-a"),
      node("task-b", {
        dependencies: ["task-a"],
        state: "pending" as NeutronTaskState,
      }),
    ]);
    const child = snapshot.nodes.find((item) => item.taskId === "task-b");
    expect(child?.dependencies).toEqual(["task-a"]);
    expect(child?.blockingDependencyIds).toEqual(["task-a"]);
  });
});
