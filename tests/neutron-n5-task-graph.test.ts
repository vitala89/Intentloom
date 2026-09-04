import { describe, expect, it } from "vitest";
import {
  NEUTRON_TASK_GRAPH_SCHEMA_URN,
  type NeutronTaskGraph,
  type NeutronTaskNode,
} from "../packages/protocol/src/neutron-runtime.js";
import {
  NeutronSchedulerError,
  validateNeutronTaskGraphForExecution,
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

describe("Neutron N5 execution graph validation", () => {
  it("accepts an empty graph", () => {
    expect(validateNeutronTaskGraphForExecution(graph([])).nodes).toEqual([]);
  });

  it("accepts a valid diamond graph", () => {
    const validated = validateNeutronTaskGraphForExecution(
      graph([
        node("a"),
        node("b", { dependencies: ["a"] }),
        node("c", { dependencies: ["a"] }),
        node("d", { dependencies: ["b", "c"] }),
      ]),
    );
    expect(validated.nodes.map((entry) => entry.taskId)).toEqual([
      "a",
      "b",
      "c",
      "d",
    ]);
  });

  it("does not treat parentId as an execution dependency", () => {
    const validated = validateNeutronTaskGraphForExecution(
      graph([
        node("parent", { state: "pending" }),
        node("child", { parentId: "parent", dependencies: [] }),
      ]),
    );
    expect(validated.nodes[1]?.parentId).toBe("parent");
    expect(validated.nodes[1]?.dependencies).toEqual([]);
  });

  it("rejects duplicate task IDs", () => {
    expect(() =>
      validateNeutronTaskGraphForExecution(graph([node("dup"), node("dup")])),
    ).toThrow(
      expect.objectContaining<Partial<NeutronSchedulerError>>({
        code: "duplicate-task-id",
      }),
    );
  });

  it("rejects missing dependencies", () => {
    expect(() =>
      validateNeutronTaskGraphForExecution(
        graph([node("child", { dependencies: ["missing"] })]),
      ),
    ).toThrow(
      expect.objectContaining<Partial<NeutronSchedulerError>>({
        code: "missing-dependency",
      }),
    );
  });

  it("rejects self dependencies", () => {
    expect(() =>
      validateNeutronTaskGraphForExecution(
        graph([node("self", { dependencies: ["self"] })]),
      ),
    ).toThrow(
      expect.objectContaining<Partial<NeutronSchedulerError>>({
        code: "self-dependency",
      }),
    );
  });

  it("rejects duplicate dependency IDs on a node", () => {
    expect(() =>
      validateNeutronTaskGraphForExecution(
        graph([node("a"), node("b", { dependencies: ["a", "a"] })]),
      ),
    ).toThrow(
      expect.objectContaining<Partial<NeutronSchedulerError>>({
        code: "duplicate-dependency",
      }),
    );
  });

  it("rejects a two-node cycle deterministically", () => {
    let error: unknown;
    try {
      validateNeutronTaskGraphForExecution(
        graph([
          node("a", { dependencies: ["b"] }),
          node("b", { dependencies: ["a"] }),
        ]),
      );
    } catch (caught) {
      error = caught;
    }
    expect(error).toBeInstanceOf(NeutronSchedulerError);
    expect((error as NeutronSchedulerError).code).toBe("cycle-detected");
    expect((error as NeutronSchedulerError).details.cyclePath).toEqual([
      "a",
      "b",
      "a",
    ]);
  });

  it("rejects a multi-node cycle", () => {
    let error: unknown;
    try {
      validateNeutronTaskGraphForExecution(
        graph([
          node("a", { dependencies: ["c"] }),
          node("b", { dependencies: ["a"] }),
          node("c", { dependencies: ["b"] }),
        ]),
      );
    } catch (caught) {
      error = caught;
    }
    expect(error).toBeInstanceOf(NeutronSchedulerError);
    expect((error as NeutronSchedulerError).code).toBe("cycle-detected");
    expect((error as NeutronSchedulerError).details.cyclePath).toEqual([
      "a",
      "c",
      "b",
      "a",
    ]);
  });

  it("rejects invalid parentId references", () => {
    expect(() =>
      validateNeutronTaskGraphForExecution(
        graph([node("child", { parentId: "missing" })]),
      ),
    ).toThrow(
      expect.objectContaining<Partial<NeutronSchedulerError>>({
        code: "invalid-parent",
      }),
    );
  });
});
