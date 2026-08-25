import { describe, expect, it } from "vitest";
import type {
  SyncDryRunResult,
  TransactionResult,
} from "@intentloom/application";
import {
  formatHumanOutcome,
  formatJsonOutcome,
  mapDryRunToCliOutcome,
  mapTransactionResultToCliOutcome,
} from "../packages/cli/src/mutation-outcome.js";

function emptyPlan() {
  return { changes: [], diagnostics: [] };
}

function transactionResult(
  overrides: Partial<TransactionResult> = {},
): TransactionResult {
  return {
    ...emptyPlan(),
    status: "success",
    rollbackAttempted: false,
    rollbackCompleted: false,
    rollbackFailures: [],
    createdFiles: [],
    updatedFiles: [],
    unchangedFiles: [],
    manifestUpdated: false,
    sourceMapUpdated: false,
    consistencyValidated: true,
    cleanupCompleted: true,
    ...overrides,
  };
}

function dryRunResult(
  overrides: Partial<SyncDryRunResult> = {},
): SyncDryRunResult {
  return {
    ...emptyPlan(),
    dryRun: true,
    createdFiles: [],
    updatedFiles: [],
    unchangedFiles: [],
    conflictFiles: [],
    ...overrides,
  };
}

describe("mapTransactionResultToCliOutcome", () => {
  it("maps success to exit 0", () => {
    const outcome = mapTransactionResultToCliOutcome(
      transactionResult({
        createdFiles: ["AGENTS.md"],
        manifestUpdated: true,
      }),
    );
    expect(outcome.exitCode).toBe(0);
    expect(outcome.status).toBe("success");
    expect(outcome.errorCode).toBeNull();
  });

  it("maps conflict without rollback to exit 3", () => {
    const outcome = mapTransactionResultToCliOutcome(
      transactionResult({
        status: "failed",
        rollbackAttempted: false,
        diagnostics: ["sync-conflict"],
        changes: [{ kind: "conflict", path: "AGENTS.md" }],
      }),
    );
    expect(outcome.exitCode).toBe(3);
    expect(outcome.status).toBe("conflict");
    expect(outcome.conflicts).toEqual(["AGENTS.md"]);
  });

  it("maps failed transaction with completed rollback to exit 4", () => {
    const outcome = mapTransactionResultToCliOutcome(
      transactionResult({
        status: "failed",
        failedStage: "manifest-stage",
        rollbackAttempted: true,
        rollbackCompleted: true,
        diagnostics: ["manifest-write-failed"],
      }),
    );
    expect(outcome.exitCode).toBe(4);
    expect(outcome.status).toBe("failed");
    expect(outcome.rollbackCompleted).toBe(true);
  });

  it("maps failed transaction with incomplete rollback to exit 5", () => {
    const outcome = mapTransactionResultToCliOutcome(
      transactionResult({
        status: "failed",
        failedStage: "generated-stage",
        rollbackAttempted: true,
        rollbackCompleted: false,
        rollbackFailures: [".aif/manifest.lock.json"],
        diagnostics: [
          "generated-write-failed",
          "transaction-rollback-incomplete",
        ],
      }),
    );
    expect(outcome.exitCode).toBe(5);
    expect(outcome.status).toBe("failed");
    expect(outcome.rollbackErrorCode).toBe("transaction-rollback-incomplete");
    expect(outcome.rollbackFailures).toEqual([".aif/manifest.lock.json"]);
  });

  it("prefers post-write validation error code over original diagnostic", () => {
    const outcome = mapTransactionResultToCliOutcome(
      transactionResult({
        status: "failed",
        rollbackAttempted: false,
        diagnostics: ["sync-conflict"],
        postWriteValidation: {
          status: "invalid",
          code: "manifest-json-malformed",
          checkedGeneratedFileCount: 0,
          checkedManifestEntryCount: 0,
          checkedSourceMapEntryCount: 0,
          checksumsValidated: false,
          ownershipValidated: false,
          pathsValidated: false,
          versionsValidated: false,
          metadataBytesValidated: false,
        },
        changes: [{ kind: "modified", path: "AGENTS.md" }],
      }),
    );
    expect(outcome.errorCode).toBe("manifest-json-malformed");
    expect(outcome.exitCode).toBe(3);
  });

  it("normalizes created, updated, and unchanged paths", () => {
    const outcome = mapTransactionResultToCliOutcome(
      transactionResult({
        createdFiles: ["docs/rules.md", "AGENTS.md"],
        updatedFiles: ["AGENTS.md", "docs/rules.md"],
        unchangedFiles: ["README.md"],
      }),
    );
    expect(outcome.created).toEqual(["AGENTS.md", "docs/rules.md"]);
    expect(outcome.updated).toEqual(["AGENTS.md", "docs/rules.md"]);
    expect(outcome.unchanged).toEqual(["README.md"]);
  });

  it("sanitizes invalid error codes", () => {
    const outcome = mapTransactionResultToCliOutcome(
      transactionResult({
        status: "failed",
        rollbackAttempted: false,
        diagnostics: ["INVALID CODE"],
        changes: [{ kind: "conflict", path: "AGENTS.md" }],
      }),
    );
    expect(outcome.errorCode).toBe("transaction-failed");
  });
});

