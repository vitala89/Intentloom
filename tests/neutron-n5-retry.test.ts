import { describe, expect, it } from "vitest";
import {
  createMemoryFileSystem,
  inspectProject,
  type FileSystem,
} from "../packages/application/src/index.js";
import {
  acquireNeutronTaskLease,
  classifyNeutronRetry,
  createNeutronAttemptAuthority,
  createNeutronSchedulerClock,
  executeReadyNeutronTaskNodes,
  isNeutronSchedulerStatePath,
  NEUTRON_RETRY_MAX_ATTEMPTS,
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
import type { NeutronErrorCode } from "../packages/protocol/src/neutron-runtime.js";

const ROOT = "/project";
const SESSION = "session-n5-4";
const PROJECT = "project-n5-4";

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
    createdAt: "2026-09-06T00:00:00.000Z",
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
    "/project/package.json": JSON.stringify({ name: "n5-slice4" }),
    "/project/src/main.ts": "export const ok = true;\n",
    "/project/docs/specs/SPEC.md": "# Intent\nRetry recovery.\n",
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
  text = "",
  toolName?: string,
): ModelTurnResult {
  return {
    schemaVersion: 1,
    sessionId,
    responseText: text,
    toolCalls:
      toolName === undefined
        ? []
        : [
            {
              id: `call-${toolName}`,
              name: toolName,
              argumentsJson: JSON.stringify({ root: ROOT }),
            },
          ],
    stopReason: toolName === undefined ? "stop" : "tool_call",
    usage: { inputTokens: 4, outputTokens: 2, totalTokens: 6 },
    diagnostics: ["n5-slice4"],
  };
}

class SequenceAdapter implements ModelAdapter {
  readonly visits: string[] = [];
  attemptsStarted = 0;
  private readonly outcomes: ReadonlyArray<Error | "ok">;
  private outcomeIndex = 0;
  private issuedTool = false;

  constructor(outcomes: ReadonlyArray<Error | "ok">) {
    this.outcomes = outcomes;
  }

  getCapabilities() {
    return validateModelAdapterCapabilities({
      providerKind: "ollama",
      modelId: "fixture-n5-4",
      supportsStreaming: false,
      supportsToolCalls: true,
      supportsVision: false,
      maxContextTokens: 8192,
      maxOutputTokens: 1024,
    });
  }

  async executeTurn(request: ModelTurnRequest): Promise<ModelTurnResult> {
    this.visits.push(request.sessionId);
    const current = this.outcomes[this.outcomeIndex] ?? "ok";
    if (current !== "ok") {
      this.attemptsStarted += 1;
      this.outcomeIndex += 1;
      this.issuedTool = false;
      throw current;
    }
    if (!this.issuedTool) {
      this.attemptsStarted += 1;
      this.issuedTool = true;
      return turn(request.sessionId, "", "inspect");
    }
    this.issuedTool = false;
    this.outcomeIndex += 1;
    return turn(request.sessionId, `attempt-${this.outcomeIndex}`);
  }
}

async function runRetryWave(options: {
  readonly adapter: ModelAdapter;
  readonly nodes?: NeutronTaskNode[];
  readonly capabilities?: AgentRoleCapabilities;
  readonly maxConcurrency?: number;
  readonly maxAttempts?: number;
  readonly nodeTimeoutMs?: number;
  readonly clock?: ReturnType<typeof createNeutronSchedulerClock>;
  readonly files?: Record<string, string>;
  readonly heartbeatSchedule?: Parameters<
    typeof executeReadyNeutronTaskNodes
  >[0]["heartbeatSchedule"];
}) {
  const fs = createMemoryFileSystem(options.files ?? projectFiles());
  const before = sourceFingerprint(fs);
  const result = await executeReadyNeutronTaskNodes({
    graph: graph(options.nodes ?? [node("task-a")]),
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
    ...(options.maxAttempts === undefined
      ? {}
      : { maxAttempts: options.maxAttempts }),
    ...(options.nodeTimeoutMs === undefined
      ? {}
      : { nodeTimeoutMs: options.nodeTimeoutMs }),
    ...(options.clock === undefined ? {} : { clock: options.clock }),
    ...(options.heartbeatSchedule === undefined
      ? {}
      : { heartbeatSchedule: options.heartbeatSchedule }),
  });
  return { fs, before, result };
}

