import { cwd } from "node:process";
import { nodeFileSystem, type FileSystem } from "@intentloom/application";
import { createCliArtifactValidator } from "./cli-project-metadata.js";
import { runSecurityFindingsCommand } from "./security-findings-command.js";
import { runSecurityOperationsCommand } from "./security-operations-command.js";
import { parseSecurityArguments } from "./security-parse.js";

export type SecurityCliExitCode = 0 | 2 | 3;

export interface SecurityCliIo {
  readonly stdout: (message: string) => void;
  readonly stderr: (message: string) => void;
}

export interface SecurityCliDependencies {
  readonly catalogRoot: string;
  readonly fileSystem?: FileSystem;
}

const findingsSubcommands = new Set([
  "import",
  "inspect",
  "coverage",
  "dismiss",
  "accept-risk",
  "list",
]);

export async function runSecurityCommand(
  args: readonly string[],
  dependencies: SecurityCliDependencies,
  io: SecurityCliIo,
): Promise<SecurityCliExitCode> {
  const parsed = parseSecurityArguments(args);
  await createCliArtifactValidator(dependencies.catalogRoot);
  const fileSystem = dependencies.fileSystem ?? nodeFileSystem;
  const root = parsed.values.get("--root") ?? cwd();
  const projectId = parsed.values.get("--project-id") ?? "project-local";
  const context = {
    args,
    subcommand: parsed.subcommand,
    flags: parsed.flags,
    values: parsed.values,
    root,
    projectId,
    fileSystem,
    io,
  };

  if (findingsSubcommands.has(parsed.subcommand)) {
    return runSecurityFindingsCommand(context);
  }
  return runSecurityOperationsCommand(context);
}
