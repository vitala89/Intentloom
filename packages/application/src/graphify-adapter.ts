import type {
  KnowledgeProviderAdapter,
  KnowledgeProviderQuery,
  KnowledgeProviderQueryResult,
  KnowledgeProviderSymbolNode,
  KnowledgeProviderEdge,
} from "@intentloom/protocol";

export type GraphifyExecRunner = (
  command: string,
  args: string[],
) => Promise<{ stdout: string; stderr?: string; exitCode: number }>;

export interface GraphifyAdapterOptions {
  executablePath?: string;
  execRunner?: GraphifyExecRunner | undefined;
  version?: string;
}

export class GraphifyKnowledgeAdapter implements KnowledgeProviderAdapter {
  readonly id = "ext:org/graphify-provider";
  readonly name = "Graphify Code-Graph Provider";
  readonly capabilities = { read: ["./"] };

  private readonly executablePath: string;
  private readonly execRunner?: GraphifyExecRunner | undefined;
  private readonly version: string;

  constructor(options: GraphifyAdapterOptions = {}) {
    this.executablePath = options.executablePath ?? "graphify";
    this.execRunner = options.execRunner;
    this.version = options.version ?? "1.2.0";
  }

  async query(
    query: KnowledgeProviderQuery,
  ): Promise<KnowledgeProviderQueryResult> {
    if (!this.execRunner) {
      return {
        status: "provider_unavailable",
        nodes: [],
        edges: [],
        provider: {
          id: this.id,
          name: this.name,
          version: this.version,
        },
        diagnostics: ["Graphify executable runner is not configured."],
      };
    }

    try {
      const args = [
        "query",
        "--kind",
        query.queryKind,
        "--path",
        query.targetPath,
      ];
      if (query.symbolName) {
        args.push("--symbol", query.symbolName);
      }
      if (query.depth !== undefined) {
        args.push("--depth", String(query.depth));
      }

      const res = await this.execRunner(this.executablePath, args);
      if (res.exitCode !== 0) {
        return {
          status: "query_failed",
          nodes: [],
          edges: [],
          provider: { id: this.id, name: this.name, version: this.version },
          diagnostics: [
            res.stderr || `Graphify process exited with code ${res.exitCode}`,
          ],
        };
      }

      const parsed = JSON.parse(res.stdout);
      return this.normalizeGraphifyPayload(parsed);
    } catch (error) {
      return {
        status: "query_failed",
        nodes: [],
        edges: [],
        provider: { id: this.id, name: this.name, version: this.version },
        diagnostics: [error instanceof Error ? error.message : String(error)],
      };
    }
  }

  private normalizeGraphifyPayload(
    payload: unknown,
  ): KnowledgeProviderQueryResult {
    if (typeof payload !== "object" || payload === null) {
      throw new Error("Graphify payload must be a non-null object");
    }
    const r = payload as Record<string, unknown>;

    const nodes: KnowledgeProviderSymbolNode[] = Array.isArray(r.nodes)
      ? r.nodes.map((n: Record<string, unknown>, idx: number) => {
          const node: KnowledgeProviderSymbolNode = {
            id: typeof n.id === "string" ? n.id : `node-${idx}`,
            name: typeof n.name === "string" ? n.name : "unnamed",
            kind:
              typeof n.kind === "string"
                ? n.kind
                : typeof n.type === "string"
                  ? n.type
                  : "symbol",
            location: {
              path:
                typeof n.path === "string"
                  ? n.path
                  : typeof n.file === "string"
                    ? n.file
                    : "./",
              startLine: typeof n.startLine === "number" ? n.startLine : 1,
              startColumn:
                typeof n.startColumn === "number" ? n.startColumn : 1,
              endLine: typeof n.endLine === "number" ? n.endLine : 1,
              endColumn: typeof n.endColumn === "number" ? n.endColumn : 1,
            },
          };
          if (typeof n.documentation === "string") {
            node.documentation = n.documentation;
          }
          return node;
        })
      : [];

    const edges: KnowledgeProviderEdge[] = Array.isArray(r.edges)
      ? r.edges.map((e: Record<string, unknown>, idx: number) => ({
          sourceId:
            typeof e.sourceId === "string"
              ? e.sourceId
              : typeof e.source === "string"
                ? e.source
                : `node-${idx}`,
          targetId:
            typeof e.targetId === "string"
              ? e.targetId
              : typeof e.target === "string"
                ? e.target
                : `node-${idx + 1}`,
          relation: normalizeRelation(e.relation ?? e.type),
        }))
      : [];

    return {
      status: "success",
      nodes,
      edges,
      provider: {
        id: this.id,
        name: this.name,
        version: this.version,
      },
    };
  }
}

function normalizeRelation(rel: unknown): KnowledgeProviderEdge["relation"] {
  if (typeof rel === "string") {
    const s = rel.toLowerCase();
    if (
      s === "calls" ||
      s === "implements" ||
      s === "extends" ||
      s === "imports" ||
      s === "uses"
    ) {
      return s;
    }
  }
  return "uses";
}
