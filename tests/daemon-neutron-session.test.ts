import { createConnection } from "node:net";
import { randomUUID } from "node:crypto";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, describe, expect, it } from "vitest";
import {
  APPROVED_APPLY_METHOD,
  NEUTRON_SESSION_CREATE_METHOD,
  NEUTRON_SESSION_GET_METHOD,
  SESSION_GET_METHOD,
  createNeutronSessionCancelRequest,
  createNeutronSessionCreateRequest,
  createNeutronSessionGetRequest,
  createNeutronTurnExecuteRequest,
  parseDaemonRequest,
} from "@intentloom/protocol";
import type { ModelAdapter } from "../packages/application/src/model-adapter.js";
import { createNeutronSessionRuntime } from "../packages/application/src/neutron-session-runtime.js";
import { NeutronN2Error } from "../packages/validator/src/neutron-runtime-n2.js";
import { startLocalDaemon } from "../packages/daemon/src/index.js";
import { bindNeutronSessionHandlers } from "../packages/daemon/src/neutron-session-handlers.js";
import { fingerprintNeutronProjectRoot } from "../packages/application/src/neutron-session-fingerprint.js";
import { readFileSync } from "node:fs";

const daemons: { close(): Promise<void> }[] = [];

afterEach(async () => {
  await Promise.all(daemons.splice(0).map((daemon) => daemon.close()));
});

function fixtureAdapter(
  root: string,
  responseText = "Inspection complete",
): ModelAdapter {
  return {
    getCapabilities: () => ({
      providerKind: "deterministic-test",
      modelId: "fixture-n6",
      supportsStreaming: false,
      supportsToolCalls: true,
      supportsVision: false,
      maxContextTokens: 1024,
      maxOutputTokens: 256,
    }),
    executeTurn: async (request) => ({
      schemaVersion: 1,
      sessionId: request.sessionId,
      responseText,
      toolCalls: [
        {
          id: "call-1",
          name: "inspect",
          argumentsJson: "{}",
        },
      ],
      stopReason: "tool_call",
      usage: { inputTokens: 1, outputTokens: 1, totalTokens: 2 },
      diagnostics: [],
    }),
  };
}

function blockingAdapter(root: string): ModelAdapter {
  return {
    getCapabilities: () => fixtureAdapter(root).getCapabilities(),
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
      return fixtureAdapter(root).executeTurn(request, options);
    },
  };
}

function daemonEndpoint(directory: string): string {
  return process.platform === "win32"
    ? `\\\\.\\pipe\\intentloom-neutron-${process.pid}-${randomUUID()}`
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
  if (payload === null || typeof payload !== "object" || Array.isArray(payload))
    throw new Error("daemon viewmodel is not an object");
  return payload as Record<string, unknown>;
}

async function projectRoot(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "intentloom-n6-project-"));
  await writeFile(
    join(root, "package.json"),
    JSON.stringify({ name: "n6-fixture" }),
  );
  await writeFile(join(root, "README.md"), "safe");
  return root;
}

