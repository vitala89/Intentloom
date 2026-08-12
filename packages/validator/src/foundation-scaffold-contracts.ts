import type {
  FoundationScaffoldApplyResult,
  FoundationScaffoldCompareResult,
  FoundationScaffoldGetResult,
  FoundationScaffoldPlanRecord,
  FoundationScaffoldPrepareResult,
  FoundationScaffoldRollbackResult,
  FoundationScaffoldTemplateVersion,
  FoundationScaffoldValidateResult,
} from "@intentloom/protocol";
import {
  FOUNDATION_SCAFFOLD_APPLY_SCHEMA_URN,
  FOUNDATION_SCAFFOLD_COMPARE_SCHEMA_URN,
  FOUNDATION_SCAFFOLD_GET_SCHEMA_URN,
  FOUNDATION_SCAFFOLD_PLAN_SCHEMA_URN,
  FOUNDATION_SCAFFOLD_PREPARE_SCHEMA_URN,
  FOUNDATION_SCAFFOLD_ROLLBACK_SCHEMA_URN,
  FOUNDATION_SCAFFOLD_VALIDATE_SCHEMA_URN,
} from "@intentloom/protocol";
import {
  validateScaffoldPlan,
  validateScaffoldResult,
} from "./inception-scaffold.js";

function assertSchemaVersion(
  value: unknown,
  field: string,
  expected: string,
): void {
  if (
    typeof value !== "object" ||
    value === null ||
    (value as Record<string, unknown>).schemaVersion !== expected
  ) {
    throw new Error(`Invalid ${field}: unsupported schema version`);
  }
}

function assertNonEmptyString(value: unknown, field: string): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`Invalid ${field}: expected non-empty string`);
  }
  return value;
}

function assertStringArray(value: unknown, field: string): readonly string[] {
  if (
    !Array.isArray(value) ||
    !value.every((entry) => typeof entry === "string")
  ) {
    throw new Error(`Invalid ${field}: expected string array`);
  }
  return value;
}

function validateTemplateVersions(
  value: unknown,
): readonly FoundationScaffoldTemplateVersion[] {
  if (!Array.isArray(value)) {
    throw new Error(
      "Invalid foundation scaffold templateVersions: expected array",
    );
  }
  for (const entry of value) {
    if (typeof entry !== "object" || entry === null) {
      throw new Error("Invalid foundation scaffold templateVersions entry");
    }
    const record = entry as Record<string, unknown>;
    assertNonEmptyString(record.id, "templateVersions.id");
    assertNonEmptyString(record.version, "templateVersions.version");
  }
  return value as readonly FoundationScaffoldTemplateVersion[];
}

export function validateFoundationScaffoldPlanRecord(
  value: unknown,
): FoundationScaffoldPlanRecord {
  if (typeof value !== "object" || value === null) {
    throw new Error("Invalid foundation scaffold plan: expected object");
  }
  assertSchemaVersion(
    value,
    "foundation scaffold plan",
    FOUNDATION_SCAFFOLD_PLAN_SCHEMA_URN,
  );
  const record = value as Record<string, unknown>;
  assertNonEmptyString(
    record.workshopId,
    "foundation scaffold plan.workshopId",
  );
  validateScaffoldPlan(record.plan);
  assertNonEmptyString(
    record.planDigest,
    "foundation scaffold plan.planDigest",
  );
  if (
    typeof record.expiresAt !== "number" ||
    !Number.isFinite(record.expiresAt)
  ) {
    throw new Error("Invalid foundation scaffold plan.expiresAt");
  }
  assertStringArray(
    record.verificationChecks,
    "foundation scaffold plan.verificationChecks",
  );
  assertStringArray(
    record.requiredCapabilities,
    "foundation scaffold plan.requiredCapabilities",
  );
  validateTemplateVersions(record.templateVersions);
  assertNonEmptyString(record.dryRun, "foundation scaffold plan.dryRun");
  return value as FoundationScaffoldPlanRecord;
}

export function validateFoundationScaffoldPrepareResult(
  value: unknown,
): FoundationScaffoldPrepareResult {
  if (typeof value !== "object" || value === null) {
    throw new Error("Invalid foundation scaffold prepare: expected object");
  }
  assertSchemaVersion(
    value,
    "foundation scaffold prepare",
    FOUNDATION_SCAFFOLD_PREPARE_SCHEMA_URN,
  );
  const record = value as Record<string, unknown>;
  assertNonEmptyString(
    record.workshopId,
    "foundation scaffold prepare.workshopId",
  );
  validateFoundationScaffoldPlanRecord(record.record);
  if (record.workshopUnchanged !== true) {
    throw new Error(
      "Invalid foundation scaffold prepare.workshopUnchanged: expected true",
    );
  }
  return value as FoundationScaffoldPrepareResult;
}

