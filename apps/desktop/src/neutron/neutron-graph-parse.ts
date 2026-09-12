import type {
  NeutronGraphSnapshot,
  NeutronGraphStaleSnapshot,
} from "@intentloom/protocol";
import {
  NEUTRON_GRAPH_DEFAULT_CONCURRENCY,
  NEUTRON_GRAPH_HARD_MAX_CONCURRENCY,
  NEUTRON_GRAPH_SNAPSHOT_SCHEMA_URN,
  NEUTRON_GRAPH_STATUSES,
  NEUTRON_GRAPH_STALE_KINDS,
} from "@intentloom/protocol";
import { NEUTRON_GRAPH_MAX_WARNINGS } from "@intentloom/protocol";
import {
  failGraphParse,
  graphStrings,
  oneOfGraph,
  requiredGraphBoolean,
  requiredGraphInt,
  requiredGraphString,
  requireGraphFalse,
} from "./neutron-graph-parse-helpers.js";
import { parseGraphNode } from "./neutron-graph-parse-node.js";

export function parseNeutronGraphSnapshot(
  value: unknown,
): NeutronGraphSnapshot | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== "object" || Array.isArray(value)) {
    failGraphParse("graphSnapshot must be an object");
  }
  const record = value as Record<string, unknown>;
  if (record.schemaVersion !== NEUTRON_GRAPH_SNAPSHOT_SCHEMA_URN) {
    failGraphParse("graphSnapshot schemaVersion is invalid");
  }
  if (!Array.isArray(record.nodes)) {
    failGraphParse("graphSnapshot.nodes must be an array");
  }
  return {
    schemaVersion: NEUTRON_GRAPH_SNAPSHOT_SCHEMA_URN,
    graphId: requiredGraphString(record.graphId, "graphSnapshot.graphId"),
    sessionId: requiredGraphString(record.sessionId, "graphSnapshot.sessionId"),
    root: requiredGraphString(record.root, "graphSnapshot.root"),
    projectId: requiredGraphString(record.projectId, "graphSnapshot.projectId"),
    status: oneOfGraph(
      record.status,
      NEUTRON_GRAPH_STATUSES,
      "graphSnapshot.status",
    ),
    partial: requiredGraphBoolean(record.partial, "graphSnapshot.partial"),
    accepted: requiredGraphBoolean(record.accepted, "graphSnapshot.accepted"),
    mutationAttempted: requireGraphFalse(
      record.mutationAttempted,
      "graphSnapshot.mutationAttempted",
    ),
    rerunAttempted: requireGraphFalse(
      record.rerunAttempted,
      "graphSnapshot.rerunAttempted",
    ),
    cancellationAcknowledged: requiredGraphBoolean(
      record.cancellationAcknowledged,
      "graphSnapshot.cancellationAcknowledged",
    ),
    budgetExceeded: requiredGraphBoolean(
      record.budgetExceeded,
      "graphSnapshot.budgetExceeded",
    ),
    digestPresent: requiredGraphBoolean(
      record.digestPresent,
      "graphSnapshot.digestPresent",
    ),
    outputDigest:
      record.outputDigest === null || record.outputDigest === undefined
        ? null
        : requiredGraphString(
            record.outputDigest,
            "graphSnapshot.outputDigest",
          ),
    usage: parseUsage(record.usage),
    concurrency: parseConcurrency(record.concurrency),
    nodeCounts: parseCounts(record.nodeCounts),
    nodes: record.nodes.map((node, index) => parseGraphNode(node, index)),
    stale: parseStale(record.stale),
    warnings: boundedWarnings(record.warnings),
  };
}

function boundedWarnings(value: unknown): readonly string[] {
  const items = graphStrings(value, "graphSnapshot.warnings");
  if (items.length > NEUTRON_GRAPH_MAX_WARNINGS) {
    failGraphParse(
      `graphSnapshot.warnings exceeds ${NEUTRON_GRAPH_MAX_WARNINGS} entries`,
    );
  }
  return items;
}

