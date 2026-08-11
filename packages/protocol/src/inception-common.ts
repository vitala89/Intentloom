import type { InceptionSessionState } from "./inception.js";

export const INCEPTION_SESSION_SCHEMA_URN =
  "urn:intentloom:schema:inception-session:1" as const;

export const INCEPTION_QUESTION_SCHEMA_URN =
  "urn:intentloom:schema:inception-question:1" as const;

export const INCEPTION_ANSWER_SCHEMA_URN =
  "urn:intentloom:schema:inception-answer:1" as const;

export const INCEPTION_CONFLICT_SCHEMA_URN =
  "urn:intentloom:schema:inception-conflict:1" as const;

export const INCEPTION_SUMMARY_SCHEMA_URN =
  "urn:intentloom:schema:inception-summary:1" as const;

export const INCEPTION_RETENTION_STATE_SCHEMA_URN =
  "urn:intentloom:schema:inception-retention-state:1" as const;

export const INCEPTION_QUESTION_LIST_SCHEMA_URN =
  "urn:intentloom:schema:inception-question-list:1" as const;

export const INCEPTION_CONFLICT_LIST_SCHEMA_URN =
  "urn:intentloom:schema:inception-conflict-list:1" as const;

export const INCEPTION_SESSION_EXPORT_SCHEMA_URN =
  "urn:intentloom:schema:inception-session-export:1" as const;

export const INCEPTION_SESSION_DELETE_SCHEMA_URN =
  "urn:intentloom:schema:inception-session-delete:1" as const;

export type InceptionRetentionStatus = "active" | "exported" | "deleted";

export interface InceptionRetentionState {
  readonly schemaVersion: typeof INCEPTION_RETENTION_STATE_SCHEMA_URN;
  readonly sessionId: string;
  readonly status: InceptionRetentionStatus;
  readonly updatedAt: number;
}

export interface VersionedInceptionSession {
  readonly schemaVersion: typeof INCEPTION_SESSION_SCHEMA_URN;
  readonly session: InceptionSessionState;
  readonly retention: InceptionRetentionState;
}

export interface VersionedInceptionSummary {
  readonly schemaVersion: typeof INCEPTION_SUMMARY_SCHEMA_URN;
  readonly sessionId: string;
  readonly root: string;
  readonly idea: string;
  readonly status: string;
  readonly totalQuestions: number;
  readonly answeredQuestions: number;
  readonly pendingQuestions: number;
  readonly confirmedAnswers: number;
  readonly assumptionsCount: number;
  readonly constraintsCount: number;
  readonly alternativesCount: number;
}

export interface InceptionSessionExport {
  readonly schemaVersion: typeof INCEPTION_SESSION_EXPORT_SCHEMA_URN;
  readonly session: InceptionSessionState;
  readonly retention: InceptionRetentionState;
  readonly exportedAt: number;
}

export interface InceptionSessionDeleteResult {
  readonly schemaVersion: typeof INCEPTION_SESSION_DELETE_SCHEMA_URN;
  readonly sessionId: string;
  readonly deleted: true;
  readonly deletedAt: number;
}
