import { describe, expect, it } from "vitest";
import {
  createMemoryFileSystem,
  inspectProject,
  type FileSystem,
} from "../packages/application/src/index.js";
import {
  executeNeutronTaskNode,
  resolveNeutronNodeCapabilities,
  type ExecuteNeutronTaskNodeResult,
  type NeutronNodeExecutionSuccess,
} from "../packages/application/src/neutron-scheduler.js";
import type { ModelAdapter } from "../packages/application/src/model-adapter.js";
import { NeutronN2Error } from "../packages/validator/src/neutron-runtime-n2.js";
import { validateModelAdapterCapabilities } from "../packages/validator/src/model-adapter.js";
import type {
  ModelTurnRequest,
  ModelTurnResult,
} from "../packages/protocol/src/model-adapter.js";
import {
  NEUTRON_RUNTIME_SESSION_SCHEMA_URN,
  NEUTRON_TASK_GRAPH_SCHEMA_URN,
  type NeutronRuntimeSession,
  type NeutronTaskGraph,
  type NeutronTaskNode,
} from "../packages/protocol/src/neutron-runtime.js";
import type { AgentRoleCapabilities } from "../packages/protocol/src/index.js";

const ROOT = "/project";
const SESSION = "session-n5-2";
const PROJECT = "project-n5-2";

function caps(
  allowedTools: readonly string[] = ["inspect"],
): AgentRoleCapabilities {
  return {
    readOnly: true,
    allowedPaths: [],
    allowedTools,
    maxBudget: 100,
    allowNetwork: false,
  };
}

function session(
  overrides: Partial<NeutronRuntimeSession> = {},
): NeutronRuntimeSession {
  return {
    schemaVersion: NEUTRON_RUNTIME_SESSION_SCHEMA_URN,
    sessionId: SESSION,
    root: ROOT,
    projectId: PROJECT,
    state: "inspecting",
    mutationAllowed: false,
    createdAt: "2026-09-05T00:00:00.000Z",
    ...overrides,
  };
}

