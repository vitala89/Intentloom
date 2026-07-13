import { cwd } from "node:process";
import { resolve } from "node:path";
import { parse } from "yaml";
import {
  adoptProject,
  destinationCollisionKey,
  diffProject,
  doctorProject,
  initProject,
  nodeFileSystem,
  planFeature,
  syncProject,
  type FileSystem,
  type Plan,
  type SyncDryRunResult,
  type TransactionOptions,
  type TransactionResult,
  type TransactionStage,
} from "./index.js";
import type { AdapterName } from "@aif/core";

export type CliExitCode = 0 | 2 | 3 | 4 | 5;

export interface CliIo {
  readonly stdout: (message: string) => void;
  readonly stderr: (message: string) => void;
}

export interface CliDependencies {
  readonly catalogRoot: string;
  readonly fileSystem?: FileSystem;
  readonly transactionOptions?: TransactionOptions;
}

export interface CliSyncOutcome {
  readonly status: "success" | "conflict" | "failed";
  readonly dryRun: boolean;
  readonly failedStage: TransactionStage | null;
  readonly errorCode: string | null;
  readonly rollbackAttempted: boolean;
  readonly rollbackCompleted: boolean | null;
  readonly rollbackFailures: readonly string[];
  readonly rollbackErrorCode: string | null;
  readonly created: readonly string[];
  readonly updated: readonly string[];
  readonly unchanged: readonly string[];
  readonly conflicts: readonly string[];
  readonly manifestUpdated: boolean;
  readonly sourceMapUpdated: boolean;
  readonly consistencyValidated: boolean;
  readonly cleanupCompleted: boolean;
  readonly exitCode: CliExitCode;
}

class CliUsageError extends Error {}

interface ParsedArguments {
  readonly command: string;
  readonly flags: ReadonlySet<string>;
  readonly values: ReadonlyMap<string, string>;
}

interface ProjectConfiguration {
  readonly profile: string;
  readonly adapters: readonly AdapterName[];
}

const commands = new Set(["init", "adopt", "plan", "diff", "sync", "doctor"]);
const booleanFlags = new Set(["--dry-run", "--force", "--json"]);
const valueFlags = new Set(["--root", "--profile", "--adapters", "--task"]);
const adapters = new Set<AdapterName>(["claude", "codex", "cursor", "copilot"]);
const usage =
  "Usage: aif <init|adopt|plan|diff|sync|doctor> [--root PATH] [--dry-run]";

function parseArguments(args: readonly string[]): ParsedArguments {
  const command = args[0] ?? "";
  if (!commands.has(command)) throw new CliUsageError(usage);
  const flags = new Set<string>();
  const values = new Map<string, string>();
  for (let index = 1; index < args.length; index += 1) {
    const token = args[index]!;
    if (booleanFlags.has(token)) {
      flags.add(token);
      continue;
    }
    if (!valueFlags.has(token))
      throw new CliUsageError(`unknown option: ${token}`);
    const value = args[index + 1];
    if (value === undefined || value.startsWith("--"))
      throw new CliUsageError(`missing value for ${token}`);
    values.set(token, value);
    index += 1;
  }
  if (command !== "sync" && flags.has("--force"))
    throw new CliUsageError("--force is only valid with sync");
  return { command, flags, values };
}

function safePaths(paths: readonly string[]): string[] {
  const safe: string[] = [];
  for (const path of paths) {
    try {
      destinationCollisionKey(path);
      safe.push(path);
    } catch {
      /* unsafe metadata input is represented by its classification, not its value */
    }
  }
  return [...new Set(safe)].sort();
}

function safeErrorCode(value: string | undefined): string {
  return value !== undefined && /^[a-z0-9][a-z0-9:-]*$/u.test(value)
    ? value
    : "transaction-failed";
}

function conflicts(result: Plan): string[] {
  return safePaths(
    result.changes
      .filter((change) =>
        ["conflict", "modified", "security-error"].includes(change.kind),
      )
      .map((change) => change.path),
  );
}

