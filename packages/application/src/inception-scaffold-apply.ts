import type {
  ScaffoldPlan,
  BlueprintApproval,
  ScaffoldResult,
  ScaffoldBackupRecord,
} from "@intentloom/protocol";
import {
  validateScaffoldPlan,
  validateBlueprintApproval,
  validateScaffoldResult,
} from "@intentloom/validator";

export interface ApplyScaffoldOptions {
  readonly fileWriter?: (path: string, content: string) => void;
  readonly existingFiles?: Record<string, string>;
}

export function applyProjectScaffold(
  plan: ScaffoldPlan,
  approval: BlueprintApproval,
  options?: ApplyScaffoldOptions,
): ScaffoldResult {
  const validatedPlan = validateScaffoldPlan(plan);
  const validatedApproval = validateBlueprintApproval(approval);

  if (validatedApproval.status !== "approved") {
    throw new Error(
      `Cannot apply scaffold plan: blueprint approval status is '${validatedApproval.status}'`,
    );
  }

  if (validatedPlan.blueprintDigest !== validatedApproval.blueprintDigest) {
    throw new Error(
      `Cannot apply scaffold plan: plan digest '${validatedPlan.blueprintDigest}' does not match approval digest '${validatedApproval.blueprintDigest}'`,
    );
  }

  const existing = options?.existingFiles ?? {};
  const writer = options?.fileWriter ?? (() => undefined);

  const backups: ScaffoldBackupRecord[] = [];
  const writtenFiles: string[] = [];
  const now = Date.now();

  try {
    for (const file of validatedPlan.files) {
      if (file.action === "skip") continue;

      const hasOriginal = Object.prototype.hasOwnProperty.call(
        existing,
        file.path,
      );
      const originalContent = hasOriginal
        ? (existing[file.path] ?? null)
        : null;

      backups.push({
        path: file.path,
        originalContent,
        created: !hasOriginal,
      });

      writer(file.path, file.content);
      writtenFiles.push(file.path);
    }

    return validateScaffoldResult({
      planId: validatedPlan.planId,
      root: validatedPlan.root,
      status: "applied",
      writtenFiles,
      backups,
      appliedAt: now,
    });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : String(err);

    // Roll back any partially written files byte-for-byte
    for (const b of backups) {
      writer(b.path, b.originalContent ?? "");
    }

    return validateScaffoldResult({
      planId: validatedPlan.planId,
      root: validatedPlan.root,
      status: "failed",
      writtenFiles: [],
      backups,
      error: `Scaffold apply failed and was rolled back: ${errorMessage}`,
      appliedAt: now,
    });
  }
}

export function rollbackProjectScaffold(
  result: ScaffoldResult,
  fileWriter?: (path: string, content: string | null) => void,
): ScaffoldResult {
  const validatedResult = validateScaffoldResult(result);
  const writer = fileWriter ?? (() => undefined);
  const now = Date.now();

  for (const backup of validatedResult.backups) {
    writer(backup.path, backup.originalContent);
  }

  return validateScaffoldResult({
    planId: validatedResult.planId,
    root: validatedResult.root,
    status: "rolled-back",
    writtenFiles: [],
    backups: validatedResult.backups,
    appliedAt: now,
  });
}
