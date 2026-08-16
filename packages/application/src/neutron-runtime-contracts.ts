import type { NeutronRuntimeContractSnapshot } from "../../protocol/src/neutron-runtime.js";
import { validateNeutronRuntimeContractSnapshot } from "../../validator/src/neutron-runtime.js";

export interface PrepareNeutronRuntimeContractInput {
  readonly root: string;
  readonly snapshot: unknown;
}

function assertSameRoot(expected: string, actual: string, field: string): void {
  if (actual !== expected) {
    throw new Error(`${field} root must match the selected project root`);
  }
}

export function prepareNeutronRuntimeContractSnapshot(
  input: PrepareNeutronRuntimeContractInput,
): NeutronRuntimeContractSnapshot {
  if (typeof input.root !== "string" || input.root.length === 0) {
    throw new Error("root must be a non-empty string");
  }
  const snapshot = validateNeutronRuntimeContractSnapshot(input.snapshot);
  assertSameRoot(input.root, snapshot.session.root, "session");
  assertSameRoot(input.root, snapshot.context.root, "context");
  assertSameRoot(input.root, snapshot.tool.invocation.root, "tool");
  assertSameRoot(input.root, snapshot.graph.root, "graph");
  assertSameRoot(input.root, snapshot.subagent.root, "subagent");
  const sessionId = snapshot.session.sessionId;
  if (snapshot.context.sessionId !== sessionId) {
    throw new Error("context.sessionId must match session.sessionId");
  }
  if (snapshot.tool.invocation.sessionId !== sessionId) {
    throw new Error("tool.sessionId must match session.sessionId");
  }
  if (snapshot.graph.sessionId !== sessionId) {
    throw new Error("graph.sessionId must match session.sessionId");
  }
  if (snapshot.subagent.sessionId !== sessionId) {
    throw new Error("subagent.sessionId must match session.sessionId");
  }
  if (snapshot.usage.sessionId !== sessionId) {
    throw new Error("usage.sessionId must match session.sessionId");
  }
  if (snapshot.event.sessionId !== sessionId) {
    throw new Error("event.sessionId must match session.sessionId");
  }
  if (snapshot.adapter.networkMode !== "offline") {
    throw new Error("N1 snapshots must stay offline");
  }
  return snapshot;
}