export function mapTransactionResultToCliOutcome(
  result: TransactionResult,
): CliSyncOutcome {
  const conflictPaths = conflicts(result);
  const originalDiagnostic = result.diagnostics.find(
    (diagnostic) => diagnostic !== "transaction-rollback-incomplete",
  );
  const errorCode =
    result.status === "success"
      ? null
      : safeErrorCode(
          result.postWriteValidation?.status === "invalid"
            ? result.postWriteValidation.code
            : originalDiagnostic,
        );
  const status =
    result.status === "success"
      ? "success"
      : result.rollbackAttempted
        ? "failed"
        : "conflict";
  const exitCode: CliExitCode =
    status === "success"
      ? 0
      : status === "conflict"
        ? 3
        : result.rollbackCompleted
          ? 4
          : 5;
  return {
    status,
    dryRun: false,
    failedStage: result.failedStage ?? null,
    errorCode,
    rollbackAttempted: result.rollbackAttempted,
    rollbackCompleted: result.rollbackAttempted
      ? result.rollbackCompleted
      : null,
    rollbackFailures: safePaths(result.rollbackFailures),
    rollbackErrorCode: result.rollbackCompleted
      ? null
      : "transaction-rollback-incomplete",
    created: safePaths(result.createdFiles),
    updated: safePaths(result.updatedFiles),
    unchanged: safePaths(result.unchangedFiles),
    conflicts: conflictPaths,
    manifestUpdated: result.manifestUpdated,
    sourceMapUpdated: result.sourceMapUpdated,
    consistencyValidated: result.consistencyValidated,
    cleanupCompleted: result.cleanupCompleted,
    exitCode,
  };
}

export function mapDryRunToCliOutcome(
  result: SyncDryRunResult,
): CliSyncOutcome {
  const conflictPaths = safePaths(result.conflictFiles);
  const hasConflict = conflictPaths.length > 0 || result.diagnostics.length > 0;
  return {
    status: hasConflict ? "conflict" : "success",
    dryRun: true,
    failedStage: null,
    errorCode: hasConflict
      ? safeErrorCode(result.diagnostics[0] ?? "sync-conflict")
      : null,
    rollbackAttempted: false,
    rollbackCompleted: null,
    rollbackFailures: [],
    rollbackErrorCode: null,
    created: safePaths(result.createdFiles),
    updated: safePaths(result.updatedFiles),
    unchanged: safePaths(result.unchangedFiles),
    conflicts: conflictPaths,
    manifestUpdated: false,
    sourceMapUpdated: false,
    consistencyValidated: false,
    cleanupCompleted: false,
    exitCode: hasConflict ? 3 : 0,
  };
}

function yesNo(value: boolean): string {
  return value ? "yes" : "no";
}

function counts(outcome: CliSyncOutcome): string[] {
  return [
    `Created: ${outcome.created.length}`,
    `Updated: ${outcome.updated.length}`,
    `Unchanged: ${outcome.unchanged.length}`,
  ];
}

export function formatHumanOutcome(outcome: CliSyncOutcome): string {
  if (outcome.dryRun) {
    if (outcome.status === "conflict")
      return [
        "AIF sync dry run found conflicts.",
        "",
        `Reason: ${outcome.errorCode}`,
        `Conflicts: ${outcome.conflicts.length}`,
        ...outcome.conflicts.map((path) => `- ${path}`),
        "Dry run — no files were changed.",
      ].join("\n");
    return [
      "AIF sync dry run.",
      "",
      ...counts(outcome),
      "Dry run — no files were changed.",
    ].join("\n");
  }
  if (outcome.status === "success") {
    const noChanges =
      outcome.created.length === 0 &&
      outcome.updated.length === 0 &&
      !outcome.manifestUpdated &&
      !outcome.sourceMapUpdated;
    return [
      noChanges
        ? "AIF sync completed. No changes required."
        : "AIF sync completed.",
      "",
      ...counts(outcome),
      `Manifest updated: ${yesNo(outcome.manifestUpdated)}`,
      `Source map updated: ${yesNo(outcome.sourceMapUpdated)}`,
      `Consistency validation: ${outcome.consistencyValidated ? "passed" : "failed"}`,
      `Cleanup: ${outcome.cleanupCompleted ? "passed" : "failed"}`,
    ].join("\n");
  }
  if (outcome.status === "conflict")
    return [
      "AIF sync was not applied.",
      "",
      `Reason: ${outcome.errorCode}`,
      `Conflicts: ${outcome.conflicts.length}`,
      ...outcome.conflicts.map((path) => `- ${path}`),
      "No project files were changed.",
    ].join("\n");
  if (outcome.rollbackCompleted)
    return [
      `AIF sync failed during: ${outcome.failedStage ?? "unknown"}`,
      `Error: ${outcome.errorCode}`,
      "Rollback: completed",
      "Project state was restored.",
    ].join("\n");
  return [
    `AIF sync failed during: ${outcome.failedStage ?? "unknown"}`,
    `Error: ${outcome.errorCode}`,
    "Rollback: incomplete",
    `Rollback error: ${outcome.rollbackErrorCode}`,
    "Manual inspection is required.",
    ...outcome.rollbackFailures.map((path) => `- ${path}`),
  ].join("\n");
}

