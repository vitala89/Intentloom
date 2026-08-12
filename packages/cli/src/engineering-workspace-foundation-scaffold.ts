import {
  runFoundationScaffoldCliCommand,
  type FoundationScaffoldCliCommand,
} from "@intentloom/application";
import type {
  WorkspaceCliExitCode,
  WorkspaceCliIo,
} from "./engineering-workspace-command.js";

const scaffoldSubcommands = [
  "scaffold-prepare",
  "scaffold-get",
  "scaffold-compare",
  "scaffold-validate",
  "scaffold-apply",
  "scaffold-rollback",
] as const satisfies readonly FoundationScaffoldCliCommand[];

export const foundationScaffoldUsage =
  "Usage: intentloom foundation <scaffold-prepare|scaffold-get|scaffold-compare|scaffold-validate|scaffold-apply|scaffold-rollback> " +
  "[--workshop-id ID] [--root PATH] [--plan-id ID] [--existing-paths a,b] [--granted-capabilities a,b] [--json]";

export function isFoundationScaffoldSubcommand(
  value: string | undefined,
): value is FoundationScaffoldCliCommand {
  return (
    value !== undefined &&
    (scaffoldSubcommands as readonly string[]).includes(value)
  );
}

interface ParsedScaffoldFlags {
  readonly json: boolean;
  readonly workshopId?: string;
  readonly root?: string;
  readonly planId?: string;
  readonly existingPaths?: readonly string[];
  readonly grantedCapabilities?: readonly string[];
}

function parseScaffoldFlags(args: readonly string[]): ParsedScaffoldFlags {
  let json = false;
  let workshopId: string | undefined;
  let root: string | undefined;
  let planId: string | undefined;
  let existingPaths: readonly string[] | undefined;
  let grantedCapabilities: readonly string[] | undefined;

  for (let index = 0; index < args.length; index += 1) {
    const token = args[index];
    if (token === undefined) continue;
    if (token === "--json") {
      if (json) {
        throw new Error(
          `${foundationScaffoldUsage}\n--json specified more than once`,
        );
      }
      json = true;
      continue;
    }
    if (token === "--workshop-id") {
      const value = args[index + 1];
      if (value === undefined || value.startsWith("--")) {
        throw new Error(
          `${foundationScaffoldUsage}\nmissing value for --workshop-id`,
        );
      }
      if (workshopId !== undefined) {
        throw new Error(
          `${foundationScaffoldUsage}\n--workshop-id specified more than once`,
        );
      }
      workshopId = value;
      index += 1;
      continue;
    }
    if (token === "--root") {
      const value = args[index + 1];
      if (value === undefined || value.startsWith("--")) {
        throw new Error(`${foundationScaffoldUsage}\nmissing value for --root`);
      }
      if (root !== undefined) {
        throw new Error(
          `${foundationScaffoldUsage}\n--root specified more than once`,
        );
      }
      root = value;
      index += 1;
      continue;
    }
    if (token === "--plan-id") {
      const value = args[index + 1];
      if (value === undefined || value.startsWith("--")) {
        throw new Error(
          `${foundationScaffoldUsage}\nmissing value for --plan-id`,
        );
      }
      if (planId !== undefined) {
        throw new Error(
          `${foundationScaffoldUsage}\n--plan-id specified more than once`,
        );
      }
      planId = value;
      index += 1;
      continue;
    }
    if (token === "--existing-paths") {
      const value = args[index + 1];
      if (value === undefined || value.startsWith("--")) {
        throw new Error(
          `${foundationScaffoldUsage}\nmissing value for --existing-paths`,
        );
      }
      if (existingPaths !== undefined) {
        throw new Error(
          `${foundationScaffoldUsage}\n--existing-paths specified more than once`,
        );
      }
      existingPaths = value
        .split(",")
        .map((entry) => entry.trim())
        .filter((entry) => entry.length > 0);
      index += 1;
      continue;
    }
    if (token === "--granted-capabilities") {
      const value = args[index + 1];
      if (value === undefined || value.startsWith("--")) {
        throw new Error(
          `${foundationScaffoldUsage}\nmissing value for --granted-capabilities`,
        );
      }
      if (grantedCapabilities !== undefined) {
        throw new Error(
          `${foundationScaffoldUsage}\n--granted-capabilities specified more than once`,
        );
      }
      grantedCapabilities = value
        .split(",")
        .map((entry) => entry.trim())
        .filter((entry) => entry.length > 0);
      index += 1;
      continue;
    }
    throw new Error(
      `${foundationScaffoldUsage}\nunexpected argument: ${token}`,
    );
  }

  return {
    json,
    ...(workshopId !== undefined ? { workshopId } : {}),
    ...(root !== undefined ? { root } : {}),
    ...(planId !== undefined ? { planId } : {}),
    ...(existingPaths !== undefined ? { existingPaths } : {}),
    ...(grantedCapabilities !== undefined ? { grantedCapabilities } : {}),
  };
}

export async function runFoundationScaffoldCommand(
  args: readonly string[],
  io: WorkspaceCliIo,
): Promise<WorkspaceCliExitCode> {
  const subcommand = args[1];
  if (!isFoundationScaffoldSubcommand(subcommand)) {
    io.stderr(foundationScaffoldUsage);
    return 2;
  }

  try {
    const flags = parseScaffoldFlags(args.slice(2));
    const result = await runFoundationScaffoldCliCommand(subcommand, {
      json: flags.json,
      ...(flags.workshopId !== undefined
        ? { workshopId: flags.workshopId }
        : {}),
      ...(flags.root !== undefined ? { root: flags.root } : {}),
      ...(flags.planId !== undefined ? { planId: flags.planId } : {}),
      ...(flags.existingPaths !== undefined
        ? { existingPaths: flags.existingPaths }
        : {}),
      ...(flags.grantedCapabilities !== undefined
        ? { grantedCapabilities: flags.grantedCapabilities }
        : {}),
    });
    if (result.stdout.length > 0) io.stdout(result.stdout);
    if (result.stderr.length > 0) io.stderr(result.stderr);
    return result.exitCode === 0 ? 0 : 2;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    io.stderr(
      message.includes("Usage:")
        ? message
        : `${foundationScaffoldUsage}\n${message}`,
    );
    return 2;
  }
}
