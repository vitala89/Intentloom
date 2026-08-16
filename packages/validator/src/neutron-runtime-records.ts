import {
  NEUTRON_CONTEXT_BUNDLE_SCHEMA_URN,
  NEUTRON_ERROR_CODES,
  NEUTRON_EVENT_KINDS,
  NEUTRON_READ_ONLY_TOOLS,
  NEUTRON_RUNTIME_EVENT_SCHEMA_URN,
  NEUTRON_SUBAGENT_RESULT_SCHEMA_URN,
  NEUTRON_TASK_GRAPH_SCHEMA_URN,
  NEUTRON_TASK_STATES,
  NEUTRON_TOOL_ENVELOPE_SCHEMA_URN,
  NEUTRON_USAGE_BUDGET_SCHEMA_URN,
  type NeutronContextBundle,
  type NeutronContextSource,
  type NeutronEventKind,
  type NeutronReadOnlyTool,
  type NeutronRuntimeEvent,
  type NeutronSubagentResult,
  type NeutronTaskGraph,
  type NeutronTaskNode,
  type NeutronTaskState,
  type NeutronToolEnvelope,
  type NeutronUsageBudget,
} from "../../protocol/src/neutron-runtime.js";
import {
  finiteInt,
  isObject,
  nonEmpty,
  oneOf,
  strings,
} from "./neutron-runtime-helpers.js";

function validateSource(value: unknown, index: number): NeutronContextSource {
  if (!isObject(value)) {
    throw new Error(`context.sources[${index}] must be an object`);
  }
  const kinds = [
    "inspect",
    "memory",
    "skill",
    "policy",
    "evidence",
    "task",
  ] as const;
  const trusts = ["project", "catalog", "user", "derived"] as const;
  if (typeof value.included !== "boolean") {
    throw new Error(`context.sources[${index}].included must be a boolean`);
  }
  return {
    sourceId: nonEmpty(value.sourceId, `context.sources[${index}].sourceId`),
    kind: oneOf(value.kind, kinds, `context.sources[${index}].kind`),
    trustClass: oneOf(
      value.trustClass,
      trusts,
      `context.sources[${index}].trustClass`,
    ),
    provenance: nonEmpty(
      value.provenance,
      `context.sources[${index}].provenance`,
    ),
    included: value.included,
    ...(typeof value.exclusionReason === "string"
      ? { exclusionReason: value.exclusionReason }
      : {}),
  };
}

export function validateNeutronContextBundle(
  value: unknown,
): NeutronContextBundle {
  if (!isObject(value)) throw new Error("context bundle must be an object");
  if (value.schemaVersion !== NEUTRON_CONTEXT_BUNDLE_SCHEMA_URN) {
    throw new Error("unsupported neutron context bundle schema");
  }
  if (!Array.isArray(value.sources)) {
    throw new Error("context.sources must be an array");
  }
  return {
    schemaVersion: NEUTRON_CONTEXT_BUNDLE_SCHEMA_URN,
    root: nonEmpty(value.root, "context.root"),
    sessionId: nonEmpty(value.sessionId, "context.sessionId"),
    estimatedTokens: finiteInt(
      value.estimatedTokens,
      "context.estimatedTokens",
    ),
    sources: value.sources.map((source, index) =>
      validateSource(source, index),
    ),
    excludedSecretLikePaths: strings(
      value.excludedSecretLikePaths,
      "context.excludedSecretLikePaths",
    ),
  };
}

export function validateNeutronToolEnvelope(
  value: unknown,
): NeutronToolEnvelope {
  if (!isObject(value)) throw new Error("tool envelope must be an object");
  if (value.schemaVersion !== NEUTRON_TOOL_ENVELOPE_SCHEMA_URN) {
    throw new Error("unsupported neutron tool envelope schema");
  }
  if (!isObject(value.invocation) || !isObject(value.result)) {
    throw new Error("tool envelope invocation and result must be objects");
  }
  const invocationId = nonEmpty(
    value.invocation.invocationId,
    "tool.invocation.invocationId",
  );
  if (value.result.invocationId !== invocationId) {
    throw new Error("tool result invocationId must match invocation");
  }
  if (typeof value.result.ok !== "boolean") {
    throw new Error("tool.result.ok must be a boolean");
  }
  return {
    schemaVersion: NEUTRON_TOOL_ENVELOPE_SCHEMA_URN,
    invocation: {
      invocationId,
      toolName: oneOf(
        value.invocation.toolName,
        NEUTRON_READ_ONLY_TOOLS,
        "tool.invocation.toolName",
      ) as NeutronReadOnlyTool,
      root: nonEmpty(value.invocation.root, "tool.invocation.root"),
      sessionId: nonEmpty(
        value.invocation.sessionId,
        "tool.invocation.sessionId",
      ),
      argumentsJson: nonEmpty(
        value.invocation.argumentsJson,
        "tool.invocation.argumentsJson",
      ),
      timeoutMs: finiteInt(
        value.invocation.timeoutMs,
        "tool.invocation.timeoutMs",
      ),
    },
    result: {
      invocationId,
      ok: value.result.ok,
      payloadJson:
        value.result.payloadJson === null
          ? null
          : nonEmpty(value.result.payloadJson, "tool.result.payloadJson"),
      errorCode:
        value.result.errorCode === null
          ? null
          : oneOf(
              value.result.errorCode,
              NEUTRON_ERROR_CODES,
              "tool.result.errorCode",
            ),
    },
  };
}

