import { describe, expect, it } from "vitest";
import {
  createMemoryFileSystem,
  inspectProject,
  type FileSystem,
} from "../packages/application/src/index.js";
import {
  createNeutronSchedulerClock,
  executeReadyNeutronTaskNodes,
  isNeutronSchedulerStatePath,
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
const SESSION = "session-n5-4c";
const PROJECT = "project-n5-4c";

function caps(): AgentRoleCapabilities {
  return {
    readOnly: true,
    allowedPaths: [],
    allowedTools: ["inspect", "doctor"],
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
    createdAt: "2026-09-06T00:00:00.000Z",
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
    expectedOutput: `Complete ${taskId}`,
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

function projectFiles(): Record<string, string> {
  return {
    "/project/package.json": JSON.stringify({ name: "n5-slice4-cancel" }),
    "/project/src/main.ts": "export const ok = true;\n",
    "/project/docs/specs/SPEC.md": "# Intent\nCancel timeout.\n",
    "/project/README.md": "safe",
  };
}

function sourceFingerprint(
  fs: FileSystem & { files: Map<string, string> },
): string {
  return [...fs.files.entries()]
    .filter(([path]) => !isNeutronSchedulerStatePath(path))
    .toSorted(([left], [right]) => left.localeCompare(right))
    .map(([path, content]) => `${path}:${content}`)
    .join("\n");
}

function turn(sessionId: string, text: string): ModelTurnResult {
  return {
    schemaVersion: 1,
    sessionId,
    responseText: text,
    toolCalls: [],
    stopReason: "stop",
    usage: { inputTokens: 4, outputTokens: 2, totalTokens: 6 },
    diagnostics: ["n5-slice4-cancel"],
  };
}

function detectTask(request: ModelTurnRequest): string {
  const content = request.messages[0]?.content ?? "";
  return /Complete (task-[a-z]+)/u.exec(content)?.[1] ?? "unknown";
}

function deferred(): { promise: Promise<void>; resolve: () => void } {
  let resolve!: () => void;
  const promise = new Promise<void>((next) => {
    resolve = next;
  });
  return { promise, resolve };
}

class GateAdapter implements ModelAdapter {
  readonly started: string[] = [];
  readonly requests: ModelTurnRequest[] = [];
  ignoreAbortAfterStart = false;
  private readonly issuedTool = new Set<string>();
  private readonly gates = new Map<string, ReturnType<typeof deferred>>();

  gate(taskId: string): ReturnType<typeof deferred> {
    const existing = this.gates.get(taskId);
    if (existing !== undefined) return existing;
    const created = deferred();
    this.gates.set(taskId, created);
    return created;
  }

  getCapabilities() {
    return validateModelAdapterCapabilities({
      providerKind: "ollama",
      modelId: "fixture-n5-4c",
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
    if (options.signal?.aborted === true && !this.ignoreAbortAfterStart) {
      throw new NeutronN2Error(
        "cancelled",
        "Model turn execution was cancelled",
      );
    }
    this.requests.push(request);
    const taskId = detectTask(request);
    const first = !this.issuedTool.has(taskId);
    if (first) this.started.push(taskId);
    await this.gate(taskId).promise;
    if (options.signal?.aborted === true && !this.ignoreAbortAfterStart) {
      throw new NeutronN2Error(
        "cancelled",
        "Model turn execution was cancelled",
      );
    }
    if (first) {
      this.issuedTool.add(taskId);
      this.gate(taskId).resolve();
      return {
        ...turn(request.sessionId, ""),
        toolCalls: [
          {
            id: `call-inspect-${taskId}`,
            name: "inspect",
            argumentsJson: JSON.stringify({ root: ROOT }),
          },
        ],
        stopReason: "tool_call" as const,
      };
    }
    return turn(request.sessionId, `${taskId} done`);
  }
}

async function waitUntil(predicate: () => boolean): Promise<void> {
  for (let i = 0; i < 200; i += 1) {
    if (predicate()) return;
    await Promise.resolve();
  }
  throw new Error("timed out waiting for adapter start");
}

describe("Neutron N5 Slice 4 — cancellation and timeout", () => {
  it("admits no work when the session signal is already aborted", async () => {
    const adapter = new GateAdapter();
    const fs = createMemoryFileSystem(projectFiles());
    const controller = new AbortController();
    controller.abort();
    const result = await executeReadyNeutronTaskNodes({
      graph: graph([node("task-a")]),
      session: session(),
      projectId: PROJECT,
      adapter,
      fs,
      sessionCapabilities: caps(),
      fingerprintProject: async () => sourceFingerprint(fs),
      signal: controller.signal,
    });
    expect(result.admittedTaskIds).toEqual([]);
    expect(adapter.started).toEqual([]);
    expect(result.outcomes).toEqual([]);
  });

  it("admits no work when the runtime session is cancelled", async () => {
    const adapter = new GateAdapter();
    const fs = createMemoryFileSystem(projectFiles());
    const result = await executeReadyNeutronTaskNodes({
      graph: graph([node("task-a")]),
      session: session({ state: "cancelled" }),
      projectId: PROJECT,
      adapter,
      fs,
      sessionCapabilities: caps(),
      fingerprintProject: async () => sourceFingerprint(fs),
    });
    expect(result.admittedTaskIds).toEqual([]);
    expect(adapter.started).toEqual([]);
  });

  it("cancels after lease and before provider when aborted between acquire and run", async () => {
    const adapter = new GateAdapter();
    const fs = createMemoryFileSystem(projectFiles());
    const controller = new AbortController();
    const pending = executeReadyNeutronTaskNodes({
      graph: graph([node("task-a")]),
      session: session(),
      projectId: PROJECT,
      adapter,
      fs,
      sessionCapabilities: caps(),
      fingerprintProject: async () => sourceFingerprint(fs),
      signal: controller.signal,
    });
    await waitUntil(() =>
      [...fs.files.keys()].some((path) =>
        path.includes("/.aif/neutron/scheduler/leases/"),
      ),
    );
    controller.abort();
    const result = await pending;
    expect(adapter.started).toEqual([]);
    expect(result.outcomes[0]?.execution?.error?.code).toBe("cancelled");
    expect(result.outcomes[0]?.attempts[0]?.state).toBe("cancelled");
  });

  it("cancels during provider execution and does not retry", async () => {
    const adapter = new GateAdapter();
    const fs = createMemoryFileSystem(projectFiles());
    const controller = new AbortController();
    const pending = executeReadyNeutronTaskNodes({
      graph: graph([node("task-a")]),
      session: session(),
      projectId: PROJECT,
      adapter,
      fs,
      sessionCapabilities: caps(),
      fingerprintProject: async () => sourceFingerprint(fs),
      inspect: async (root) => inspectProject(root, fs),
      signal: controller.signal,
    });
    await waitUntil(() => adapter.started.includes("task-a"));
    controller.abort();
    adapter.gate("task-a").resolve();
    const result = await pending;
    expect(adapter.started).toEqual(["task-a"]);
    expect(
      result.outcomes[0]?.execution && "node" in result.outcomes[0].execution
        ? result.outcomes[0].execution.node.state
        : "",
    ).toBe("cancelled");
    expect(result.outcomes[0]?.attempts).toHaveLength(1);
  });

  it("keeps a peer running when only one node signal is cancelled", async () => {
    const adapter = new GateAdapter();
    const fs = createMemoryFileSystem(projectFiles());
    const nodeAbort = new AbortController();
    const pending = executeReadyNeutronTaskNodes({
      graph: graph([node("task-a"), node("task-b")]),
      session: session(),
      projectId: PROJECT,
      adapter,
      fs,
      sessionCapabilities: caps(),
      fingerprintProject: async () => sourceFingerprint(fs),
      inspect: async (root) => inspectProject(root, fs),
      maxConcurrency: 2,
      nodeSignals: { "task-a": nodeAbort.signal },
    });
    await waitUntil(
      () =>
        adapter.started.includes("task-a") &&
        adapter.started.includes("task-b"),
    );
    nodeAbort.abort();
    adapter.gate("task-a").resolve();
    adapter.gate("task-b").resolve();
    const result = await pending;
    const first = result.outcomes.find(
      (outcome) => outcome.taskId === "task-a",
    );
    const second = result.outcomes.find(
      (outcome) => outcome.taskId === "task-b",
    );
    expect(
      first?.execution && "node" in first.execution
        ? first.execution.node.state
        : "",
    ).toBe("cancelled");
    expect(
      second?.execution && "node" in second.execution
        ? second.execution.node.state
        : "",
    ).toBe("completed");
  });

  it("cancels every running node when the session signal aborts", async () => {
    const adapter = new GateAdapter();
    const fs = createMemoryFileSystem(projectFiles());
    const controller = new AbortController();
    const pending = executeReadyNeutronTaskNodes({
      graph: graph([node("task-a"), node("task-b")]),
      session: session(),
      projectId: PROJECT,
      adapter,
      fs,
      sessionCapabilities: caps(),
      fingerprintProject: async () => sourceFingerprint(fs),
      inspect: async (root) => inspectProject(root, fs),
      maxConcurrency: 2,
      signal: controller.signal,
    });
    await waitUntil(
      () =>
        adapter.started.includes("task-a") &&
        adapter.started.includes("task-b"),
    );
    controller.abort();
    adapter.gate("task-a").resolve();
    adapter.gate("task-b").resolve();
    const result = await pending;
    expect(
      result.outcomes.every((outcome) =>
        outcome.execution && "node" in outcome.execution
          ? outcome.execution.node.state === "cancelled"
          : false,
      ),
    ).toBe(true);
  });

  it("times out a node, retries once, then exhausts", async () => {
    let fires = 0;
    const adapter = new SequenceTimeoutAdapter();
    const fs = createMemoryFileSystem(projectFiles());
    const result = await executeReadyNeutronTaskNodes({
      graph: graph([node("task-a")]),
      session: session(),
      projectId: PROJECT,
      adapter,
      fs,
      sessionCapabilities: caps(),
      fingerprintProject: async () => sourceFingerprint(fs),
      inspect: async (root) => inspectProject(root, fs),
      nodeTimeoutMs: 25,
      timeoutSchedule: (_ms, onTimeout) => {
        fires += 1;
        onTimeout();
        return { stop() {} };
      },
    });
    expect(fires).toBe(2);
    expect(result.outcomes[0]?.retryExhausted).toBe(true);
    expect(result.outcomes[0]?.attempts.map((entry) => entry.state)).toEqual([
      "timed-out",
      "timed-out",
    ]);
    expect(
      result.graph.nodes.find((entry) => entry.taskId === "task-a")?.state,
    ).toBe("timed-out");
  });

  it("retries a timeout on attempt 1 and completes attempt 2", async () => {
    let fires = 0;
    const adapter = new SequenceTimeoutAdapter();
    const fs = createMemoryFileSystem(projectFiles());
    const result = await executeReadyNeutronTaskNodes({
      graph: graph([node("task-a")]),
      session: session(),
      projectId: PROJECT,
      adapter,
      fs,
      sessionCapabilities: caps(),
      fingerprintProject: async () => sourceFingerprint(fs),
      inspect: async (root) => inspectProject(root, fs),
      nodeTimeoutMs: 25,
      timeoutSchedule: (_ms, onTimeout) => {
        fires += 1;
        if (fires === 1) onTimeout();
        return { stop() {} };
      },
    });
    expect(adapter.completed).toBe(1);
    expect(result.outcomes[0]?.attempts.map((entry) => entry.attempt)).toEqual([
      1, 2,
    ]);
    expect(
      result.outcomes[0]?.execution && "node" in result.outcomes[0].execution
        ? result.outcomes[0].execution.node.state
        : "",
    ).toBe("completed");
  });

  it("rejects a late successful attempt 1 after timeout authority loss", async () => {
    const adapter = new GateAdapter();
    adapter.ignoreAbortAfterStart = true;
    const fs = createMemoryFileSystem(projectFiles());
    let fireTimeout: (() => void) | undefined;
    const pending = executeReadyNeutronTaskNodes({
      graph: graph([node("task-a")]),
      session: session(),
      projectId: PROJECT,
      adapter,
      fs,
      sessionCapabilities: caps(),
      fingerprintProject: async () => sourceFingerprint(fs),
      inspect: async (root) => inspectProject(root, fs),
      nodeTimeoutMs: 25,
      timeoutSchedule: (_ms, onTimeout) => {
        fireTimeout = onTimeout;
        return { stop() {} };
      },
    });
    await waitUntil(() => adapter.started.includes("task-a"));
    fireTimeout?.();
    adapter.gate("task-a").resolve();
    const result = await pending;
    expect(result.outcomes[0]?.attempts[0]?.state).not.toBe("completed");
    expect(["stale", "timed-out"]).toContain(
      result.outcomes[0]?.attempts[0]?.state,
    );
    expect(result.outcomes[0]?.attempts[0]?.leaseId).toBe(
      `${SESSION}:task-a:1`,
    );
    const lastAttempt = result.outcomes[0]?.attempts.at(-1);
    expect(result.outcomes[0]?.lease.leaseId).toBe(lastAttempt?.leaseId);
    expect(result.outcomes[0]?.attempts[0]?.state === "completed").toBe(false);
  });

  it("aborts the current attempt when lease renewal fails", async () => {
    const clock = createNeutronSchedulerClock(1_000);
    const adapter = new GateAdapter();
    const fs = createMemoryFileSystem(projectFiles());
    const result = await executeReadyNeutronTaskNodes({
      graph: graph([node("task-a")]),
      session: session(),
      projectId: PROJECT,
      adapter,
      fs,
      sessionCapabilities: caps(),
      fingerprintProject: async () => sourceFingerprint(fs),
      inspect: async (root) => inspectProject(root, fs),
      clock,
      nodeTimeoutMs: 30,
      heartbeatSchedule: (_ms, onTick) => {
        clock.advance(30);
        onTick();
        return { stop() {} };
      },
    });
    expect(
      result.outcomes[0]?.attempts[0]?.retryReason === "lease-lost" ||
        result.outcomes[0]?.retryReason === "lease-lost" ||
        result.outcomes[0]?.attempts.some(
          (entry) => entry.retryReason === "lease-lost",
        ) ||
        result.outcomes[0]?.execution?.error?.code === "timeout" ||
        result.outcomes[0]?.execution?.error?.code === "cancelled",
    ).toBe(true);
    expect(result.outcomes[0]?.attempts.length).toBeGreaterThanOrEqual(1);
  });

  it("stops heartbeat timers on cancellation", async () => {
    let stopped = 0;
    const adapter = new GateAdapter();
    const fs = createMemoryFileSystem(projectFiles());
    const controller = new AbortController();
    const pending = executeReadyNeutronTaskNodes({
      graph: graph([node("task-a")]),
      session: session(),
      projectId: PROJECT,
      adapter,
      fs,
      sessionCapabilities: caps(),
      fingerprintProject: async () => sourceFingerprint(fs),
      inspect: async (root) => inspectProject(root, fs),
      signal: controller.signal,
      heartbeatSchedule: () => ({
        stop() {
          stopped += 1;
        },
      }),
    });
    await waitUntil(() => adapter.started.includes("task-a"));
    controller.abort();
    adapter.gate("task-a").resolve();
    await pending;
    expect(stopped).toBe(1);
  });
});

class SequenceTimeoutAdapter implements ModelAdapter {
  completed = 0;
  private issuedTool = false;

  getCapabilities() {
    return validateModelAdapterCapabilities({
      providerKind: "ollama",
      modelId: "fixture-n5-4c",
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
      this.issuedTool = false;
      throw new NeutronN2Error("timeout", "Model turn timed out");
    }
    if (!this.issuedTool) {
      this.issuedTool = true;
      return {
        ...turn(request.sessionId, ""),
        toolCalls: [
          {
            id: "call-inspect",
            name: "inspect",
            argumentsJson: JSON.stringify({ root: ROOT }),
          },
        ],
        stopReason: "tool_call",
      };
    }
    this.issuedTool = false;
    this.completed += 1;
    return turn(request.sessionId, "done");
  }
}
