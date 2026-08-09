import type {
  EngineeringArchitectureRule,
  EngineeringGraphSnapshot,
  GraphEdge,
  GraphEdgeType,
  GraphNode,
  GraphNodeType,
  QualityGraphProviderKind,
} from "@intentloom/protocol";
import { QUALITY_GRAPH_SNAPSHOT_SCHEMA_URN } from "@intentloom/protocol";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function validateEngineeringGraphSnapshot(
  input: unknown,
): EngineeringGraphSnapshot {
  if (!isRecord(input)) {
    throw new Error("EngineeringGraphSnapshot must be an object");
  }

  if (input.schemaUrn !== QUALITY_GRAPH_SNAPSHOT_SCHEMA_URN) {
    throw new Error(
      `Invalid schemaUrn: expected '${QUALITY_GRAPH_SNAPSHOT_SCHEMA_URN}'`,
    );
  }

  const validKinds: readonly QualityGraphProviderKind[] = [
    "typescript-workspace",
    "nx-workspace",
    "custom",
  ];
  if (
    typeof input.providerKind !== "string" ||
    !validKinds.includes(input.providerKind as QualityGraphProviderKind)
  ) {
    throw new Error(`Invalid providerKind: '${String(input.providerKind)}'`);
  }

  if (
    typeof input.providerName !== "string" ||
    input.providerName.trim() === ""
  ) {
    throw new Error("providerName must be a non-empty string");
  }

  if (typeof input.snapshotId !== "string" || input.snapshotId.trim() === "") {
    throw new Error("snapshotId must be a non-empty string");
  }

  if (
    typeof input.projectRoot !== "string" ||
    input.projectRoot.trim() === ""
  ) {
    throw new Error("projectRoot must be a non-empty string");
  }

  if (!Array.isArray(input.nodes)) {
    throw new Error("nodes must be an array");
  }

  const nodes: GraphNode[] = input.nodes.map((n, idx) => {
    if (!isRecord(n)) {
      throw new Error(`Node at index ${idx} must be an object`);
    }
    if (typeof n.id !== "string" || n.id.trim() === "") {
      throw new Error(`Node at index ${idx} must have a non-empty id`);
    }
    if (typeof n.name !== "string" || n.name.trim() === "") {
      throw new Error(`Node at index ${idx} must have a non-empty name`);
    }
    const validNodeTypes: readonly GraphNodeType[] = [
      "project",
      "package",
      "file",
      "target",
    ];
    if (
      typeof n.type !== "string" ||
      !validNodeTypes.includes(n.type as GraphNodeType)
    ) {
      throw new Error(`Node '${n.id}' has invalid type: '${String(n.type)}'`);
    }

    const path = typeof n.path === "string" ? n.path : undefined;
    const tags = Array.isArray(n.tags)
      ? n.tags.filter((t): t is string => typeof t === "string")
      : undefined;
    const metadata = isRecord(n.metadata) ? n.metadata : undefined;

    return {
      id: n.id,
      name: n.name,
      type: n.type as GraphNodeType,
      ...(path !== undefined ? { path } : {}),
      ...(tags !== undefined ? { tags } : {}),
      ...(metadata !== undefined ? { metadata } : {}),
    };
  });

  if (!Array.isArray(input.edges)) {
    throw new Error("edges must be an array");
  }

  const nodeIds = new Set(nodes.map((n) => n.id));

  const edges: GraphEdge[] = input.edges.map((e, idx) => {
    if (!isRecord(e)) {
      throw new Error(`Edge at index ${idx} must be an object`);
    }
    if (typeof e.source !== "string" || !nodeIds.has(e.source)) {
      throw new Error(
        `Edge at index ${idx} references unknown source: '${String(e.source)}'`,
      );
    }
    if (typeof e.target !== "string" || !nodeIds.has(e.target)) {
      throw new Error(
        `Edge at index ${idx} references unknown target: '${String(e.target)}'`,
      );
    }
    const validEdgeTypes: readonly GraphEdgeType[] = [
      "dependency",
      "task-dependency",
      "implicit-dependency",
    ];
    if (
      typeof e.type !== "string" ||
      !validEdgeTypes.includes(e.type as GraphEdgeType)
    ) {
      throw new Error(
        `Edge at index ${idx} has invalid type: '${String(e.type)}'`,
      );
    }

    const metadata = isRecord(e.metadata) ? e.metadata : undefined;

    return {
      source: e.source,
      target: e.target,
      type: e.type as GraphEdgeType,
      ...(metadata !== undefined ? { metadata } : {}),
    };
  });

  if (
    typeof input.contentDigest !== "string" ||
    input.contentDigest.trim() === ""
  ) {
    throw new Error("contentDigest must be a non-empty string");
  }

  if (typeof input.createdAt !== "string" || input.createdAt.trim() === "") {
    throw new Error("createdAt must be a non-empty string");
  }

  const validConfidences = ["high", "medium", "low"] as const;
  if (
    typeof input.confidence !== "string" ||
    !validConfidences.includes(
      input.confidence as (typeof validConfidences)[number],
    )
  ) {
    throw new Error(`Invalid confidence: '${String(input.confidence)}'`);
  }

  const limitations = Array.isArray(input.limitations)
    ? input.limitations.filter((l): l is string => typeof l === "string")
    : undefined;

  return {
    schemaUrn: QUALITY_GRAPH_SNAPSHOT_SCHEMA_URN,
    providerKind: input.providerKind as QualityGraphProviderKind,
    providerName: input.providerName,
    snapshotId: input.snapshotId,
    projectRoot: input.projectRoot,
    nodes,
    edges,
    contentDigest: input.contentDigest,
    createdAt: input.createdAt,
    confidence: input.confidence as "high" | "medium" | "low",
    ...(limitations !== undefined ? { limitations } : {}),
  };
}

export function validateEngineeringArchitectureRule(
  input: unknown,
): EngineeringArchitectureRule {
  if (!isRecord(input)) {
    throw new Error("EngineeringArchitectureRule must be an object");
  }

  if (typeof input.ruleId !== "string" || input.ruleId.trim() === "") {
    throw new Error("ruleId must be a non-empty string");
  }

  if (
    typeof input.sourceTagOrPath !== "string" ||
    input.sourceTagOrPath.trim() === ""
  ) {
    throw new Error("sourceTagOrPath must be a non-empty string");
  }

  if (
    typeof input.forbiddenTargetTagOrPath !== "string" ||
    input.forbiddenTargetTagOrPath.trim() === ""
  ) {
    throw new Error("forbiddenTargetTagOrPath must be a non-empty string");
  }

  if (typeof input.reason !== "string" || input.reason.trim() === "") {
    throw new Error("reason must be a non-empty string");
  }

  return {
    ruleId: input.ruleId,
    sourceTagOrPath: input.sourceTagOrPath,
    forbiddenTargetTagOrPath: input.forbiddenTargetTagOrPath,
    reason: input.reason,
  };
}
