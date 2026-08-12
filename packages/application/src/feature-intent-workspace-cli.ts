import type { FileSystem } from "./index.js";
import { nodeFileSystem } from "./index.js";
import type { QualityCliResult } from "./engineering-quality/cli-quality-standards.js";
import {
  listFeatureIntentOperations,
  prepareFeatureIntentWorkspace,
} from "./feature-intent-workspace.js";
import {
  buildFeatureIntentWorkspaceViewModel,
  renderFeatureIntentWorkspaceText,
} from "./feature-intent-workspace-viewmodel.js";

export type FeatureIntentWorkspaceCliCommand =
  "prepare" | "analyze" | "operations";

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

export async function runFeatureIntentWorkspaceCliCommand(
  command: FeatureIntentWorkspaceCliCommand,
  args: {
    readonly json?: boolean;
    readonly root?: string;
    readonly title?: string;
    readonly summary?: string;
    readonly projectId?: string;
    readonly fs?: FileSystem;
  },
): Promise<QualityCliResult> {
  const json = args.json ?? false;
  if (command === "operations") {
    return jsonResult(
      { operations: listFeatureIntentOperations() },
      json,
      `Operations: ${listFeatureIntentOperations().join(", ")}`,
    );
  }
  if (!args.root) {
    return errorResult(`Error: root is required for ${command}`);
  }
  if (!args.title || !args.summary) {
    return errorResult(`Error: title and summary are required for ${command}`);
  }
  try {
    const overview = await prepareFeatureIntentWorkspace(
      {
        root: args.root,
        title: args.title,
        summary: args.summary,
        ...(args.projectId !== undefined ? { projectId: args.projectId } : {}),
      },
      args.fs ?? nodeFileSystem,
    );
    const viewmodel = buildFeatureIntentWorkspaceViewModel(overview, "ready");
    if (command === "analyze") {
      const analyzePayload = {
        intentId: viewmodel.intentId,
        title: viewmodel.title,
        impactSummary: viewmodel.impactSummary,
        packages: viewmodel.packages,
        publicApiChangeRisk: viewmodel.publicApiChangeRisk,
        assessmentFindingsCount: viewmodel.assessmentFindingsCount,
        debtItemCount: viewmodel.debtItemCount,
        mutationAllowed: viewmodel.mutationAllowed,
      };
      return jsonResult(
        analyzePayload,
        json,
        `${viewmodel.impactSummary}\nMutation allowed: ${viewmodel.mutationAllowed}`,
      );
    }
    return jsonResult(
      viewmodel,
      json,
      renderFeatureIntentWorkspaceText(viewmodel),
    );
  } catch (error: unknown) {
    return errorResult(error instanceof Error ? error.message : String(error));
  }
}