export function validateFoundationScaffoldGetResult(
  value: unknown,
): FoundationScaffoldGetResult {
  if (typeof value !== "object" || value === null) {
    throw new Error("Invalid foundation scaffold get: expected object");
  }
  assertSchemaVersion(
    value,
    "foundation scaffold get",
    FOUNDATION_SCAFFOLD_GET_SCHEMA_URN,
  );
  const record = value as Record<string, unknown>;
  assertNonEmptyString(record.workshopId, "foundation scaffold get.workshopId");
  validateFoundationScaffoldPlanRecord(record.record);
  return value as FoundationScaffoldGetResult;
}

export function validateFoundationScaffoldCompareResult(
  value: unknown,
): FoundationScaffoldCompareResult {
  if (typeof value !== "object" || value === null) {
    throw new Error("Invalid foundation scaffold compare: expected object");
  }
  assertSchemaVersion(
    value,
    "foundation scaffold compare",
    FOUNDATION_SCAFFOLD_COMPARE_SCHEMA_URN,
  );
  const record = value as Record<string, unknown>;
  assertNonEmptyString(
    record.workshopId,
    "foundation scaffold compare.workshopId",
  );
  assertNonEmptyString(record.planId, "foundation scaffold compare.planId");
  assertStringArray(record.created, "foundation scaffold compare.created");
  assertStringArray(record.skipped, "foundation scaffold compare.skipped");
  assertStringArray(
    record.collisions,
    "foundation scaffold compare.collisions",
  );
  return value as FoundationScaffoldCompareResult;
}

export function validateFoundationScaffoldValidateResult(
  value: unknown,
): FoundationScaffoldValidateResult {
  if (typeof value !== "object" || value === null) {
    throw new Error("Invalid foundation scaffold validate: expected object");
  }
  assertSchemaVersion(
    value,
    "foundation scaffold validate",
    FOUNDATION_SCAFFOLD_VALIDATE_SCHEMA_URN,
  );
  const record = value as Record<string, unknown>;
  assertNonEmptyString(
    record.workshopId,
    "foundation scaffold validate.workshopId",
  );
  assertNonEmptyString(record.planId, "foundation scaffold validate.planId");
  if (record.valid !== true) {
    throw new Error(
      "Invalid foundation scaffold validate.valid: expected true",
    );
  }
  assertNonEmptyString(
    record.planDigest,
    "foundation scaffold validate.planDigest",
  );
  if (record.approvalRequired !== true) {
    throw new Error(
      "Invalid foundation scaffold validate.approvalRequired: expected true",
    );
  }
  if (
    typeof record.expiresAt !== "number" ||
    !Number.isFinite(record.expiresAt)
  ) {
    throw new Error("Invalid foundation scaffold validate.expiresAt");
  }
  return value as FoundationScaffoldValidateResult;
}

export function validateFoundationScaffoldApplyResult(
  value: unknown,
): FoundationScaffoldApplyResult {
  if (typeof value !== "object" || value === null) {
    throw new Error("Invalid foundation scaffold apply: expected object");
  }
  assertSchemaVersion(
    value,
    "foundation scaffold apply",
    FOUNDATION_SCAFFOLD_APPLY_SCHEMA_URN,
  );
  const record = value as Record<string, unknown>;
  assertNonEmptyString(
    record.workshopId,
    "foundation scaffold apply.workshopId",
  );
  assertNonEmptyString(record.planId, "foundation scaffold apply.planId");
  validateScaffoldResult(record.result);
  if (
    typeof record.revalidatedAt !== "number" ||
    !Number.isFinite(record.revalidatedAt)
  ) {
    throw new Error("Invalid foundation scaffold apply.revalidatedAt");
  }
  return value as FoundationScaffoldApplyResult;
}

export function validateFoundationScaffoldRollbackResult(
  value: unknown,
): FoundationScaffoldRollbackResult {
  if (typeof value !== "object" || value === null) {
    throw new Error("Invalid foundation scaffold rollback: expected object");
  }
  assertSchemaVersion(
    value,
    "foundation scaffold rollback",
    FOUNDATION_SCAFFOLD_ROLLBACK_SCHEMA_URN,
  );
  const record = value as Record<string, unknown>;
  assertNonEmptyString(
    record.workshopId,
    "foundation scaffold rollback.workshopId",
  );
  assertNonEmptyString(record.planId, "foundation scaffold rollback.planId");
  validateScaffoldResult(record.result);
  if (
    typeof record.rolledBackAt !== "number" ||
    !Number.isFinite(record.rolledBackAt)
  ) {
    throw new Error("Invalid foundation scaffold rollback.rolledBackAt");
  }
  return value as FoundationScaffoldRollbackResult;
}
