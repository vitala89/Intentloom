import {
  runFoundationCliCommand,
  runInceptionCliCommand,
  type FoundationCliCommand,
  type InceptionCliCommand,
} from "@intentloom/application";
import type { FoundationAnswer, InceptionAnswer } from "@intentloom/protocol";
import {
  isFoundationScaffoldSubcommand,
  runFoundationScaffoldCommand,
} from "./engineering-workspace-foundation-scaffold.js";

export type WorkspaceCliExitCode = 0 | 2;

export interface WorkspaceCliIo {
  readonly stdout: (message: string) => void;
  readonly stderr: (message: string) => void;
}

interface ParsedWorkspaceFlags {
  readonly json: boolean;
  readonly root?: string;
  readonly idea?: string;
  readonly sessionId?: string;
  readonly workshopId?: string;
  readonly inceptionSessionId?: string;
  readonly pendingOnly: boolean;
  readonly jsonInput?: string;
  readonly effort?: "low" | "medium" | "high";
  readonly turnIndex?: number;
  readonly modelProfile?: string;
  readonly tier?: "minimal" | "recommended" | "extensible";
  readonly leftTier?: "minimal" | "recommended" | "extensible";
  readonly rightTier?: "minimal" | "recommended" | "extensible";
  readonly approver?: string;
}

const inceptionSubcommands = [
  "start",
  "get",
  "questions",
  "answer",
  "summarize",
  "conflicts",
  "export",
  "delete",
] as const satisfies readonly InceptionCliCommand[];

const foundationSubcommands = [
  "start",
  "get",
  "questions",
  "answer",
  "summarize",
  "conflicts",
  "readiness",
  "discover-questions",
  "discover-turn",
  "blueprint-propose",
  "blueprint-compare",
  "blueprint-approve",
  "blueprint-revoke",
  "export",
  "delete",
] as const satisfies readonly FoundationCliCommand[];

export const inceptionUsage =
  "Usage: intentloom inception <start|get|questions|answer|summarize|conflicts|export|delete> " +
  "[--root PATH] [--idea TEXT] [--session-id ID] [--pending-only] [--json-input JSON] [--json]";

export const foundationUsage =
  "Usage: intentloom foundation <start|get|questions|answer|summarize|conflicts|readiness|discover-questions|discover-turn|blueprint-propose|blueprint-compare|blueprint-approve|blueprint-revoke|scaffold-prepare|scaffold-get|scaffold-compare|scaffold-validate|export|delete> " +
  "[--root PATH] [--idea TEXT] [--workshop-id ID] [--inception-session-id ID] [--effort low|medium|high] [--turn-index N] [--model-profile NAME] [--tier minimal|recommended|extensible] [--left-tier TIER] [--right-tier TIER] [--approver NAME] [--plan-id ID] [--existing-paths a,b] [--pending-only] [--json-input JSON] [--json]";

function isInceptionSubcommand(
  value: string | undefined,
): value is InceptionCliCommand {
  return (
    value !== undefined &&
    (inceptionSubcommands as readonly string[]).includes(value)
  );
}

function isFoundationSubcommand(
  value: string | undefined,
): value is FoundationCliCommand {
  return (
    value !== undefined &&
    (foundationSubcommands as readonly string[]).includes(value)
  );
}

function parseBlueprintTierFlag(
  value: string,
  flag: string,
  usage: string,
): "minimal" | "recommended" | "extensible" {
  if (
    value !== "minimal" &&
    value !== "recommended" &&
    value !== "extensible"
  ) {
    throw new Error(
      `${usage}\n${flag} must be minimal, recommended, or extensible`,
    );
  }
  return value;
}

