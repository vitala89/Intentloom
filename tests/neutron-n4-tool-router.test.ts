import { describe, expect, it, vi } from "vitest";
import {
  createMemoryFileSystem,
  inspectProject,
} from "../packages/application/src/index.js";
import {
  createNeutronInspectDispatch,
  routeNeutronToolInvocation,
} from "../packages/application/src/neutron-tool-router.js";
import { listRegisteredNeutronTools } from "../packages/application/src/neutron-tool-registry.js";
import { runNeutronN2ReadOnlyLoop } from "../packages/application/src/neutron-n2-loop.js";
import {
  NEUTRON_RUNTIME_SESSION_SCHEMA_URN,
  type NeutronRuntimeSession,
} from "../packages/protocol/src/neutron-runtime.js";
import type { AgentRoleCapabilities } from "../packages/protocol/src/index.js";

const READ_ONLY_CAPS: AgentRoleCapabilities = {
  readOnly: true,
  allowedPaths: [],
  allowedTools: ["inspect"],
  maxBudget: 100,
  allowNetwork: false,
};

function session(
  overrides: Partial<NeutronRuntimeSession> = {},
): NeutronRuntimeSession {
  return {
    schemaVersion: NEUTRON_RUNTIME_SESSION_SCHEMA_URN,
    sessionId: "session-n4",
    root: "/project",
    projectId: "project-n4",
    state: "inspecting",
    mutationAllowed: false,
    createdAt: "2026-08-16T00:00:00.000Z",
    ...overrides,
  };
}

function invocation(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    invocationId: "inv-1",
    toolName: "inspect",
    root: "/project",
    sessionId: "session-n4",
    argumentsJson: JSON.stringify({ root: "/project" }),
    timeoutMs: 15_000,
    ...overrides,
  };
}

function fingerprint(fs: { files: Map<string, string> }): string {
  return [...fs.files.entries()]
    .toSorted(([left], [right]) => left.localeCompare(right))
    .map(([path, content]) => `${path}:${content}`)
    .join("\n");
}

