import { readFile } from "node:fs/promises";
import { isAbsolute, relative, resolve } from "node:path";
import {
  doctorProject,
  inspectProject,
  nodeFileSystem,
  type DoctorPlan,
  type ProjectInspection,
} from "@intentloom/application";
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
export const PROJECT_INSPECT_TOOL = "intentloom_project_inspect" as const;
export const PROJECT_DOCTOR_TOOL = "intentloom_project_doctor" as const;
export const MCP_TOOL_ERROR_SCHEMA_VERSION = 1 as const;

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

const releaseAnalysisTool = {
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

const projectInspectTool = {
  name: PROJECT_INSPECT_TOOL,
  description:
    "Inspect the configured project root using bounded, read-only project evidence.",
  inputSchema: {
    $id: "urn:intentloom:mcp:project-inspect:input:1",
    type: "object",
    additionalProperties: false,
    properties: {},
  },
  outputSchema: {
    $id: "urn:intentloom:mcp:project-inspect:output:1",
    type: "object",
    required: ["operationVersion", "readOnly", "capabilities", "findings"],
  },
  annotations: { "x-intentloom-limits": { configuredRoot: 1, arguments: 0 } },
} as const;

const projectDoctorTool = {
  name: PROJECT_DOCTOR_TOOL,
  description:
    "Diagnose the configured project root using bounded, read-only Intentloom checks.",
  inputSchema: {
    $id: "urn:intentloom:mcp:project-doctor:input:1",
    type: "object",
    additionalProperties: false,
    required: ["profile", "adapters"],
    properties: {
      profile: {
        type: "string",
        enum: [
          "generic",
          "typescript",
          "angular",
          "rust",
          "tauri",
          "angular-tauri",
        ],
      },
      adapters: {
        type: "array",
        minItems: 1,
        maxItems: 4,
        uniqueItems: true,
        items: {
          type: "string",
          enum: ["claude", "codex", "cursor", "copilot"],
        },
      },
      projectOwnedMappings: { $ref: "#/$defs/mappings" },
      documentationMappings: { $ref: "#/$defs/mappings" },
    },
    $defs: {
      mappings: {
        type: "array",
        maxItems: 128,
        items: {
          type: "object",
          additionalProperties: false,
          required: ["source", "destination"],
          properties: {
            source: { type: "string", minLength: 1, maxLength: 512 },
            destination: { type: "string", minLength: 1, maxLength: 512 },
          },
        },
      },
    },
  },
  outputSchema: {
    $id: "urn:intentloom:mcp:project-doctor:output:1",
    type: "object",
    required: ["findings", "diagnostics", "errors"],
  },
  annotations: {
    "x-intentloom-limits": {
      configuredRoot: 1,
      adapters: 4,
      mappingsPerKind: 128,
      mappingPathLength: 512,
    },
  },
} as const;

const tools = [
  releaseAnalysisTool,
  projectInspectTool,
  projectDoctorTool,
] as const;

type McpToolName =
  | typeof RELEASE_ANALYSIS_TOOL
  | typeof PROJECT_INSPECT_TOOL
  | typeof PROJECT_DOCTOR_TOOL;

const profiles = [
  "generic",
  "typescript",
  "angular",
  "rust",
  "tauri",
  "angular-tauri",
] as const;
const adapters = ["claude", "codex", "cursor", "copilot"] as const;

type McpToolErrorCode = "arguments-invalid" | "root-symlink" | "tool-failed";
type McpProfile = (typeof profiles)[number];
type McpAdapter = (typeof adapters)[number];

class McpToolError extends Error {
  constructor(
    readonly code: McpToolErrorCode,
    message: string,
  ) {
    super(message);
  }
}

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

async function assertNonSymlinkRoot(options: McpServerOptions): Promise<void> {
  if (await nodeFileSystem.isSymbolicLink(resolve(options.root)))
    throw new McpToolError(
      "root-symlink",
      "configured project root must not be a symbolic link",
    );
}

function emptyArguments(args: Record<string, unknown>): void {
  if (Object.keys(args).length > 0)
    throw new McpToolError(
      "arguments-invalid",
      "this tool does not accept arguments",
    );
}

function isProfile(value: unknown): value is McpProfile {
  return typeof value === "string" && profiles.includes(value as McpProfile);
}

function areAdapters(value: unknown): value is McpAdapter[] {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.length <= 4 &&
    new Set(value).size === value.length &&
    value.every(
      (adapter) =>
        typeof adapter === "string" && adapters.includes(adapter as McpAdapter),
    )
  );
}

