import type {
  ApprovedApplyExecutionResult,
  ApprovedApplyRequest,
  ApprovedApplyRollbackFile,
} from "@intentloom/protocol";
import { validateApprovedApplyExecutionResult } from "@intentloom/validator";
import type { GeneratedFile } from "@intentloom/core";
import { evaluateApprovedApplyPlan } from "./approved-apply-gate.js";
import {
  synchronizeGeneratedFiles,
  nodeFileSystem,
  type FileSystem,
} from "./index.js";

export interface ApprovedApplyEngineOptions {
  readonly now?: () => number;
  readonly currentProjectStateDigest?: string;
  readonly fs?: FileSystem;
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

  const fs = options.fs ?? nodeFileSystem;
  const targetRoot = request.plan.targetRoot;
  const diagnostics: string[] = [];

  const rollbackFiles: ApprovedApplyRollbackFile[] = [];
  for (const file of filesToApply) {
    const filePath = file.path;
    const fullPath = `${targetRoot}/${filePath}`;
    try {
      if (await fs.exists(fullPath)) {
        const existingContent = await fs.read(fullPath);
        rollbackFiles.push({
          path: filePath,
          previousContent: existingContent,
        });
      } else {
        rollbackFiles.push({
          path: filePath,
          previousContent: null,
        });
      }
    } catch {
      rollbackFiles.push({
        path: filePath,
        previousContent: null,
      });
    }
  }

  const syncResult = await synchronizeGeneratedFiles(
    targetRoot,
    filesToApply,
    fs,
  );

  if (syncResult.status !== "success") {
    diagnostics.push(`transaction-failed:${syncResult.status}`);
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