function node(
  taskId: string,
  overrides: Partial<NeutronTaskNode> = {},
): NeutronTaskNode {
  return {
    taskId,
    parentId: null,
    dependencies: [],
    role: "context-scout",
    requiredCapabilities: ["inspect"],
    state: "ready",
    expectedOutput: "Inspect the project and summarize findings",
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

function fingerprint(fs: FileSystem): string {
  return [...fs.files.entries()]
    .toSorted(([left], [right]) => left.localeCompare(right))
    .map(([path, content]) => `${path}:${content}`)
    .join("\n");
}

function projectFiles(
  extras: Record<string, string> = {},
): Record<string, string> {
  return {
    "/project/package.json": JSON.stringify({ name: "n5-slice2" }),
    "/project/docs/specs/SPEC.md": "# Intent\nRead-only node execution.\n",
    "/project/README.md": "safe",
    "/project/.aif/memory/tasks/task-a.json": `${JSON.stringify({
      schemaVersion: "1",
      id: "task-a",
      root: "/project",
      intent: "Inspect the project and summarize findings",
      affectedPaths: ["README.md"],
      validationOutcome: "partial",
      evidenceReferences: [],
      usedSkills: [],
      unresolvedWork: ["inspect"],
      provenance: "intentloom.task.summary.v1",
      trustClass: "user-supplied",
      retentionState: "active",
      createdAt: "2026-09-05T00:00:00.000Z",
    })}\n`,
    ...extras,
  };
}

function turn(
  sessionId: string,
  options: {
    readonly text?: string;
    readonly toolName?: string;
    readonly toolArgs?: Record<string, unknown>;
  } = {},
): ModelTurnResult {
  const toolName = options.toolName;
  return {
    schemaVersion: 1,
    sessionId,
    responseText: options.text ?? "",
    toolCalls:
      toolName === undefined
        ? []
        : [
            {
              id: `call-${toolName}`,
              name: toolName,
              argumentsJson: JSON.stringify(options.toolArgs ?? { root: ROOT }),
            },
          ],
    stopReason: toolName === undefined ? "stop" : "tool_call",
    usage: { inputTokens: 4, outputTokens: 2, totalTokens: 6 },
    diagnostics: ["n5-slice2"],
  };
}

class ScriptedAdapter implements ModelAdapter {
  readonly requests: ModelTurnRequest[] = [];
  private readonly steps: Array<ModelTurnResult | Error>;

  constructor(steps: Array<ModelTurnResult | Error>) {
    this.steps = [...steps];
  }

  getCapabilities() {
    return validateModelAdapterCapabilities({
      providerKind: "ollama",
      modelId: "fixture-n5",
      supportsStreaming: false,
      supportsToolCalls: true,
      supportsVision: false,
      maxContextTokens: 8192,
      maxOutputTokens: 1024,
    });
  }

  async executeTurn(
    request: ModelTurnRequest,
    options: { signal?: AbortSignal } = {},
  ): Promise<ModelTurnResult> {
    if (options.signal?.aborted === true) {
      throw new NeutronN2Error(
        "cancelled",
        "Model turn execution was cancelled",
      );
    }
    this.requests.push(request);
    const next = this.steps.shift();
    if (next === undefined) {
      throw new Error("unexpected extra model turn");
    }
    if (next instanceof Error) throw next;
    return next;
  }
}

function inspectThenAnswer(sessionId: string): ScriptedAdapter {
  return new ScriptedAdapter([
    turn(sessionId, { toolName: "inspect" }),
    turn(sessionId, { text: "Inspection complete" }),
  ]);
}

async function execute(
  options: {
    readonly nodes?: NeutronTaskNode[];
    readonly taskId?: string;
    readonly adapter?: ScriptedAdapter;
    readonly session?: NeutronRuntimeSession;
    readonly capabilities?: AgentRoleCapabilities;
    readonly files?: Record<string, string>;
    readonly profileName?: string;
    readonly profileAllowedTools?: readonly string[];
    readonly signal?: AbortSignal;
  } = {},
) {
  const fs = createMemoryFileSystem(options.files ?? projectFiles());
  const adapter = options.adapter ?? inspectThenAnswer(SESSION);
  const before = fingerprint(fs);
  const result = await executeNeutronTaskNode({
    graph: graph(options.nodes ?? [node("task-a")]),
    taskId: options.taskId ?? "task-a",
    session: options.session ?? session(),
    projectId: PROJECT,
    adapter,
    fs,
    sessionCapabilities: options.capabilities ?? caps(),
    fingerprintProject: async () => fingerprint(fs),
    inspect: async (root) => inspectProject(root, fs),
    ...(options.profileName !== undefined
      ? { profileName: options.profileName }
      : {}),
    ...(options.profileAllowedTools !== undefined
      ? { profileAllowedTools: options.profileAllowedTools }
      : {}),
    ...(options.signal !== undefined ? { signal: options.signal } : {}),
  });
  return { result, adapter, fs, before, after: fingerprint(fs) };
}

function expectExecuted(
  result: ExecuteNeutronTaskNodeResult,
): NeutronNodeExecutionSuccess {
  expect(result.executed).toBe(true);
  return result as NeutronNodeExecutionSuccess;
}

describe("Neutron N5 Slice 2 — capability clamp", () => {
  it("intersects session, parent, node, and the read-only catalog", () => {
    const resolved = resolveNeutronNodeCapabilities({
      sessionCapabilities: caps(["inspect", "doctor", "timeline"]),
      parentRequiredCapabilities: ["inspect", "doctor"],
      nodeRequiredCapabilities: ["inspect", "doctor"],
      profileAllowedTools: ["inspect", "memorySearch"],
    });
    expect(resolved.allowedTools).toEqual(["inspect"]);
    expect(resolved.capabilities.readOnly).toBe(true);
    expect(resolved.capabilities.allowNetwork).toBe(false);
    expect(resolved.denyAllTools).toBe(false);
  });

  it("forces read-only even when the session grant is broader", () => {
    const resolved = resolveNeutronNodeCapabilities({
      sessionCapabilities: {
        readOnly: false,
        allowedPaths: ["/tmp"],
        allowedTools: [],
        maxBudget: 9,
        allowNetwork: true,
      },
      nodeRequiredCapabilities: [],
    });
    expect(resolved.capabilities.readOnly).toBe(true);
    expect(resolved.capabilities.allowNetwork).toBe(false);
    expect(resolved.allowedTools).toEqual([
      "inspect",
      "doctor",
      "memorySearch",
      "timeline",
      "conformance",
      "securityAudit",
      "projectDiff",
    ]);
  });
});

describe("Neutron N5 Slice 2 — single-node execution", () => {
  it("executes one ready node through N3, N2, and N4 inspect", async () => {
    const executed = await execute();
    const { adapter, before, after } = executed;
    const result = expectExecuted(executed.result);
    expect(result.attempt).toBe(1);
    expect(result.node.state).toBe("completed");
    expect(result.subagent.status).toBe("completed");
    expect(result.subagent.mutationAttempted).toBe(false);
    expect(result.subagent.taskId).toBe("task-a");
    expect(result.parentId).toBeNull();
    expect(result.output).toBe("Inspection complete");
    expect(result.tool?.invocation.toolName).toBe("inspect");
    expect(result.adapter?.providerKind).toBe("ollama");
    expect(result.context?.bundle.sessionId).toBe(SESSION);
    expect(result.context?.bundle.root).toBe(ROOT);
    expect(result.usage?.sessionId).toBe(SESSION);
    expect(adapter.requests).toHaveLength(2);
    expect(adapter.requests[0]?.messages[0]?.content).toContain(
      "Inspect the project and summarize findings",
    );
    expect(result.projectFingerprintBefore).toBe(before);
    expect(result.projectFingerprintAfter).toBe(before);
    expect(after).toBe(before);
  });

  it("keeps parentId in provenance without treating it as a dependency", async () => {
    const result = expectExecuted(
      (
        await execute({
          nodes: [
            node("parent", {
              state: "completed",
              requiredCapabilities: ["inspect"],
            }),
            node("child", {
              parentId: "parent",
              expectedOutput: "Inspect child scope",
            }),
          ],
          taskId: "child",
        })
      ).result,
    );
    expect(result.parentId).toBe("parent");
    expect(result.node.state).toBe("completed");
  });

  it("does not call the provider when a dependency is still pending", async () => {
    const adapter = inspectThenAnswer(SESSION);
    const { result } = await execute({
      adapter,
      nodes: [
        node("a", { state: "pending" }),
        node("b", { dependencies: ["a"], state: "pending" }),
      ],
      taskId: "b",
    });
    expect(result.executed).toBe(false);
    expect(result.error.code).toBe("node-not-runnable");
    expect(adapter.requests).toHaveLength(0);
  });

  it("does not call the provider when a dependency failed, cancelled, or timed out", async () => {
    for (const state of ["failed", "cancelled", "timed-out"] as const) {
      const adapter = inspectThenAnswer(SESSION);
      const { result } = await execute({
        adapter,
        nodes: [
          node("a", { state }),
          node("b", { dependencies: ["a"], state: "ready" }),
        ],
        taskId: "b",
      });
      expect(result.executed).toBe(false);
      expect(result.error.code).toBe("node-not-runnable");
      expect(adapter.requests).toHaveLength(0);
    }
  });

  it("refuses blocked, running, and completed nodes without a provider call", async () => {
    for (const state of ["blocked", "running", "completed"] as const) {
      const adapter = inspectThenAnswer(SESSION);
      const { result } = await execute({
        adapter,
        nodes: [node("solo", { state })],
        taskId: "solo",
      });
      expect(result.executed).toBe(false);
      expect(result.error.code).toBe("node-not-runnable");
      expect(adapter.requests).toHaveLength(0);
    }
  });

  it("denies a registered tool outside the node grant", async () => {
    const adapter = new ScriptedAdapter([
      turn(SESSION, { toolName: "doctor" }),
      turn(SESSION, { text: "should not finish" }),
    ]);
    const ran = await execute({
      adapter,
      capabilities: caps(["inspect"]),
    });
    const result = expectExecuted(ran.result);
    expect(result.node.state).toBe("failed");
    expect(result.error?.code).toBe("capability-denied");
    expect(result.subagent.status).toBe("failed");
    expect(ran.after).toBe(ran.before);
  });

  it("clamps a child below parent and session allowedTools", async () => {
    const adapter = new ScriptedAdapter([
      turn(SESSION, { toolName: "doctor" }),
      turn(SESSION, { text: "should not finish" }),
    ]);
    const { result } = await execute({
      adapter,
      capabilities: caps(["inspect", "doctor"]),
      profileAllowedTools: ["inspect", "doctor"],
      nodes: [
        node("parent", {
          state: "completed",
          requiredCapabilities: ["inspect"],
        }),
        node("child", {
          parentId: "parent",
          requiredCapabilities: ["inspect", "doctor"],
        }),
      ],
      taskId: "child",
    });
    const executed = expectExecuted(result);
    expect(executed.capabilities.allowedTools).toEqual(["inspect"]);
    expect(executed.error?.code).toBe("capability-denied");
    expect(executed.node.state).toBe("failed");
  });

  it("never grants mutation capability", async () => {
    const { result } = await execute({
      capabilities: {
        readOnly: false,
        allowedPaths: [],
        allowedTools: ["inspect", "apply"],
        maxBudget: 10,
        allowNetwork: true,
      },
    });
    const executed = expectExecuted(result);
    expect(executed.capabilities.readOnly).toBe(true);
    expect(executed.capabilities.allowNetwork).toBe(false);
    expect(executed.capabilities.allowedTools).toEqual(["inspect"]);
    expect(executed.node.state).toBe("completed");
  });

  it("forwards taskId and keeps project/session isolation in N3", async () => {
    const executed = expectExecuted((await execute()).result);
    expect(executed.context?.bundle.sessionId).toBe(SESSION);
    expect(executed.context?.bundle.root).toBe(ROOT);
    expect(
      executed.context?.bundle.sources.some(
        (source) =>
          source.kind === "task" && source.sourceId.includes("task-a"),
      ),
    ).toBe(true);
  });

  it("maps a missing profile to a context-assembly failure", async () => {
    const adapter = inspectThenAnswer(SESSION);
    const { result } = await execute({
      adapter,
      profileName: "missing-n5-profile",
    });
    const executed = expectExecuted(result);
    expect(executed.node.state).toBe("failed");
    expect(executed.error?.code).toBe("context-assembly-failed");
    expect(executed.error?.stage).toBe("context");
    expect(adapter.requests).toHaveLength(0);
  });

  it("maps a provider failure to a failed node", async () => {
    const adapter = new ScriptedAdapter([
      new NeutronN2Error("adapter-unconfigured", "daemon down"),
    ]);
    const executed = expectExecuted((await execute({ adapter })).result);
    expect(executed.node.state).toBe("failed");
    expect(executed.error?.code).toBe("adapter-unconfigured");
    expect(executed.error?.stage).toBe("model");
    expect(executed.attempt).toBe(1);
  });

  it("maps timeout and cancellation to the matching node states", async () => {
    const timeoutAdapter = new ScriptedAdapter([
      new NeutronN2Error("timeout", "model timed out"),
    ]);
    const timeout = expectExecuted(
      (await execute({ adapter: timeoutAdapter })).result,
    );
    expect(timeout.node.state).toBe("timed-out");
    expect(timeout.subagent.status).toBe("failed");
    expect(timeout.error?.code).toBe("timeout");

    const cancelled = await execute({
      signal: AbortSignal.abort(),
    });
    expect(cancelled.result.executed).toBe(false);
    expect(cancelled.result.error.code).toBe("cancelled");
    expect(cancelled.adapter.requests).toHaveLength(0);
  });

  it("executes only the requested ready node when several are ready", async () => {
    const adapter = inspectThenAnswer(SESSION);
    const { result } = await execute({
      adapter,
      nodes: [node("task-z"), node("task-a")],
      taskId: "task-z",
    });
    const executed = expectExecuted(result);
    expect(executed.node.taskId).toBe("task-z");
    expect(executed.node.state).toBe("completed");
    const other = executed.graph.nodes.find(
      (entry) => entry.taskId === "task-a",
    );
    expect(other?.state).toBe("ready");
    expect(adapter.requests).toHaveLength(2);
  });

  it("does not persist scheduler state or mutate project files", async () => {
    const { result, fs, before, after } = await execute();
    expect(result.executed).toBe(true);
    expect(after).toBe(before);
    const persisted = [...fs.files.keys()].filter((path) =>
      path.includes(".aif/neutron/scheduler"),
    );
    expect(persisted).toEqual([]);
  });
});
