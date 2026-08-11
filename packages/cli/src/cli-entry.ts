import {
  runCli,
  type CliDependencies,
  type CliExitCode,
  type CliIo,
} from "./command.js";
import { runBlueprintCommand } from "./engineering-workspace-blueprint-command.js";
import {
  runFoundationCommand,
  runInceptionCommand,
} from "./engineering-workspace-command.js";

export type { CliDependencies, CliExitCode, CliIo };

export async function runCliEntry(
  args: readonly string[],
  dependencies: CliDependencies,
  io: CliIo,
): Promise<CliExitCode> {
  if (args[0] === "inception") {
    return runInceptionCommand(args, io);
  }
  if (args[0] === "foundation") {
    return await runFoundationCommand(args, io);
  }
  if (args[0] === "blueprint") {
    return await runBlueprintCommand(args, io);
  }
  return runCli(args, dependencies, io);
}
