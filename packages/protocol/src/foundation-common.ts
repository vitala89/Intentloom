import type { FoundationWorkshopState } from "./foundation-workshop.js";

export const FOUNDATION_WORKSHOP_SCHEMA_URN =
  "urn:intentloom:schema:foundation-workshop:1" as const;

export const FOUNDATION_QUESTION_LIST_SCHEMA_URN =
  "urn:intentloom:schema:foundation-question-list:1" as const;

export const FOUNDATION_CONFLICT_LIST_SCHEMA_URN =
  "urn:intentloom:schema:foundation-conflict-list:1" as const;

export const FOUNDATION_UNDERSTANDING_SUMMARY_SCHEMA_URN =
  "urn:intentloom:schema:foundation-understanding-summary:1" as const;

export const FOUNDATION_READINESS_REPORT_SCHEMA_URN =
  "urn:intentloom:schema:foundation-readiness-report:1" as const;

export const FOUNDATION_RETENTION_STATE_SCHEMA_URN =
  "urn:intentloom:schema:foundation-retention-state:1" as const;

export const FOUNDATION_WORKSHOP_EXPORT_SCHEMA_URN =
  "urn:intentloom:schema:foundation-workshop-export:1" as const;

export const FOUNDATION_WORKSHOP_DELETE_SCHEMA_URN =
  "urn:intentloom:schema:foundation-workshop-delete:1" as const;

export type FoundationRetentionStatus = "active" | "exported" | "deleted";

export interface FoundationRetentionState {
  readonly schemaVersion: typeof FOUNDATION_RETENTION_STATE_SCHEMA_URN;
  readonly workshopId: string;
  readonly status: FoundationRetentionStatus;
  readonly updatedAt: number;
}

export interface VersionedFoundationWorkshop {
  readonly schemaVersion: typeof FOUNDATION_WORKSHOP_SCHEMA_URN;
  readonly workshop: FoundationWorkshopState;
  readonly retention: FoundationRetentionState;
}

export interface FoundationUnderstandingSummary {
  readonly schemaVersion: typeof FOUNDATION_UNDERSTANDING_SUMMARY_SCHEMA_URN;
  readonly workshopId: string;
  readonly root: string;
  readonly idea: string;
  readonly status: string;
  readonly problemStatement: string;
  readonly smallestOutcome: string;
  readonly nonGoalsCount: number;
  readonly totalQuestions: number;
  readonly answeredQuestions: number;
  readonly pendingQuestions: number;
  readonly actorsCount: number;
  readonly workflowsCount: number;
  readonly domainConceptsCount: number;
  readonly qualityScenariosCount: number;
  readonly changeScenariosCount: number;
  readonly constraintsCount: number;
  readonly risksCount: number;
  readonly alternativesCount: number;
}

export interface FoundationReadinessReport {
  readonly schemaVersion: typeof FOUNDATION_READINESS_REPORT_SCHEMA_URN;
  readonly workshopId: string;
  readonly readinessStatus: FoundationWorkshopState["readinessStatus"];
  readonly findings: readonly FoundationWorkshopState["readinessFindings"][number][];
  readonly blockingCount: number;
  readonly warningCount: number;
  readonly evaluatedAt: number;
}

export interface FoundationWorkshopExport {
  readonly schemaVersion: typeof FOUNDATION_WORKSHOP_EXPORT_SCHEMA_URN;
  readonly workshop: FoundationWorkshopState;
  readonly retention: FoundationRetentionState;
  readonly exportedAt: number;
}

export interface FoundationWorkshopDeleteResult {
  readonly schemaVersion: typeof FOUNDATION_WORKSHOP_DELETE_SCHEMA_URN;
  readonly workshopId: string;
  readonly deleted: true;
  readonly deletedAt: number;
}
