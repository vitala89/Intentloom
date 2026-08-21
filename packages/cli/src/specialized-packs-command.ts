import {
  runSpecializedPacksCliCommand,
  runSpecializedPacksExternalCliCommand,
  type SpecializedPacksCliCommand,
  type SpecializedPacksExternalCliCommand,
} from "@intentloom/application";

export type SpecializedPacksCliExitCode = CliExitCode;

import type { CliExitCode, CliIo } from "./command.js";

export const specializedPacksUsage =
  "Usage: intentloom specialized-packs <list|detect|explain|compatibility|checks|external> " +
  "[--root PATH] [--pack-id ID] [--pack-ids a,b] [--json]";

export const specializedPacksExternalUsage =
  "Usage: intentloom specialized-packs external <preview|activate> " +
  "[--root PATH] [--manifest-file PATH|--manifest-json JSON] [--source-json JSON] " +
  "[--declared-publisher NAME] [--declared-license SPDX] " +
  "[--approval-file PATH|--approval-json JSON] [--json]";

const firstPartySubcommands = [
  "list",
  "detect",
  "explain",
  "compatibility",
  "checks",
] as const satisfies readonly SpecializedPacksCliCommand[];

const externalSubcommands = [
  "preview",
  "activate",
] as const satisfies readonly SpecializedPacksExternalCliCommand[];

interface ParsedSpecializedPacksFlags {
  readonly json: boolean;
  readonly root?: string;
  readonly packId?: string;
  readonly packIds?: readonly string[];
  readonly manifestFile?: string;
  readonly manifestJson?: string;
  readonly sourceJson?: string;
  readonly approvalFile?: string;
  readonly approvalJson?: string;
  readonly declaredPublisher?: string;
  readonly declaredLicense?: string;
}

function isFirstPartySubcommand(
  value: string | undefined,
): value is SpecializedPacksCliCommand {
  return (
    value !== undefined &&
    (firstPartySubcommands as readonly string[]).includes(value)
  );
}

function isExternalSubcommand(
  value: string | undefined,
): value is SpecializedPacksExternalCliCommand {
  return (
    value !== undefined &&
    (externalSubcommands as readonly string[]).includes(value)
  );
}

function parseSpecializedPacksFlags(
  args: readonly string[],
  usage: string,
): ParsedSpecializedPacksFlags {
  let json = false;
  let root: string | undefined;
  let packId: string | undefined;
  let packIds: readonly string[] | undefined;
  let manifestFile: string | undefined;
  let manifestJson: string | undefined;
  let sourceJson: string | undefined;
  let approvalFile: string | undefined;
  let approvalJson: string | undefined;
  let declaredPublisher: string | undefined;
  let declaredLicense: string | undefined;

  for (let index = 0; index < args.length; index += 1) {
    const token = args[index];
    if (token === undefined) continue;
    if (token === "--json") {
      if (json) throw new Error(`${usage}\n--json specified more than once`);
      json = true;
      continue;
    }
    const readValue = (flag: string): string => {
      const value = args[index + 1];
      if (value === undefined || value.startsWith("--")) {
        throw new Error(`${usage}\nmissing value for ${flag}`);
      }
      index += 1;
      return value;
    };
    if (token === "--root") {
      root = readValue("--root");
      continue;
    }
    if (token === "--pack-id") {
      packId = readValue("--pack-id");
      continue;
    }
    if (token === "--pack-ids") {
      packIds = readValue("--pack-ids")
        .split(",")
        .map((item) => item.trim())
        .filter((item) => item.length > 0);
      continue;
    }
    if (token === "--manifest-file") {
      manifestFile = readValue("--manifest-file");
      continue;
    }
    if (token === "--manifest-json") {
      manifestJson = readValue("--manifest-json");
      continue;
    }
    if (token === "--source-json") {
      sourceJson = readValue("--source-json");
      continue;
    }
    if (token === "--approval-file") {
      approvalFile = readValue("--approval-file");
      continue;
    }
    if (token === "--approval-json") {
      approvalJson = readValue("--approval-json");
      continue;
    }
    if (token === "--declared-publisher") {
      declaredPublisher = readValue("--declared-publisher");
      continue;
    }
    if (token === "--declared-license") {
      declaredLicense = readValue("--declared-license");
      continue;
    }
    throw new Error(`${usage}\nunknown argument: ${token}`);
  }

  return {
    json,
    ...(root !== undefined ? { root } : {}),
    ...(packId !== undefined ? { packId } : {}),
    ...(packIds !== undefined ? { packIds } : {}),
    ...(manifestFile !== undefined ? { manifestFile } : {}),
    ...(manifestJson !== undefined ? { manifestJson } : {}),
    ...(sourceJson !== undefined ? { sourceJson } : {}),
    ...(approvalFile !== undefined ? { approvalFile } : {}),
    ...(approvalJson !== undefined ? { approvalJson } : {}),
    ...(declaredPublisher !== undefined ? { declaredPublisher } : {}),
    ...(declaredLicense !== undefined ? { declaredLicense } : {}),
  };
}

export async function runSpecializedPacksCommand(
  args: readonly string[],
  io: CliIo,
): Promise<CliExitCode> {
  const subcommand = args[0];
  if (subcommand === "external") {
    const externalCommand = args[1];
    if (!isExternalSubcommand(externalCommand)) {
      io.stderr(specializedPacksExternalUsage);
      return 2;
    }
    const flags = parseSpecializedPacksFlags(
      args.slice(2),
      specializedPacksExternalUsage,
    );
    const result = await runSpecializedPacksExternalCliCommand(
      externalCommand,
      flags,
    );
    if (result.stdout) io.stdout(result.stdout);
    if (result.stderr) io.stderr(result.stderr);
    return result.exitCode === 0 ? 0 : 2;
  }

  if (!isFirstPartySubcommand(subcommand)) {
    io.stderr(`${specializedPacksUsage}\n${specializedPacksExternalUsage}`);
    return 2;
  }

  const flags = parseSpecializedPacksFlags(
    args.slice(1),
    specializedPacksUsage,
  );
  const result = await runSpecializedPacksCliCommand(subcommand, flags);
  if (result.stdout) io.stdout(result.stdout);
  if (result.stderr) io.stderr(result.stderr);
  return result.exitCode === 0 ? 0 : 2;
}
