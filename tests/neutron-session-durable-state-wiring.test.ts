import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { createPersistentNeutronMutationApprovalStore } from "../packages/application/src/neutron-mutation-apply-durable-store.js";
import { requireNeutronHostDurableState } from "../packages/application/src/neutron-host-durable-state.js";
import type { ModelAdapter } from "../packages/application/src/model-adapter.js";
import { createNeutronSessionRuntime } from "../packages/application/src/neutron-session-runtime.js";
import { bindNeutronSessionHandlers } from "../packages/daemon/src/neutron-session-handlers.js";

function fixtureAdapter(): ModelAdapter {
  return {
    getCapabilities: () => ({
      providerKind: "deterministic-test",
      modelId: "fixture-durable-state",
      supportsStreaming: false,
      supportsToolCalls: true,
      supportsVision: false,
      maxContextTokens: 1024,
      maxOutputTokens: 256,
    }),
    executeTurn: async (request) => ({
      schemaVersion: 1,
      sessionId: request.sessionId,
      responseText: "ok",
      toolCalls: [],
      stopReason: "stop",
      usage: { inputTokens: 1, outputTokens: 1, totalTokens: 2 },
      diagnostics: [],
    }),
  };
}

function runtime(options: { durableStateDirectory?: string } = {}) {
  return createNeutronSessionRuntime({
    createAdapter: () => fixtureAdapter(),
    ...options,
  });
}

describe("Neutron session host durable-state wiring", () => {
  it("preserves a trusted host directory for future Slice 3.1 composition", async () => {
    const stateDir = await mkdtemp(join(tmpdir(), "neutron-host-state-"));
    const created = runtime({ durableStateDirectory: stateDir });
    const host = requireNeutronHostDurableState(created.hostDurableState());
    expect(host.durableStateDirectory).toBe(stateDir);
    const store = createPersistentNeutronMutationApprovalStore({
      directory: host.durableStateDirectory,
    });
    expect(store.getByApproval).toEqual(expect.any(Function));
    expect(store.claim).toEqual(expect.any(Function));
  });

  it("does not expose the durable path on session viewmodels or RPC handlers", async () => {
    const projectRoot = await mkdtemp(join(tmpdir(), "neutron-host-project-"));
    const stateDir = await mkdtemp(join(tmpdir(), "neutron-host-hidden-"));
    const created = runtime({ durableStateDirectory: stateDir });
    const view = await created.create({
      root: projectRoot,
      projectId: "project-local",
    });
    expect(JSON.stringify(view)).not.toContain(stateDir);
    expect(JSON.stringify(view)).not.toContain("durableStateDirectory");
    expect(view.session.mutationAllowed).toBe(false);
    const handlers = bindNeutronSessionHandlers(created);
    expect(JSON.stringify(Object.keys(handlers).sort())).not.toContain(
      "durableStateDirectory",
    );
    expect(handlers).not.toHaveProperty("hostDurableState");
  });

  it("fails closed when production mutation composition lacks a host directory", () => {
    const created = runtime();
    expect(created.hostDurableState()).toBeUndefined();
    expect(() =>
      requireNeutronHostDurableState(created.hostDurableState()),
    ).toThrow("neutron-mutation-state-unavailable");
    expect(() => runtime({ durableStateDirectory: "   " })).toThrow(
      "neutron-mutation-state-unusable",
    );
  });

  it("does not introduce a memory-store fallback in production composition", async () => {
    const [bin, runtimeSource] = await Promise.all([
      readFile("packages/daemon/src/bin.ts", "utf8"),
      readFile("packages/application/src/neutron-session-runtime.ts", "utf8"),
    ]);
    expect(bin).toContain(
      "durableStateDirectory: startup.durableStateDirectory",
    );
    expect(bin).not.toContain("createMemoryNeutronMutationApprovalStore");
    expect(runtimeSource).not.toContain(
      "createMemoryNeutronMutationApprovalStore",
    );
    expect(bin).not.toContain("applyApprovedNeutronMutation");
    expect(bin).not.toContain("approveAndApply");
  });
});
