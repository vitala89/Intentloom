import type {
  ExistingProjectFlowStep,
  ExistingProjectScanScope,
  ExistingProjectWorkspaceOverview,
} from "@intentloom/protocol";
import {
  EXISTING_PROJECT_SCAN_SCOPE_SCHEMA_URN,
  EXISTING_PROJECT_WORKSPACE_OVERVIEW_SCHEMA_URN,
} from "@intentloom/protocol";

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

function nonEmptyString(value: unknown, field: string): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`Invalid ${field}: expected non-empty string`);
  }
  return value;
}

function stringArray(value: unknown, field: string): readonly string[] {
  if (!Array.isArray(value)) {
    throw new Error(`Invalid ${field}: expected array`);
  }
  return value.map((entry, index) =>
    nonEmptyString(entry, `${field}[${index}]`),
  );
}

function validateFlowStep(value: unknown): ExistingProjectFlowStep {
  if (typeof value !== "object" || value === null) {
    throw new Error("Invalid flow step: expected object");
  }
  const record = value as ExistingProjectFlowStep;
  nonEmptyString(record.id, "flowStep.id");
  nonEmptyString(record.label, "flowStep.label");
  if (
    record.status !== "complete" &&
    record.status !== "partial" &&
    record.status !== "skipped" &&
    record.status !== "unavailable"
  ) {
    throw new Error("Invalid flowStep.status");
  }
  if (record.readOnly !== true) {
    throw new Error("Invalid flowStep.readOnly");
  }
  return record;
}

export function validateExistingProjectScanScope(
  value: unknown,
): ExistingProjectScanScope {
  if (value === "quick" || value === "standard" || value === "deep") {
    return value;
  }
  throw new Error("Invalid existing project scan scope");
}

export function validateExistingProjectWorkspaceOverview(
  value: unknown,
): ExistingProjectWorkspaceOverview {
  if (typeof value !== "object" || value === null) {
    throw new Error(
      "Invalid existing project workspace overview: expected object",
    );
  }
  assertSchemaVersion(
    value,
    "overview",
    EXISTING_PROJECT_WORKSPACE_OVERVIEW_SCHEMA_URN,
  );
  const record = value as ExistingProjectWorkspaceOverview;
  nonEmptyString(record.root, "root");
  nonEmptyString(record.projectId, "projectId");
  validateExistingProjectScanScope(record.scope);
  if (typeof record.preparedAt !== "number") {
    throw new Error("Invalid preparedAt");
  }
  if (record.readOnly !== true) {
    throw new Error("Invalid readOnly flag");
  }
  if (!Array.isArray(record.flowSteps)) {
    throw new Error("Invalid flowSteps");
  }
  record.flowSteps.forEach((step) => validateFlowStep(step));
  stringArray(record.inspect.detectedAdapters, "inspect.detectedAdapters");
  stringArray(
    record.specializedPacks.compatiblePackIds,
    "specializedPacks.compatiblePackIds",
  );
  return record;
}

export function createExistingProjectScanScopeRecord(
  scope: ExistingProjectScanScope,
): {
  readonly schemaVersion: typeof EXISTING_PROJECT_SCAN_SCOPE_SCHEMA_URN;
  readonly scope: ExistingProjectScanScope;
} {
  return {
    schemaVersion: EXISTING_PROJECT_SCAN_SCOPE_SCHEMA_URN,
    scope,
  };
}
