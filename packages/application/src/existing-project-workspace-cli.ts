import type { ExistingProjectScanScope } from "@intentloom/protocol";
import type { FileSystem } from "./index.js";
import { nodeFileSystem } from "./index.js";
import type { QualityCliResult } from "./engineering-quality/cli-quality-standards.js";
import {
  listExistingProjectScanScopes,
  prepareExistingProjectWorkspace,
} from "./existing-project-workspace.js";
import {
  buildExistingProjectWorkspaceViewModel,
  renderExistingProjectWorkspaceText,
} from "./existing-project-workspace-viewmodel.js";

export type ExistingProjectWorkspaceCliCommand = "prepare" | "scopes";

function jsonResult(
  payload: unknown,
  json: boolean,
  human: string,
): QualityCliResult {
  return {
    exitCode: 0,
    stdout: json ? JSON.stringify(payload, null, 2) : human,
    stderr: "",
  };
}

function errorResult(message: string): QualityCliResult {
  return { exitCode: 1, stdout: "", stderr: message };
}

function parseScope(value: string | undefined): ExistingProjectScanScope {
  if (value === undefined) return "standard";
  if (value === "quick" || value === "standard" || value === "deep") {
    return value;
  }
  throw new Error("scope must be quick, standard, or deep");
}

export async function runExistingProjectWorkspaceCliCommand(
  command: ExistingProjectWorkspaceCliCommand,
  args: {
    readonly json?: boolean;
    readonly root?: string;
    readonly projectId?: string;
    readonly scope?: string;
    readonly fs?: FileSystem;
  },
): Promise<QualityCliResult> {
  const json = args.json ?? false;
  if (command === "scopes") {
    return jsonResult(
      { scopes: listExistingProjectScanScopes() },
      json,
      `Scan scopes: ${listExistingProjectScanScopes().join(", ")}`,
    );
  }
  if (!args.root) {
    return errorResult("Error: root is required for prepare");
  }
  try {
    const overview = await prepareExistingProjectWorkspace(
      {
        root: args.root,
        ...(args.projectId !== undefined ? { projectId: args.projectId } : {}),
        scope: parseScope(args.scope),
      },
      args.fs ?? nodeFileSystem,
    );
    const viewmodel = buildExistingProjectWorkspaceViewModel(overview, "ready");
    return jsonResult(
      viewmodel,
      json,
      renderExistingProjectWorkspaceText(viewmodel),
    );
  } catch (error: unknown) {
    return errorResult(error instanceof Error ? error.message : String(error));
  }
}
