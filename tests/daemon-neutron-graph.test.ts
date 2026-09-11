import { createConnection } from "node:net";
import { randomUUID } from "node:crypto";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, describe, expect, it } from "vitest";
import {
  NEUTRON_GRAPH_EXECUTE_METHOD,
  NEUTRON_GRAPH_GET_METHOD,
  createNeutronGraphCancelRequest,
  createNeutronGraphExecuteRequest,
  createNeutronGraphGetRequest,
  createNeutronSessionCreateRequest,
  parseDaemonRequest,
} from "@intentloom/protocol";
import type { NeutronTaskNode } from "@intentloom/protocol";
import type { ModelAdapter } from "../packages/application/src/model-adapter.js";
import { createNeutronSessionRuntime } from "../packages/application/src/neutron-session-runtime.js";
import { fingerprintNeutronProjectRoot } from "../packages/application/src/neutron-session-fingerprint.js";
import { startLocalDaemon } from "../packages/daemon/src/index.js";
import { bindNeutronSessionHandlers } from "../packages/daemon/src/neutron-session-handlers.js";
import { NeutronN2Error } from "../packages/validator/src/neutron-runtime-n2.js";

const daemons: { close(): Promise<void> }[] = [];

afterEach(async () => {
  await Promise.all(daemons.splice(0).map((daemon) => daemon.close()));
});

function readyNode(taskId: string): NeutronTaskNode {
  return {
    dependencies: [],
    expectedOutput: `Complete ${taskId}`,
    parentId: null,
    requiredCapabilities: ["inspect"],
    role: "context-scout",
    state: "ready",
    taskId,
  };
}

function fixtureAdapter(): ModelAdapter {
  return {
    getCapabilities: () => ({
      providerKind: "deterministic-test",
      modelId: "fixture-n6-graph",
      supportsStreaming: false,
      supportsToolCalls: true,
      supportsVision: false,
      maxContextTokens: 1024,
      maxOutputTokens: 256,
    }),
    executeTurn: async (request) => ({
      diagnostics: [],
      responseText: request.messages.some((message) => message.role === "tool")
        ? "Inspection complete"
        : "",
      schemaVersion: 1,
      sessionId: request.sessionId,
      stopReason: request.messages.some((message) => message.role === "tool")
        ? "stop"
        : "tool_call",
      toolCalls: request.messages.some((message) => message.role === "tool")
        ? []
        : [{ argumentsJson: "{}", id: "call-1", name: "inspect" }],
      usage: { inputTokens: 1, outputTokens: 1, totalTokens: 2 },
    }),
  };
}

function blockingAdapter(): ModelAdapter {
  return {
    getCapabilities: () => fixtureAdapter().getCapabilities(),
    executeTurn: async (request, options) => {
      await new Promise<void>((resolve, reject) => {
        if (options?.signal?.aborted) {
          reject(new NeutronN2Error("cancelled", "cancelled"));
          return;
        }
        const onAbort = () => {
          reject(new NeutronN2Error("cancelled", "cancelled"));
        };
        options?.signal?.addEventListener("abort", onAbort, { once: true });
      });
      return fixtureAdapter().executeTurn(request, options);
    },
  };
}

function daemonEndpoint(directory: string): string {
  return process.platform === "win32"
    ? `\\\\.\\pipe\\intentloom-n6-graph-${process.pid}-${randomUUID()}`
    : join(directory, "daemon.sock");
}

function rawRequest(
  endpoint: string,
  request: object,
  token: string,
): Promise<unknown> {
  return new Promise((resolvePromise, reject) => {
    const socket = createConnection(endpoint);
    let output = "";
    socket.once("connect", () =>
      socket.write(`${JSON.stringify({ token, request })}\n`),
    );
    socket.on("data", (chunk) => (output += chunk.toString()));
    socket.once("error", reject);
    socket.once("end", () => resolvePromise(JSON.parse(output)));
  });
}

function viewmodel(value: unknown): Record<string, unknown> {
  const payload = (value as { result?: { viewmodel?: unknown } }).result
    ?.viewmodel;
  if (
    payload === null ||
    typeof payload !== "object" ||
    Array.isArray(payload)
  ) {
    throw new Error("daemon viewmodel is not an object");
  }
  return payload as Record<string, unknown>;
}

function errorMessage(value: unknown): string {
  const error = (value as { error?: { message?: unknown } }).error;
  return typeof error?.message === "string"
    ? error.message
    : JSON.stringify(value);
}

async function projectRoot(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "intentloom-n6-graph-"));
  await writeFile(
    join(root, "package.json"),
    JSON.stringify({ name: "n6-graph" }),
  );
  await writeFile(join(root, "README.md"), "safe");
  await mkdir(join(root, "docs", "specs"), { recursive: true });
  await writeFile(join(root, "docs", "specs", "SPEC.md"), "# Intent\nGraph.\n");
  return root;
}

