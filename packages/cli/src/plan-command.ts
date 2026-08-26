import { planFeature } from "@intentloom/application";
import { createCliArtifactValidator } from "./cli-project-metadata.js";
import { parsePlanArguments } from "./plan-parse.js";

export type PlanCliExitCode = 0 | 2 | 3;

export interface PlanCliIo {
  readonly stdout: (message: string) => void;
  readonly stderr: (message: string) => void;
}

export interface PlanCliDependencies {
  readonly catalogRoot: string;
}

export async function runPlanCommand(
  args: readonly string[],
  dependencies: PlanCliDependencies,
  io: PlanCliIo,
): Promise<PlanCliExitCode> {
  const parsed = parsePlanArguments(args);
  const validator = await createCliArtifactValidator(dependencies.catalogRoot);
  const result = await planFeature(
    parsed.values.get("--task") ?? "",
    validator,
  );
  io.stdout(
    parsed.flags.has("--json") ? JSON.stringify(result, null, 2) : result,
  );
  return 0;
}
