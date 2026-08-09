export const QUALITY_GRAPH_PROVIDER_SCHEMA_URN =
  "urn:intentloom:schema:engineering-graph-provider:v1" as const;

export const QUALITY_GRAPH_SNAPSHOT_SCHEMA_URN =
  "urn:intentloom:schema:engineering-graph-snapshot:v1" as const;

export type QualityGraphProviderKind =
  "typescript-workspace" | "nx-workspace" | "custom";

export type GraphNodeType = "project" | "package" | "file" | "target";

export type GraphEdgeType =
  "dependency" | "task-dependency" | "implicit-dependency";

export interface GraphNode {
  readonly id: string;
  readonly name: string;
  readonly type: GraphNodeType;
  readonly path?: string;
  readonly tags?: readonly string[];
  readonly metadata?: Record<string, unknown>;
}

export interface GraphEdge {
  readonly source: string;
  readonly target: string;
  readonly type: GraphEdgeType;
  readonly metadata?: Record<string, unknown>;
}

export interface EngineeringGraphSnapshot {
  readonly schemaUrn: typeof QUALITY_GRAPH_SNAPSHOT_SCHEMA_URN;
  readonly providerKind: QualityGraphProviderKind;
  readonly providerName: string;
  readonly snapshotId: string;
  readonly projectRoot: string;
  readonly nodes: readonly GraphNode[];
  readonly edges: readonly GraphEdge[];
  readonly contentDigest: string;
  readonly createdAt: string;
  readonly confidence: "high" | "medium" | "low";
  readonly limitations?: readonly string[];
}

export interface EngineeringArchitectureRule {
  readonly ruleId: string;
  readonly sourceTagOrPath: string;
  readonly forbiddenTargetTagOrPath: string;
  readonly reason: string;
}

export interface EngineeringGraphFinding {
  readonly ruleId: string;
  readonly sourceNodeId: string;
  readonly targetNodeId: string;
  readonly reason: string;
  readonly severity: "warning" | "error";
}