interface McpProjectMapping {
  readonly source: string;
  readonly destination: string;
}

function areMappings(value: unknown): value is McpProjectMapping[] {
  return Array.isArray(value) && value.length <= 128 && value.every(isMapping);
}

function isMapping(value: unknown): value is McpProjectMapping {
  if (value === null || typeof value !== "object") return false;
  const mapping = value as Record<string, unknown>;
  return (
    typeof mapping.source === "string" &&
    mapping.source.length > 0 &&
    mapping.source.length <= 512 &&
    typeof mapping.destination === "string" &&
    mapping.destination.length > 0 &&
    mapping.destination.length <= 512
  );
}

async function projectInspect(
  args: Record<string, unknown>,
  options: McpServerOptions,
): Promise<ProjectInspection> {
  emptyArguments(args);
  await assertNonSymlinkRoot(options);
  return inspectProject(options.root, nodeFileSystem);
}

async function projectDoctor(
  args: Record<string, unknown>,
  options: McpServerOptions,
): Promise<DoctorPlan> {
  await assertNonSymlinkRoot(options);
  if (
    !isProfile(args.profile) ||
    !areAdapters(args.adapters) ||
    (args.projectOwnedMappings !== undefined &&
      !areMappings(args.projectOwnedMappings)) ||
    (args.documentationMappings !== undefined &&
      !areMappings(args.documentationMappings))
  )
    throw new McpToolError(
      "arguments-invalid",
      "profile and adapters must match the declared tool schema",
    );
  return doctorProject(
    {
      root: options.root,
      profile: args.profile,
      adapters: args.adapters,
      dryRun: true,
      projectOwnedMappings: args.projectOwnedMappings ?? [],
      documentationMappings: args.documentationMappings ?? [],
    },
    nodeFileSystem,
  );
}

function toolArguments(value: unknown): Record<string, unknown> {
  if (value === undefined) return {};
  if (value === null || typeof value !== "object" || Array.isArray(value))
    throw new McpToolError("arguments-invalid", "arguments must be an object");
  return value as Record<string, unknown>;
}

function isMcpToolName(value: unknown): value is McpToolName {
  return (
    value === RELEASE_ANALYSIS_TOOL ||
    value === PROJECT_INSPECT_TOOL ||
    value === PROJECT_DOCTOR_TOOL
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
    return { jsonrpc: "2.0", id, result: { tools } };
  if (request.method !== "tools/call")
    return error(id, -32601, "method not found");
  const params = request.params;
  if (!params || !isMcpToolName(params.name))
    return error(id, -32602, "unsupported tool");
  try {
    const args = toolArguments(params.arguments);
    const report =
      params.name === RELEASE_ANALYSIS_TOOL
        ? await releaseAnalysis(args, options)
        : params.name === PROJECT_INSPECT_TOOL
          ? await projectInspect(args, options)
          : await projectDoctor(args, options);
    return {
      jsonrpc: "2.0",
      id,
      result: {
        content: [{ type: "text", text: JSON.stringify(report) }],
        structuredContent: report,
      },
    };
  } catch (cause) {
    const toolError =
      cause instanceof McpToolError
        ? cause
        : new McpToolError("tool-failed", "tool failed");
    return {
      jsonrpc: "2.0",
      id,
      result: {
        isError: true,
        content: [
          {
            type: "text",
            text: JSON.stringify({
              schemaVersion: MCP_TOOL_ERROR_SCHEMA_VERSION,
              code: toolError.code,
              message: toolError.message,
            }),
          },
        ],
        structuredContent: {
          schemaVersion: MCP_TOOL_ERROR_SCHEMA_VERSION,
          code: toolError.code,
          message: toolError.message,
        },
      },
    };
  }
}

export function encodeMcpFrame(response: McpResponse): string {
  const body = JSON.stringify(response);
  return `Content-Length: ${Buffer.byteLength(body, "utf8")}\r\n\r\n${body}`;
}