describe("mapDryRunToCliOutcome", () => {
  it("maps dry-run success to exit 0", () => {
    const outcome = mapDryRunToCliOutcome(
      dryRunResult({
        createdFiles: ["AGENTS.md"],
      }),
    );
    expect(outcome.exitCode).toBe(0);
    expect(outcome.status).toBe("success");
    expect(outcome.dryRun).toBe(true);
  });

  it("maps dry-run conflict to exit 3", () => {
    const outcome = mapDryRunToCliOutcome(
      dryRunResult({
        conflictFiles: ["AGENTS.md"],
        diagnostics: ["sync-conflict"],
      }),
    );
    expect(outcome.exitCode).toBe(3);
    expect(outcome.status).toBe("conflict");
    expect(outcome.errorCode).toBe("sync-conflict");
  });

  it("treats diagnostics without conflict files as conflict", () => {
    const outcome = mapDryRunToCliOutcome(
      dryRunResult({
        diagnostics: ["ownership-conflict"],
      }),
    );
    expect(outcome.exitCode).toBe(3);
    expect(outcome.status).toBe("conflict");
  });
});

describe("formatHumanOutcome", () => {
  it("formats dry-run success", () => {
    const text = formatHumanOutcome(
      mapDryRunToCliOutcome(
        dryRunResult({
          createdFiles: ["AGENTS.md"],
        }),
      ),
    );
    expect(text).toBe(
      [
        "Intentloom sync dry run.",
        "",
        "Created: 1",
        "Updated: 0",
        "Unchanged: 0",
        "Dry run — no files were changed.",
      ].join("\n"),
    );
  });

  it("formats dry-run conflict", () => {
    const text = formatHumanOutcome(
      mapDryRunToCliOutcome(
        dryRunResult({
          conflictFiles: ["AGENTS.md"],
          diagnostics: ["sync-conflict"],
        }),
      ),
    );
    expect(text).toContain("Intentloom sync dry run found conflicts.");
    expect(text).toContain("Reason: sync-conflict");
    expect(text).toContain("- AGENTS.md");
  });

  it("formats no-change success", () => {
    const text = formatHumanOutcome(
      mapTransactionResultToCliOutcome(transactionResult()),
    );
    expect(text).toContain("Intentloom sync completed. No changes required.");
  });

  it("formats normal success", () => {
    const text = formatHumanOutcome(
      mapTransactionResultToCliOutcome(
        transactionResult({
          createdFiles: ["AGENTS.md"],
          manifestUpdated: true,
        }),
      ),
    );
    expect(text).toContain("Intentloom sync completed.");
    expect(text).not.toContain("No changes required.");
    expect(text).toContain("Manifest updated: yes");
  });

  it("formats conflict", () => {
    const text = formatHumanOutcome(
      mapTransactionResultToCliOutcome(
        transactionResult({
          status: "failed",
          rollbackAttempted: false,
          diagnostics: ["sync-conflict"],
          changes: [{ kind: "conflict", path: "AGENTS.md" }],
        }),
      ),
    );
    expect(text).toContain("Intentloom sync was not applied.");
    expect(text).toContain("No project files were changed.");
  });

  it("formats rollback complete failure", () => {
    const text = formatHumanOutcome(
      mapTransactionResultToCliOutcome(
        transactionResult({
          status: "failed",
          failedStage: "manifest-stage",
          rollbackAttempted: true,
          rollbackCompleted: true,
          diagnostics: ["manifest-write-failed"],
        }),
      ),
    );
    expect(text).toBe(
      [
        "Intentloom sync failed during: manifest-stage",
        "Error: manifest-write-failed",
        "Rollback: completed",
        "Project state was restored.",
      ].join("\n"),
    );
  });

  it("formats rollback incomplete failure", () => {
    const text = formatHumanOutcome(
      mapTransactionResultToCliOutcome(
        transactionResult({
          status: "failed",
          failedStage: "generated-stage",
          rollbackAttempted: true,
          rollbackCompleted: false,
          rollbackFailures: [".aif/manifest.lock.json"],
          diagnostics: [
            "generated-write-failed",
            "transaction-rollback-incomplete",
          ],
        }),
      ),
    );
    expect(text).toContain("Rollback: incomplete");
    expect(text).toContain("Rollback error: transaction-rollback-incomplete");
    expect(text).toContain("- .aif/manifest.lock.json");
  });
});

describe("formatJsonOutcome", () => {
  it("serializes outcome objects exactly", () => {
    const outcome = mapTransactionResultToCliOutcome(
      transactionResult({
        createdFiles: ["AGENTS.md"],
        manifestUpdated: true,
      }),
    );
    expect(formatJsonOutcome(outcome)).toBe(JSON.stringify(outcome, null, 2));
  });
});
