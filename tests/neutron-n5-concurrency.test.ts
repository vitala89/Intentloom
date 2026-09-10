import { describe, expect, it } from "vitest";
import {
  createMemoryFileSystem,
  inspectProject,
  type FileSystem,
} from "../packages/application/src/index.js";
import {
  executeReadyNeutronTaskNodes,
  isNeutronSchedulerStatePath,
  NEUTRON_SCHEDULER_HARD_MAX_CONCURRENCY,
  planNeutronTaskScheduling,
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
const SESSION = "session-n5-3";
const PROJECT = "project-n5-3";

function caps(
  allowedTools: readonly string[] = ["inspect", "doctor"],
): AgentRoleCapabilities {
  return {
    readOnly: true,
    allowedPaths: [],
    allowedTools,
    maxBudget: 100,
    allowNetwork: false,
  };
}

function session(): NeutronRuntimeSession {
  return {
    schemaVersion: NEUTRON_RUNTIME_SESSION_SCHEMA_URN,
    sessionId: SESSION,
    root: ROOT,
    projectId: PROJECT,
    state: "inspecting",
    mutationAllowed: false,
    createdAt: "2026-09-05T00:00:00.000Z",
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
    "/project/package.json": JSON.stringify({ name: "n5-slice3" }),
    "/project/src/main.ts": "export const ok = true;\n",
    "/project/docs/specs/SPEC.md": "# Intent\nBounded concurrency.\n",
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

function turn(
  sessionId: string,
  options: {
    readonly text?: string;
    readonly toolName?: string;
  } = {},
): ModelTurnResult {
  return {
    schemaVersion: 1,
    sessionId,
    responseText: options.text ?? "",
    toolCalls:
      options.toolName === undefined
        ? []
        : [
            {
              id: `call-${options.toolName}`,
              name: options.toolName,
              argumentsJson: JSON.stringify({ root: ROOT }),
            },
          ],
    stopReason: options.toolName === undefined ? "stop" : "tool_call",
    usage: { inputTokens: 4, outputTokens: 2, totalTokens: 6 },
    diagnostics: ["n5-slice3"],
  };
}

function detectTask(request: ModelTurnRequest): string {
  const content = request.messages[0]?.content ?? "";
  const match = /Complete (task-[a-z]+)/u.exec(content);
  return match?.[1] ?? "unknown";
}

function deferred(): {
  promise: Promise<void>;
  resolve: () => void;
} {
  let resolve!: () => void;
  const promise = new Promise<void>((next) => {
    resolve = next;
  });
  return { promise, resolve };
}

class BarrierAdapter implements ModelAdapter {
  readonly started: string[] = [];
  readonly requests: ModelTurnRequest[] = [];
  private readonly gates = new Map<string, ReturnType<typeof deferred>>();
  private readonly failTasks: ReadonlySet<string>;
  private readonly tools: Readonly<Record<string, string>>;

  constructor(
    options: {
      readonly failTasks?: readonly string[];
      readonly tools?: Readonly<Record<string, string>>;
    } = {},
  ) {
    this.failTasks = new Set(options.failTasks ?? []);
    this.tools = options.tools ?? {};
  }

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
      modelId: "fixture-n5-3",
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
    const taskId = detectTask(request);
    const visits = this.started.filter((id) => id === taskId).length;
    this.started.push(taskId);
    if (visits === 0) {
      await this.gate(taskId).promise;
      if (this.failTasks.has(taskId)) {
        throw new Error(`${taskId} provider failed`);
      }
      return turn(request.sessionId, {
        toolName: this.tools[taskId] ?? "inspect",
      });
    }
    return turn(request.sessionId, { text: `${taskId} done` });
  }
}

async function waitUntil(predicate: () => boolean): Promise<void> {
  for (let i = 0; i < 200; i += 1) {
    if (predicate()) return;
    await Promise.resolve();
  }
  throw new Error("timed out waiting for adapter start");
}

async function runWave(options: {
  readonly nodes: NeutronTaskNode[];
  readonly adapter: BarrierAdapter;
  readonly maxConcurrency?: number;
  readonly ownerId?: string;
  readonly capabilities?: AgentRoleCapabilities;
  readonly signal?: AbortSignal;
  readonly files?: Record<string, string>;
}) {
  const fs = createMemoryFileSystem(options.files ?? projectFiles());
  const before = sourceFingerprint(fs);
  const pending = executeReadyNeutronTaskNodes({
    graph: graph(options.nodes),
    session: session(),
    projectId: PROJECT,
    adapter: options.adapter,
    fs,
    sessionCapabilities: options.capabilities ?? caps(),
    fingerprintProject: async () => sourceFingerprint(fs),
    inspect: async (root) => inspectProject(root, fs),
    ...(options.maxConcurrency === undefined
      ? {}
      : { maxConcurrency: options.maxConcurrency }),
    ...(options.ownerId === undefined ? {} : { ownerId: options.ownerId }),
    ...(options.signal === undefined ? {} : { signal: options.signal }),
  });
  return { fs, before, pending };
}

describe("Neutron N5 Slice 3 — bounded concurrency", () => {
  it("defaults to capacity 1 and executes one wave only", async () => {
    const adapter = new BarrierAdapter();
    const { pending } = await runWave({
      nodes: [node("task-c"), node("task-a"), node("task-b")],
      adapter,
    });
    await waitUntil(() => adapter.started.includes("task-a"));
    expect(adapter.started).toEqual(["task-a"]);
    adapter.gate("task-a").resolve();
    const result = await pending;
    expect(result.admittedTaskIds).toEqual(["task-a"]);
    expect(result.outcomes).toHaveLength(1);
    expect(result.outcomes[0]?.taskId).toBe("task-a");
    expect(
      result.graph.nodes.find((entry) => entry.taskId === "task-b")?.state,
    ).toBe("ready");
    expect(adapter.started.filter((id) => id === "task-b")).toHaveLength(0);
  });

  it("overlaps two independent nodes at capacity 2", async () => {
    const adapter = new BarrierAdapter();
    const { pending } = await runWave({
      nodes: [node("task-c"), node("task-a"), node("task-b")],
      adapter,
      maxConcurrency: 2,
    });
    await waitUntil(
      () =>
        adapter.started.includes("task-a") &&
        adapter.started.includes("task-b"),
    );
    expect(adapter.started.slice(0, 2).toSorted()).toEqual([
      "task-a",
      "task-b",
    ]);
    expect(adapter.started.includes("task-c")).toBe(false);
    adapter.gate("task-a").resolve();
    adapter.gate("task-b").resolve();
    const result = await pending;
    expect(result.admittedTaskIds).toEqual(["task-a", "task-b"]);
  });

  it("enforces the hard max of 4 and rejects values above it", () => {
    expect(NEUTRON_SCHEDULER_HARD_MAX_CONCURRENCY).toBe(4);
    const ready = graph([
      node("task-a"),
      node("task-b"),
      node("task-c"),
      node("task-d"),
      node("task-e"),
    ]);
    const plan = planNeutronTaskScheduling({
      graph: ready,
      maxConcurrency: 4,
    });
    expect(plan.selectedReadyTaskIds).toEqual([
      "task-a",
      "task-b",
      "task-c",
      "task-d",
    ]);
    expect(() =>
      planNeutronTaskScheduling({ graph: ready, maxConcurrency: 5 }),
    ).toThrowError(/maxConcurrency must be an integer from 1 to 4/u);
  });

  it("admits task IDs in deterministic code-point order", async () => {
    const adapter = new BarrierAdapter();
    const { pending } = await runWave({
      nodes: [node("task-c"), node("task-a"), node("task-b")],
      adapter,
      maxConcurrency: 2,
    });
    adapter.gate("task-a").resolve();
    adapter.gate("task-b").resolve();
    const result = await pending;
    expect(result.admittedTaskIds).toEqual(["task-a", "task-b"]);
    expect(result.outcomes.map((outcome) => outcome.taskId)).toEqual([
      "task-a",
      "task-b",
    ]);
  });

  it("returns results in taskId order when completion is reversed", async () => {
    const adapter = new BarrierAdapter();
    const { pending } = await runWave({
      nodes: [node("task-a"), node("task-b")],
      adapter,
      maxConcurrency: 2,
    });
    await waitUntil(
      () =>
        adapter.started.includes("task-a") &&
        adapter.started.includes("task-b"),
    );
    adapter.gate("task-b").resolve();
    await Promise.resolve();
    adapter.gate("task-a").resolve();
    const result = await pending;
    expect(result.outcomes.map((outcome) => outcome.taskId)).toEqual([
      "task-a",
      "task-b",
    ]);
    expect(
      result.outcomes.every((outcome) => outcome.execution?.executed === true),
    ).toBe(true);
  });

  it("reduces available capacity by already-running nodes", async () => {
    const adapter = new BarrierAdapter();
    const { pending } = await runWave({
      nodes: [
        node("task-a", { state: "running" }),
        node("task-b"),
        node("task-c"),
      ],
      adapter,
      maxConcurrency: 2,
    });
    await waitUntil(() => adapter.started.includes("task-b"));
    expect(adapter.started).toEqual(["task-b"]);
    adapter.gate("task-b").resolve();
    const result = await pending;
    expect(result.plan.availableCapacity).toBe(1);
    expect(result.admittedTaskIds).toEqual(["task-b"]);
    expect(adapter.started.includes("task-c")).toBe(false);
  });

  it("executes none when available capacity is 0", async () => {
    const adapter = new BarrierAdapter();
    const { pending } = await runWave({
      nodes: [node("task-a", { state: "running" }), node("task-b")],
      adapter,
      maxConcurrency: 1,
    });
    const result = await pending;
    expect(result.admittedTaskIds).toEqual([]);
    expect(result.outcomes).toEqual([]);
    expect(adapter.requests).toHaveLength(0);
  });

  it("does not cancel an independent node when another fails", async () => {
    const adapter = new BarrierAdapter({ failTasks: ["task-a"] });
    const { pending } = await runWave({
      nodes: [node("task-a"), node("task-b")],
      adapter,
      maxConcurrency: 2,
    });
    await waitUntil(
      () =>
        adapter.started.includes("task-a") &&
        adapter.started.includes("task-b"),
    );
    adapter.gate("task-a").resolve();
    adapter.gate("task-b").resolve();
    const result = await pending;
    const failed = result.outcomes.find(
      (outcome) => outcome.taskId === "task-a",
    );
    const passed = result.outcomes.find(
      (outcome) => outcome.taskId === "task-b",
    );
    expect(failed?.execution?.executed).toBe(true);
    expect(
      failed?.execution && "node" in failed.execution
        ? failed.execution.node.state
        : "",
    ).toBe("failed");
    expect(
      passed?.execution && "node" in passed.execution
        ? passed.execution.node.state
        : "",
    ).toBe("completed");
  });

  it("keeps per-node capability clamps isolated", async () => {
    const adapter = new BarrierAdapter({
      tools: { "task-a": "inspect", "task-b": "doctor" },
    });
    const { pending } = await runWave({
      nodes: [
        node("task-a", { requiredCapabilities: ["inspect"] }),
        node("task-b", { requiredCapabilities: ["doctor"] }),
      ],
      adapter,
      maxConcurrency: 2,
    });
    adapter.gate("task-a").resolve();
    adapter.gate("task-b").resolve();
    const result = await pending;
    const first = result.outcomes[0];
    const second = result.outcomes[1];
    expect(
      first?.execution && "capabilities" in first.execution
        ? first.execution.capabilities.allowedTools
        : [],
    ).toEqual(["inspect"]);
    expect(
      second?.execution && "capabilities" in second.execution
        ? second.execution.capabilities.allowedTools
        : [],
    ).toEqual(["doctor"]);
  });

  it("prevents a second wave from calling the provider for a leased task", async () => {
    const adapter = new BarrierAdapter();
    const first = await runWave({
      nodes: [node("task-a")],
      adapter,
      ownerId: "owner-1",
    });
    await waitUntil(() => adapter.started.includes("task-a"));
    const second = await runWave({
      nodes: [node("task-a")],
      adapter,
      ownerId: "owner-2",
      files: Object.fromEntries(first.fs.files),
    });
    const blocked = await second.pending;
    expect(blocked.outcomes[0]?.executed).toBe(false);
    expect(blocked.outcomes[0]?.error?.code).toBe("lease-held");
    expect(adapter.started.filter((id) => id === "task-a")).toHaveLength(1);
    adapter.gate("task-a").resolve();
    const completed = await first.pending;
    expect(completed.outcomes[0]?.execution?.executed).toBe(true);
  });

  it("leaves project sources unchanged and only writes scheduler lease metadata", async () => {
    const adapter = new BarrierAdapter();
    const { fs, before, pending } = await runWave({
      nodes: [node("task-a")],
      adapter,
    });
    adapter.gate("task-a").resolve();
    await pending;
    expect(sourceFingerprint(fs)).toBe(before);
    expect(fs.files.get("/project/src/main.ts")).toBe(
      "export const ok = true;\n",
    );
    const leaseWrites = [...fs.files.keys()].filter((path) =>
      isNeutronSchedulerStatePath(path),
    );
    expect(leaseWrites.length).toBeGreaterThan(0);
    expect(
      leaseWrites.every((path) =>
        path.includes("/.aif/neutron/scheduler/leases/"),
      ),
    ).toBe(true);
  });

  it("cleans heartbeat state after a wave finishes", async () => {
    let stopped = 0;
    const adapter = new BarrierAdapter();
    const fs = createMemoryFileSystem(projectFiles());
    const pending = executeReadyNeutronTaskNodes({
      graph: graph([node("task-a")]),
      session: session(),
      projectId: PROJECT,
      adapter,
      fs,
      sessionCapabilities: caps(),
      fingerprintProject: async () => sourceFingerprint(fs),
      inspect: async (root) => inspectProject(root, fs),
      heartbeatSchedule: () => ({
        stop() {
          stopped += 1;
        },
      }),
    });
    adapter.gate("task-a").resolve();
    await pending;
    expect(stopped).toBe(1);
  });
});
