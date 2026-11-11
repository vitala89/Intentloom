import { dirname } from "node:path";
import type { GeneratedFile } from "@intentloom/core";
import type { FileSystem } from "../host-file-system.js";
import { inside } from "../project-path.js";
import {
  planOwnedChanges,
  prepareOwnedTransaction,
  type OwnedTransactionFiles,
  type OwnedWritePlan,
} from "./generated-file-transaction-plan.js";
import {
  PostWriteValidationFailure,
  validateCommittedOwnershipState,
} from "./post-write-consistency.js";
import type {
  PostWriteValidationResult,
  TransactionOptions,
  TransactionResult,
  TransactionStage,
} from "./transaction-contracts.js";
import {
  lockPath,
  sourceMapPath,
  type TransactionMetadata,
} from "./transaction-metadata.js";
import {
  collisionPlan,
  noncanonicalPathPlan,
  safeDestination,
} from "./transaction-path-safety.js";
import { rollbackOwnedGeneratedFiles } from "./transaction-rollback.js";
import { rejectedBeforeWrite } from "./transaction-summary.js";

interface StageCursor {
  current: TransactionStage;
}

export async function commitOwnedGeneratedFiles(
  root: string,
  files: readonly GeneratedFile[],
  fs: FileSystem,
  options: TransactionOptions = {},
  validatedMetadata?: TransactionMetadata,
): Promise<TransactionResult> {
  const rejected = rejectedOwnedPlan(files);
  if (rejected) return rejected;
  const prepared = prepareOwnedTransaction(files, validatedMetadata);
  const planned = await planOwnedChanges(root, prepared, fs);
  const stage: StageCursor = { current: "generated-stage" };
  let postWriteValidation: PostWriteValidationResult | undefined;
  const backups = new Map<string, string>();
  const created: string[] = [];
  try {
    await writeOwnedFiles(
      root,
      prepared.transactionFiles,
      fs,
      options,
      stage,
      backups,
      created,
    );
    postWriteValidation = await validateOwnedCommit(
      root,
      prepared,
      planned,
      fs,
      options,
      stage,
    );
    injectStage(stage, options, "success-cleanup");
    return ownedSuccess(planned, postWriteValidation);
  } catch (error) {
    return ownedFailure(
      root,
      fs,
      options,
      planned,
      stage,
      backups,
      created,
      error,
      postWriteValidation,
    );
  }
}

function rejectedOwnedPlan(
  files: readonly GeneratedFile[],
): TransactionResult | null {
  const collision = collisionPlan(files);
  if (collision) return rejectedBeforeWrite(collision);
  const invalidPath = noncanonicalPathPlan(files);
  if (invalidPath) return rejectedBeforeWrite(invalidPath);
  return null;
}

function injectStage(
  stage: StageCursor,
  options: TransactionOptions,
  candidate: TransactionStage,
): void {
  stage.current = candidate;
  if (options.failAt === candidate) throw new Error(`injected:${candidate}`);
}

async function writeOwnedFiles(
  root: string,
  transactionFiles: readonly GeneratedFile[],
  fs: FileSystem,
  options: TransactionOptions,
  stage: StageCursor,
  backups: Map<string, string>,
  created: string[],
): Promise<void> {
  for (const candidate of [
    "generated-stage",
    "manifest-stage",
    "source-map-stage",
  ] as const)
    injectStage(stage, options, candidate);
  for (const file of transactionFiles) {
    injectStage(stage, options, commitStage(file.path));
    const path = inside(root, file.path);
    await safeDestination(root, path, fs);
    if (await fs.exists(path)) backups.set(path, await fs.read(path));
    else created.push(path);
    await fs.mkdir(dirname(path));
    await fs.write(path, file.content);
  }
}

function commitStage(path: string): TransactionStage {
  if (path === lockPath) return "manifest-finalize";
  if (path === sourceMapPath) return "source-map-finalize";
  return "generated-commit";
}

async function validateOwnedCommit(
  root: string,
  prepared: OwnedTransactionFiles,
  planned: OwnedWritePlan,
  fs: FileSystem,
  options: TransactionOptions,
  stage: StageCursor,
): Promise<PostWriteValidationResult> {
  injectStage(stage, options, "post-write-consistency");
  await options.corruptAfterFinalization?.({ root, fileSystem: fs });
  const postWriteValidation = await validateCommittedOwnershipState({
    root,
    files: prepared.normalized,
    manifestBytes: prepared.manifest,
    sourceMapBytes: prepared.sourceMap,
    createdGeneratedPaths: planned.createdGeneratedPaths,
    fs,
  });
  if (postWriteValidation.status === "invalid")
    throw new PostWriteValidationFailure(postWriteValidation);
  return postWriteValidation;
}

function ownedSuccess(
  planned: OwnedWritePlan,
  postWriteValidation: PostWriteValidationResult,
): TransactionResult {
  return {
    ...planned.proposal,
    status: "success",
    rollbackAttempted: false,
    rollbackCompleted: true,
    rollbackFailures: [],
    ...planned.summary,
    consistencyValidated: true,
    cleanupCompleted: true,
    postWriteValidation,
  };
}

async function ownedFailure(
  root: string,
  fs: FileSystem,
  options: TransactionOptions,
  planned: OwnedWritePlan,
  stage: StageCursor,
  backups: ReadonlyMap<string, string>,
  created: readonly string[],
  error: unknown,
  postWriteValidation: PostWriteValidationResult | undefined,
): Promise<TransactionResult> {
  const validation =
    error instanceof PostWriteValidationFailure
      ? error.validation
      : postWriteValidation;
  const rollbackFailures = await rollbackOwnedGeneratedFiles(
    root,
    fs,
    backups,
    created,
    options.rollbackFailPaths,
    error,
  );
  const originalError = error instanceof Error ? error.message : String(error);
  return {
    ...planned.proposal,
    status: "failed",
    failedStage: stage.current,
    diagnostics:
      rollbackFailures.length === 0
        ? [originalError]
        : [originalError, "transaction-rollback-incomplete"],
    rollbackAttempted: true,
    rollbackCompleted: rollbackFailures.length === 0,
    rollbackFailures,
    ...planned.summary,
    consistencyValidated: validation?.status === "valid",
    cleanupCompleted: false,
    ...(validation === undefined ? {} : { postWriteValidation: validation }),
  };
}
