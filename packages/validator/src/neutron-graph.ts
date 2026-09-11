import { NEUTRON_GRAPH_SNAPSHOT_SCHEMA_URN } from "../../protocol/src/neutron-graph.js";
import type { NeutronGraphSnapshot } from "../../protocol/src/neutron-graph.js";
import {
  isObject,
  nonEmpty,
  oneOf,
  strings,
} from "./neutron-runtime-helpers.js";
import { NEUTRON_GRAPH_STATUSES } from "../../protocol/src/neutron-graph.js";
import {
  validateGraphConcurrency,
  validateGraphCounts,
  validateGraphNode,
  validateGraphStale,
} from "./neutron-graph-fields.js";

function requireBoolean(value: unknown, field: string): boolean {
  if (typeof value !== "boolean") {
    throw new Error(`${field} must be a boolean`);
  }
  return value;
}

function requireFalse(value: unknown, field: string): false {
  if (value !== false) {
    throw new Error(`${field} must be false`);
  }
  return false;
}

export function validateNeutronGraphSnapshot(
  value: unknown,
): NeutronGraphSnapshot {
  if (!isObject(value)) throw new Error("graphSnapshot must be an object");
  if (value.schemaVersion !== NEUTRON_GRAPH_SNAPSHOT_SCHEMA_URN) {
    throw new Error("unsupported neutron graph snapshot schema");
  }
  if (!Array.isArray(value.nodes)) {
    throw new Error("graphSnapshot.nodes must be an array");
  }
  if (!Array.isArray(value.warnings)) {
    throw new Error("graphSnapshot.warnings must be an array");
  }
  const stale = value.stale === null ? null : validateGraphStale(value.stale);
  return {
    schemaVersion: NEUTRON_GRAPH_SNAPSHOT_SCHEMA_URN,
    graphId: nonEmpty(value.graphId, "graphSnapshot.graphId"),
    sessionId: nonEmpty(value.sessionId, "graphSnapshot.sessionId"),
    root: nonEmpty(value.root, "graphSnapshot.root"),
    projectId: nonEmpty(value.projectId, "graphSnapshot.projectId"),
    status: oneOf(value.status, NEUTRON_GRAPH_STATUSES, "graphSnapshot.status"),
    partial: requireBoolean(value.partial, "graphSnapshot.partial"),
    accepted: requireBoolean(value.accepted, "graphSnapshot.accepted"),
    mutationAttempted: requireFalse(
      value.mutationAttempted,
      "graphSnapshot.mutationAttempted",
    ),
    rerunAttempted: requireFalse(
      value.rerunAttempted,
      "graphSnapshot.rerunAttempted",
    ),
    cancellationAcknowledged: requireBoolean(
      value.cancellationAcknowledged,
      "graphSnapshot.cancellationAcknowledged",
    ),
    budgetExceeded: requireBoolean(
      value.budgetExceeded,
      "graphSnapshot.budgetExceeded",
    ),
    digestPresent: requireBoolean(
      value.digestPresent,
      "graphSnapshot.digestPresent",
    ),
    concurrency: validateGraphConcurrency(value.concurrency),
    nodeCounts: validateGraphCounts(value.nodeCounts),
    nodes: value.nodes.map((node, index) => validateGraphNode(node, index)),
    stale,
    warnings: strings(value.warnings, "graphSnapshot.warnings"),
  };
}

export function optionalGraphSnapshot(
  value: unknown,
): NeutronGraphSnapshot | null {
  if (value === null || value === undefined) return null;
  return validateNeutronGraphSnapshot(value);
}
