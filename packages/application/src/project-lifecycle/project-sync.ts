import type { GeneratedFile } from "@intentloom/core";
import {
  lockPath,
  sourceMapPath,
  type TransactionMetadata,
} from "../generated-file/transaction-metadata.js";
import { transactionSummary } from "../generated-file/transaction-summary.js";
import type {
  TransactionOptions,
  TransactionResult,
} from "../generated-file/transaction-contracts.js";
import type { FileSystem } from "../host-file-system.js";
import type { Change, Plan } from "../project-change.js";
import { desired } from "./desired-generated-state.js";
import { plan } from "./project-plan.js";
import type {
  SyncDryRunResult,
  SyncOptions,
} from "./project-lifecycle-contracts.js";

export type GeneratedFileSynchronizer = (
  root: string,
  files: readonly GeneratedFile[],
  fs: FileSystem,
  options: TransactionOptions,
  validatedMetadata?: TransactionMetadata,
) => Promise<TransactionResult>;

export async function executeProjectSync(
  options: SyncOptions,
  fs: FileSystem,
  transactionOptions: TransactionOptions,
  synchronize: GeneratedFileSynchronizer,
): Promise<SyncDryRunResult | TransactionResult> {
  const proposal = await plan(options, fs, true);
  const desiredFiles = await desired(options);
  const payload = desiredFiles.filter(
    (file) => file.path !== lockPath && file.path !== sourceMapPath,
  );
  const blockingChanges = proposal.changes.filter((change) =>
    ["conflict", "modified", "security-error"].includes(change.kind),
  );
  if (options.dryRun)
    return syncDryRunResult(proposal, payload, blockingChanges);
  if (blockingChanges.length > 0 || proposal.diagnostics.length > 0)
    return rejectedSyncResult(proposal, payload);
  return synchronize(options.root, payload, fs, transactionOptions, {
    manifest: desiredFiles.find((file) => file.path === lockPath)!.content,
    sourceMap: desiredFiles.find((file) => file.path === sourceMapPath)!
      .content,
  });
}

function syncDryRunResult(
  proposal: Plan,
  payload: readonly GeneratedFile[],
  blockingChanges: readonly Change[],
): SyncDryRunResult {
  const summary = transactionSummary(payload, proposal.changes);
  return {
    ...proposal,
    dryRun: true,
    createdFiles: summary.createdFiles,
    updatedFiles: summary.updatedFiles,
    unchangedFiles: summary.unchangedFiles,
    conflictFiles: blockingChanges.map((change) => change.path).sort(),
  };
}

function rejectedSyncResult(
  proposal: Plan,
  payload: readonly GeneratedFile[],
): TransactionResult {
  return {
    ...proposal,
    diagnostics:
      proposal.diagnostics.length > 0
        ? proposal.diagnostics
        : ["sync-conflict"],
    status: "failed",
    rollbackAttempted: false,
    rollbackCompleted: true,
    rollbackFailures: [],
    ...transactionSummary(payload, proposal.changes),
    manifestUpdated: false,
    sourceMapUpdated: false,
    consistencyValidated: false,
    cleanupCompleted: false,
  };
}
