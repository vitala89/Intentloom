import { createConnection } from "node:net";
import { randomUUID } from "node:crypto";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, describe, expect, it } from "vitest";
import {
  createNeutronSessionCreateRequest,
  createNeutronTurnExecuteRequest,
} from "@intentloom/protocol";
import type { ModelAdapter } from "../packages/application/src/model-adapter.js";
import { createNeutronSessionRuntime } from "../packages/application/src/neutron-session-runtime.js";
import { NEUTRON_SESSION_READ_ONLY_CAPS } from "../packages/application/src/neutron-session-turn.js";
import { startLocalDaemon } from "../packages/daemon/src/index.js";
import { bindNeutronSessionHandlers } from "../packages/daemon/src/neutron-session-handlers.js";

const SECRET_BODY = "N6_SLICE2_SECRET_BODY=do-not-cross";
const daemons: { close(): Promise<void> }[] = [];

afterEach(async () => {
  await Promise.all(daemons.splice(0).map((daemon) => daemon.close()));
});

function fixtureAdapter(toolName: "inspect" | "doctor"): ModelAdapter {
  return {
    getCapabilities: () => ({
      providerKind: "deterministic-test",
      modelId: "fixture-n6-activity",
      supportsStreaming: false,
      supportsToolCalls: true,
      supportsVision: false,
      maxContextTokens: 1024,
      maxOutputTokens: 256,
    }),
    executeTurn: async (request) => ({
      schemaVersion: 1,
      sessionId: request.sessionId,
      responseText: "I ran doctor successfully. Apply succeeded.",
      toolCalls: request.messages.some((message) => message.role === "tool")
        ? []
        : [
            {
              id: "call-1",
              name: toolName,
              argumentsJson: "{}",
            },
          ],
      stopReason: "stop",
      usage: { inputTokens: 1, outputTokens: 1, totalTokens: 2 },
      diagnostics: [],
    }),
  };
}

function daemonEndpoint(directory: string): string {
  return process.platform === "win32"
    ? `\\\\.\\pipe\\intentloom-neutron-act-${process.pid}-${randomUUID()}`
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
  const root = await mkdtemp(join(tmpdir(), "intentloom-n6-activity-"));
  await mkdir(join(root, "docs", "specs"), { recursive: true });
  await writeFile(
    join(root, "package.json"),
    JSON.stringify({ name: "n6-activity" }),
  );
  await writeFile(join(root, "docs", "specs", "SPEC.md"), "# Intent\npolicy\n");
  await writeFile(join(root, ".env"), `${SECRET_BODY}\n`);
  return root;
}

describe("Neutron N6 Slice 2 daemon context and tool activity", () => {
  it("returns N3 summary and structured inspect activity for the bound turn", async () => {
    const root = await projectRoot();
    const directory = await mkdtemp(join(tmpdir(), "intentloom-n6-act-ep-"));
    const token = "n".repeat(32);
    const runtime = createNeutronSessionRuntime({
      createAdapter: () => fixtureAdapter("inspect"),
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
      sessionId: string;
      projectId: string;
      root: string;
      mutationAllowed: boolean;
    };
    expect(session.mutationAllowed).toBe(false);
    const executed = viewmodel(
      await rawRequest(
        daemon.endpoint,
        createNeutronTurnExecuteRequest(
          2,
          root,
          session.sessionId,
          "project-n6",
          "Inspect this project",
        ),
        token,
      ),
    );
    const context = executed.contextSummary as {
      sessionId: string;
      root: string;
      excludedSecretLikePaths: string[];
      sources: { kind: string; path?: string }[];
    };
    const activity = executed.toolActivity as {
      toolName: string;
      status: string;
      ok: boolean;
    }[];
    const serialized = JSON.stringify(executed);
    expect(context.sessionId).toBe(session.sessionId);
    expect(context.root).toBe(session.root);
    expect(context.excludedSecretLikePaths).toContain(".env");
    expect(context.sources.some((source) => source.kind === "policy")).toBe(
      true,
    );
    expect(activity).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          toolName: "inspect",
          status: "completed",
          ok: true,
        }),
      ]),
    );
    expect(executed.responseText).toContain("I ran doctor successfully");
    expect(serialized).not.toContain(SECRET_BODY);
    expect(serialized).not.toContain("modelPrompt");
    expect(serialized).not.toContain("projectionEntries");
    await rm(root, { recursive: true, force: true });
    await rm(directory, { recursive: true, force: true });
  });

  it("keeps capability-denied tool activity denied and associated with the session", async () => {
    const root = await projectRoot();
    const directory = await mkdtemp(join(tmpdir(), "intentloom-n6-act-den-"));
    const token = "n".repeat(32);
    const runtime = createNeutronSessionRuntime({
      createAdapter: () => fixtureAdapter("inspect"),
      capabilities: {
        ...NEUTRON_SESSION_READ_ONLY_CAPS,
        allowedTools: ["timeline"],
      },
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
    const executed = viewmodel(
      await rawRequest(
        daemon.endpoint,
        createNeutronTurnExecuteRequest(
          2,
          root,
          sessionId,
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
    expect(executed.toolActivity).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          toolName: "inspect",
          status: "denied",
          allowed: false,
          ok: false,
          errorCode: "capability-denied",
        }),
      ]),
    );
    await rm(root, { recursive: true, force: true });
    await rm(directory, { recursive: true, force: true });
  });
});
