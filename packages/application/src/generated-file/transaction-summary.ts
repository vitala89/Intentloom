import type { GeneratedFile } from "@intentloom/core";
import type { Change, Plan } from "../project-change.js";
import type { TransactionResult } from "./transaction-contracts.js";
import { lockPath, sourceMapPath } from "./transaction-metadata.js";

export function transactionSummary(
  files: readonly GeneratedFile[],
  changes: readonly Change[],
): Pick<
  TransactionResult,
  | "createdFiles"
  | "updatedFiles"
  | "unchangedFiles"
  | "manifestUpdated"
  | "sourceMapUpdated"
> {
  const generatedChanges = changes.filter(
    (change) => change.path !== lockPath && change.path !== sourceMapPath,
  );
  const changedPaths = new Set(generatedChanges.map((change) => change.path));
  return {
    createdFiles: generatedChanges
      .filter((change) => change.kind === "create")
      .map((change) => change.path)
      .sort(),
    updatedFiles: generatedChanges
      .filter((change) => change.kind === "update")
      .map((change) => change.path)
      .sort(),
    unchangedFiles: files
      .map((file) => file.path)
      .filter((path) => !changedPaths.has(path))
      .sort(),
    manifestUpdated: changes.some((change) => change.path === lockPath),
    sourceMapUpdated: changes.some((change) => change.path === sourceMapPath),
  };
}

export function rejectedBeforeWrite(plan: Plan): TransactionResult {
  return {
    ...plan,
    status: "failed",
    rollbackAttempted: false,
    rollbackCompleted: true,
    rollbackFailures: [],
    createdFiles: [],
    updatedFiles: [],
    unchangedFiles: [],
    manifestUpdated: false,
    sourceMapUpdated: false,
    consistencyValidated: false,
    cleanupCompleted: false,
  };
}
