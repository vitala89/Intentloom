import {
  runFoundationCliCommand,
  runInceptionCliCommand,
  type FoundationCliCommand,
  type InceptionCliCommand,
} from "@intentloom/application";
import type { FoundationAnswer, InceptionAnswer } from "@intentloom/protocol";

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
  "export",
  "delete",
] as const satisfies readonly FoundationCliCommand[];

export const inceptionUsage =
  "Usage: intentloom inception <start|get|questions|answer|summarize|conflicts|export|delete> " +
  "[--root PATH] [--idea TEXT] [--session-id ID] [--pending-only] [--json-input JSON] [--json]";

export const foundationUsage =
  "Usage: intentloom foundation <start|get|questions|answer|summarize|conflicts|readiness|export|delete> " +
  "[--root PATH] [--idea TEXT] [--workshop-id ID] [--inception-session-id ID] [--pending-only] [--json-input JSON] [--json]";

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
      token !== "--json-input"
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

export function runFoundationCommand(
  args: readonly string[],
  io: WorkspaceCliIo,
): WorkspaceCliExitCode {
  const subcommand = args[1];
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

    return emitCliResult(
      runFoundationCliCommand(subcommand, {
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
      }),
      io,
    );
  } catch (error) {
    return handleCommandError(error, foundationUsage, io);
  }
}
