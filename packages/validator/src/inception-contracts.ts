import type {
  InceptionConflict,
  InceptionQuestion,
  InceptionRetentionState,
  InceptionSessionDeleteResult,
  InceptionSessionExport,
  VersionedInceptionSession,
  VersionedInceptionSummary,
} from "@intentloom/protocol";
import {
  INCEPTION_CONFLICT_LIST_SCHEMA_URN,
  INCEPTION_QUESTION_LIST_SCHEMA_URN,
  INCEPTION_RETENTION_STATE_SCHEMA_URN,
  INCEPTION_SESSION_DELETE_SCHEMA_URN,
  INCEPTION_SESSION_EXPORT_SCHEMA_URN,
  INCEPTION_SESSION_SCHEMA_URN,
  INCEPTION_SUMMARY_SCHEMA_URN,
} from "@intentloom/protocol";
import {
  validateInceptionConflict,
  validateInceptionQuestion,
  validateInceptionSessionState,
} from "./inception-base.js";

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

export function createInceptionRetentionState(
  sessionId: string,
  status: InceptionRetentionState["status"],
  updatedAt = Date.now(),
): InceptionRetentionState {
  return {
    schemaVersion: INCEPTION_RETENTION_STATE_SCHEMA_URN,
    sessionId,
    status,
    updatedAt,
  };
}

export function validateInceptionRetentionState(
  value: unknown,
): InceptionRetentionState {
  if (typeof value !== "object" || value === null)
    throw new Error("Invalid inception retention state: expected object");
  assertSchemaVersion(value, "retention", INCEPTION_RETENTION_STATE_SCHEMA_URN);
  const record = value as InceptionRetentionState;
  if (
    record.status !== "active" &&
    record.status !== "exported" &&
    record.status !== "deleted"
  )
    throw new Error("Invalid retention.status");
  return record;
}

export function validateVersionedInceptionSession(
  value: unknown,
): VersionedInceptionSession {
  if (typeof value !== "object" || value === null)
    throw new Error("Invalid versioned inception session: expected object");
  assertSchemaVersion(value, "session envelope", INCEPTION_SESSION_SCHEMA_URN);
  const record = value as VersionedInceptionSession;
  return {
    schemaVersion: INCEPTION_SESSION_SCHEMA_URN,
    session: validateInceptionSessionState(record.session),
    retention: validateInceptionRetentionState(record.retention),
  };
}

export function validateVersionedInceptionSummary(
  value: unknown,
): VersionedInceptionSummary {
  if (typeof value !== "object" || value === null)
    throw new Error("Invalid versioned inception summary: expected object");
  assertSchemaVersion(value, "summary", INCEPTION_SUMMARY_SCHEMA_URN);
  return value as VersionedInceptionSummary;
}

export function validateInceptionSessionExport(
  value: unknown,
): InceptionSessionExport {
  if (typeof value !== "object" || value === null)
    throw new Error("Invalid inception session export: expected object");
  assertSchemaVersion(value, "export", INCEPTION_SESSION_EXPORT_SCHEMA_URN);
  const record = value as InceptionSessionExport;
  return {
    schemaVersion: INCEPTION_SESSION_EXPORT_SCHEMA_URN,
    session: validateInceptionSessionState(record.session),
    retention: validateInceptionRetentionState(record.retention),
    exportedAt: record.exportedAt,
  };
}

export function validateInceptionSessionDeleteResult(
  value: unknown,
): InceptionSessionDeleteResult {
  if (typeof value !== "object" || value === null)
    throw new Error("Invalid inception session delete result: expected object");
  assertSchemaVersion(value, "delete", INCEPTION_SESSION_DELETE_SCHEMA_URN);
  const record = value as InceptionSessionDeleteResult;
  if (record.deleted !== true)
    throw new Error("Invalid delete result: deleted must be true");
  return record;
}

export function validateInceptionQuestionList(value: unknown): {
  readonly schemaVersion: typeof INCEPTION_QUESTION_LIST_SCHEMA_URN;
  readonly sessionId: string;
  readonly questions: readonly InceptionQuestion[];
  readonly pendingQuestionIds: readonly string[];
} {
  if (typeof value !== "object" || value === null)
    throw new Error("Invalid inception question list: expected object");
  assertSchemaVersion(
    value,
    "question list",
    INCEPTION_QUESTION_LIST_SCHEMA_URN,
  );
  const record = value as {
    sessionId: string;
    questions: unknown;
    pendingQuestionIds: unknown;
  };
  const questions = Array.isArray(record.questions)
    ? record.questions.map((item) => validateInceptionQuestion(item))
    : [];
  const pendingQuestionIds = Array.isArray(record.pendingQuestionIds)
    ? record.pendingQuestionIds.filter(
        (item): item is string => typeof item === "string",
      )
    : [];
  return {
    schemaVersion: INCEPTION_QUESTION_LIST_SCHEMA_URN,
    sessionId: record.sessionId,
    questions,
    pendingQuestionIds,
  };
}

export function validateInceptionConflictList(value: unknown): {
  readonly schemaVersion: typeof INCEPTION_CONFLICT_LIST_SCHEMA_URN;
  readonly sessionId: string;
  readonly conflicts: readonly InceptionConflict[];
} {
  if (typeof value !== "object" || value === null)
    throw new Error("Invalid inception conflict list: expected object");
  assertSchemaVersion(
    value,
    "conflict list",
    INCEPTION_CONFLICT_LIST_SCHEMA_URN,
  );
  const record = value as { sessionId: string; conflicts: unknown };
  const conflicts = Array.isArray(record.conflicts)
    ? record.conflicts.map((item) => validateInceptionConflict(item))
    : [];
  return {
    schemaVersion: INCEPTION_CONFLICT_LIST_SCHEMA_URN,
    sessionId: record.sessionId,
    conflicts,
  };
}