export function formatJsonOutcome(outcome: CliSyncOutcome): string {
  return JSON.stringify(outcome, null, 2);
}

function formatPlan(result: Plan): string {
  return [...result.changes]
    .sort((left, right) => left.path.localeCompare(right.path))
    .map(
      (change) => `${change.kind.padEnd(8)} ${change.path} — ${change.reason}`,
    )
    .join("\n");
}

function parseAdapters(value: string): AdapterName[] {
  const parsed = value.split(",").filter(Boolean);
  if (
    parsed.length === 0 ||
    parsed.some((adapter) => !adapters.has(adapter as AdapterName))
  )
    throw new CliUsageError("invalid --adapters value");
  return parsed as AdapterName[];
}

async function projectConfiguration(
  root: string,
  fileSystem: FileSystem,
): Promise<ProjectConfiguration> {
  const path = resolve(root, ".aif/config.yaml");
  if (!(await fileSystem.exists(path)))
    throw new CliUsageError(
      "sync requires an initialized project with .aif/config.yaml",
    );
  let value: unknown;
  try {
    value = parse(await fileSystem.read(path));
  } catch {
    throw new CliUsageError("invalid .aif/config.yaml");
  }
  if (typeof value !== "object" || value === null)
    throw new CliUsageError("invalid .aif/config.yaml");
  const config = value as Record<string, unknown>;
  if (typeof config.profile !== "string" || !Array.isArray(config.adapters))
    throw new CliUsageError("invalid .aif/config.yaml");
  return {
    profile: config.profile,
    adapters: parseAdapters(config.adapters.join(",")),
  };
}

export async function runCli(
  args: readonly string[],
  dependencies: CliDependencies,
  io: CliIo,
): Promise<CliExitCode> {
  if (args.includes("--version") || args[0] === "--version") {
    io.stdout("0.1.0-alpha.0");
    return 0;
  }
  if (
    args.includes("--help") ||
    args[0] === "--help" ||
    args[0] === "help" ||
    args.length === 0
  ) {
    io.stdout(usage);
    return 0;
  }
  try {
    const parsed = parseArguments(args);
    const fileSystem = dependencies.fileSystem ?? nodeFileSystem;
    const root = parsed.values.get("--root") ?? cwd();
    const storedConfig =
      parsed.command === "sync"
        ? await projectConfiguration(root, fileSystem)
        : undefined;
    const profile =
      parsed.values.get("--profile") ?? storedConfig?.profile ?? "generic";
    const adapterNames = parseAdapters(
      parsed.values.get("--adapters") ??
        storedConfig?.adapters.join(",") ??
        "claude,codex,cursor,copilot",
    );
    const options = {
      root,
      profile,
      adapters: adapterNames,
      dryRun: parsed.flags.has("--dry-run"),
      catalogRoot: dependencies.catalogRoot,
    };
    if (parsed.command === "sync") {
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
    const result =
      parsed.command === "init"
        ? await initProject(options, fileSystem)
        : parsed.command === "adopt"
          ? await adoptProject(options, fileSystem)
          : parsed.command === "diff"
            ? await diffProject(options, fileSystem)
            : parsed.command === "doctor"
              ? await doctorProject(options, fileSystem)
              : await planFeature(parsed.values.get("--task") ?? "");
    io.stdout(
      parsed.flags.has("--json")
        ? JSON.stringify(result, null, 2)
        : typeof result === "string"
          ? result
          : formatPlan(result),
    );
    return typeof result === "string" || conflicts(result).length === 0 ? 0 : 3;
  } catch (error) {
    io.stderr(error instanceof Error ? error.message : "configuration error");
    return 2;
  }
}
