import { readFile } from "node:fs/promises";
import { isAbsolute, relative, resolve } from "node:path";
import {
  analyzeReleaseEvidence,
  type ReleaseAnalysisReport,
} from "@intentloom/evidence-analysis";
import {
  collectGitEvidence,
  createReleaseTimeline,
} from "@intentloom/evidence-git";
import {
  importProviderExport,
  type ProviderName,
} from "@intentloom/evidence-provider";

export const MCP_PROTOCOL_VERSION = "2024-11-05" as const;
export const RELEASE_ANALYSIS_TOOL = "intentloom_release_analysis" as const;

export interface McpRequest {
  readonly jsonrpc: "2.0";
  readonly id?: string | number;
  readonly method: string;
  readonly params?: Record<string, unknown>;
}

export interface McpResponse {
  readonly jsonrpc: "2.0";
  readonly id: string | number | null;
  readonly result?: Record<string, unknown>;
  readonly error?: { readonly code: number; readonly message: string };
}

export interface McpServerOptions {
  readonly root: string;
  readonly readFile?: (path: string) => Promise<string>;
}

const tool = {
  name: RELEASE_ANALYSIS_TOOL,
  description:
    "Analyze a local Git release timeline against one explicit GitHub or GitLab export.",
  inputSchema: {
    type: "object",
    additionalProperties: false,
    required: ["provider", "file", "projectKey"],
    properties: {
      provider: { type: "string", enum: ["github", "gitlab"] },
      file: {
        type: "string",
        description: "Project-relative JSON export path.",
      },
      projectKey: { type: "string" },
      caseId: { type: "string" },
    },
  },
} as const;

function error(
  id: string | number | null,
  code: number,
  message: string,
): McpResponse {
  return { jsonrpc: "2.0", id, error: { code, message } };
}

function boundedPath(root: string, value: unknown): string {
  if (typeof value !== "string" || value.length === 0)
    throw new Error("file must be a non-empty string");
  const candidate = resolve(root, value);
  const relativePath = relative(resolve(root), candidate);
  if (
    relativePath === "" ||
    relativePath === ".." ||
    relativePath.startsWith("../") ||
    (isAbsolute(relativePath) && relativePath !== candidate)
  )
    throw new Error("file must remain within the project root");
  return candidate;
}

async function releaseAnalysis(
  args: Record<string, unknown>,
  options: McpServerOptions,
): Promise<ReleaseAnalysisReport> {
  const provider = args.provider;
  const projectKey = args.projectKey;
  if (provider !== "github" && provider !== "gitlab")
    throw new Error("provider must be github or gitlab");
  if (typeof projectKey !== "string" || projectKey.length === 0)
    throw new Error("projectKey must be a non-empty string");
  const filePath = boundedPath(options.root, args.file);
  let payload: unknown;
  try {
    payload = JSON.parse(
      await (options.readFile ?? ((path) => readFile(path, "utf8")))(filePath),
    );
  } catch {
    payload = undefined;
  }
  const providerEvidence = importProviderExport({
    provider: provider as ProviderName,
    projectKey,
    payload,
  });
  const timeline = createReleaseTimeline(
    typeof args.caseId === "string" && args.caseId.length > 0
      ? args.caseId
      : "release",
    await collectGitEvidence({ root: options.root }),
  );
  return analyzeReleaseEvidence(
    {
      caseId: timeline.caseId,
      quality: timeline.quality,
      events: timeline.events.map(({ commitId, timestamp }) => ({
        commitId,
        timestamp,
      })),
    },
    {
      provider: providerEvidence.provider,
      projectKey: providerEvidence.projectKey,
      status: providerEvidence.status,
      events: providerEvidence.events.map(
        ({ eventType, sourceId, commitIds }) => ({
          eventType,
          sourceId,
          ...(commitIds ? { commitIds } : {}),
        }),
      ),
    },
    projectKey,
  );
}

export async function handleMcpRequest(
  request: McpRequest,
  options: McpServerOptions,
): Promise<McpResponse | null> {
  const id = request.id ?? null;
  if (request.method === "notifications/initialized") return null;
  if (request.method === "initialize")
    return {
      jsonrpc: "2.0",
      id,
      result: {
        protocolVersion: MCP_PROTOCOL_VERSION,
        capabilities: { tools: {} },
        serverInfo: { name: "intentloom", version: "0.1.0-beta.1" },
      },
    };
  if (request.method === "tools/list")
    return { jsonrpc: "2.0", id, result: { tools: [tool] } };
  if (request.method !== "tools/call")
    return error(id, -32601, "method not found");
  const params = request.params;
  if (!params || params.name !== RELEASE_ANALYSIS_TOOL)
    return error(id, -32602, "unsupported tool");
  try {
    const report = await releaseAnalysis(
      (params.arguments ?? {}) as Record<string, unknown>,
      options,
    );
    return {
      jsonrpc: "2.0",
      id,
      result: {
        content: [{ type: "text", text: JSON.stringify(report) }],
        structuredContent: report,
      },
    };
  } catch (cause) {
    return {
      jsonrpc: "2.0",
      id,
      result: {
        isError: true,
        content: [
          {
            type: "text",
            text: cause instanceof Error ? cause.message : "tool failed",
          },
        ],
      },
    };
  }
}

export function encodeMcpFrame(response: McpResponse): string {
  const body = JSON.stringify(response);
  return `Content-Length: ${Buffer.byteLength(body, "utf8")}\r\n\r\n${body}`;
}
