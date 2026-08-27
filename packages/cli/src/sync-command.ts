import { cwd } from "node:process";
import {
  nodeFileSystem,
  syncProject,
  type FileSystem,
  type TransactionOptions,
} from "@intentloom/application";
import {
  createCliArtifactValidator,
  formatValidationFailure,
} from "./cli-project-metadata.js";
import {
  formatHumanOutcome,
  formatJsonOutcome,
  mapDryRunToCliOutcome,
  mapTransactionResultToCliOutcome,
} from "./mutation-outcome.js";
import { parseSyncArguments } from "./sync-parse.js";
import {
  buildProjectMutationOptions,
  loadInvalidProjectMetadata,
  metadataBlocksMutationCommand,
} from "./project-command-context.js";

export type SyncCliExitCode = 0 | 2 | 3 | 4 | 5;

export interface SyncCliIo {
  readonly stdout: (message: string) => void;
  readonly stderr: (message: string) => void;
}

export interface SyncCliDependencies {
  readonly catalogRoot: string;
  readonly fileSystem?: FileSystem;
  readonly transactionOptions?: TransactionOptions;
}

export async function runSyncCommand(
  args: readonly string[],
  dependencies: SyncCliDependencies,
  io: SyncCliIo,
): Promise<SyncCliExitCode> {
  const parsed = parseSyncArguments(args);
  const fileSystem = dependencies.fileSystem ?? nodeFileSystem;
  const root = parsed.values.get("--root") ?? cwd();
  const validator = await createCliArtifactValidator(dependencies.catalogRoot);
  const invalidMetadata = await loadInvalidProjectMetadata(
    "sync",
    root,
    fileSystem,
    validator,
  );
  if (metadataBlocksMutationCommand("sync", invalidMetadata)) {
    const output = formatValidationFailure(
      invalidMetadata,
      parsed.flags.has("--json"),
    );
    io.stderr(output);
    return 3;
  }
  const options = await buildProjectMutationOptions({
    command: "sync",
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
  const result = await syncProject(
    { ...options, force: parsed.flags.has("--force") },
    fileSystem,
    dependencies.transactionOptions,
  );
  const outcome =
    "dryRun" in result
      ? mapDryRunToCliOutcome(result)
      : mapTransactionResultToCliOutcome(result);
  io.stdout(
    parsed.flags.has("--json")
      ? formatJsonOutcome(outcome)
      : formatHumanOutcome(outcome),
  );
  return outcome.exitCode;
}
