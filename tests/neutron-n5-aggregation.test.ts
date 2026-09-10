import { describe, expect, it } from "vitest";
import {
  createMemoryFileSystem,
  inspectProject,
  type FileSystem,
} from "../packages/application/src/index.js";
import {
  aggregateNeutronTaskGraphResults,
  createNeutronAttemptAuthority,
  executeReadyNeutronTaskNodes,
  isNeutronSchedulerStatePath,
  NeutronSchedulerError,
  reconcileNeutronTaskGraphExecution,
} from "../packages/application/src/neutron-scheduler.js";
import type { ModelAdapter } from "../packages/application/src/model-adapter.js";
import type { NeutronAttemptEvidence } from "../packages/application/src/neutron-scheduler-attempt.js";
import type { NeutronReadyNodeOutcome } from "../packages/application/src/neutron-scheduler-wave-types.js";
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
const SESSION = "session-n5-5";
const PROJECT = "project-n5-5";

function caps(): AgentRoleCapabilities {
  return {
    allowNetwork: false,
    allowedPaths: [],
    allowedTools: ["inspect", "doctor"],
    maxBudget: 100,
    readOnly: true,
  };
}

function session(): NeutronRuntimeSession {
  return {
    createdAt: "2026-09-07T00:00:00.000Z",
    mutationAllowed: false,
    projectId: PROJECT,
    root: ROOT,
    schemaVersion: NEUTRON_RUNTIME_SESSION_SCHEMA_URN,
    sessionId: SESSION,
    state: "inspecting",
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

function projectFiles(): Record<string, string> {
  return {
    "/project/README.md": "safe",
    "/project/docs/specs/SPEC.md": "# Intent\nAggregation.\n",
    "/project/package.json": JSON.stringify({ name: "n5-slice5" }),
    "/project/src/main.ts": "export const ok = true;\n",
  };
}

function sourceFingerprint(
  fs: FileSystem & { files: Map<string, string> },
): string {
  return [...fs.files.entries()]
    .filter(([path]) => !isNeutronSchedulerStatePath(path))
    .toSorted(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
    .map(([path, content]) => `${path}:${content}`)
    .join("\n");
}

function turn(
  sessionId: string,
  text = "",
  toolName?: string,
): ModelTurnResult {
  return {
    diagnostics: ["n5-slice5"],
    responseText: text,
    schemaVersion: 1,
    sessionId,
    stopReason: toolName === undefined ? "stop" : "tool_call",
    toolCalls:
      toolName === undefined
        ? []
        : [
            {
              argumentsJson: JSON.stringify({ root: ROOT }),
              id: `call-${toolName}`,
              name: toolName,
            },
          ],
    usage: { inputTokens: 4, outputTokens: 2, totalTokens: 6 },
  };
}

function detectTask(request: ModelTurnRequest): string {
  return (
    /Complete (task-[a-z0-9-]+)/u.exec(
      request.messages[0]?.content ?? "",
    )?.[1] ?? "unknown"
  );
}

function attempt(
  taskId: string,
  number: number,
  state: NeutronAttemptEvidence["state"],
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

class ScriptAdapter implements ModelAdapter {
  readonly started: string[] = [];
  readonly visits: string[] = [];
  private readonly failFirst: ReadonlySet<string>;
  private readonly seen = new Set<string>();

  constructor(failFirst: readonly string[] = []) {
    this.failFirst = new Set(failFirst);
  }

  getCapabilities() {
    return validateModelAdapterCapabilities({
      maxContextTokens: 8192,
      maxOutputTokens: 1024,
      modelId: "fixture-n5-5",
      providerKind: "ollama",
      supportsStreaming: false,
      supportsToolCalls: true,
      supportsVision: false,
    });
  }

  async executeTurn(request: ModelTurnRequest): Promise<ModelTurnResult> {
    const taskId = detectTask(request);
    this.visits.push(taskId);
    const first = !this.seen.has(`${taskId}:tool`);
    if (first) {
      this.started.push(taskId);
      if (this.failFirst.has(taskId) && !this.seen.has(`${taskId}:fail`)) {
        this.seen.add(`${taskId}:fail`);
        throw new NeutronN2Error("operation-failed", "transient");
      }
      this.seen.add(`${taskId}:tool`);
      return turn(request.sessionId, "", "inspect");
    }
    return turn(request.sessionId, `${taskId} done`);
  }
}

class GateAdapter implements ModelAdapter {
  readonly started: string[] = [];
  readonly finished: string[] = [];
  private readonly gates = new Map<
    string,
    { promise: Promise<void>; resolve: () => void }
  >();
  private readonly issued = new Set<string>();

  gate(taskId: string) {
    const existing = this.gates.get(taskId);
    if (existing !== undefined) return existing;
    let resolve!: () => void;
    const promise = new Promise<void>((next) => {
      resolve = next;
    });
    const created = { promise, resolve };
    this.gates.set(taskId, created);
    return created;
  }

  getCapabilities() {
    return validateModelAdapterCapabilities({
      maxContextTokens: 8192,
      maxOutputTokens: 1024,
      modelId: "fixture-n5-5c",
      providerKind: "ollama",
      supportsStreaming: false,
      supportsToolCalls: true,
      supportsVision: false,
    });
  }

  async executeTurn(
    request: ModelTurnRequest,
    options: { signal?: AbortSignal } = {},
  ): Promise<ModelTurnResult> {
    const taskId = detectTask(request);
    if (!this.issued.has(taskId)) this.started.push(taskId);
    await this.gate(taskId).promise;
    if (options.signal?.aborted === true) {
      throw new NeutronN2Error(
        "cancelled",
        "Model turn execution was cancelled",
      );
    }
    if (!this.issued.has(taskId)) {
      this.issued.add(taskId);
      return turn(request.sessionId, "", "inspect");
    }
    this.finished.push(taskId);
    return turn(request.sessionId, `${taskId} done`);
  }
}

async function waitUntil(predicate: () => boolean): Promise<void> {
  for (let i = 0; i < 200; i += 1) {
    if (predicate()) return;
    await Promise.resolve();
  }
  throw new Error("timed out waiting");
}

async function runWave(options: {
  readonly nodes: NeutronTaskNode[];
  readonly adapter: ModelAdapter;
  readonly maxConcurrency?: number;
  readonly signal?: AbortSignal;
  readonly files?: Record<string, string>;
  readonly graph?: NeutronTaskGraph;
  readonly nodeTimeoutMs?: number;
  readonly timeoutSchedule?: Parameters<
    typeof executeReadyNeutronTaskNodes
  >[0]["timeoutSchedule"];
}) {
  const fs = createMemoryFileSystem(options.files ?? projectFiles());
  const result = await executeReadyNeutronTaskNodes({
    adapter: options.adapter,
    fingerprintProject: async () => sourceFingerprint(fs),
    fs,
    graph: options.graph ?? graph(options.nodes),
    inspect: async (root) => inspectProject(root, fs),
    projectId: PROJECT,
    session: session(),
    sessionCapabilities: caps(),
    ...(options.maxConcurrency === undefined
      ? {}
      : { maxConcurrency: options.maxConcurrency }),
    ...(options.signal === undefined ? {} : { signal: options.signal }),
    ...(options.nodeTimeoutMs === undefined
      ? {}
      : { nodeTimeoutMs: options.nodeTimeoutMs }),
    ...(options.timeoutSchedule === undefined
      ? {}
      : { timeoutSchedule: options.timeoutSchedule }),
  });
  return { before: sourceFingerprint(fs), fs, result };
}

describe("Neutron N5 Slice 5 — aggregation", () => {
  it("aggregates all completed tasks as accepted success", () => {
    const result = aggregateNeutronTaskGraphResults({
      graph: graph([
        node("task-b", { state: "completed" }),
        node("task-a", { state: "completed" }),
      ]),
      session: session(),
    });
    expect(result.status).toBe("completed");
    expect(result.accepted).toBe(true);
    expect(result.partial).toBe(false);
    expect(result.mutationAttempted).toBe(false);
    expect(result.nodes.map((item) => item.taskId)).toEqual([
      "task-a",
      "task-b",
    ]);
  });

  it("fails the graph when one required task failed", () => {
    const result = aggregateNeutronTaskGraphResults({
      graph: graph([
        node("task-a", { state: "completed" }),
        node("task-b", { state: "failed" }),
      ]),
      session: session(),
    });
    expect(result.status).toBe("failed");
    expect(result.accepted).toBe(false);
    expect(result.partial).toBe(true);
  });

  it("keeps retry then success attempt history", async () => {
    const { result } = await runWave({
      adapter: new ScriptAdapter(["task-a"]),
      nodes: [node("task-a")],
    });
    const aggregated = aggregateNeutronTaskGraphResults({
      graph: result.graph,
      outcomes: result.outcomes,
      session: session(),
    });
    const record = aggregated.nodes[0];
    expect(aggregated.status).toBe("completed");
    expect(record?.attempts.map((item) => item.attempt)).toEqual([1, 2]);
    expect(record?.attempts[0]?.state).toBe("failed");
    expect(record?.attempts[1]?.state).toBe("completed");
    expect(record?.authoritativeAttempt).toBe(2);
    expect(record?.leaseIds).toEqual([
      `${SESSION}:task-a:1`,
      `${SESSION}:task-a:2`,
    ]);
  });

  it("surfaces cancelled nodes instead of hiding completed siblings", () => {
    const result = aggregateNeutronTaskGraphResults({
      graph: graph([
        node("task-a", { state: "completed" }),
        node("task-b", { state: "cancelled" }),
      ]),
      session: session(),
    });
    expect(result.status).toBe("cancelled");
    expect(result.partial).toBe(true);
    expect(result.accepted).toBe(false);
  });

  it("preserves timed-out as a distinct graph outcome", () => {
    const result = aggregateNeutronTaskGraphResults({
      graph: graph([
        node("task-a", { state: "completed" }),
        node("task-b", { state: "timed-out" }),
      ]),
      session: session(),
    });
    expect(result.status).toBe("timed-out");
    expect(result.nodes.find((item) => item.taskId === "task-b")?.state).toBe(
      "timed-out",
    );
  });

  it("keeps blocked descendants with causal dependency ids", () => {
    const result = aggregateNeutronTaskGraphResults({
      graph: graph([
        node("task-a", { state: "failed" }),
        node("task-c", {
          dependencies: ["task-a"],
          parentId: "task-a",
          state: "pending",
        }),
      ]),
      session: session(),
    });
    const blocked = result.nodes.find((item) => item.taskId === "task-c");
    expect(result.status).toBe("failed");
    expect(blocked?.state).toBe("blocked");
    expect(blocked?.executed).toBe(false);
    expect(blocked?.blockingDependencyIds).toEqual(["task-a"]);
    expect(blocked?.usage).toBeUndefined();
  });

  it("does not treat independent success plus a failed branch as complete", () => {
    const result = aggregateNeutronTaskGraphResults({
      graph: graph([
        node("task-a", { state: "completed" }),
        node("task-b", { state: "failed" }),
        node("task-c", {
          dependencies: ["task-b"],
          parentId: "task-b",
          state: "pending",
        }),
      ]),
      session: session(),
    });
    expect(result.status).toBe("failed");
    expect(result.partial).toBe(true);
    expect(result.nodes.find((item) => item.taskId === "task-c")?.state).toBe(
      "blocked",
    );
  });

  it("marks unfinished graphs incomplete without executing remaining nodes", () => {
    const result = aggregateNeutronTaskGraphResults({
      graph: graph([
        node("task-a", { state: "completed" }),
        node("task-b", { state: "ready" }),
      ]),
      session: session(),
    });
    expect(result.status).toBe("incomplete");
    expect(result.accepted).toBe(false);
  });

  it("orders nodes by taskId code points and ignores outcome array order", () => {
    const first = outcome("task-z", [attempt("task-z", 1, "completed")]);
    const second = outcome("task-a", [attempt("task-a", 1, "completed")]);
    const left = aggregateNeutronTaskGraphResults({
      graph: graph([
        node("task-z", { state: "completed" }),
        node("task-a", { state: "completed" }),
      ]),
      outcomes: [first, second],
      session: session(),
    });
    const right = aggregateNeutronTaskGraphResults({
      graph: graph([
        node("task-z", { state: "completed" }),
        node("task-a", { state: "completed" }),
      ]),
      outcomes: [second, first],
      session: session(),
    });
    expect(left.nodes.map((item) => item.taskId)).toEqual(["task-a", "task-z"]);
    expect(left.digest).toBe(right.digest);
    expect(left.nodes).toEqual(right.nodes);
  });

  it("excludes stale attempts from final authority", () => {
    const authority = createNeutronAttemptAuthority(1);
    authority.advance(2);
    expect(authority.owns(1)).toBe(false);
    const result = aggregateNeutronTaskGraphResults({
      graph: graph([node("task-a", { state: "completed" })]),
      outcomes: [
        outcome("task-a", [
          attempt("task-a", 1, "stale"),
          attempt("task-a", 2, "completed"),
        ]),
      ],
      session: session(),
    });
    expect(result.nodes[0]?.attempts[0]?.state).toBe("stale");
    expect(result.nodes[0]?.authoritativeAttempt).toBe(2);
    expect(result.nodes[0]?.attempts.map((item) => item.attempt)).toEqual([
      1, 2,
    ]);
  });

  it("preserves budget-exceeded as an auditable cause", () => {
    const exhausted = attempt("task-a", 1, "failed");
    const result = aggregateNeutronTaskGraphResults({
      graph: graph([node("task-a", { state: "failed" })]),
      outcomes: [
        {
          ...outcome("task-a", [
            {
              ...exhausted,
              error: {
                code: "budget-exceeded",
                message: "token budget exceeded",
                stage: "model",
              },
            },
          ]),
        },
      ],
      session: session(),
    });
    expect(result.budgetExceeded).toBe(true);
    expect(result.warnings).toContain("budget-exceeded:task-a");
    expect(result.nodes[0]?.error?.code).toBe("budget-exceeded");
  });

  it("computes a stable digest that ignores observational timing", () => {
    const first = aggregateNeutronTaskGraphResults({
      graph: graph([node("task-a", { state: "completed" })]),
      outcomes: [outcome("task-a", [attempt("task-a", 1, "completed")])],
      session: session(),
    });
    const shifted = attempt("task-a", 1, "completed");
    const second = aggregateNeutronTaskGraphResults({
      graph: graph([node("task-a", { state: "completed" })]),
      outcomes: [
        outcome("task-a", [{ ...shifted, completedAt: 999, startedAt: 1 }]),
      ],
      session: session(),
    });
    expect(first.digest).toBe(second.digest);
    expect(first.digest.startsWith("sha256:")).toBe(true);
  });

  it("composes Slices 1-5 on a multi-task fixture", async () => {
    const adapter = new ScriptAdapter(["task-a"]);
    const wave1 = await runWave({
      adapter,
      maxConcurrency: 2,
      nodes: [
        node("task-a"),
        node("task-b"),
        node("task-c", {
          dependencies: ["task-a"],
          parentId: "task-a",
          state: "pending",
        }),
      ],
    });
    const wave2 = await executeReadyNeutronTaskNodes({
      adapter,
      fingerprintProject: async () => sourceFingerprint(wave1.fs),
      fs: wave1.fs,
      graph: wave1.result.graph,
      inspect: async (root) => inspectProject(root, wave1.fs),
      maxConcurrency: 2,
      projectId: PROJECT,
      session: session(),
      sessionCapabilities: caps(),
    });
    const aggregated = aggregateNeutronTaskGraphResults({
      graph: wave2.graph,
      outcomes: [...wave1.result.outcomes, ...wave2.outcomes],
      session: session(),
    });
    expect(aggregated.status).toBe("completed");
    expect(aggregated.accepted).toBe(true);
    expect(aggregated.nodes.map((item) => item.taskId)).toEqual([
      "task-a",
      "task-b",
      "task-c",
    ]);
    expect(
      aggregated.nodes.find((item) => item.taskId === "task-c")?.parentId,
    ).toBe("task-a");
    expect(
      aggregated.nodes.find((item) => item.taskId === "task-c")?.dependencies,
    ).toEqual(["task-a"]);
    const retried = aggregated.nodes.find((item) => item.taskId === "task-a");
    expect(retried?.attempts).toHaveLength(2);
    expect(retried?.effectiveCapabilities?.readOnly).toBe(true);
    expect(retried?.allowedTools).toEqual(["inspect"]);
    expect(retried?.tools[0]?.toolName).toBe("inspect");
    expect(retried?.context?.sourceIds.length).toBeGreaterThan(0);
    expect(JSON.stringify(aggregated)).not.toMatch(
      /chain.of.thought|hidden reasoning/i,
    );
    expect(
      aggregated.nodes.every(
        (item) => item.context?.excludedSecretLikePaths.length === 0,
      ),
    ).toBe(true);
    expect(sourceFingerprint(wave1.fs)).toBe(wave1.before);
    expect(aggregated.mutationAttempted).toBe(false);
  });

  it("aggregates a cancellation wave with a blocked dependent", async () => {
    const adapter = new GateAdapter();
    const controller = new AbortController();
    const fs = createMemoryFileSystem(projectFiles());
    const pending = executeReadyNeutronTaskNodes({
      adapter,
      fingerprintProject: async () => sourceFingerprint(fs),
      fs,
      graph: graph([
        node("task-a"),
        node("task-b"),
        node("task-c", {
          dependencies: ["task-b"],
          parentId: "task-b",
          state: "pending",
        }),
      ]),
      inspect: async (root) => inspectProject(root, fs),
      maxConcurrency: 2,
      projectId: PROJECT,
      session: session(),
      sessionCapabilities: caps(),
      signal: controller.signal,
    });
    await waitUntil(() => adapter.started.includes("task-a"));
    adapter.gate("task-a").resolve();
    await waitUntil(() => adapter.finished.includes("task-a"));
    await waitUntil(() => adapter.started.includes("task-b"));
    controller.abort();
    adapter.gate("task-b").resolve();
    const wave = await pending;
    const aggregated = aggregateNeutronTaskGraphResults({
      graph: wave.graph,
      outcomes: wave.outcomes,
      session: session(),
    });
    expect(aggregated.status).toBe("cancelled");
    expect(
      aggregated.nodes.find((item) => item.taskId === "task-a")?.state,
    ).toBe("completed");
    expect(
      aggregated.nodes.find((item) => item.taskId === "task-b")?.state,
    ).toBe("cancelled");
    expect(
      aggregated.nodes.find((item) => item.taskId === "task-c")?.state,
    ).toBe("blocked");
    expect(
      aggregated.nodes.find((item) => item.taskId === "task-c")?.executed,
    ).toBe(false);
    expect(adapter.started.includes("task-c")).toBe(false);
  });

  it("aggregates timeout retry with distinct leases and stale late results ignored", async () => {
    let fires = 0;
    const adapter = new ScriptAdapter();
    const { result } = await runWave({
      adapter,
      nodeTimeoutMs: 25,
      nodes: [node("task-a")],
      timeoutSchedule: (_ms, onTimeout) => {
        fires += 1;
        if (fires === 1) onTimeout();
        return { stop() {} };
      },
    });
    const aggregated = aggregateNeutronTaskGraphResults({
      graph: result.graph,
      outcomes: result.outcomes,
      session: session(),
    });
    const record = aggregated.nodes[0];
    expect(record?.attempts.map((item) => item.attempt)).toEqual([1, 2]);
    expect(record?.attempts[0]?.leaseId).toBe(`${SESSION}:task-a:1`);
    expect(record?.attempts[1]?.leaseId).toBe(`${SESSION}:task-a:2`);
    expect(record?.authoritativeAttempt).toBe(2);
    expect(record?.attempts[0]?.state).not.toBe("completed");
    expect(aggregated.status).toBe("completed");
  });

  it("reconcile is fail-closed on stale project and does not rerun", async () => {
    const adapter = new ScriptAdapter();
    const { fs, result } = await runWave({
      adapter,
      nodes: [node("task-a")],
    });
    const baseline = sourceFingerprint(fs);
    await fs.write("/project/src/main.ts", "export const drifted = true;\n");
    const callsBefore = adapter.visits.length;
    const reconciled = reconcileNeutronTaskGraphExecution({
      baseline: { projectFingerprint: baseline },
      current: { projectFingerprint: sourceFingerprint(fs) },
      graph: result.graph,
      outcomes: result.outcomes,
      session: session(),
    });
    expect(reconciled.status).toBe("stale");
    expect(reconciled.accepted).toBe(false);
    expect(reconciled.rerunAttempted).toBe(false);
    expect(reconciled.stale?.kinds).toEqual(["project"]);
    expect(adapter.visits.length).toBe(callsBefore);
    expect(await fs.read("/project/src/main.ts")).toBe(
      "export const drifted = true;\n",
    );
  });
});
