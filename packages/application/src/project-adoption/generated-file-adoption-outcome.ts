import { normalizeOutputPath } from "@intentloom/core";
import type { TransactionResult } from "../generated-file/transaction-contracts.js";
import type { AdoptionTransactionOutcome } from "./generated-file-adoption-contracts.js";

const safeDiagnostic = /^[a-z0-9][a-z0-9:-]*$/u;

export interface AdoptionTransactionMapping {
  readonly transactionOutcome: AdoptionTransactionOutcome;
  readonly applied: boolean;
  readonly applicationStatus:
    "applied" | "failed-restored" | "failed-incomplete";
}

export function mapAdoptionTransactionOutcome(
  result: TransactionResult,
): AdoptionTransactionMapping {
  const diagnostics = safeTransactionDiagnostics(result.diagnostics);
  const applied = result.status === "success";
  return {
    transactionOutcome: {
      status: result.status,
      failedStage: result.failedStage ?? null,
      errorCode: adoptionErrorCode(result, diagnostics),
      rollbackAttempted: result.rollbackAttempted,
      rollbackCompleted: result.rollbackCompleted,
      rollbackFailures: normalizeRollbackFailures(result.rollbackFailures),
      diagnostics,
    },
    applied,
    applicationStatus: applied
      ? "applied"
      : result.rollbackCompleted
        ? "failed-restored"
        : "failed-incomplete",
  };
}

function safeTransactionDiagnostics(diagnostics: readonly string[]): string[] {
  return [
    ...new Set(
      diagnostics.map((diagnostic) =>
        safeDiagnostic.test(diagnostic) ? diagnostic : "transaction-failed",
      ),
    ),
  ].sort();
}

function adoptionErrorCode(
  result: TransactionResult,
  diagnostics: readonly string[],
): string | null {
  return result.status === "success"
    ? null
    : result.postWriteValidation?.status === "invalid"
      ? result.postWriteValidation.code
      : (diagnostics.find(
          (diagnostic) => diagnostic !== "transaction-rollback-incomplete",
        ) ?? "transaction-failed");
}

function normalizeRollbackFailures(paths: readonly string[]): string[] {
  return paths
    .flatMap((path) => {
      try {
        return [normalizeOutputPath(path)];
      } catch {
        return [];
      }
    })
    .sort();
}
