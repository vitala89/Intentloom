import { readFile } from "node:fs/promises";
import {
  doctorProject,
  inspectProject,
  nodeFileSystem,
  type DoctorPlan,
  type ProjectInspection,
} from "@intentloom/application";
import {
  analyzeReleaseEvidence,
  evaluateEngineeringConformance,
  type EngineeringConformanceReport,
  type EngineeringWorkflowCaseType,
  type EngineeringWorkflowPolicy,
  type GenericTimeline,
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
import { INTENTLOOM_VERSION } from "@intentloom/application";
import {
  assertNonSymlinkRoot,
  boundedPath,
  McpToolError,
  toolArguments,
  type McpServerOptions,
} from "./common.js";
import {
  HARNESS_INSPECT_TOOL,
  HARNESS_REPLAY_TOOL,
  harnessInspect,
  harnessInspectTool,
  harnessReplay,
  harnessReplayTool,
} from "./harness-tools.js";

export {
  McpToolError,
  type McpServerOptions,
  type McpToolErrorCode,
} from "./common.js";
export { HARNESS_INSPECT_TOOL, HARNESS_REPLAY_TOOL } from "./harness-tools.js";

export const MCP_PROTOCOL_VERSION = "2024-11-05" as const;
export const RELEASE_ANALYSIS_TOOL = "intentloom_release_analysis" as const;
export const PROJECT_INSPECT_TOOL = "intentloom_project_inspect" as const;
export const PROJECT_DOCTOR_TOOL = "intentloom_project_doctor" as const;
export const ENGINEERING_CONFORMANCE_TOOL =
  "intentloom_engineering_conformance" as const;
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

const defaultEngineeringPolicy: EngineeringWorkflowPolicy = {
  schemaVersion: "1",
  policyId: "policy:default-engineering-conformance",
  description: "Default Intentloom engineering workflow policy",
  rules: [
    {
      ruleId: "rule:require-commit-evidence",
      caseType: "pull-request",
      severity: "error",
      title: "Commit Evidence Presence",
      condition: {
        type: "required-activity",
        activity: "commit",
      },
      remediation: {
        summary: "Pull request workflow timeline must contain commit evidence.",
        actionableSteps: [
          "Ensure local Git history contains commits on the topic branch.",
        ],
      },
    },
    {
      ruleId: "rule:require-release-evidence",
      caseType: "release",
      severity: "error",
      title: "Release Evidence Presence",
      condition: {
        type: "required-activity",
        activity: "commit",
      },
      remediation: {
        summary: "Release workflow timeline must contain commit evidence.",
        actionableSteps: [
          "Ensure Git tags and release commits exist in the repository.",
        ],
      },
    },
  ],
};

const engineeringConformanceTool = {
  name: ENGINEERING_CONFORMANCE_TOOL,
  description:
    "Evaluate engineering workflow policy conformance against repository timeline events.",
  inputSchema: {
    $id: "urn:intentloom:mcp:engineering-conformance:input:1",
    type: "object",
    additionalProperties: false,
    properties: {
      policyFile: {
        type: "string",
        description: "Project-relative JSON workflow policy path.",
      },
      timelineFile: {
        type: "string",
        description: "Project-relative JSON timeline events path.",
      },
      caseId: { type: "string" },
      caseType: { type: "string", enum: ["pull-request", "release"] },
    },
  },
  outputSchema: {
    $id: "urn:intentloom:mcp:engineering-conformance:output:1",
    type: "object",
    required: [
      "operationVersion",
      "policyId",
      "evaluatedAt",
      "caseType",
      "caseId",
      "summary",
      "findings",
    ],
  },
  annotations: {
    "x-intentloom-limits": {
      configuredRoot: 1,
      policyFileLength: 512,
      timelineFileLength: 512,
    },
  },
} as const;

const tools = [
  releaseAnalysisTool,
  projectInspectTool,
  projectDoctorTool,
  engineeringConformanceTool,
  harnessInspectTool,
  harnessReplayTool,
] as const;

type McpToolName =
  | typeof RELEASE_ANALYSIS_TOOL
  | typeof PROJECT_INSPECT_TOOL
  | typeof PROJECT_DOCTOR_TOOL
  | typeof ENGINEERING_CONFORMANCE_TOOL
  | typeof HARNESS_INSPECT_TOOL
  | typeof HARNESS_REPLAY_TOOL;

const profiles = [
  "generic",
  "typescript",
  "angular",
  "rust",
  "tauri",
  "angular-tauri",
] as const;
const adapters = ["claude", "codex", "cursor", "copilot"] as const;

type McpProfile = (typeof profiles)[number];
type McpAdapter = (typeof adapters)[number];

function error(
  id: string | number | null,
  code: number,
  message: string,
): McpResponse {
  return { jsonrpc: "2.0", id, error: { code, message } };
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

async function engineeringConformance(
  args: Record<string, unknown>,
  options: McpServerOptions,
): Promise<EngineeringConformanceReport> {
  await assertNonSymlinkRoot(options);
  const caseId =
    typeof args.caseId === "string" && args.caseId.length > 0
      ? args.caseId
      : "current";
  const caseType =
    typeof args.caseType === "string" &&
    (args.caseType === "pull-request" || args.caseType === "release")
      ? (args.caseType as EngineeringWorkflowCaseType)
      : "pull-request";

  let policy: EngineeringWorkflowPolicy;
  if (typeof args.policyFile === "string" && args.policyFile.length > 0) {
    const policyPath = boundedPath(options.root, args.policyFile);
    const content = await (
      options.readFile ?? ((path) => readFile(path, "utf8"))
    )(policyPath);
    policy = JSON.parse(content);
  } else {
    policy = defaultEngineeringPolicy;
  }

  let timeline: GenericTimeline;
  if (typeof args.timelineFile === "string" && args.timelineFile.length > 0) {
    const timelinePath = boundedPath(options.root, args.timelineFile);
    const content = await (
      options.readFile ?? ((path) => readFile(path, "utf8"))
    )(timelinePath);
    timeline = JSON.parse(content);
  } else {
    const rawGit = await collectGitEvidence({ root: options.root });
    timeline = {
      caseType,
      caseId,
      events: rawGit.commits.map((c) => ({
        activity: "commit",
        source: "git",
        sourceId: c.id,
        timestamp: new Date(c.timestamp * 1000).toISOString(),
        commitIds: [c.id],
      })),
    };
  }

  return evaluateEngineeringConformance(timeline, policy);
}

function isMcpToolName(value: unknown): value is McpToolName {
  return (
    value === RELEASE_ANALYSIS_TOOL ||
    value === PROJECT_INSPECT_TOOL ||
    value === PROJECT_DOCTOR_TOOL ||
    value === ENGINEERING_CONFORMANCE_TOOL ||
    value === HARNESS_INSPECT_TOOL ||
    value === HARNESS_REPLAY_TOOL
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
        serverInfo: { name: "intentloom", version: INTENTLOOM_VERSION },
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
          : params.name === PROJECT_DOCTOR_TOOL
            ? await projectDoctor(args, options)
            : params.name === ENGINEERING_CONFORMANCE_TOOL
              ? await engineeringConformance(args, options)
              : params.name === HARNESS_INSPECT_TOOL
                ? await harnessInspect(args, options)
                : await harnessReplay(args, options);
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
