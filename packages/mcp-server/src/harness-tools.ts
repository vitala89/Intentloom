import { readFile } from "node:fs/promises";
import {
  inspectHarnessScorecard,
  replayHarnessScorecard,
  type HarnessInspectionView,
  type HarnessReplayView,
  type HarnessScorecard,
} from "@intentloom/application";
import {
  assertNonSymlinkRoot,
  boundedPath,
  McpToolError,
  type McpServerOptions,
} from "./common.js";

export const HARNESS_INSPECT_TOOL = "intentloom_harness_inspect" as const;
export const HARNESS_REPLAY_TOOL = "intentloom_harness_replay" as const;

export const harnessInspectTool = {
  name: HARNESS_INSPECT_TOOL,
  description:
    "Inspect an Agentic Harness scorecard JSON file using canonical read-only application operations.",
  inputSchema: {
    $id: "urn:intentloom:mcp:harness-inspect:input:1",
    type: "object",
    additionalProperties: false,
    required: ["file"],
    properties: {
      file: {
        type: "string",
        description: "Project-relative JSON scorecard path.",
      },
    },
  },
  outputSchema: {
    $id: "urn:intentloom:mcp:harness-inspect:output:1",
    type: "object",
    required: [
      "schemaVersion",
      "viewType",
      "scenarioId",
      "requestId",
      "status",
      "readOnly",
    ],
  },
  annotations: {
    "x-intentloom-limits": { configuredRoot: 1, filePathLength: 512 },
  },
} as const;

export const harnessReplayTool = {
  name: HARNESS_REPLAY_TOOL,
  description:
    "Replay an Agentic Harness scorecard JSON file using canonical read-only event simulation.",
  inputSchema: {
    $id: "urn:intentloom:mcp:harness-replay:input:1",
    type: "object",
    additionalProperties: false,
    required: ["file"],
    properties: {
      file: {
        type: "string",
        description: "Project-relative JSON scorecard path.",
      },
      mode: {
        type: "string",
        enum: ["simulate", "strict"],
        description: "Replay mode (defaults to simulate).",
      },
    },
  },
  outputSchema: {
    $id: "urn:intentloom:mcp:harness-replay:output:1",
    type: "object",
    required: [
      "schemaVersion",
      "viewType",
      "scenarioId",
      "requestId",
      "mode",
      "readOnly",
    ],
  },
  annotations: {
    "x-intentloom-limits": { configuredRoot: 1, filePathLength: 512 },
  },
} as const;

export async function harnessInspect(
  args: Record<string, unknown>,
  options: McpServerOptions,
): Promise<HarnessInspectionView> {
  await assertNonSymlinkRoot(options);
  const filePath = boundedPath(options.root, args.file);
  let content: string;
  try {
    content = await (options.readFile ?? ((path) => readFile(path, "utf8")))(
      filePath,
    );
  } catch (cause) {
    throw new McpToolError(
      "arguments-invalid",
      `unable to read scorecard file: ${(cause as Error).message}`,
    );
  }
  let rawScorecard: unknown;
  try {
    rawScorecard = JSON.parse(content);
  } catch {
    throw new McpToolError(
      "arguments-invalid",
      "scorecard file must contain valid JSON",
    );
  }
  try {
    return inspectHarnessScorecard(rawScorecard as HarnessScorecard);
  } catch (cause) {
    throw new McpToolError(
      "arguments-invalid",
      `invalid harness scorecard: ${(cause as Error).message}`,
    );
  }
}

export async function harnessReplay(
  args: Record<string, unknown>,
  options: McpServerOptions,
): Promise<HarnessReplayView> {
  await assertNonSymlinkRoot(options);
  const filePath = boundedPath(options.root, args.file);
  const mode = args.mode === undefined ? "simulate" : args.mode;
  if (mode !== "simulate" && mode !== "strict") {
    throw new McpToolError(
      "arguments-invalid",
      "mode must be simulate or strict",
    );
  }
  let content: string;
  try {
    content = await (options.readFile ?? ((path) => readFile(path, "utf8")))(
      filePath,
    );
  } catch (cause) {
    throw new McpToolError(
      "arguments-invalid",
      `unable to read scorecard file: ${(cause as Error).message}`,
    );
  }
  let rawScorecard: unknown;
  try {
    rawScorecard = JSON.parse(content);
  } catch {
    throw new McpToolError(
      "arguments-invalid",
      "scorecard file must contain valid JSON",
    );
  }
  try {
    return replayHarnessScorecard(rawScorecard as HarnessScorecard, mode);
  } catch (cause) {
    throw new McpToolError(
      "arguments-invalid",
      `invalid harness scorecard: ${(cause as Error).message}`,
    );
  }
}
