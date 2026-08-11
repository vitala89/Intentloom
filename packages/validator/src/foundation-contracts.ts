import type {
  FoundationConflict,
  FoundationQuestion,
  FoundationRetentionState,
  FoundationWorkshopDeleteResult,
  FoundationWorkshopExport,
  VersionedFoundationWorkshop,
  FoundationUnderstandingSummary,
  FoundationReadinessReport,
} from "@intentloom/protocol";
import {
  FOUNDATION_CONFLICT_LIST_SCHEMA_URN,
  FOUNDATION_QUESTION_LIST_SCHEMA_URN,
  FOUNDATION_RETENTION_STATE_SCHEMA_URN,
  FOUNDATION_WORKSHOP_DELETE_SCHEMA_URN,
  FOUNDATION_WORKSHOP_EXPORT_SCHEMA_URN,
  FOUNDATION_WORKSHOP_SCHEMA_URN,
  FOUNDATION_UNDERSTANDING_SUMMARY_SCHEMA_URN,
  FOUNDATION_READINESS_REPORT_SCHEMA_URN,
} from "@intentloom/protocol";
import {
  validateFoundationConflict,
  validateFoundationQuestion,
  validateFoundationWorkshopState,
} from "./foundation-base.js";
import { validateFoundationReadinessFinding } from "./foundation-entity-validators.js";

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

export function createFoundationRetentionState(
  workshopId: string,
  status: FoundationRetentionState["status"],
  updatedAt = Date.now(),
): FoundationRetentionState {
  return {
    schemaVersion: FOUNDATION_RETENTION_STATE_SCHEMA_URN,
    workshopId,
    status,
    updatedAt,
  };
}

export function validateFoundationRetentionState(
  value: unknown,
): FoundationRetentionState {
  if (typeof value !== "object" || value === null)
    throw new Error("Invalid foundation retention state: expected object");
  assertSchemaVersion(
    value,
    "retention",
    FOUNDATION_RETENTION_STATE_SCHEMA_URN,
  );
  const record = value as FoundationRetentionState;
  if (
    record.status !== "active" &&
    record.status !== "exported" &&
    record.status !== "deleted"
  )
    throw new Error("Invalid retention.status");
  return record;
}

export function validateVersionedFoundationWorkshop(
  value: unknown,
): VersionedFoundationWorkshop {
  if (typeof value !== "object" || value === null)
    throw new Error("Invalid versioned foundation workshop: expected object");
  assertSchemaVersion(
    value,
    "workshop envelope",
    FOUNDATION_WORKSHOP_SCHEMA_URN,
  );
  const record = value as VersionedFoundationWorkshop;
  return {
    schemaVersion: FOUNDATION_WORKSHOP_SCHEMA_URN,
    workshop: validateFoundationWorkshopState(record.workshop),
    retention: validateFoundationRetentionState(record.retention),
  };
}

export function validateFoundationUnderstandingSummary(
  value: unknown,
): FoundationUnderstandingSummary {
  if (typeof value !== "object" || value === null)
    throw new Error(
      "Invalid foundation understanding summary: expected object",
    );
  assertSchemaVersion(
    value,
    "understanding summary",
    FOUNDATION_UNDERSTANDING_SUMMARY_SCHEMA_URN,
  );
  return value as FoundationUnderstandingSummary;
}

export function validateFoundationReadinessReport(
  value: unknown,
): FoundationReadinessReport {
  if (typeof value !== "object" || value === null)
    throw new Error("Invalid foundation readiness report: expected object");
  assertSchemaVersion(
    value,
    "readiness report",
    FOUNDATION_READINESS_REPORT_SCHEMA_URN,
  );
  const record = value as FoundationReadinessReport;
  const findings = Array.isArray(record.findings)
    ? record.findings.map((item) => validateFoundationReadinessFinding(item))
    : [];
  return {
    schemaVersion: FOUNDATION_READINESS_REPORT_SCHEMA_URN,
    workshopId: record.workshopId,
    readinessStatus: record.readinessStatus,
    findings,
    blockingCount: record.blockingCount,
    warningCount: record.warningCount,
    evaluatedAt: record.evaluatedAt,
  };
}

export function validateFoundationWorkshopExport(
  value: unknown,
): FoundationWorkshopExport {
  if (typeof value !== "object" || value === null)
    throw new Error("Invalid foundation workshop export: expected object");
  assertSchemaVersion(value, "export", FOUNDATION_WORKSHOP_EXPORT_SCHEMA_URN);
  const record = value as FoundationWorkshopExport;
  return {
    schemaVersion: FOUNDATION_WORKSHOP_EXPORT_SCHEMA_URN,
    workshop: validateFoundationWorkshopState(record.workshop),
    retention: validateFoundationRetentionState(record.retention),
    exportedAt: record.exportedAt,
  };
}

export function validateFoundationWorkshopDeleteResult(
  value: unknown,
): FoundationWorkshopDeleteResult {
  if (typeof value !== "object" || value === null)
    throw new Error(
      "Invalid foundation workshop delete result: expected object",
    );
  assertSchemaVersion(value, "delete", FOUNDATION_WORKSHOP_DELETE_SCHEMA_URN);
  const record = value as FoundationWorkshopDeleteResult;
  if (record.deleted !== true)
    throw new Error("Invalid delete result: deleted must be true");
  return record;
}

export function validateFoundationQuestionList(value: unknown): {
  readonly schemaVersion: typeof FOUNDATION_QUESTION_LIST_SCHEMA_URN;
  readonly workshopId: string;
  readonly questions: readonly FoundationQuestion[];
  readonly pendingQuestionIds: readonly string[];
} {
  if (typeof value !== "object" || value === null)
    throw new Error("Invalid foundation question list: expected object");
  assertSchemaVersion(
    value,
    "question list",
    FOUNDATION_QUESTION_LIST_SCHEMA_URN,
  );
  const record = value as {
    workshopId: string;
    questions: unknown;
    pendingQuestionIds: unknown;
  };
  const questions = Array.isArray(record.questions)
    ? record.questions.map((item) => validateFoundationQuestion(item))
    : [];
  const pendingQuestionIds = Array.isArray(record.pendingQuestionIds)
    ? record.pendingQuestionIds.filter(
        (item): item is string => typeof item === "string",
      )
    : [];
  return {
    schemaVersion: FOUNDATION_QUESTION_LIST_SCHEMA_URN,
    workshopId: record.workshopId,
    questions,
    pendingQuestionIds,
  };
}

export function validateFoundationConflictList(value: unknown): {
  readonly schemaVersion: typeof FOUNDATION_CONFLICT_LIST_SCHEMA_URN;
  readonly workshopId: string;
  readonly conflicts: readonly FoundationConflict[];
} {
  if (typeof value !== "object" || value === null)
    throw new Error("Invalid foundation conflict list: expected object");
  assertSchemaVersion(
    value,
    "conflict list",
    FOUNDATION_CONFLICT_LIST_SCHEMA_URN,
  );
  const record = value as { workshopId: string; conflicts: unknown };
  const conflicts = Array.isArray(record.conflicts)
    ? record.conflicts.map((item) => validateFoundationConflict(item))
    : [];
  return {
    schemaVersion: FOUNDATION_CONFLICT_LIST_SCHEMA_URN,
    workshopId: record.workshopId,
    conflicts,
  };
}
