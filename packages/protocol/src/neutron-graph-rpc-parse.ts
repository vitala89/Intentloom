import { ProtocolValidationError } from "./protocol-validation-error.js";
import { PROTOCOL_VERSION } from "./jsonrpc.js";
import {
  NEUTRON_TASK_STATES,
  type NeutronTaskNode,
  type NeutronTaskState,
} from "./neutron-runtime.js";
import {
  NEUTRON_GRAPH_DEFAULT_CONCURRENCY,
  NEUTRON_GRAPH_HARD_MAX_CONCURRENCY,
} from "./neutron-graph.js";

export interface NeutronGraphBoundParams {
  readonly protocolVersion: typeof PROTOCOL_VERSION;
  readonly root: string;
  readonly sessionId: string;
  readonly projectId: string;
  readonly graphId?: string;
}

export function requiredGraphParam(value: unknown, field: string): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new ProtocolValidationError(
      -32602,
      `${field} must be a non-empty string`,
    );
  }
  return value;
}

export function boundGraphParams(
  params: Record<string, unknown>,
): NeutronGraphBoundParams {
  const graphId =
    params.graphId === undefined
      ? undefined
      : requiredGraphParam(params.graphId, "graphId");
  return {
    protocolVersion: PROTOCOL_VERSION,
    root: requiredGraphParam(params.root, "root"),
    sessionId: requiredGraphParam(params.sessionId, "sessionId"),
    projectId: requiredGraphParam(params.projectId, "projectId"),
    ...(graphId === undefined ? {} : { graphId }),
  };
}

export function parseGraphMaxConcurrency(value: unknown): number | undefined {
  if (value === undefined) return undefined;
  if (
    typeof value !== "number" ||
    !Number.isInteger(value) ||
    value < NEUTRON_GRAPH_DEFAULT_CONCURRENCY ||
    value > NEUTRON_GRAPH_HARD_MAX_CONCURRENCY
  ) {
    throw new ProtocolValidationError(
      -32602,
      `maxConcurrency must be an integer from ${NEUTRON_GRAPH_DEFAULT_CONCURRENCY} to ${NEUTRON_GRAPH_HARD_MAX_CONCURRENCY}`,
    );
  }
  return value;
}

export function parseGraphNodes(value: unknown): readonly NeutronTaskNode[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new ProtocolValidationError(
      -32602,
      "nodes must be a non-empty array",
    );
  }
  return value.map((node, index) => parseNode(node, index));
}

function parseNode(value: unknown, index: number): NeutronTaskNode {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new ProtocolValidationError(
      -32602,
      `nodes[${index}] must be an object`,
    );
  }
  const record = value as Record<string, unknown>;
  const field = (name: string) => `nodes[${index}].${name}`;
  const state = record.state;
  if (
    typeof state !== "string" ||
    !(NEUTRON_TASK_STATES as readonly string[]).includes(state)
  ) {
    throw new ProtocolValidationError(-32602, `${field("state")} is invalid`);
  }
  if (!Array.isArray(record.dependencies)) {
    throw new ProtocolValidationError(
      -32602,
      `${field("dependencies")} must be an array`,
    );
  }
  if (!Array.isArray(record.requiredCapabilities)) {
    throw new ProtocolValidationError(
      -32602,
      `${field("requiredCapabilities")} must be an array`,
    );
  }
  return {
    taskId: requiredGraphParam(record.taskId, field("taskId")),
    parentId:
      record.parentId === null
        ? null
        : requiredGraphParam(record.parentId, field("parentId")),
    dependencies: record.dependencies.map((item, depIndex) =>
      requiredGraphParam(item, `${field("dependencies")}[${depIndex}]`),
    ),
    role: requiredGraphParam(record.role, field("role")),
    requiredCapabilities: record.requiredCapabilities.map((item, capIndex) =>
      requiredGraphParam(item, `${field("requiredCapabilities")}[${capIndex}]`),
    ),
    state: state as NeutronTaskState,
    expectedOutput: requiredGraphParam(
      record.expectedOutput,
      field("expectedOutput"),
    ),
  };
}