describe("Neutron N6 Slice 1 daemon session RPC", () => {
  it("parses neutron methods and does not overload session.get", () => {
    const parsed = parseDaemonRequest(
      createNeutronSessionCreateRequest(1, "/tmp/project", "p1"),
    );
    expect(parsed.method).toBe(NEUTRON_SESSION_CREATE_METHOD);
    expect(parsed.method).not.toBe(SESSION_GET_METHOD);
    expect(() =>
      parseDaemonRequest({
        jsonrpc: "2.0",
        id: 1,
        method: "intentloom.neutron.session.*",
        params: { protocolVersion: 1, root: "/tmp" },
      }),
    ).toThrow(/unsupported protocol method/);
  });

  it("creates, gets, executes a read-only turn, and leaves the fingerprint unchanged", async () => {
    const root = await projectRoot();
    const before = await fingerprintNeutronProjectRoot(root);
    const directory = await mkdtemp(join(tmpdir(), "intentloom-n6-endpoint-"));
    const token = "n".repeat(32);
    const adapter = fixtureAdapter(root, "Apply succeeded");
    const runtime = createNeutronSessionRuntime({
      createAdapter: () => adapter,
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
    const session = created.session as {
      mutationAllowed: boolean;
      sessionId: string;
      state: string;
    };
    expect(session.mutationAllowed).toBe(false);
    expect(session.state).toBe("created");
    expect((created.adapter as { providerKind: string }).providerKind).toBe(
      "deterministic-test",
    );

    const got = viewmodel(
      await rawRequest(
        daemon.endpoint,
        createNeutronSessionGetRequest(
          2,
          root,
          session.sessionId,
          "project-n6",
        ),
        token,
      ),
    );
    expect((got.session as { sessionId: string }).sessionId).toBe(
      session.sessionId,
    );

    const executed = viewmodel(
      await rawRequest(
        daemon.endpoint,
        createNeutronTurnExecuteRequest(
          3,
          root,
          session.sessionId,
          "project-n6",
          "Inspect this project",
        ),
        token,
      ),
    );
    expect((executed.session as { state: string }).state).toBe("completed");
    expect(
      (executed.session as { mutationAllowed: boolean }).mutationAllowed,
    ).toBe(false);
    expect(executed.responseText).toBe("Apply succeeded");
    expect(executed.projectFingerprintBefore).toBe(before);
    expect(executed.projectFingerprintAfter).toBe(before);
    expect(await fingerprintNeutronProjectRoot(root)).toBe(before);

    const info = (await rawRequest(
      daemon.endpoint,
      {
        jsonrpc: "2.0",
        id: 4,
        method: "intentloom.daemon.info.v1",
        params: { protocolVersion: 1, clientProtocolVersion: 1 },
      },
      token,
    )) as { result: { capabilities: { method: string }[] } };
    const methods = info.result.capabilities.map((entry) => entry.method);
    expect(methods).toContain(NEUTRON_SESSION_CREATE_METHOD);
    expect(methods).toContain(NEUTRON_SESSION_GET_METHOD);
    expect(methods).not.toContain(APPROVED_APPLY_METHOD);

    await rm(root, { recursive: true, force: true });
    await rm(directory, { recursive: true, force: true });
  });

  it("rejects unknown sessions and cross-root reuse", async () => {
    const root = await projectRoot();
    const other = await projectRoot();
    const directory = await mkdtemp(join(tmpdir(), "intentloom-n6-bind-"));
    const token = "n".repeat(32);
    const runtime = createNeutronSessionRuntime({
      createAdapter: () => fixtureAdapter(root),
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
    const sessionId = (created.session as { sessionId: string }).sessionId;
    const unknown = (await rawRequest(
      daemon.endpoint,
      createNeutronSessionGetRequest(2, root, "missing", "project-n6"),
      token,
    )) as { error?: { message: string } };
    expect(unknown.error?.message).toMatch(/unknown neutron session/);
    const crossed = (await rawRequest(
      daemon.endpoint,
      createNeutronSessionGetRequest(3, other, sessionId, "project-n6"),
      token,
    )) as { error?: { message: string } };
    expect(crossed.error?.message).toMatch(/root does not match/);
    await rm(root, { recursive: true, force: true });
    await rm(other, { recursive: true, force: true });
    await rm(directory, { recursive: true, force: true });
  });

  it("fails visibly when the adapter is unconfigured", async () => {
    const root = await projectRoot();
    const directory = await mkdtemp(
      join(tmpdir(), "intentloom-n6-unconfigured-"),
    );
    const token = "n".repeat(32);
    const runtime = createNeutronSessionRuntime({ createAdapter: () => null });
    const daemon = await startLocalDaemon({
      endpoint: daemonEndpoint(directory),
      sessionToken: token,
      enforceCanonicalRoots: false,
      ...bindNeutronSessionHandlers(runtime),
    });
    daemons.push(daemon);
    const response = (await rawRequest(
      daemon.endpoint,
      createNeutronSessionCreateRequest(1, root, "project-n6"),
      token,
    )) as { error?: { message: string } };
    expect(response.error?.message).toMatch(/not configured/);
    await rm(root, { recursive: true, force: true });
    await rm(directory, { recursive: true, force: true });
  });

  it("acknowledges runtime cancellation", async () => {
    const root = await projectRoot();
    const directory = await mkdtemp(join(tmpdir(), "intentloom-n6-cancel-"));
    const token = "n".repeat(32);
    const runtime = createNeutronSessionRuntime({
      createAdapter: () => blockingAdapter(root),
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
    const sessionId = (created.session as { sessionId: string }).sessionId;
    const turn = rawRequest(
      daemon.endpoint,
      createNeutronTurnExecuteRequest(
        2,
        root,
        sessionId,
        "project-n6",
        "Inspect",
      ),
      token,
    );
    await new Promise((resolve) => setTimeout(resolve, 50));
    const cancelled = viewmodel(
      await rawRequest(
        daemon.endpoint,
        createNeutronSessionCancelRequest(3, root, sessionId, "project-n6"),
        token,
      ),
    );
    expect(cancelled.cancellationAcknowledged).toBe(true);
    expect((cancelled.session as { state: string }).state).toBe("cancelled");
    await turn;
    await rm(root, { recursive: true, force: true });
    await rm(directory, { recursive: true, force: true });
  });

  it("does not dispatch approvedApply from neutron handlers", () => {
    const source = readFileSync(
      new URL(
        "../packages/daemon/src/neutron-session-handlers.ts",
        import.meta.url,
      ),
      "utf8",
    );
    expect(source).not.toContain("approvedApply");
    expect(source).not.toContain(APPROVED_APPLY_METHOD);
  });
});
