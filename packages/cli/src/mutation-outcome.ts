import {
  destinationCollisionKey,
  type Plan,
  type SyncDryRunResult,
  type TransactionResult,
  type TransactionStage,
} from "@intentloom/application";
type CliExitCode = 0 | 2 | 3 | 4 | 5;

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

export function conflicts(result: Plan): string[] {
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
        "Intentloom sync dry run found conflicts.",
        "",
        `Reason: ${outcome.errorCode}`,
        `Conflicts: ${outcome.conflicts.length}`,
        ...outcome.conflicts.map((path) => `- ${path}`),
        "Dry run — no files were changed.",
      ].join("\n");
    return [
      "Intentloom sync dry run.",
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
        ? "Intentloom sync completed. No changes required."
        : "Intentloom sync completed.",
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
      "Intentloom sync was not applied.",
      "",
      `Reason: ${outcome.errorCode}`,
      `Conflicts: ${outcome.conflicts.length}`,
      ...outcome.conflicts.map((path) => `- ${path}`),
      "No project files were changed.",
    ].join("\n");
  if (outcome.rollbackCompleted)
    return [
      `Intentloom sync failed during: ${outcome.failedStage ?? "unknown"}`,
      `Error: ${outcome.errorCode}`,
      "Rollback: completed",
      "Project state was restored.",
    ].join("\n");
  return [
    `Intentloom sync failed during: ${outcome.failedStage ?? "unknown"}`,
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
