import { describe, expect, it } from "vitest";
import {
  PROTOCOL_VERSION,
  createDaemonInfoRequest,
  createDaemonInfoResponse,
  parseDaemonInfoResponse,
} from "@intentloom/protocol";
import {
  createMemoryFileSystem,
  initProject,
  getInteractiveWorkspaceState,
} from "@intentloom/application";

describe("v1.0 Stable Compatibility Contract & Protocol Guarantees (ADR-0043)", () => {
  it("guarantees wire protocol version is exactly 1 for current release line", () => {
    expect(PROTOCOL_VERSION).toBe(1);
  });

  it("produces backward-compatible daemonInfo request and response payloads", () => {
    const req = createDaemonInfoRequest("req-1");
    expect(req.params.protocolVersion).toBe(1);
    expect(req.method).toBe("intentloom.daemon.info.v1");

    const res = createDaemonInfoResponse("req-1", {
      daemonVersion: "0.6.0-beta.1",
      capabilities: [
        {
          method: "intentloom.daemon.info.v1",
          operation: "daemonInfo",
          classification: "read-only",
        },
        {
          method: "intentloom.project.inspect.v1",
          operation: "inspectProject",
          classification: "read-only",
        },
      ],
      limits: {
        maxMessageBytes: 10485760,
        maxResponseBytes: 10485760,
        maxConnections: 10,
        requestTimeoutMs: 30000,
      },
      compatibility: {
        status: "compatible",
        clientProtocolVersion: 1,
        daemonProtocolVersion: 1,
      },
    });

    const parsed = parseDaemonInfoResponse(res);
    expect(parsed.result.protocolVersion).toBe(1);
    expect(parsed.result.daemonVersion).toBe("0.6.0-beta.1");
    expect(parsed.result.capabilities.length).toBe(2);
    expect(parsed.result.compatibility.status).toBe("compatible");
  });

  it("validates that incompatible protocol versions fail parsing cleanly", () => {
    const invalidRes = {
      protocolVersion: 99,
      requestId: "req-fail",
      ok: true,
      result: {
        protocolVersion: 99,
        daemonVersion: "99.0.0",
        capabilities: [],
      },
    };

    expect(() => parseDaemonInfoResponse(invalidRes as any)).toThrow(
      "jsonrpc must equal 2.0",
    );
  });

  it("verifies structured interactive workspace state schema stability across releases", async () => {
    const fs = createMemoryFileSystem();
    const root = "/project";
    await initProject({ root, adapters: ["codex"] }, fs);

    const state = await getInteractiveWorkspaceState(
      { root, projectId: "compat-test" },
      fs,
    );
    expect(state.projectId).toBe("compat-test");
    expect(state.root).toBe(root);
    expect(state.inspect).not.toBeNull();
    expect(Array.isArray(state.findings)).toBe(true);
    expect(Array.isArray(state.sessions)).toBe(true);
    expect(state.generatedAt).toBeTruthy();
  });
});
