import type { FileSystem } from "./index.js";
import { nodeFileSystem } from "./index.js";
import type { QualityCliResult } from "./engineering-quality/cli-quality-standards.js";
import {
  listBoundedExecutionOperations,
  prepareBoundedExecutionWorkspace,
} from "./bounded-execution-workspace.js";
import {
  buildBoundedExecutionWorkspaceViewModel,
  renderBoundedExecutionWorkspaceText,
} from "./bounded-execution-workspace-viewmodel.js";

export type BoundedExecutionWorkspaceCliCommand =
  "prepare" | "execute" | "operations";

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

export async function runBoundedExecutionWorkspaceCliCommand(
  command: BoundedExecutionWorkspaceCliCommand,
  args: {
    readonly json?: boolean;
    readonly root?: string;
    readonly title?: string;
    readonly summary?: string;
    readonly projectId?: string;
    readonly planApproval?: string;
    readonly requestedNetworkAccess?: boolean;
    readonly requestedProcessExecution?: boolean;
    readonly requestedAllowedCommands?: readonly string[];
    readonly requestedAllowedPaths?: readonly string[];
    readonly requestedRoot?: string;
    readonly proposedPaths?: readonly string[];
    readonly applyRequested?: boolean;
    readonly grantedApprovals?: readonly string[];
    readonly fs?: FileSystem;
  },
): Promise<QualityCliResult> {
  const json = args.json ?? false;
  if (command === "operations") {
    return jsonResult(
      { operations: listBoundedExecutionOperations() },
      json,
      `Operations: ${listBoundedExecutionOperations().join(", ")}`,
    );
  }
  if (!args.root) {
    return errorResult(`Error: root is required for ${command}`);
  }
  if (!args.title || !args.summary) {
    return errorResult(`Error: title and summary are required for ${command}`);
  }
  try {
    const overview = await prepareBoundedExecutionWorkspace(
      {
        root: args.root,
        title: args.title,
        summary: args.summary,
        ...(command === "execute" && args.applyRequested === true
          ? { applyRequested: true }
          : { applyRequested: false }),
        ...(args.projectId !== undefined ? { projectId: args.projectId } : {}),
        ...(args.planApproval !== undefined
          ? { planApproval: args.planApproval }
          : {}),
        ...(args.requestedNetworkAccess !== undefined
          ? { requestedNetworkAccess: args.requestedNetworkAccess }
          : {}),
        ...(args.requestedProcessExecution !== undefined
          ? { requestedProcessExecution: args.requestedProcessExecution }
          : {}),
        ...(args.requestedAllowedCommands !== undefined
          ? { requestedAllowedCommands: args.requestedAllowedCommands }
          : {}),
        ...(args.requestedAllowedPaths !== undefined
          ? { requestedAllowedPaths: args.requestedAllowedPaths }
          : {}),
        ...(args.requestedRoot !== undefined
          ? { requestedRoot: args.requestedRoot }
          : {}),
        ...(args.proposedPaths !== undefined
          ? { proposedPaths: args.proposedPaths }
          : {}),
        ...(args.grantedApprovals !== undefined
          ? { grantedApprovals: args.grantedApprovals }
          : {}),
      },
      args.fs ?? nodeFileSystem,
    );
    const viewmodel = buildBoundedExecutionWorkspaceViewModel(
      overview,
      "ready",
    );
    return jsonResult(
      viewmodel,
      json,
      renderBoundedExecutionWorkspaceText(viewmodel),
    );
  } catch (error: unknown) {
    return errorResult(error instanceof Error ? error.message : String(error));
  }
}