function parseWorkspaceFlags(
  args: readonly string[],
  usage: string,
): ParsedWorkspaceFlags {
  let json = false;
  let pendingOnly = false;
  let root: string | undefined;
  let idea: string | undefined;
  let sessionId: string | undefined;
  let workshopId: string | undefined;
  let inceptionSessionId: string | undefined;
  let jsonInput: string | undefined;
  let effort: ParsedWorkspaceFlags["effort"];
  let turnIndex: number | undefined;
  let modelProfile: string | undefined;
  let tier: ParsedWorkspaceFlags["tier"];
  let leftTier: ParsedWorkspaceFlags["leftTier"];
  let rightTier: ParsedWorkspaceFlags["rightTier"];
  let approver: string | undefined;

  for (let index = 0; index < args.length; index += 1) {
    const token = args[index];
    if (token === "--json") {
      if (json) throw new Error(`${usage}\n--json specified more than once`);
      json = true;
      continue;
    }
    if (token === "--pending-only") {
      if (pendingOnly)
        throw new Error(`${usage}\n--pending-only specified more than once`);
      pendingOnly = true;
      continue;
    }
    if (
      token !== "--root" &&
      token !== "--idea" &&
      token !== "--session-id" &&
      token !== "--workshop-id" &&
      token !== "--inception-session-id" &&
      token !== "--json-input" &&
      token !== "--effort" &&
      token !== "--turn-index" &&
      token !== "--model-profile" &&
      token !== "--tier" &&
      token !== "--left-tier" &&
      token !== "--right-tier" &&
      token !== "--approver"
    ) {
      throw new Error(`${usage}\nunknown option: ${token}`);
    }
    const value = args[index + 1];
    if (value === undefined || value.startsWith("--")) {
      throw new Error(`${usage}\nmissing value for ${token}`);
    }
    if (token === "--root") {
      if (root !== undefined)
        throw new Error(`${usage}\n--root specified more than once`);
      root = value;
    } else if (token === "--idea") {
      if (idea !== undefined)
        throw new Error(`${usage}\n--idea specified more than once`);
      idea = value;
    } else if (token === "--session-id") {
      if (sessionId !== undefined)
        throw new Error(`${usage}\n--session-id specified more than once`);
      sessionId = value;
    } else if (token === "--workshop-id") {
      if (workshopId !== undefined)
        throw new Error(`${usage}\n--workshop-id specified more than once`);
      workshopId = value;
    } else if (token === "--inception-session-id") {
      if (inceptionSessionId !== undefined) {
        throw new Error(
          `${usage}\n--inception-session-id specified more than once`,
        );
      }
      inceptionSessionId = value;
    } else if (token === "--effort") {
      if (effort !== undefined)
        throw new Error(`${usage}\n--effort specified more than once`);
      if (value !== "low" && value !== "medium" && value !== "high") {
        throw new Error(`${usage}\n--effort must be low, medium, or high`);
      }
      effort = value;
    } else if (token === "--turn-index") {
      if (turnIndex !== undefined)
        throw new Error(`${usage}\n--turn-index specified more than once`);
      const parsed = Number.parseInt(value, 10);
      if (!Number.isFinite(parsed) || parsed < 0) {
        throw new Error(
          `${usage}\n--turn-index must be a non-negative integer`,
        );
      }
      turnIndex = parsed;
    } else if (token === "--model-profile") {
      if (modelProfile !== undefined) {
        throw new Error(`${usage}\n--model-profile specified more than once`);
      }
      modelProfile = value;
    } else if (token === "--tier") {
      if (tier !== undefined)
        throw new Error(`${usage}\n--tier specified more than once`);
      tier = parseBlueprintTierFlag(value, "--tier", usage);
    } else if (token === "--left-tier") {
      if (leftTier !== undefined)
        throw new Error(`${usage}\n--left-tier specified more than once`);
      leftTier = parseBlueprintTierFlag(value, "--left-tier", usage);
    } else if (token === "--right-tier") {
      if (rightTier !== undefined)
        throw new Error(`${usage}\n--right-tier specified more than once`);
      rightTier = parseBlueprintTierFlag(value, "--right-tier", usage);
    } else if (token === "--approver") {
      if (approver !== undefined)
        throw new Error(`${usage}\n--approver specified more than once`);
      approver = value;
    } else if (jsonInput !== undefined) {
      throw new Error(`${usage}\n--json-input specified more than once`);
    } else {
      jsonInput = value;
    }
    index += 1;
  }

  return {
    json,
    pendingOnly,
    ...(root !== undefined ? { root } : {}),
    ...(idea !== undefined ? { idea } : {}),
    ...(sessionId !== undefined ? { sessionId } : {}),
    ...(workshopId !== undefined ? { workshopId } : {}),
    ...(inceptionSessionId !== undefined ? { inceptionSessionId } : {}),
    ...(jsonInput !== undefined ? { jsonInput } : {}),
    ...(effort !== undefined ? { effort } : {}),
    ...(turnIndex !== undefined ? { turnIndex } : {}),
    ...(modelProfile !== undefined ? { modelProfile } : {}),
    ...(tier !== undefined ? { tier } : {}),
    ...(leftTier !== undefined ? { leftTier } : {}),
    ...(rightTier !== undefined ? { rightTier } : {}),
    ...(approver !== undefined ? { approver } : {}),
  };
}

