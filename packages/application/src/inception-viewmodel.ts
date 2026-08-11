import type {
  InceptionAnswer,
  InceptionConflict,
  InceptionQuestion,
  InceptionRetentionState,
  InceptionSessionDeleteResult,
  InceptionSessionExport,
  InceptionSessionState,
  VersionedInceptionSession,
  VersionedInceptionSummary,
} from "@intentloom/protocol";
import {
  INCEPTION_CONFLICT_LIST_SCHEMA_URN,
  INCEPTION_QUESTION_LIST_SCHEMA_URN,
  INCEPTION_SESSION_DELETE_SCHEMA_URN,
  INCEPTION_SESSION_EXPORT_SCHEMA_URN,
  INCEPTION_SESSION_SCHEMA_URN,
  INCEPTION_SUMMARY_SCHEMA_URN,
} from "@intentloom/protocol";
import {
  createInceptionRetentionState,
  validateInceptionConflictList,
  validateInceptionQuestionList,
  validateInceptionSessionDeleteResult,
  validateInceptionSessionExport,
  validateVersionedInceptionSession,
  validateVersionedInceptionSummary,
} from "@intentloom/validator";
import type { InceptionSummary } from "./inception.js";

export function buildVersionedInceptionSession(
  session: InceptionSessionState,
  retention: InceptionRetentionState,
): VersionedInceptionSession {
  return validateVersionedInceptionSession({
    schemaVersion: INCEPTION_SESSION_SCHEMA_URN,
    session,
    retention,
  });
}

export function buildVersionedInceptionSummary(
  summary: InceptionSummary,
): VersionedInceptionSummary {
  return validateVersionedInceptionSummary({
    schemaVersion: INCEPTION_SUMMARY_SCHEMA_URN,
    ...summary,
  });
}

export function buildInceptionQuestionList(input: {
  readonly sessionId: string;
  readonly questions: readonly InceptionQuestion[];
  readonly answers: readonly InceptionAnswer[];
}): ReturnType<typeof validateInceptionQuestionList> {
  const answered = new Set(input.answers.map((answer) => answer.questionId));
  const pendingQuestionIds = input.questions
    .filter((question) => !answered.has(question.id))
    .map((question) => question.id);
  return validateInceptionQuestionList({
    schemaVersion: INCEPTION_QUESTION_LIST_SCHEMA_URN,
    sessionId: input.sessionId,
    questions: input.questions,
    pendingQuestionIds,
  });
}

export function buildInceptionConflictList(input: {
  readonly sessionId: string;
  readonly conflicts: readonly InceptionConflict[];
}): ReturnType<typeof validateInceptionConflictList> {
  return validateInceptionConflictList({
    schemaVersion: INCEPTION_CONFLICT_LIST_SCHEMA_URN,
    sessionId: input.sessionId,
    conflicts: input.conflicts,
  });
}

export function buildInceptionSessionExport(
  session: InceptionSessionState,
): InceptionSessionExport {
  return validateInceptionSessionExport({
    schemaVersion: INCEPTION_SESSION_EXPORT_SCHEMA_URN,
    session,
    retention: createInceptionRetentionState(session.id, "exported"),
    exportedAt: Date.now(),
  });
}

export function buildInceptionSessionDeleteResult(
  sessionId: string,
): InceptionSessionDeleteResult {
  return validateInceptionSessionDeleteResult({
    schemaVersion: INCEPTION_SESSION_DELETE_SCHEMA_URN,
    sessionId,
    deleted: true,
    deletedAt: Date.now(),
  });
}

export function buildInceptionSessionViewmodel(
  session: InceptionSessionState,
  retentionStatus: InceptionRetentionState["status"] = "active",
): VersionedInceptionSession {
  return buildVersionedInceptionSession(
    session,
    createInceptionRetentionState(
      session.id,
      retentionStatus,
      session.updatedAt,
    ),
  );
}