describe("Neutron N6 Slice 3 daemon graph RPC", () => {
  it("parses named graph methods and rejects wildcards", () => {
    const parsed = parseDaemonRequest(
      createNeutronGraphGetRequest(1, "/tmp/project", "s1", "p1"),
    );
    expect(parsed.method).toBe(NEUTRON_GRAPH_GET_METHOD);
    expect(() =>
      parseDaemonRequest({
        jsonrpc: "2.0",
        id: 1,
        method: "intentloom.neutron.graph.*",
        params: {
          protocolVersion: 1,
          root: "/tmp",
          sessionId: "s",
          projectId: "p",
        },
      }),
    ).toThrow(/unsupported protocol method/);
  });

  it("executes one scheduling wave, gets the snapshot, and leaves the fingerprint unchanged", async () => {
    const root = await projectRoot();
    const before = await fingerprintNeutronProjectRoot(root);
    const directory = await mkdtemp(join(tmpdir(), "intentloom-n6-graph-ep-"));
    const token = "g".repeat(32);
    const runtime = createNeutronSessionRuntime({
      createAdapter: () => fixtureAdapter(),
    });
    const daemon = await startLocalDaemon({
      endpoint: daemonEndpoint(directory),
      sessionToken: token,
      enforceCanonicalRoots: false,
      ...bindNeutronSessionHandlers(runtime),
    });
    daemons.push(daemon);
    const created = viewmodel(
      await rawRequest(
        daemon.endpoint,
        createNeutronSessionCreateRequest(1, root, "project-n6"),
        token,
      ),
    );
    const session = created.session as { sessionId: string; projectId: string };
    const executed = viewmodel(
      await rawRequest(
        daemon.endpoint,
        createNeutronGraphExecuteRequest(
          2,
          root,
          session.sessionId,
          session.projectId,
          [readyNode("task-a"), readyNode("task-b")],
        ),
        token,
      ),
    );
    const snapshot = executed.graphSnapshot as {
      graphId: string;
      mutationAttempted: boolean;
      nodes: readonly { taskId: string }[];
      rerunAttempted: boolean;
      status: string;
    };
    expect(executed.session).toMatchObject({ mutationAllowed: false });
    expect(snapshot.mutationAttempted).toBe(false);
    expect(snapshot.rerunAttempted).toBe(false);
    expect(snapshot.nodes.map((node) => node.taskId)).toEqual([
      "task-a",
      "task-b",
    ]);
    const got = viewmodel(
      await rawRequest(
        daemon.endpoint,
        createNeutronGraphGetRequest(
          3,
          root,
          session.sessionId,
          session.projectId,
          snapshot.graphId,
        ),
        token,
      ),
    );
    expect((got.graphSnapshot as { graphId: string }).graphId).toBe(
      snapshot.graphId,
    );
    expect(await fingerprintNeutronProjectRoot(root)).toBe(before);
    expect(executed.method).toBeUndefined();
    expect(NEUTRON_GRAPH_EXECUTE_METHOD).toContain("graph.execute");
  });

  it("rejects unknown graphs, cross-root reuse, and oversized concurrency", async () => {
    const root = await projectRoot();
    const other = await projectRoot();
    const directory = await mkdtemp(join(tmpdir(), "intentloom-n6-graph-rej-"));
    const token = "r".repeat(32);
    const runtime = createNeutronSessionRuntime({
      createAdapter: () => fixtureAdapter(),
    });
    const daemon = await startLocalDaemon({
      endpoint: daemonEndpoint(directory),
      sessionToken: token,
      enforceCanonicalRoots: false,
      ...bindNeutronSessionHandlers(runtime),
    });
    daemons.push(daemon);
    const created = viewmodel(
      await rawRequest(
        daemon.endpoint,
        createNeutronSessionCreateRequest(1, root, "project-n6"),
        token,
      ),
    );
    const session = created.session as { sessionId: string; projectId: string };
    const unknown = await rawRequest(
      daemon.endpoint,
      createNeutronGraphGetRequest(
        2,
        root,
        session.sessionId,
        session.projectId,
      ),
      token,
    );
    expect(errorMessage(unknown)).toMatch(/unknown neutron graph/);
    const crossRoot = await rawRequest(
      daemon.endpoint,
      createNeutronGraphExecuteRequest(
        3,
        other,
        session.sessionId,
        session.projectId,
        [readyNode("task-a")],
      ),
      token,
    );
    expect(errorMessage(crossRoot)).toMatch(/root does not match/);
    expect(() =>
      parseDaemonRequest(
        createNeutronGraphExecuteRequest(
          4,
          root,
          session.sessionId,
          session.projectId,
          [readyNode("task-a")],
          { maxConcurrency: 5 },
        ),
      ),
    ).toThrow(/maxConcurrency/);
  });

  it("acknowledges graph cancellation through the runtime abort path", async () => {
    const root = await projectRoot();
    const directory = await mkdtemp(join(tmpdir(), "intentloom-n6-graph-c-"));
    const token = "c".repeat(32);
    const runtime = createNeutronSessionRuntime({
      createAdapter: () => blockingAdapter(),
    });
    const daemon = await startLocalDaemon({
      endpoint: daemonEndpoint(directory),
      sessionToken: token,
      enforceCanonicalRoots: false,
      ...bindNeutronSessionHandlers(runtime),
    });
    daemons.push(daemon);
    const created = viewmodel(
      await rawRequest(
        daemon.endpoint,
        createNeutronSessionCreateRequest(1, root, "project-n6"),
        token,
      ),
    );
    const session = created.session as { sessionId: string; projectId: string };
    const pending = rawRequest(
      daemon.endpoint,
      createNeutronGraphExecuteRequest(
        2,
        root,
        session.sessionId,
        session.projectId,
        [readyNode("task-a")],
      ),
      token,
    );
    await new Promise((resolve) => setTimeout(resolve, 50));
    const cancelled = viewmodel(
      await rawRequest(
        daemon.endpoint,
        createNeutronGraphCancelRequest(
          3,
          root,
          session.sessionId,
          session.projectId,
        ),
        token,
      ),
    );
    expect(cancelled.cancellationAcknowledged).toBe(true);
    await pending;
  });
});