function parseAnswerJson<T>(raw: string, usage: string): T {
  try {
    return JSON.parse(raw) as T;
  } catch {
    throw new Error(`${usage}\n--json-input must be valid JSON`);
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

function handleCommandError(error: unknown, usage: string, io: WorkspaceCliIo) {
  const message = error instanceof Error ? error.message : String(error);
  io.stderr(message.includes("Usage:") ? message : `${usage}\n${message}`);
  return 2 as const;
}

export function runInceptionCommand(
  args: readonly string[],
  io: WorkspaceCliIo,
): WorkspaceCliExitCode {
  const subcommand = args[1];
  if (!isInceptionSubcommand(subcommand)) {
    io.stderr(inceptionUsage);
    return 2;
  }

  try {
    const flags = parseWorkspaceFlags(args.slice(2), inceptionUsage);
    const answer =
      flags.jsonInput !== undefined
        ? parseAnswerJson<InceptionAnswer>(flags.jsonInput, inceptionUsage)
        : undefined;

    return emitCliResult(
      runInceptionCliCommand(subcommand, {
        json: flags.json,
        ...(flags.root !== undefined ? { root: flags.root } : {}),
        ...(flags.idea !== undefined ? { idea: flags.idea } : {}),
        ...(flags.sessionId !== undefined
          ? { sessionId: flags.sessionId }
          : {}),
        ...(flags.pendingOnly ? { pendingOnly: true } : {}),
        ...(answer !== undefined ? { answer } : {}),
      }),
      io,
    );
  } catch (error) {
    return handleCommandError(error, inceptionUsage, io);
  }
}

export async function runFoundationCommand(
  args: readonly string[],
  io: WorkspaceCliIo,
): Promise<WorkspaceCliExitCode> {
  const subcommand = args[1];
  if (isFoundationScaffoldSubcommand(subcommand)) {
    return runFoundationScaffoldCommand(args, io);
  }
  if (!isFoundationSubcommand(subcommand)) {
    io.stderr(foundationUsage);
    return 2;
  }

  try {
    const flags = parseWorkspaceFlags(args.slice(2), foundationUsage);
    const answer =
      flags.jsonInput !== undefined
        ? parseAnswerJson<FoundationAnswer>(flags.jsonInput, foundationUsage)
        : undefined;

    const result = await runFoundationCliCommand(subcommand, {
      json: flags.json,
      ...(flags.root !== undefined ? { root: flags.root } : {}),
      ...(flags.idea !== undefined ? { idea: flags.idea } : {}),
      ...(flags.workshopId !== undefined
        ? { workshopId: flags.workshopId }
        : {}),
      ...(flags.inceptionSessionId !== undefined
        ? { inceptionSessionId: flags.inceptionSessionId }
        : {}),
      ...(flags.pendingOnly ? { pendingOnly: true } : {}),
      ...(answer !== undefined ? { answer } : {}),
      ...(flags.effort !== undefined ? { effort: flags.effort } : {}),
      ...(flags.turnIndex !== undefined ? { turnIndex: flags.turnIndex } : {}),
      ...(flags.modelProfile !== undefined
        ? { modelProfile: flags.modelProfile }
        : {}),
      ...(flags.tier !== undefined ? { tier: flags.tier } : {}),
      ...(flags.leftTier !== undefined ? { leftTier: flags.leftTier } : {}),
      ...(flags.rightTier !== undefined ? { rightTier: flags.rightTier } : {}),
      ...(flags.approver !== undefined ? { approver: flags.approver } : {}),
    });

    return emitCliResult(result, io);
  } catch (error) {
    return handleCommandError(error, foundationUsage, io);
  }
}
