import {
  NEUTRON_ADAPTER_CAPABILITY_SCHEMA_URN,
  NEUTRON_RUNTIME_SESSION_SCHEMA_URN,
  NEUTRON_SESSION_STATES,
  type NeutronAdapterCapability,
  type NeutronRuntimeContractSnapshot,
  type NeutronRuntimeSession,
} from "@intentloom/protocol";
import { isObject, nonEmpty, oneOf } from "./neutron-runtime-helpers.js";
import {
  validateNeutronContextBundle,
  validateNeutronRuntimeEvent,
  validateNeutronSubagentResult,
  validateNeutronTaskGraph,
  validateNeutronToolEnvelope,
  validateNeutronUsageBudget,
} from "./neutron-runtime-records.js";

export {
  validateNeutronContextBundle,
  validateNeutronRuntimeEvent,
  validateNeutronSubagentResult,
  validateNeutronTaskGraph,
  validateNeutronToolEnvelope,
  validateNeutronUsageBudget,
} from "./neutron-runtime-records.js";

export function validateNeutronRuntimeSession(
  value: unknown,
): NeutronRuntimeSession {
  if (!isObject(value)) throw new Error("runtime session must be an object");
  if (value.schemaVersion !== NEUTRON_RUNTIME_SESSION_SCHEMA_URN) {
    throw new Error("unsupported neutron runtime session schema");
  }
  if (value.mutationAllowed !== false) {
    throw new Error("runtime session mutationAllowed must be false");
  }
  return {
    schemaVersion: NEUTRON_RUNTIME_SESSION_SCHEMA_URN,
    sessionId: nonEmpty(value.sessionId, "session.sessionId"),
    root: nonEmpty(value.root, "session.root"),
    projectId: nonEmpty(value.projectId, "session.projectId"),
    state: oneOf(value.state, NEUTRON_SESSION_STATES, "session.state"),
    mutationAllowed: false,
    createdAt: nonEmpty(value.createdAt, "session.createdAt"),
  };
}

export function validateNeutronAdapterCapability(
  value: unknown,
): NeutronAdapterCapability {
  if (!isObject(value)) throw new Error("adapter capability must be an object");
  if (value.schemaVersion !== NEUTRON_ADAPTER_CAPABILITY_SCHEMA_URN) {
    throw new Error("unsupported neutron adapter capability schema");
  }
  const providerKind = value.providerKind;
  if (
    providerKind !== "deterministic-test" &&
    providerKind !== "unconfigured"
  ) {
    throw new Error(
      "adapter.providerKind must be deterministic-test or unconfigured",
    );
  }
  if (value.networkMode !== "offline") {
    throw new Error("N1 adapter.networkMode must be offline");
  }
  if (value.dataHandling !== "ephemeral" && value.dataHandling !== "retained") {
    throw new Error("adapter.dataHandling is invalid");
  }
  if (value.credentialIsolation !== "outside-project-metadata") {
    throw new Error("adapter.credentialIsolation is invalid");
  }
  if (typeof value.supportsStreaming !== "boolean") {
    throw new Error("adapter.supportsStreaming must be a boolean");
  }
  if (typeof value.supportsToolCalls !== "boolean") {
    throw new Error("adapter.supportsToolCalls must be a boolean");
  }
  return {
    schemaVersion: NEUTRON_ADAPTER_CAPABILITY_SCHEMA_URN,
    providerKind,
    modelId: nonEmpty(value.modelId, "adapter.modelId"),
    supportsStreaming: value.supportsStreaming,
    supportsToolCalls: value.supportsToolCalls,
    networkMode: "offline",
    dataHandling: value.dataHandling,
    credentialIsolation: "outside-project-metadata",
  };
}

export function validateNeutronRuntimeContractSnapshot(
  value: unknown,
): NeutronRuntimeContractSnapshot {
  if (!isObject(value)) throw new Error("runtime snapshot must be an object");
  return {
    session: validateNeutronRuntimeSession(value.session),
    adapter: validateNeutronAdapterCapability(value.adapter),
    context: validateNeutronContextBundle(value.context),
    tool: validateNeutronToolEnvelope(value.tool),
    graph: validateNeutronTaskGraph(value.graph),
    subagent: validateNeutronSubagentResult(value.subagent),
    usage: validateNeutronUsageBudget(value.usage),
    event: validateNeutronRuntimeEvent(value.event),
  };
}
