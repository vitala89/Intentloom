import { cwd } from "node:process";
import {
  initProject,
  nodeFileSystem,
  type FileSystem,
} from "@intentloom/application";
import {
  createCliArtifactValidator,
  formatValidationFailure,
} from "./cli-project-metadata.js";
import { formatPlan } from "./formatters.js";
import { conflicts } from "./mutation-outcome.js";
import { parseInitArguments } from "./init-parse.js";
import {
  buildProjectMutationOptions,
  loadInvalidProjectMetadata,
  metadataBlocksMutationCommand,
} from "./project-command-context.js";

export type InitCliExitCode = 0 | 2 | 3;

export interface InitCliIo {
  readonly stdout: (message: string) => void;
  readonly stderr: (message: string) => void;
}

export interface InitCliDependencies {
  readonly catalogRoot: string;
  readonly fileSystem?: FileSystem;
}

export async function runInitCommand(
  args: readonly string[],
  dependencies: InitCliDependencies,
  io: InitCliIo,
): Promise<InitCliExitCode> {
  const parsed = parseInitArguments(args);
  const fileSystem = dependencies.fileSystem ?? nodeFileSystem;
  const root = parsed.values.get("--root") ?? cwd();
  const validator = await createCliArtifactValidator(dependencies.catalogRoot);
  const invalidMetadata = await loadInvalidProjectMetadata(
    "init",
    root,
    fileSystem,
    validator,
  );
  if (metadataBlocksMutationCommand("init", invalidMetadata)) {
    const output = formatValidationFailure(
      invalidMetadata,
      parsed.flags.has("--json"),
    );
    io.stderr(output);
    return 3;
  }
  const options = await buildProjectMutationOptions({
    command: "init",
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
  const result = await initProject(options, fileSystem);
  io.stdout(
    parsed.flags.has("--json")
      ? JSON.stringify(result, null, 2)
      : formatPlan(result),
  );
  return conflicts(result).length === 0 ? 0 : 3;
}
