import type {
  ApprovedApplyExecutionResult,
  ApprovedApplyRequest,
  ApprovedApplyRollbackFile,
} from "@intentloom/protocol";
import { validateApprovedApplyExecutionResult } from "@intentloom/validator";
import type { GeneratedFile } from "@intentloom/core";
import { evaluateApprovedApplyPlan } from "./approved-apply-gate.js";
import type { GeneratedFileSyncMode } from "./generated-file-sync-declared.js";
import { isDeclaredPathsOnlySyncMode } from "./generated-file-sync-declared.js";
import {
  synchronizeGeneratedFiles,
  nodeFileSystem,
  type FileSystem,
  type TransactionOptions,
} from "./index.js";
import { exactNeutronMutationPathSetsEqual } from "../../validator/src/neutron/mutation/neutron-mutation-path-set.js";
import {
  assertApprovedApplyBaselineCurrent,
  captureApprovedApplyBaseline,
  filesystemGuardingBaseline,
} from "./approved-apply-baseline.js";

export interface ApprovedApplyEngineOptions {
  readonly now?: () => number;
  readonly currentProjectStateDigest?: string;
  readonly fs?: FileSystem;
  readonly syncMode?: GeneratedFileSyncMode;
  readonly failAt?: TransactionOptions["failAt"];
  readonly rollbackFailPaths?: readonly string[];
  /**
   * Pre-captured rollback baseline. When set, Apply does not read a second
   * baseline and refuses to write if the project bytes changed.
   */
  readonly baseline?: readonly ApprovedApplyRollbackFile[];
}

export async function executeApprovedApplyPlan(
  request: ApprovedApplyRequest,
  filesToApply: readonly GeneratedFile[],
  options: ApprovedApplyEngineOptions = {},
): Promise<ApprovedApplyExecutionResult> {
  const gateOptions: {
    now?: () => number;
    currentProjectStateDigest?: string;
  } = {};
  if (options.now !== undefined) {
    gateOptions.now = options.now;
  }
  if (options.currentProjectStateDigest !== undefined) {
    gateOptions.currentProjectStateDigest = options.currentProjectStateDigest;
  }

  const gateResult = evaluateApprovedApplyPlan(request, gateOptions);

  if (!gateResult.passed) {
    return validateApprovedApplyExecutionResult({
      schemaVersion: 1,
      targetResourceId: request.targetResourceId,
      applied: false,
      gateResult,
      diagnostics: ["gate-evaluation-failed", ...gateResult.diagnostics],
    });
  }

  if (
    isDeclaredPathsOnlySyncMode(options.syncMode) &&
    !exactNeutronMutationPathSetsEqual(
      filesToApply.map((file) => file.path),
      request.plan.changedPaths,
    )
  ) {
    return validateApprovedApplyExecutionResult({
      schemaVersion: 1,
      targetResourceId: request.targetResourceId,
      applied: false,
      gateResult,
      diagnostics: ["path-scope-mismatch"],
    });
  }

  const fs = options.fs ?? nodeFileSystem;
  const targetRoot = request.plan.targetRoot;
  const diagnostics: string[] = [];
  const rollbackFiles =
    options.baseline ??
    (await captureApprovedApplyBaseline(
      targetRoot,
      filesToApply.map((file) => file.path),
      fs,
    ));
  if (options.baseline !== undefined) {
    await assertApprovedApplyBaselineCurrent(targetRoot, rollbackFiles, fs);
  }

  const syncFs =
    options.baseline === undefined
      ? fs
      : filesystemGuardingBaseline(fs, targetRoot, rollbackFiles);
  const syncResult = await synchronizeGeneratedFiles(
    targetRoot,
    filesToApply,
    syncFs,
    declaredPathSyncOptions(options),
  );

  if (syncResult.status !== "success") {
    diagnostics.push(`transaction-failed:${syncResult.status}`);
    if (syncResult.failedStage !== undefined) {
      diagnostics.push(`failed-stage:${syncResult.failedStage}`);
    }
    if (syncResult.rollbackAttempted) {
      diagnostics.push("rollback-attempted");
    }
    if (syncResult.rollbackFailures && syncResult.rollbackFailures.length > 0) {
      diagnostics.push(
        `rollback-failures:${syncResult.rollbackFailures.join(",")}`,
      );
    }
    return validateApprovedApplyExecutionResult({
      schemaVersion: 1,
      targetResourceId: request.targetResourceId,
      applied: false,
      gateResult,
      rollbackEvidence: {
        schemaVersion: 1,
        planDigest: request.plan.planDigest,
        targetRoot,
        rollbackFiles,
      },
      diagnostics,
    });
  }

  return validateApprovedApplyExecutionResult({
    schemaVersion: 1,
    targetResourceId: request.targetResourceId,
    applied: true,
    gateResult,
    rollbackEvidence: {
      schemaVersion: 1,
      planDigest: request.plan.planDigest,
      targetRoot,
      rollbackFiles,
    },
    diagnostics: [],
  });
}

function declaredPathSyncOptions(
  options: ApprovedApplyEngineOptions,
): TransactionOptions {
  return {
    ...(options.syncMode !== undefined ? { syncMode: options.syncMode } : {}),
    ...(options.failAt !== undefined ? { failAt: options.failAt } : {}),
    ...(options.rollbackFailPaths !== undefined
      ? { rollbackFailPaths: options.rollbackFailPaths }
      : {}),
  };
}
