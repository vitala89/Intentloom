import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { prepareNeutronRuntimeContractSnapshot } from "../packages/application/src/neutron-runtime-contracts.js";
import {
  NEUTRON_RUNTIME_SESSION_SCHEMA_URN,
  type NeutronRuntimeContractSnapshot,
} from "../packages/protocol/src/neutron-runtime.js";

function loadFixture(): NeutronRuntimeContractSnapshot {
  return JSON.parse(
    readFileSync(
      resolve("tests/fixtures/neutron-runtime/contract-snapshot.v1.json"),
      "utf8",
    ),
  ) as NeutronRuntimeContractSnapshot;
}

describe("Neutron N1 runtime contracts", () => {
  it("prepares a root-bound offline snapshot from the frozen fixture", () => {
    const prepared = prepareNeutronRuntimeContractSnapshot({
      root: "/project",
      snapshot: loadFixture(),
    });
    expect(prepared.session.schemaVersion).toBe(
      NEUTRON_RUNTIME_SESSION_SCHEMA_URN,
    );
    expect(prepared.adapter.networkMode).toBe("offline");
    expect(prepared.session.mutationAllowed).toBe(false);
    expect(prepared.subagent.mutationAttempted).toBe(false);
    expect(prepared.tool.invocation.toolName).toBe("inspect");
    expect(prepared.context.excludedSecretLikePaths).toEqual([".env"]);
  });

  it("rejects a snapshot whose records leave the selected root", () => {
    const snapshot = loadFixture();
    expect(() =>
      prepareNeutronRuntimeContractSnapshot({
        root: "/other",
        snapshot,
      }),
    ).toThrow(/selected project root/);
  });

  it("rejects hosted provider kinds and explicit egress", () => {
    const snapshot = {
      ...loadFixture(),
      adapter: {
        ...loadFixture().adapter,
        providerKind: "openai",
        networkMode: "explicit-egress",
      },
    };
    expect(() =>
      prepareNeutronRuntimeContractSnapshot({
        root: "/project",
        snapshot,
      }),
    ).toThrow(/deterministic-test or unconfigured|offline/);
  });

  it("rejects an unknown read-write tool name", () => {
    const fixture = loadFixture();
    const snapshot = {
      ...fixture,
      tool: {
        ...fixture.tool,
        invocation: {
          ...fixture.tool.invocation,
          toolName: "apply",
        },
      },
    };
    expect(() =>
      prepareNeutronRuntimeContractSnapshot({
        root: "/project",
        snapshot,
      }),
    ).toThrow(/toolName/);
  });

  it("validates cancellation and timeout events", () => {
    const fixture = loadFixture();
    const cancelled = prepareNeutronRuntimeContractSnapshot({
      root: "/project",
      snapshot: {
        ...fixture,
        session: { ...fixture.session, state: "cancelled" },
        event: {
          ...fixture.event,
          kind: "cancellation",
          code: "cancelled",
          message: "user cancelled",
        },
      },
    });
    expect(cancelled.session.state).toBe("cancelled");
    expect(cancelled.event.code).toBe("cancelled");

    const timedOut = prepareNeutronRuntimeContractSnapshot({
      root: "/project",
      snapshot: {
        ...fixture,
        session: { ...fixture.session, state: "timed-out" },
        event: {
          ...fixture.event,
          kind: "timeout",
          code: "timeout",
          message: "tool timeout",
        },
      },
    });
    expect(timedOut.event.kind).toBe("timeout");
  });
});