function parseUsage(value: unknown): NeutronGraphSnapshot["usage"] {
  if (value === null || value === undefined) return null;
  if (typeof value !== "object" || Array.isArray(value)) {
    failGraphParse("graphSnapshot.usage must be an object");
  }
  const record = value as Record<string, unknown>;
  return {
    contextTokens: requiredGraphInt(
      record.contextTokens,
      "usage.contextTokens",
    ),
    inputTokens: requiredGraphInt(record.inputTokens, "usage.inputTokens"),
    limitExceeded: requiredGraphBoolean(
      record.limitExceeded,
      "usage.limitExceeded",
    ),
    outputTokens: requiredGraphInt(record.outputTokens, "usage.outputTokens"),
    tokenBudget: requiredGraphInt(record.tokenBudget, "usage.tokenBudget"),
  };
}

function parseConcurrency(value: unknown): NeutronGraphSnapshot["concurrency"] {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    failGraphParse("graphSnapshot.concurrency must be an object");
  }
  const record = value as Record<string, unknown>;
  if (record.defaultConcurrency !== NEUTRON_GRAPH_DEFAULT_CONCURRENCY) {
    failGraphParse("concurrency.defaultConcurrency must be 1");
  }
  if (record.hardMaximum !== NEUTRON_GRAPH_HARD_MAX_CONCURRENCY) {
    failGraphParse("concurrency.hardMaximum must be 4");
  }
  const maxConcurrency = requiredGraphInt(
    record.maxConcurrency,
    "maxConcurrency",
  );
  if (
    maxConcurrency < NEUTRON_GRAPH_DEFAULT_CONCURRENCY ||
    maxConcurrency > NEUTRON_GRAPH_HARD_MAX_CONCURRENCY
  ) {
    failGraphParse("concurrency.maxConcurrency is outside 1-4");
  }
  return {
    defaultConcurrency: NEUTRON_GRAPH_DEFAULT_CONCURRENCY,
    maxConcurrency,
    hardMaximum: NEUTRON_GRAPH_HARD_MAX_CONCURRENCY,
    runningCount: requiredGraphInt(record.runningCount, "runningCount"),
    availableCapacity: requiredGraphInt(
      record.availableCapacity,
      "availableCapacity",
    ),
  };
}

function parseCounts(value: unknown): NeutronGraphSnapshot["nodeCounts"] {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    failGraphParse("graphSnapshot.nodeCounts must be an object");
  }
  const record = value as Record<string, unknown>;
  return {
    total: requiredGraphInt(record.total, "nodeCounts.total"),
    pending: requiredGraphInt(record.pending, "nodeCounts.pending"),
    ready: requiredGraphInt(record.ready, "nodeCounts.ready"),
    running: requiredGraphInt(record.running, "nodeCounts.running"),
    blocked: requiredGraphInt(record.blocked, "nodeCounts.blocked"),
    cancelled: requiredGraphInt(record.cancelled, "nodeCounts.cancelled"),
    timedOut: requiredGraphInt(record.timedOut, "nodeCounts.timedOut"),
    failed: requiredGraphInt(record.failed, "nodeCounts.failed"),
    completed: requiredGraphInt(record.completed, "nodeCounts.completed"),
  };
}

function parseStale(value: unknown): NeutronGraphStaleSnapshot | null {
  if (value === null) return null;
  if (typeof value !== "object" || Array.isArray(value)) {
    failGraphParse("graphSnapshot.stale must be an object");
  }
  const record = value as Record<string, unknown>;
  if (!Array.isArray(record.kinds) || !Array.isArray(record.mismatches)) {
    failGraphParse("graphSnapshot.stale kinds/mismatches must be arrays");
  }
  return {
    accepted: requiredGraphBoolean(record.accepted, "stale.accepted"),
    rerunAttempted: requireGraphFalse(
      record.rerunAttempted,
      "stale.rerunAttempted",
    ),
    kinds: record.kinds.map((kind, index) =>
      oneOfGraph(kind, NEUTRON_GRAPH_STALE_KINDS, `stale.kinds[${index}]`),
    ),
    mismatches: record.mismatches.map((item, index) => {
      if (typeof item !== "object" || item === null || Array.isArray(item)) {
        failGraphParse(`stale.mismatches[${index}] must be an object`);
      }
      const mismatch = item as Record<string, unknown>;
      return {
        kind: oneOfGraph(
          mismatch.kind,
          NEUTRON_GRAPH_STALE_KINDS,
          `stale.mismatches[${index}].kind`,
        ),
        expected: requiredGraphString(
          mismatch.expected,
          `stale.mismatches[${index}].expected`,
        ),
        current: requiredGraphString(
          mismatch.current,
          `stale.mismatches[${index}].current`,
        ),
      };
    }),
  };
}