describe("Neutron N5 Slice 4 — retry policy", () => {
  it("rejects a stale attempt after authority advances", () => {
    const authority = createNeutronAttemptAuthority(1);
    expect(authority.owns(1)).toBe(true);
    authority.advance(2);
    expect(authority.owns(1)).toBe(false);
    expect(authority.owns(2)).toBe(true);
    authority.invalidate(2);
    expect(authority.owns(2)).toBe(false);
  });

  it("classifies retryable and non-retryable failures without string matching", () => {
    expect(NEUTRON_RETRY_MAX_ATTEMPTS).toBe(2);
    expect(
      classifyNeutronRetry({
        attempt: 1,
        cancelled: false,
        failure: {
          code: "operation-failed",
          stage: "model",
          message: "transient",
        },
      }),
    ).toEqual({
      retryable: true,
      reason: "operation-failed",
      nextAttempt: 2,
    });
    expect(
      classifyNeutronRetry({
        attempt: 2,
        cancelled: false,
        failure: {
          code: "timeout",
          stage: "timeout",
          message: "late",
        },
      }),
    ).toEqual({ retryable: false, reason: "retry-exhausted" });
    for (const code of [
      "capability-denied",
      "validation-failed",
      "budget-exceeded",
      "cancelled",
      "permission-denied",
    ] as const) {
      expect(
        classifyNeutronRetry({
          attempt: 1,
          cancelled: false,
          failure: { code, stage: "capability", message: code },
        }).retryable,
      ).toBe(false);
    }
  });

  it("retries a transient provider failure once and completes", async () => {
    const adapter = new SequenceAdapter([
      new NeutronN2Error("operation-failed", "transient"),
      "ok",
    ]);
    const { result } = await runRetryWave({ adapter });
    const outcome = result.outcomes[0];
    expect(adapter.attemptsStarted).toBe(2);
    expect(
      outcome?.execution && "node" in outcome.execution
        ? outcome.execution.node.state
        : "",
    ).toBe("completed");
    expect(
      outcome?.execution && "attempt" in outcome.execution
        ? outcome.execution.attempt
        : 0,
    ).toBe(2);
    expect(outcome?.attempts.map((entry) => entry.attempt)).toEqual([1, 2]);
    expect(outcome?.attempts[0]?.leaseId).toBe(`${SESSION}:task-a:1`);
    expect(outcome?.attempts[1]?.leaseId).toBe(`${SESSION}:task-a:2`);
    expect(outcome?.attempts[0]?.leaseId).not.toBe(
      outcome?.attempts[1]?.leaseId,
    );
  });

  it("exhausts retries after two transient failures", async () => {
    const adapter = new SequenceAdapter([
      new NeutronN2Error("operation-failed", "first"),
      new NeutronN2Error("operation-failed", "second"),
    ]);
    const { result } = await runRetryWave({ adapter });
    expect(adapter.attemptsStarted).toBe(2);
    expect(result.outcomes[0]?.retryExhausted).toBe(true);
    expect(result.outcomes[0]?.retryReason).toBe("retry-exhausted");
    expect(
      result.outcomes[0]?.execution && "node" in result.outcomes[0].execution
        ? result.outcomes[0].execution.node.state
        : "",
    ).toBe("failed");
  });

  it("does not retry non-retryable provider errors", async () => {
    const cases: NeutronErrorCode[] = [
      "capability-denied",
      "permission-denied",
      "budget-exceeded",
    ];
    for (const code of cases) {
      const adapter = new SequenceAdapter([
        new NeutronN2Error(code, code),
        "ok",
      ]);
      const { result } = await runRetryWave({ adapter });
      expect({
        code,
        attemptsStarted: adapter.attemptsStarted,
        recorded: result.outcomes[0]?.attempts.length,
      }).toEqual({ code, attemptsStarted: 1, recorded: 1 });
    }
  });

  it("does not retry validation failure and never calls the provider", async () => {
    const adapter = new SequenceAdapter(["ok"]);
    const fs = createMemoryFileSystem(projectFiles());
    const result = await executeReadyNeutronTaskNodes({
      graph: graph([node("task-a")]),
      session: { ...session(), projectId: "other-project" },
      projectId: PROJECT,
      adapter,
      fs,
      sessionCapabilities: caps(),
      fingerprintProject: async () => sourceFingerprint(fs),
    });
    expect(adapter.visits).toHaveLength(0);
    expect(result.outcomes[0]?.execution?.executed).toBe(false);
    expect(result.outcomes[0]?.execution?.error?.code).toBe(
      "validation-failed",
    );
    expect(
      result.outcomes[0]?.attempts[0]?.retryReason ?? "non-retryable",
    ).not.toBe("operation-failed");
  });

  it("does not widen capabilities across retry", async () => {
    const sessionCaps: AgentRoleCapabilities = {
      ...caps(["inspect"]),
      allowedTools: ["inspect"],
    };
    const adapter: ModelAdapter = {
      getCapabilities: () =>
        validateModelAdapterCapabilities({
          providerKind: "ollama",
          modelId: "fixture-n5-4",
          supportsStreaming: false,
          supportsToolCalls: true,
          supportsVision: false,
          maxContextTokens: 8192,
          maxOutputTokens: 1024,
        }),
      executeTurn: async (request) => {
        if (adapterCalls === 0) {
          adapterCalls += 1;
          (sessionCaps as { allowedTools: string[] }).allowedTools = [
            "inspect",
            "doctor",
          ];
          throw new NeutronN2Error("operation-failed", "transient");
        }
        return turn(request.sessionId, "", "doctor");
      },
    };
    let adapterCalls = 0;
    const { result } = await runRetryWave({
      adapter,
      capabilities: sessionCaps,
    });
    const execution = result.outcomes[0]?.execution;
    expect(
      execution && "capabilities" in execution
        ? execution.capabilities.allowedTools
        : [],
    ).toEqual(["inspect"]);
    expect(execution && "error" in execution ? execution.error?.code : "").toBe(
      "capability-denied",
    );
  });

  it("counts a retry against the same concurrency slot", async () => {
    const adapter = new SequenceAdapter([
      new NeutronN2Error("operation-failed", "transient"),
      "ok",
    ]);
    const { result } = await runRetryWave({
      adapter,
      nodes: [node("task-a"), node("task-b")],
      maxConcurrency: 1,
    });
    expect(result.admittedTaskIds).toEqual(["task-a"]);
    expect(
      result.graph.nodes.find((entry) => entry.taskId === "task-b")?.state,
    ).toBe("ready");
    expect(adapter.attemptsStarted).toBe(2);
  });

  it("keeps deterministic taskId result order after retries", async () => {
    const visits: string[] = [];
    const tools = new Set<string>();
    const adapter: ModelAdapter = {
      getCapabilities: () =>
        validateModelAdapterCapabilities({
          providerKind: "ollama",
          modelId: "fixture-n5-4",
          supportsStreaming: false,
          supportsToolCalls: true,
          supportsVision: false,
          maxContextTokens: 8192,
          maxOutputTokens: 1024,
        }),
      async executeTurn(request) {
        const content = request.messages[0]?.content ?? "";
        const taskId =
          /Complete (task-[a-z]+)/u.exec(content)?.[1] ?? "unknown";
        if (!tools.has(taskId)) {
          visits.push(taskId);
          if (
            taskId === "task-b" &&
            visits.filter((id) => id === "task-b").length === 1
          ) {
            throw new NeutronN2Error("operation-failed", "transient");
          }
          tools.add(taskId);
          return turn(request.sessionId, "", "inspect");
        }
        tools.delete(taskId);
        return turn(request.sessionId, `${taskId} done`);
      },
    };
    const { result } = await runRetryWave({
      adapter,
      nodes: [node("task-b"), node("task-a")],
      maxConcurrency: 2,
    });
    expect(result.outcomes.map((outcome) => outcome.taskId)).toEqual([
      "task-a",
      "task-b",
    ]);
    expect(visits.filter((id) => id === "task-b")).toHaveLength(2);
  });

  it("recovers an expired attempt-1 lease onto a distinct attempt-2 lease", async () => {
    const clock = createNeutronSchedulerClock(1_000);
    const files = projectFiles();
    const fs = createMemoryFileSystem(files);
    await acquireNeutronTaskLease({
      root: ROOT,
      fs,
      clock,
      sessionId: SESSION,
      taskId: "task-a",
      ownerId: "stale-owner",
      nodeTimeoutMs: 50,
    });
    clock.advance(50);
    const adapter = new SequenceAdapter(["ok"]);
    const { result } = await runRetryWave({
      adapter,
      clock,
      nodeTimeoutMs: 50,
      files: Object.fromEntries(fs.files),
    });
    expect(adapter.attemptsStarted).toBe(1);
    expect(result.outcomes[0]?.attempts.map((entry) => entry.attempt)).toEqual([
      1, 2,
    ]);
    expect(result.outcomes[0]?.attempts[0]?.state).toBe("timed-out");
    expect(result.outcomes[0]?.lease.leaseId).toBe(`${SESSION}:task-a:2`);
    expect(
      result.outcomes[0]?.execution && "node" in result.outcomes[0].execution
        ? result.outcomes[0].execution.node.state
        : "",
    ).toBe("completed");
  });

  it("leaves project sources unchanged and only writes lease metadata", async () => {
    const adapter = new SequenceAdapter([
      new NeutronN2Error("operation-failed", "transient"),
      "ok",
    ]);
    const { fs, before } = await runRetryWave({ adapter });
    expect(sourceFingerprint(fs)).toBe(before);
    const writes = [...fs.files.keys()].filter((path) =>
      isNeutronSchedulerStatePath(path),
    );
    expect(writes.length).toBeGreaterThan(1);
    expect(
      writes.every((path) => path.includes("/.aif/neutron/scheduler/leases/")),
    ).toBe(true);
  });
});
