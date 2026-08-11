import { runFoundationCliCommand } from "@intentloom/application";
import type {
  WorkspaceCliExitCode,
  WorkspaceCliIo,
} from "./engineering-workspace-command.js";

const blueprintSubcommands = [
  "propose",
  "compare",
  "approve",
  "revoke",
] as const;

type BlueprintSubcommand = (typeof blueprintSubcommands)[number];

type BlueprintTier = "minimal" | "recommended" | "extensible";

interface ParsedBlueprintFlags {
  readonly json: boolean;
  readonly workshopId?: string;
  readonly tier?: BlueprintTier;
  readonly leftTier?: BlueprintTier;
  readonly rightTier?: BlueprintTier;
  readonly approver?: string;
}

export const blueprintUsage =
  "Usage: intentloom blueprint <propose|compare|approve|revoke> " +
  "[--workshop-id ID] [--tier minimal|recommended|extensible] " +
  "[--left-tier TIER] [--right-tier TIER] [--approver NAME] [--json] " +
  "(compare also accepts positional tiers: compare minimal recommended ...)";

function isBlueprintSubcommand(
  value: string | undefined,
): value is BlueprintSubcommand {
  return (
    value !== undefined &&
    (blueprintSubcommands as readonly string[]).includes(value)
  );
}

function parseTier(value: string, flag: string): BlueprintTier {
  if (
    value !== "minimal" &&
    value !== "recommended" &&
    value !== "extensible"
  ) {
    throw new Error(
      `${blueprintUsage}\n${flag} must be minimal, recommended, or extensible`,
    );
  }
  return value;
}

function parseBlueprintFlags(args: readonly string[]): ParsedBlueprintFlags {
  let json = false;
  let workshopId: string | undefined;
  let tier: BlueprintTier | undefined;
  let leftTier: BlueprintTier | undefined;
  let rightTier: BlueprintTier | undefined;
  let approver: string | undefined;
  const positional: string[] = [];

  for (let index = 0; index < args.length; index += 1) {
    const token = args[index];
    if (token === undefined) {
      continue;
    }
    if (token === "--json") {
      if (json)
        throw new Error(`${blueprintUsage}\n--json specified more than once`);
      json = true;
      continue;
    }
    if (token === "--workshop-id") {
      const value = args[index + 1];
      if (value === undefined || value.startsWith("--")) {
        throw new Error(`${blueprintUsage}\nmissing value for --workshop-id`);
      }
      if (workshopId !== undefined) {
        throw new Error(
          `${blueprintUsage}\n--workshop-id specified more than once`,
        );
      }
      workshopId = value;
      index += 1;
      continue;
    }
    if (token === "--tier") {
      const value = args[index + 1];
      if (value === undefined || value.startsWith("--")) {
        throw new Error(`${blueprintUsage}\nmissing value for --tier`);
      }
      if (tier !== undefined) {
        throw new Error(`${blueprintUsage}\n--tier specified more than once`);
      }
      tier = parseTier(value, "--tier");
      index += 1;
      continue;
    }
    if (token === "--left-tier") {
      const value = args[index + 1];
      if (value === undefined || value.startsWith("--")) {
        throw new Error(`${blueprintUsage}\nmissing value for --left-tier`);
      }
      if (leftTier !== undefined) {
        throw new Error(
          `${blueprintUsage}\n--left-tier specified more than once`,
        );
      }
      leftTier = parseTier(value, "--left-tier");
      index += 1;
      continue;
    }
    if (token === "--right-tier") {
      const value = args[index + 1];
      if (value === undefined || value.startsWith("--")) {
        throw new Error(`${blueprintUsage}\nmissing value for --right-tier`);
      }
      if (rightTier !== undefined) {
        throw new Error(
          `${blueprintUsage}\n--right-tier specified more than once`,
        );
      }
      rightTier = parseTier(value, "--right-tier");
      index += 1;
      continue;
    }
    if (token === "--approver") {
      const value = args[index + 1];
      if (value === undefined || value.startsWith("--")) {
        throw new Error(`${blueprintUsage}\nmissing value for --approver`);
      }
      if (approver !== undefined) {
        throw new Error(
          `${blueprintUsage}\n--approver specified more than once`,
        );
      }
      approver = value;
      index += 1;
      continue;
    }
    if (token.startsWith("--")) {
      throw new Error(`${blueprintUsage}\nunknown option: ${token}`);
    }
    positional.push(token);
  }

  if (
    leftTier === undefined &&
    rightTier === undefined &&
    positional.length >= 2
  ) {
    leftTier = parseTier(positional[0]!, "--left-tier");
    rightTier = parseTier(positional[1]!, "--right-tier");
  }

  return {
    json,
    ...(workshopId !== undefined ? { workshopId } : {}),
    ...(tier !== undefined ? { tier } : {}),
    ...(leftTier !== undefined ? { leftTier } : {}),
    ...(rightTier !== undefined ? { rightTier } : {}),
    ...(approver !== undefined ? { approver } : {}),
  };
}

function foundationBlueprintCommand(
  subcommand: BlueprintSubcommand,
):
  | "blueprint-propose"
  | "blueprint-compare"
  | "blueprint-approve"
  | "blueprint-revoke" {
  switch (subcommand) {
    case "propose":
      return "blueprint-propose";
    case "compare":
      return "blueprint-compare";
    case "approve":
      return "blueprint-approve";
    case "revoke":
      return "blueprint-revoke";
  }
}

function emitCliResult(
  result: { exitCode: number; stdout: string; stderr: string },
  io: WorkspaceCliIo,
): WorkspaceCliExitCode {
  if (result.stdout.length > 0) io.stdout(result.stdout);
  if (result.stderr.length > 0) io.stderr(result.stderr);
  return result.exitCode === 0 ? 0 : 2;
}

export async function runBlueprintCommand(
  args: readonly string[],
  io: WorkspaceCliIo,
): Promise<WorkspaceCliExitCode> {
  const subcommand = args[1];
  if (!isBlueprintSubcommand(subcommand)) {
    io.stderr(blueprintUsage);
    return 2;
  }

  try {
    const flags = parseBlueprintFlags(args.slice(2));
    const result = await runFoundationCliCommand(
      foundationBlueprintCommand(subcommand),
      {
        json: flags.json,
        ...(flags.workshopId !== undefined
          ? { workshopId: flags.workshopId }
          : {}),
        ...(flags.tier !== undefined ? { tier: flags.tier } : {}),
        ...(flags.leftTier !== undefined ? { leftTier: flags.leftTier } : {}),
        ...(flags.rightTier !== undefined
          ? { rightTier: flags.rightTier }
          : {}),
        ...(flags.approver !== undefined ? { approver: flags.approver } : {}),
      },
    );
    return emitCliResult(result, io);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    io.stderr(
      message.includes("Usage:") ? message : `${blueprintUsage}\n${message}`,
    );
    return 2;
  }
}
