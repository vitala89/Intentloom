import type {
  FoundationScaffoldApplyResult,
  FoundationScaffoldRollbackResult,
  ScaffoldResult,
} from "@intentloom/protocol";
import {
  FOUNDATION_SCAFFOLD_APPLY_SCHEMA_URN,
  FOUNDATION_SCAFFOLD_ROLLBACK_SCHEMA_URN,
} from "@intentloom/protocol";
import {
  validateFoundationScaffoldApplyResult,
  validateFoundationScaffoldRollbackResult,
} from "@intentloom/validator";
import { getFoundationScaffoldPlan } from "./foundation-scaffold-store.js";
import { validateProjectScaffoldPlan } from "./foundation-scaffold.js";
import { revalidateFoundationScaffoldApply } from "./foundation-scaffold-apply-revalidation.js";
import {
  getFoundationScaffoldApplyResult,
  setFoundationScaffoldApplyResult,
} from "./foundation-scaffold-apply-store.js";
import {
  applyProjectScaffold as applyInceptionScaffold,
  rollbackProjectScaffold as rollbackInceptionScaffold,
} from "./inception-scaffold-apply.js";

export interface FoundationScaffoldApplyOptions {
  readonly fileWriter?: (path: string, content: string) => void;
  readonly existingFiles?: Record<string, string>;
  readonly existingPaths?: readonly string[];
  readonly grantedCapabilities?: readonly string[];
  readonly rootIsSymlink?: boolean;
  readonly now?: number;
}

export interface FoundationScaffoldRollbackOptions {
  readonly fileWriter?: (path: string, content: string | null) => void;
  readonly now?: number;
}

function requireStoredPlan(workshopId: string, planId: string) {
  const record = getFoundationScaffoldPlan(workshopId, planId);
  if (!record) {
    throw new Error(
      `No scaffold plan '${planId}' found for workshop '${workshopId}'`,
    );
  }
  return record;
}

export function applyFoundationProjectScaffold(
  workshopId: string,
  planId: string,
  options: FoundationScaffoldApplyOptions = {},
): FoundationScaffoldApplyResult {
  validateProjectScaffoldPlan(workshopId, planId);
  const record = requireStoredPlan(workshopId, planId);
  const { approval, revalidatedAt } = revalidateFoundationScaffoldApply({
    workshopId,
    record,
    ...(options.existingPaths !== undefined
      ? { existingPaths: options.existingPaths }
      : {}),
    ...(options.existingFiles !== undefined
      ? { existingFiles: options.existingFiles }
      : {}),
    grantedCapabilities: options.grantedCapabilities ?? [
      "filesystem.write",
      "scaffold.apply",
    ],
    ...(options.rootIsSymlink !== undefined
      ? { rootIsSymlink: options.rootIsSymlink }
      : {}),
    ...(options.now !== undefined ? { now: options.now } : {}),
  });

  const applyResult: ScaffoldResult = applyInceptionScaffold(
    record.plan,
    approval,
    {
      ...(options.fileWriter ? { fileWriter: options.fileWriter } : {}),
      ...(options.existingFiles
        ? { existingFiles: options.existingFiles }
        : {}),
    },
  );

  setFoundationScaffoldApplyResult(workshopId, planId, applyResult);

  return validateFoundationScaffoldApplyResult({
    schemaVersion: FOUNDATION_SCAFFOLD_APPLY_SCHEMA_URN,
    workshopId,
    planId,
    result: applyResult,
    revalidatedAt,
  });
}

export function rollbackFoundationProjectScaffold(
  workshopId: string,
  planId: string,
  options: FoundationScaffoldRollbackOptions = {},
): FoundationScaffoldRollbackResult {
  requireStoredPlan(workshopId, planId);
  const stored = getFoundationScaffoldApplyResult(workshopId, planId);
  if (!stored) {
    throw new Error(
      `No scaffold apply result found for plan '${planId}' in workshop '${workshopId}'`,
    );
  }
  if (stored.status !== "applied" && stored.status !== "failed") {
    throw new Error(
      `Cannot rollback scaffold plan '${planId}' with status '${stored.status}'`,
    );
  }

  const rolledBackAt = options.now ?? Date.now();
  const rollbackResult = rollbackInceptionScaffold(stored, options.fileWriter);
  setFoundationScaffoldApplyResult(workshopId, planId, rollbackResult);

  return validateFoundationScaffoldRollbackResult({
    schemaVersion: FOUNDATION_SCAFFOLD_ROLLBACK_SCHEMA_URN,
    workshopId,
    planId,
    result: rollbackResult,
    rolledBackAt,
  });
}

export { clearFoundationScaffoldApplyResults } from "./foundation-scaffold-apply-store.js";
