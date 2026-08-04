import type {
  KnowledgeProviderQuery,
  KnowledgeProviderQueryKind,
  KnowledgeProviderQueryResult,
  KnowledgeProviderQueryResultStatus,
  KnowledgeProviderSymbolNode,
  KnowledgeProviderEdge,
  KnowledgeProviderRelation,
} from "@intentloom/protocol";

const VALID_QUERY_KINDS: Set<KnowledgeProviderQueryKind> = new Set([
  "symbols",
  "references",
  "callers",
  "callees",
  "graph",
  "summary",
]);

const VALID_RESULT_STATUSES: Set<KnowledgeProviderQueryResultStatus> = new Set([
  "success",
  "provider_unavailable",
  "capability_denied",
  "query_failed",
]);

const VALID_RELATIONS: Set<KnowledgeProviderRelation> = new Set([
  "calls",
  "implements",
  "extends",
  "imports",
  "uses",
]);

export function validateKnowledgeProviderQuery(
  input: unknown,
): KnowledgeProviderQuery {
  if (typeof input !== "object" || input === null) {
    throw new Error("Knowledge provider query must be a non-null object");
  }
  const record = input as Record<string, unknown>;

  if (
    typeof record.targetPath !== "string" ||
    record.targetPath.trim() === ""
  ) {
    throw new Error(
      "Knowledge provider query targetPath must be a non-empty string",
    );
  }

  if (
    typeof record.queryKind !== "string" ||
    !VALID_QUERY_KINDS.has(record.queryKind as KnowledgeProviderQueryKind)
  ) {
    throw new Error(
      `Knowledge provider queryKind must be one of: ${Array.from(VALID_QUERY_KINDS).join(", ")}`,
    );
  }

  if (
    record.symbolName !== undefined &&
    typeof record.symbolName !== "string"
  ) {
    throw new Error(
      "Knowledge provider query symbolName must be a string if provided",
    );
  }

  if (
    record.depth !== undefined &&
    (typeof record.depth !== "number" ||
      !Number.isInteger(record.depth) ||
      record.depth < 0)
  ) {
    throw new Error(
      "Knowledge provider query depth must be a non-negative integer",
    );
  }

  const query: KnowledgeProviderQuery = {
    targetPath: record.targetPath.trim(),
    queryKind: record.queryKind as KnowledgeProviderQueryKind,
  };
  if (typeof record.symbolName === "string") {
    query.symbolName = record.symbolName;
  }
  if (typeof record.depth === "number") {
    query.depth = record.depth;
  }
  if (typeof record.parameters === "object" && record.parameters !== null) {
    query.parameters = record.parameters as Record<string, unknown>;
  }

  return query;
}

export function validateKnowledgeProviderQueryResult(
  input: unknown,
): KnowledgeProviderQueryResult {
  if (typeof input !== "object" || input === null) {
    throw new Error(
      "Knowledge provider query result must be a non-null object",
    );
  }
  const record = input as Record<string, unknown>;

  if (
    typeof record.status !== "string" ||
    !VALID_RESULT_STATUSES.has(
      record.status as KnowledgeProviderQueryResultStatus,
    )
  ) {
    throw new Error(
      `Knowledge provider query result status must be one of: ${Array.from(VALID_RESULT_STATUSES).join(", ")}`,
    );
  }

  if (!Array.isArray(record.nodes)) {
    throw new Error("Knowledge provider query result nodes must be an array");
  }

  if (!Array.isArray(record.edges)) {
    throw new Error("Knowledge provider query result edges must be an array");
  }

  const nodes = record.nodes.map(validateSymbolNode);
  const edges = record.edges.map(validateEdge);

  const res: KnowledgeProviderQueryResult = {
    status: record.status as KnowledgeProviderQueryResultStatus,
    nodes,
    edges,
  };

  if (typeof record.provider === "object" && record.provider !== null) {
    res.provider = record.provider as KnowledgeProviderQueryResult["provider"];
  }
  if (Array.isArray(record.diagnostics)) {
    res.diagnostics = record.diagnostics.filter(
      (d): d is string => typeof d === "string",
    );
  }

  return res;
}

function validateSymbolNode(node: unknown): KnowledgeProviderSymbolNode {
  if (typeof node !== "object" || node === null) {
    throw new Error("Symbol node must be a non-null object");
  }
  const r = node as Record<string, unknown>;
  if (
    typeof r.id !== "string" ||
    typeof r.name !== "string" ||
    typeof r.kind !== "string"
  ) {
    throw new Error("Symbol node must contain id, name, and kind strings");
  }
  const loc = r.location as Record<string, unknown> | undefined;
  if (!loc || typeof loc.path !== "string") {
    throw new Error("Symbol node location must contain a path string");
  }
  const res: KnowledgeProviderSymbolNode = {
    id: r.id,
    name: r.name,
    kind: r.kind,
    location: {
      path: loc.path,
      startLine: typeof loc.startLine === "number" ? loc.startLine : 1,
      startColumn: typeof loc.startColumn === "number" ? loc.startColumn : 1,
      endLine: typeof loc.endLine === "number" ? loc.endLine : 1,
      endColumn: typeof loc.endColumn === "number" ? loc.endColumn : 1,
    },
  };
  if (typeof r.documentation === "string") {
    res.documentation = r.documentation;
  }
  return res;
}

function validateEdge(edge: unknown): KnowledgeProviderEdge {
  if (typeof edge !== "object" || edge === null) {
    throw new Error("Edge must be a non-null object");
  }
  const r = edge as Record<string, unknown>;
  if (
    typeof r.sourceId !== "string" ||
    typeof r.targetId !== "string" ||
    typeof r.relation !== "string" ||
    !VALID_RELATIONS.has(r.relation as KnowledgeProviderRelation)
  ) {
    throw new Error(
      "Edge must contain sourceId, targetId, and a valid relation",
    );
  }
  return {
    sourceId: r.sourceId,
    targetId: r.targetId,
    relation: r.relation as KnowledgeProviderRelation,
  };
}

export function verifyKnowledgeProviderCapability(
  query: KnowledgeProviderQuery,
  grantedCapabilities?: { filesystem?: { read?: readonly string[] } },
): boolean {
  const readPaths = grantedCapabilities?.filesystem?.read;
  if (!readPaths || !Array.isArray(readPaths) || readPaths.length === 0) {
    return false;
  }

  const normalizedTarget = normalizePath(query.targetPath);
  return readPaths.some((allowedPath) => {
    const normalizedAllowed = normalizePath(allowedPath);
    if (
      normalizedAllowed === "./" ||
      normalizedAllowed === "." ||
      normalizedAllowed === ""
    ) {
      return true;
    }
    return (
      normalizedTarget === normalizedAllowed ||
      normalizedTarget.startsWith(
        normalizedAllowed.endsWith("/")
          ? normalizedAllowed
          : `${normalizedAllowed}/`,
      )
    );
  });
}

function normalizePath(p: string): string {
  return p.replace(/\\/g, "/").replace(/^\.\//, "").replace(/\/$/, "");
}
