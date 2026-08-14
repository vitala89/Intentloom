import type { FileSystem } from "./index.js";
import { nodeFileSystem } from "./index.js";
import type { QualityCliResult } from "./engineering-quality/cli-quality-standards.js";
import type {
  ContinuousLoopChangeKind,
  ContinuousLoopSnapshot,
} from "@intentloom/protocol";
import {
  listContinuousLoopOperations,
  prepareContinuousLoopWorkspace,
} from "./continuous-loop-workspace.js";
import {
  buildContinuousLoopWorkspaceViewModel,
  renderContinuousLoopWorkspaceText,
} from "./continuous-loop-workspace-viewmodel.js";

export type ContinuousLoopWorkspaceCliCommand =
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

export async function runContinuousLoopWorkspaceCliCommand(
  command: ContinuousLoopWorkspaceCliCommand,
  args: {
    readonly json?: boolean;
    readonly root?: string;
    readonly previous?: ContinuousLoopSnapshot;
    readonly current?: ContinuousLoopSnapshot;
    readonly projectId?: string;
    readonly changeKind?: ContinuousLoopChangeKind;
    readonly memoryContent?: string;
    readonly applyRequested?: boolean;
    readonly grantedApprovals?: readonly string[];
    readonly fs?: FileSystem;
  },
): Promise<QualityCliResult> {
  const json = args.json ?? false;
  if (command === "operations") {
    return jsonResult(
      { operations: listContinuousLoopOperations() },
      json,
      `Operations: ${listContinuousLoopOperations().join(", ")}`,
    );
  }
  if (!args.root) {
    return errorResult(`Error: root is required for ${command}`);
  }
  if (!args.previous || !args.current) {
    return errorResult(
      `Error: previous and current snapshots are required for ${command}`,
    );
  }
  try {
    const overview = await prepareContinuousLoopWorkspace(
      {
        root: args.root,
        previous: args.previous,
        current: args.current,
        applyRequested: command === "execute" && args.applyRequested === true,
        ...(args.projectId !== undefined ? { projectId: args.projectId } : {}),
        ...(args.changeKind !== undefined
          ? { changeKind: args.changeKind }
          : {}),
        ...(args.memoryContent !== undefined
          ? { memoryContent: args.memoryContent }
          : {}),
        ...(args.grantedApprovals !== undefined
          ? { grantedApprovals: args.grantedApprovals }
          : {}),
      },
      args.fs ?? nodeFileSystem,
    );
    const viewmodel = buildContinuousLoopWorkspaceViewModel(overview, "ready");
    return jsonResult(
      viewmodel,
      json,
      renderContinuousLoopWorkspaceText(viewmodel),
    );
  } catch (error: unknown) {
    return errorResult(error instanceof Error ? error.message : String(error));
  }
}