function validateNode(value: unknown, index: number): NeutronTaskNode {
  if (!isObject(value)) {
    throw new Error(`graph.nodes[${index}] must be an object`);
  }
  return {
    taskId: nonEmpty(value.taskId, `graph.nodes[${index}].taskId`),
    parentId:
      value.parentId === null
        ? null
        : nonEmpty(value.parentId, `graph.nodes[${index}].parentId`),
    dependencies: strings(
      value.dependencies,
      `graph.nodes[${index}].dependencies`,
    ),
    role: nonEmpty(value.role, `graph.nodes[${index}].role`),
    requiredCapabilities: strings(
      value.requiredCapabilities,
      `graph.nodes[${index}].requiredCapabilities`,
    ),
    state: oneOf(
      value.state,
      NEUTRON_TASK_STATES,
      `graph.nodes[${index}].state`,
    ) as NeutronTaskState,
    expectedOutput: nonEmpty(
      value.expectedOutput,
      `graph.nodes[${index}].expectedOutput`,
    ),
  };
}

export function validateNeutronTaskGraph(value: unknown): NeutronTaskGraph {
  if (!isObject(value)) throw new Error("task graph must be an object");
  if (value.schemaVersion !== NEUTRON_TASK_GRAPH_SCHEMA_URN) {
    throw new Error("unsupported neutron task graph schema");
  }
  if (!Array.isArray(value.nodes)) {
    throw new Error("graph.nodes must be an array");
  }
  return {
    schemaVersion: NEUTRON_TASK_GRAPH_SCHEMA_URN,
    root: nonEmpty(value.root, "graph.root"),
    sessionId: nonEmpty(value.sessionId, "graph.sessionId"),
    nodes: value.nodes.map((node, index) => validateNode(node, index)),
  };
}

export function validateNeutronSubagentResult(
  value: unknown,
): NeutronSubagentResult {
  if (!isObject(value)) throw new Error("subagent result must be an object");
  if (value.schemaVersion !== NEUTRON_SUBAGENT_RESULT_SCHEMA_URN) {
    throw new Error("unsupported neutron subagent result schema");
  }
  if (value.mutationAttempted !== false) {
    throw new Error("subagent.mutationAttempted must be false");
  }
  const statuses = ["completed", "failed", "cancelled"] as const;
  return {
    schemaVersion: NEUTRON_SUBAGENT_RESULT_SCHEMA_URN,
    taskId: nonEmpty(value.taskId, "subagent.taskId"),
    sessionId: nonEmpty(value.sessionId, "subagent.sessionId"),
    root: nonEmpty(value.root, "subagent.root"),
    status: oneOf(value.status, statuses, "subagent.status"),
    outputDigest: nonEmpty(value.outputDigest, "subagent.outputDigest"),
    mutationAttempted: false,
  };
}

export function validateNeutronUsageBudget(value: unknown): NeutronUsageBudget {
  if (!isObject(value)) throw new Error("usage budget must be an object");
  if (value.schemaVersion !== NEUTRON_USAGE_BUDGET_SCHEMA_URN) {
    throw new Error("unsupported neutron usage budget schema");
  }
  if (typeof value.limitExceeded !== "boolean") {
    throw new Error("usage.limitExceeded must be a boolean");
  }
  return {
    schemaVersion: NEUTRON_USAGE_BUDGET_SCHEMA_URN,
    sessionId: nonEmpty(value.sessionId, "usage.sessionId"),
    inputTokens: finiteInt(value.inputTokens, "usage.inputTokens"),
    outputTokens: finiteInt(value.outputTokens, "usage.outputTokens"),
    contextTokens: finiteInt(value.contextTokens, "usage.contextTokens"),
    tokenBudget: finiteInt(value.tokenBudget, "usage.tokenBudget"),
    limitExceeded: value.limitExceeded,
  };
}

export function validateNeutronRuntimeEvent(
  value: unknown,
): NeutronRuntimeEvent {
  if (!isObject(value)) throw new Error("runtime event must be an object");
  if (value.schemaVersion !== NEUTRON_RUNTIME_EVENT_SCHEMA_URN) {
    throw new Error("unsupported neutron runtime event schema");
  }
  return {
    schemaVersion: NEUTRON_RUNTIME_EVENT_SCHEMA_URN,
    sessionId: nonEmpty(value.sessionId, "event.sessionId"),
    kind: oneOf(
      value.kind,
      NEUTRON_EVENT_KINDS,
      "event.kind",
    ) as NeutronEventKind,
    code:
      value.code === null
        ? null
        : oneOf(value.code, NEUTRON_ERROR_CODES, "event.code"),
    message: nonEmpty(value.message, "event.message"),
  };
}
