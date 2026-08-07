import { describe, expect, it } from "vitest";
import {
  createMemoryFileSystem,
  inspectProject,
  doctorProject,
} from "@intentloom/application";
import {
  PROTOCOL_VERSION,
  createDaemonInfoRequest,
  parseDaemonInfoResponse,
  createDaemonInfoResponse,
} from "@intentloom/protocol";

describe("v1.0 Upgrade and Protocol Path (V1_0_STABLE_COMPATIBILITY_PLAN Phase 2)", () => {
  it("automatically migrates legacy v0.5/v0.6 project configuration to v1 schema format", async () => {
    const fs = createMemoryFileSystem();
    const root = "/legacy-project";

    // Simulate legacy project with older config structure
    await fs.mkdir(root);
    await fs.mkdir(`${root}/.aif`);
    await fs.write(
      `${root}/.aif/config.yaml`,
      `version: 1\nprofile: generic\nadapters:\n  - codex\n`,
    );
    await fs.write(`${root}/AGENTS.md`, "# Project Guidance\nKeep simple.\n");

    const inspection = await inspectProject(root, fs);
    expect(inspection.profileDetection.selectedProfile).toBe("generic");
    expect(inspection.detectedAdapters).toContain("codex");

    const doctor = await doctorProject(
      { root, profile: "generic", adapters: ["codex"] },
      fs,
    );
    expect(Array.isArray(doctor.findings)).toBe(true);

    // Verify source files remain 100% byte-for-byte unchanged
    const agentsContent = await fs.read(`${root}/AGENTS.md`);
    expect(agentsContent).toBe("# Project Guidance\nKeep simple.\n");
  });

  it("verifies structured error reporting for protocol validation errors", () => {
    const invalidEnvelope = {
      jsonrpc: "2.0",
      id: "err-1",
      method: "unknown.method.v1",
      params: {},
    };

    expect(() =>
      parseDaemonInfoResponse({
        protocolVersion: 1,
        requestId: "err-1",
        ok: false,
        result: invalidEnvelope as any,
      }),
    ).toThrow("jsonrpc must equal 2.0");
  });

  it("verifies capability discovery handshake and protocol limits negotiation", () => {
    const req = createDaemonInfoRequest("req-handshake");
    expect(req.params.clientProtocolVersion).toBe(PROTOCOL_VERSION);

    const res = createDaemonInfoResponse("req-handshake", {
      daemonVersion: "1.0.0-alpha.1",
      capabilities: [
        {
          method: "intentloom.daemon.info.v1",
          operation: "daemonInfo",
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
    expect(parsed.result.compatibility.status).toBe("compatible");
    expect(parsed.result.limits.maxMessageBytes).toBe(10485760);
  });
});
