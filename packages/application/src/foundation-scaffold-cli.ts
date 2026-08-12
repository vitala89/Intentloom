import type { QualityCliResult } from "./engineering-quality/cli-quality-standards.js";
import {
  compareProjectScaffoldPlan,
  getProjectScaffoldPlan,
  prepareProjectScaffold,
  validateProjectScaffoldPlan,
} from "./foundation-scaffold.js";
import {
  applyFoundationProjectScaffold,
  rollbackFoundationProjectScaffold,
} from "./foundation-scaffold-apply.js";

export type FoundationScaffoldCliCommand =
  | "scaffold-prepare"
  | "scaffold-get"
  | "scaffold-compare"
  | "scaffold-validate"
  | "scaffold-apply"
  | "scaffold-rollback";

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

export async function runFoundationScaffoldCliCommand(
  command: FoundationScaffoldCliCommand,
  args: {
    readonly json?: boolean;
    readonly workshopId?: string;
    readonly root?: string;
    readonly planId?: string;
    readonly existingPaths?: readonly string[];
    readonly grantedCapabilities?: readonly string[];
  },
): Promise<QualityCliResult> {
  const json = args.json ?? false;
  try {
    if (!args.workshopId) {
      return errorResult("Error: workshopId is required");
    }
    if (command === "scaffold-prepare") {
      return jsonResult(
        prepareProjectScaffold(args.workshopId, args.root),
        json,
        `Scaffold plan prepared for ${args.workshopId}`,
      );
    }
    if (!args.planId) {
      return errorResult(`Error: planId is required for ${command}`);
    }
    if (command === "scaffold-get") {
      return jsonResult(
        getProjectScaffoldPlan(args.workshopId, args.planId),
        json,
        `Scaffold plan ${args.planId} for ${args.workshopId}`,
      );
    }
    if (command === "scaffold-compare") {
      return jsonResult(
        compareProjectScaffoldPlan(
          args.workshopId,
          args.planId,
          args.existingPaths ?? [],
        ),
        json,
        `Scaffold compare for ${args.planId}`,
      );
    }
    if (command === "scaffold-validate") {
      return jsonResult(
        validateProjectScaffoldPlan(args.workshopId, args.planId),
        json,
        `Scaffold plan ${args.planId} validated`,
      );
    }
    if (command === "scaffold-apply") {
      return jsonResult(
        applyFoundationProjectScaffold(args.workshopId, args.planId, {
          ...(args.existingPaths !== undefined
            ? { existingPaths: args.existingPaths }
            : {}),
          grantedCapabilities: args.grantedCapabilities ?? [
            "filesystem.write",
            "scaffold.apply",
          ],
        }),
        json,
        `Scaffold plan ${args.planId} applied`,
      );
    }
    return jsonResult(
      rollbackFoundationProjectScaffold(args.workshopId, args.planId),
      json,
      `Scaffold plan ${args.planId} rolled back`,
    );
  } catch (error: unknown) {
    return errorResult(error instanceof Error ? error.message : String(error));
  }
}