describe("Neutron N4 tool router — Slice 1", () => {
  it("registers inspect as the first read-only routed tool", () => {
    const tools = listRegisteredNeutronTools();
    expect(tools.map((tool) => tool.toolName)).toEqual(["inspect"]);
    expect(tools[0]?.readOnly).toBe(true);
  });

  it("rejects an unknown tool without dispatch", async () => {
    const dispatch = vi.fn();
    const result = await routeNeutronToolInvocation({
      invocation: invocation({ toolName: "doctor" }),
      session: session(),
      capabilities: READ_ONLY_CAPS,
      dispatch,
    });
    expect(result.operationExecuted).toBe(false);
    expect(result.envelope.result.ok).toBe(false);
    expect(result.envelope.result.errorCode).toBe("unsupported-tool");
    expect(dispatch).not.toHaveBeenCalled();
  });

  it("routes a valid inspect invocation once and returns structured output", async () => {
    const fs = createMemoryFileSystem({
      "/project/package.json": "{}",
      "/project/README.md": "hello",
    });
    const dispatch = createNeutronInspectDispatch((root) =>
      inspectProject(root, fs),
    );
    const spy = vi.fn(dispatch);
    const before = fingerprint(fs);

    const result = await routeNeutronToolInvocation({
      invocation: invocation(),
      session: session(),
      capabilities: READ_ONLY_CAPS,
      dispatch: spy,
    });

    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith("inspect", { root: "/project" });
    expect(result.operationExecuted).toBe(true);
    expect(result.envelope.result.ok).toBe(true);
    expect(result.envelope.invocation.toolName).toBe("inspect");
    const payload = JSON.parse(result.envelope.result.payloadJson ?? "{}") as {
      readOnly: boolean;
    };
    expect(payload.readOnly).toBe(true);
    expect(fingerprint(fs)).toBe(before);
  });

  it("rejects a malformed invocation envelope", async () => {
    const dispatch = vi.fn();
    const result = await routeNeutronToolInvocation({
      invocation: { toolName: "inspect" },
      session: session(),
      capabilities: READ_ONLY_CAPS,
      dispatch,
    });
    expect(result.operationExecuted).toBe(false);
    expect(result.envelope.result.errorCode).toBe("validation-failed");
    expect(dispatch).not.toHaveBeenCalled();
  });

  it("rejects malformed inspect input", async () => {
    const dispatch = vi.fn();
    const result = await routeNeutronToolInvocation({
      invocation: invocation({ argumentsJson: "not-json" }),
      session: session(),
      capabilities: READ_ONLY_CAPS,
      dispatch,
    });
    expect(result.operationExecuted).toBe(false);
    expect(result.envelope.result.errorCode).toBe("validation-failed");
    expect(dispatch).not.toHaveBeenCalled();
  });

  it("rejects sibling and traversal roots in inspect arguments", async () => {
    const dispatch = vi.fn();
    for (const args of [
      JSON.stringify({ root: "/other" }),
      JSON.stringify({ root: "/project/../other" }),
    ]) {
      const result = await routeNeutronToolInvocation({
        invocation: invocation({ argumentsJson: args }),
        session: session(),
        capabilities: READ_ONLY_CAPS,
        dispatch,
      });
      expect(result.operationExecuted).toBe(false);
      expect(result.envelope.result.errorCode).toBe("root-mismatch");
    }
    expect(dispatch).not.toHaveBeenCalled();
  });

  it("rejects invocation root that diverges from the session root", async () => {
    const dispatch = vi.fn();
    const result = await routeNeutronToolInvocation({
      invocation: invocation({ root: "/other" }),
      session: session(),
      capabilities: READ_ONLY_CAPS,
      dispatch,
    });
    expect(result.operationExecuted).toBe(false);
    expect(result.envelope.result.errorCode).toBe("root-mismatch");
    expect(dispatch).not.toHaveBeenCalled();
  });

  it("rejects wrong, cancelled, and expired sessions", async () => {
    const dispatch = vi.fn();
    const wrongSession = await routeNeutronToolInvocation({
      invocation: invocation({ sessionId: "other-session" }),
      session: session(),
      capabilities: READ_ONLY_CAPS,
      dispatch,
    });
    expect(wrongSession.envelope.result.errorCode).toBe("validation-failed");

    const cancelled = await routeNeutronToolInvocation({
      invocation: invocation(),
      session: session({ state: "cancelled" }),
      capabilities: READ_ONLY_CAPS,
      dispatch,
    });
    expect(cancelled.envelope.result.errorCode).toBe("cancelled");

    const expired = await routeNeutronToolInvocation({
      invocation: invocation(),
      session: session({ state: "timed-out" }),
      capabilities: READ_ONLY_CAPS,
      dispatch,
    });
    expect(expired.envelope.result.errorCode).toBe("timeout");

    expect(dispatch).not.toHaveBeenCalled();
  });

  it("rejects missing capability and over-scoped network capability", async () => {
    const dispatch = vi.fn();
    const deniedTool = await routeNeutronToolInvocation({
      invocation: invocation(),
      session: session(),
      capabilities: {
        ...READ_ONLY_CAPS,
        allowedTools: ["timeline"],
      },
      dispatch,
    });
    expect(deniedTool.envelope.result.errorCode).toBe("capability-denied");

    const network = await routeNeutronToolInvocation({
      invocation: invocation(),
      session: session(),
      capabilities: {
        ...READ_ONLY_CAPS,
        allowNetwork: true,
      },
      dispatch,
    });
    expect(network.envelope.result.errorCode).toBe("capability-denied");
    expect(dispatch).not.toHaveBeenCalled();
  });

  it("rejects non-read-only effective capability", async () => {
    const dispatch = vi.fn();
    const result = await routeNeutronToolInvocation({
      invocation: invocation(),
      session: session(),
      capabilities: {
        ...READ_ONLY_CAPS,
        readOnly: false,
      },
      dispatch,
    });
    expect(result.envelope.result.errorCode).toBe("capability-denied");
    expect(dispatch).not.toHaveBeenCalled();
  });

  it("rejects cancelled signal and expired deadline before dispatch", async () => {
    const dispatch = vi.fn();
    const controller = new AbortController();
    controller.abort();
    const cancelled = await routeNeutronToolInvocation({
      invocation: invocation(),
      session: session(),
      capabilities: READ_ONLY_CAPS,
      dispatch,
      signal: controller.signal,
    });
    expect(cancelled.envelope.result.errorCode).toBe("cancelled");

    const expired = await routeNeutronToolInvocation({
      invocation: invocation(),
      session: session(),
      capabilities: READ_ONLY_CAPS,
      dispatch,
      nowMs: 2_000,
      deadlineMs: 1_000,
    });
    expect(expired.envelope.result.errorCode).toBe("timeout");
    expect(dispatch).not.toHaveBeenCalled();
  });

  it("maps dispatch failures to operation-failed with audit metadata", async () => {
    const dispatch = vi.fn(async () => {
      throw new Error("inspect exploded");
    });
    const result = await routeNeutronToolInvocation({
      invocation: invocation(),
      session: session(),
      capabilities: READ_ONLY_CAPS,
      dispatch,
    });
    expect(result.operationExecuted).toBe(true);
    expect(result.envelope.result.errorCode).toBe("operation-failed");
    const audit = JSON.parse(result.envelope.result.payloadJson ?? "{}") as {
      operationExecuted: boolean;
      denialClass: string;
    };
    expect(audit.operationExecuted).toBe(false);
    expect(audit.denialClass).toBe("operation-failed");
  });

  it("normalizes denial audit metadata for unsupported tools", async () => {
    const result = await routeNeutronToolInvocation({
      invocation: invocation({ toolName: "doctor" }),
      session: session(),
      capabilities: READ_ONLY_CAPS,
      dispatch: vi.fn(),
    });
    const audit = JSON.parse(result.envelope.result.payloadJson ?? "{}") as {
      toolName: string;
      invocationId: string;
      sessionId: string;
      root: string;
      operationExecuted: boolean;
    };
    expect(audit.toolName).toBe("doctor");
    expect(audit.invocationId).toBe("inv-1");
    expect(audit.sessionId).toBe("session-n4");
    expect(audit.root).toBe("/project");
    expect(audit.operationExecuted).toBe(false);
  });

  it("proves N2 inspect request through the router without mutating project bytes", async () => {
    const fs = createMemoryFileSystem({
      "/project/package.json": JSON.stringify({ name: "fixture" }),
    });
    const before = fingerprint(fs);
    let dispatchCount = 0;
    const routedInspect = createNeutronInspectDispatch(async (root) => {
      dispatchCount += 1;
      return inspectProject(root, fs);
    });

    const fakeAdapter = {
      getCapabilities: () => ({ modelId: "fixture", supportsToolCalls: true }),
      executeTurn: async () => ({
        responseText: "done",
        toolCalls: [
          {
            id: "call-1",
            name: "inspect",
            argumentsJson: JSON.stringify({ root: "/project" }),
          },
        ],
      }),
    };

    const n2Result = await runNeutronN2ReadOnlyLoop({
      root: "/project",
      sessionId: "session-n4-e2e",
      projectId: "project-n4",
      prompt: "inspect",
      adapter: fakeAdapter,
      disableContextAssembly: true,
      runTool: async (toolName, args) => {
        const routed = await routeNeutronToolInvocation({
          invocation: {
            invocationId: "call-1",
            toolName,
            root: "/project",
            sessionId: "session-n4-e2e",
            argumentsJson: JSON.stringify(args),
            timeoutMs: 15_000,
          },
          session: {
            schemaVersion: NEUTRON_RUNTIME_SESSION_SCHEMA_URN,
            sessionId: "session-n4-e2e",
            root: "/project",
            projectId: "project-n4",
            state: "inspecting",
            mutationAllowed: false,
            createdAt: "2026-08-16T00:00:00.000Z",
          },
          capabilities: READ_ONLY_CAPS,
          dispatch: routedInspect,
        });
        if (!routed.envelope.result.ok) {
          throw new Error(routed.envelope.result.errorCode ?? "router failed");
        }
        return JSON.parse(routed.envelope.result.payloadJson ?? "{}");
      },
      fingerprintProject: async () => fingerprint(fs),
    });

    expect(dispatchCount).toBe(1);
    expect(n2Result.tool.invocation.toolName).toBe("inspect");
    expect(n2Result.projectFingerprintAfter).toBe(before);
    expect(fingerprint(fs)).toBe(before);
  });
});
