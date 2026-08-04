export type KnowledgeProviderQueryKind =
  "symbols" | "references" | "callers" | "callees" | "graph" | "summary";

export interface KnowledgeProviderQuery {
  targetPath: string;
  queryKind: KnowledgeProviderQueryKind;
  symbolName?: string | undefined;
  depth?: number | undefined;
  parameters?: Record<string, unknown> | undefined;
}

export interface KnowledgeProviderLocation {
  path: string;
  startLine: number;
  startColumn: number;
  endLine: number;
  endColumn: number;
}

export interface KnowledgeProviderSymbolNode {
  id: string;
  name: string;
  kind: string;
  location: KnowledgeProviderLocation;
  documentation?: string | undefined;
}

export type KnowledgeProviderRelation =
  "calls" | "implements" | "extends" | "imports" | "uses";

export interface KnowledgeProviderEdge {
  sourceId: string;
  targetId: string;
  relation: KnowledgeProviderRelation;
}

export type KnowledgeProviderQueryResultStatus =
  "success" | "provider_unavailable" | "capability_denied" | "query_failed";

export interface KnowledgeProviderInfo {
  id: string;
  name: string;
  version: string;
}

export interface KnowledgeProviderQueryResult {
  status: KnowledgeProviderQueryResultStatus;
  nodes: KnowledgeProviderSymbolNode[];
  edges: KnowledgeProviderEdge[];
  provider?: KnowledgeProviderInfo | undefined;
  diagnostics?: string[] | undefined;
}

export interface KnowledgeProviderAdapter {
  id: string;
  name: string;
  capabilities: {
    read: readonly string[];
  };
  query(query: KnowledgeProviderQuery): Promise<KnowledgeProviderQueryResult>;
}
