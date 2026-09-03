import { describe, expect, it } from "vitest";
import {
  NEUTRON_TASK_GRAPH_SCHEMA_URN,
  type NeutronTaskGraph,
  type NeutronTaskNode,
  type NeutronTaskState,
} from "../packages/protocol/src/neutron-runtime.js";
import {
  applyNeutronTaskStateTransition,
  NeutronSchedulerError,
  planNeutronTaskScheduling,
  selectReadyNodes,
  validateNeutronTaskStateTransition,
} from "../packages/application/src/neutron-scheduler.js";

const ROOT = "/project";
const SESSION = "session-1";

function node(
  taskId: string,
  overrides: Partial<NeutronTaskNode> = {},
): NeutronTaskNode {
  return {
    taskId,
    parentId: null,
    dependencies: [],
    role: "research",
    requiredCapabilities: ["inspect"],
    state: "pending",
    expectedOutput: "output",
    ...overrides,
  };
}

function graph(nodes: NeutronTaskNode[]): NeutronTaskGraph {
  return {
    schemaVersion: NEUTRON_TASK_GRAPH_SCHEMA_URN,
    root: ROOT,
    sessionId: SESSION,
    nodes,
  };
}

describe("Neutron N5 deterministic scheduling", () => {
  it("marks zero-dependency pending nodes as ready", () => {
    const plan = planNeutronTaskScheduling({
      graph: graph([node("solo")]),
    });
    expect(plan.readyTaskIds).toEqual(["solo"]);
    expect(plan.selectedReadyTaskIds).toEqual(["solo"]);
  });

  it("waits when a dependency is pending", () => {
    const plan = planNeutronTaskScheduling({
      graph: graph([
        node("a", { state: "pending" }),
        node("b", { dependencies: ["a"], state: "pending" }),
      ]),
    });
    expect(plan.readyTaskIds).toEqual(["a"]);
    expect(plan.waitingTaskIds).toEqual(["b"]);
  });

  it("waits when a dependency is running", () => {
    const plan = planNeutronTaskScheduling({
      graph: graph([
        node("a", { state: "running" }),
        node("b", { dependencies: ["a"], state: "pending" }),
      ]),
    });
    expect(plan.runningTaskIds).toEqual(["a"]);
    expect(plan.waitingTaskIds).toEqual(["b"]);
    const child = plan.classifications.find((entry) => entry.taskId === "b");
    expect(child?.reasons).toContain("dependency-running");
  });

  it("blocks when a dependency failed, cancelled, or timed out", () => {
    for (const state of ["failed", "cancelled", "timed-out"] as const) {
      const plan = planNeutronTaskScheduling({
        graph: graph([
          node("a", { state }),
          node("b", { dependencies: ["a"], state: "pending" }),
        ]),
      });
      expect(plan.blockedTaskIds).toEqual(["b"]);
    }
  });

  it("becomes ready when all dependencies completed", () => {
    const plan = planNeutronTaskScheduling({
      graph: graph([
        node("a", { state: "completed" }),
        node("b", { dependencies: ["a"], state: "pending" }),
      ]),
    });
    expect(plan.readyTaskIds).toEqual(["b"]);
  });

  it("sorts ready nodes by taskId code-point ascending", () => {
    const ready = selectReadyNodes({
      graph: graph([node("z-last"), node("a-first"), node("m-middle")]),
      maxConcurrency: 4,
    });
    expect(ready).toEqual(["a-first", "m-middle", "z-last"]);
  });

  it("is independent of node insertion order", () => {
    const forward = selectReadyNodes({
      graph: graph([node("b"), node("a"), node("c")]),
      maxConcurrency: 4,
    });
    const reverse = selectReadyNodes({
      graph: graph([node("c"), node("a"), node("b")]),
      maxConcurrency: 4,
    });
    expect(forward).toEqual(["a", "b", "c"]);
    expect(reverse).toEqual(["a", "b", "c"]);
  });

  it("is independent of dependency array order", () => {
    const plan = planNeutronTaskScheduling({
      graph: graph([
        node("a", { state: "completed" }),
        node("b", { state: "completed" }),
        node("c", {
          dependencies: ["b", "a"],
          state: "pending",
        }),
        node("d", {
          dependencies: ["a", "b"],
          state: "pending",
        }),
      ]),
    });
    expect(plan.readyTaskIds).toEqual(["c", "d"]);
  });

  it("respects capacity 1 by default", () => {
    const ready = selectReadyNodes({
      graph: graph([node("a"), node("b"), node("c")]),
    });
    expect(ready).toEqual(["a"]);
  });

  it("respects explicit capacity 2 and 4", () => {
    const two = selectReadyNodes({
      graph: graph([node("a"), node("b"), node("c")]),
      maxConcurrency: 2,
    });
    expect(two).toEqual(["a", "b"]);

    const four = selectReadyNodes({
      graph: graph([node("a"), node("b"), node("c"), node("d"), node("e")]),
      maxConcurrency: 4,
    });
    expect(four).toEqual(["a", "b", "c", "d"]);
  });

  it("returns no runnable nodes when capacity is exhausted by running nodes", () => {
    const ready = selectReadyNodes({
      graph: graph([
        node("running-a", { state: "running" }),
        node("ready-b"),
        node("ready-c"),
      ]),
      maxConcurrency: 1,
    });
    expect(ready).toEqual([]);
    const plan = planNeutronTaskScheduling({
      graph: graph([node("running-a", { state: "running" }), node("ready-b")]),
      maxConcurrency: 1,
    });
    expect(plan.availableCapacity).toBe(0);
    expect(plan.runningCount).toBe(1);
  });

  it("rejects invalid concurrency bounds", () => {
    expect(() =>
      selectReadyNodes({
        graph: graph([node("a")]),
        maxConcurrency: 0,
      }),
    ).toThrowError(NeutronSchedulerError);
    expect(() =>
      selectReadyNodes({
        graph: graph([node("a")]),
        maxConcurrency: 5,
      }),
    ).toThrowError(NeutronSchedulerError);
  });
});

describe("Neutron N5 pure task transitions", () => {
  it("allows valid lifecycle transitions", () => {
    const path: Array<[NeutronTaskState, NeutronTaskState]> = [
      ["pending", "ready"],
      ["ready", "running"],
      ["running", "completed"],
      ["running", "failed"],
      ["running", "cancelled"],
      ["running", "timed-out"],
      ["running", "ready"],
      ["ready", "cancelled"],
      ["pending", "cancelled"],
      ["blocked", "ready"],
    ];
    for (const [fromState, toState] of path) {
      expect(applyNeutronTaskStateTransition(fromState, toState)).toBe(toState);
    }
  });

  it("rejects invalid pending to completed transitions", () => {
    expect(() =>
      validateNeutronTaskStateTransition("pending", "completed"),
    ).toThrowError(NeutronSchedulerError);
  });

  it("rejects restarting terminal states", () => {
    for (const terminal of [
      "completed",
      "failed",
      "cancelled",
      "timed-out",
    ] as const) {
      expect(() =>
        validateNeutronTaskStateTransition(terminal, "ready"),
      ).toThrowError(NeutronSchedulerError);
    }
  });
});

describe("Neutron N5 scheduler safety boundary", () => {
  it("does not import N2, N3, or N4 execution modules", async () => {
    const source = await import("node:fs/promises").then((fs) =>
      fs.readFile(
        new URL(
          "../packages/application/src/neutron-scheduler.ts",
          import.meta.url,
        ),
        "utf8",
      ),
    );
    expect(source).not.toMatch(
      /neutron-n2|neutron-context-assembly|neutron-tool-router/,
    );
  });
});
