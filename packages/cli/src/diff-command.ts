import { cwd } from "node:process";
import {
  diffProject,
  nodeFileSystem,
  type FileSystem,
} from "@intentloom/application";
import {
  createCliArtifactValidator,
  formatValidationFailure,
} from "./cli-project-metadata.js";
import { formatPlan } from "./formatters.js";
import { conflicts } from "./mutation-outcome.js";
import { parseDiffArguments } from "./diff-parse.js";
import {
  buildProjectMutationOptions,
  loadInvalidProjectMetadata,
  metadataBlocksMutationCommand,
} from "./project-command-context.js";

export type DiffCliExitCode = 0 | 2 | 3;

export interface DiffCliIo {
  readonly stdout: (message: string) => void;
  readonly stderr: (message: string) => void;
}

export interface DiffCliDependencies {
  readonly catalogRoot: string;
  readonly fileSystem?: FileSystem;
}

export async function runDiffCommand(
  args: readonly string[],
  dependencies: DiffCliDependencies,
  io: DiffCliIo,
): Promise<DiffCliExitCode> {
  const parsed = parseDiffArguments(args);
  const fileSystem = dependencies.fileSystem ?? nodeFileSystem;
  const root = parsed.values.get("--root") ?? cwd();
  const validator = await createCliArtifactValidator(dependencies.catalogRoot);
  const invalidMetadata = await loadInvalidProjectMetadata(
    "diff",
    root,
    fileSystem,
    validator,
  );
  if (metadataBlocksMutationCommand("diff", invalidMetadata)) {
    const output = formatValidationFailure(
      invalidMetadata,
      parsed.flags.has("--json"),
    );
    io.stderr(output);
    return 3;
  }
  const options = await buildProjectMutationOptions({
    command: "diff",
    root,
    fileSystem,
    validator,
    catalogRoot: dependencies.catalogRoot,
    dryRun: parsed.flags.has("--dry-run"),
    invalidMetadata,
    profileFlag: parsed.values.get("--profile"),
    profileFlagProvided: parsed.values.has("--profile"),
    adaptersFlag: parsed.values.get("--adapters"),
    mappingValues: parsed.mappingValues,
  });
  const result = await diffProject(options, fileSystem);
  io.stdout(
    parsed.flags.has("--json")
      ? JSON.stringify(result, null, 2)
      : formatPlan(result),
  );
  return conflicts(result).length === 0 ? 0 : 3;
}
