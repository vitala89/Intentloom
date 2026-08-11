import type {
  FoundationAnswer,
  FoundationConflict,
  FoundationQuestion,
  FoundationReadinessFinding,
  FoundationRetentionState,
  FoundationWorkshopDeleteResult,
  FoundationWorkshopExport,
  FoundationWorkshopState,
  VersionedFoundationWorkshop,
  FoundationUnderstandingSummary,
  FoundationReadinessReport,
} from "@intentloom/protocol";
import {
  FOUNDATION_CONFLICT_LIST_SCHEMA_URN,
  FOUNDATION_QUESTION_LIST_SCHEMA_URN,
  FOUNDATION_WORKSHOP_DELETE_SCHEMA_URN,
  FOUNDATION_WORKSHOP_EXPORT_SCHEMA_URN,
  FOUNDATION_WORKSHOP_SCHEMA_URN,
  FOUNDATION_UNDERSTANDING_SUMMARY_SCHEMA_URN,
  FOUNDATION_READINESS_REPORT_SCHEMA_URN,
} from "@intentloom/protocol";
import {
  createFoundationRetentionState,
  validateFoundationConflictList,
  validateFoundationQuestionList,
  validateFoundationWorkshopDeleteResult,
  validateFoundationWorkshopExport,
  validateVersionedFoundationWorkshop,
  validateFoundationUnderstandingSummary,
  validateFoundationReadinessReport,
} from "@intentloom/validator";
import type { FoundationUnderstanding } from "./foundation-workshop.js";

export function buildVersionedFoundationWorkshop(
  workshop: FoundationWorkshopState,
  retention: FoundationRetentionState,
): VersionedFoundationWorkshop {
  return validateVersionedFoundationWorkshop({
    schemaVersion: FOUNDATION_WORKSHOP_SCHEMA_URN,
    workshop,
    retention,
  });
}

export function buildFoundationUnderstandingSummary(
  summary: FoundationUnderstanding,
): FoundationUnderstandingSummary {
  return validateFoundationUnderstandingSummary({
    schemaVersion: FOUNDATION_UNDERSTANDING_SUMMARY_SCHEMA_URN,
    ...summary,
  });
}

export function buildFoundationReadinessReport(
  report: Omit<FoundationReadinessReport, "schemaVersion">,
): FoundationReadinessReport {
  return validateFoundationReadinessReport({
    schemaVersion: FOUNDATION_READINESS_REPORT_SCHEMA_URN,
    ...report,
  });
}

export function buildFoundationQuestionList(input: {
  readonly workshopId: string;
  readonly questions: readonly FoundationQuestion[];
  readonly answers: readonly FoundationAnswer[];
}): ReturnType<typeof validateFoundationQuestionList> {
  const answered = new Set(input.answers.map((answer) => answer.questionId));
  const pendingQuestionIds = input.questions
    .filter((question) => !answered.has(question.id))
    .map((question) => question.id);
  return validateFoundationQuestionList({
    schemaVersion: FOUNDATION_QUESTION_LIST_SCHEMA_URN,
    workshopId: input.workshopId,
    questions: input.questions,
    pendingQuestionIds,
  });
}

export function buildFoundationConflictList(input: {
  readonly workshopId: string;
  readonly conflicts: readonly FoundationConflict[];
}): ReturnType<typeof validateFoundationConflictList> {
  return validateFoundationConflictList({
    schemaVersion: FOUNDATION_CONFLICT_LIST_SCHEMA_URN,
    workshopId: input.workshopId,
    conflicts: input.conflicts,
  });
}

export function buildFoundationWorkshopExport(
  workshop: FoundationWorkshopState,
): FoundationWorkshopExport {
  return validateFoundationWorkshopExport({
    schemaVersion: FOUNDATION_WORKSHOP_EXPORT_SCHEMA_URN,
    workshop,
    retention: createFoundationRetentionState(workshop.id, "exported"),
    exportedAt: Date.now(),
  });
}

export function buildFoundationWorkshopDeleteResult(
  workshopId: string,
): FoundationWorkshopDeleteResult {
  return validateFoundationWorkshopDeleteResult({
    schemaVersion: FOUNDATION_WORKSHOP_DELETE_SCHEMA_URN,
    workshopId,
    deleted: true,
    deletedAt: Date.now(),
  });
}

export function buildFoundationWorkshopViewmodel(
  workshop: FoundationWorkshopState,
  retentionStatus: FoundationRetentionState["status"] = "active",
): VersionedFoundationWorkshop {
  return buildVersionedFoundationWorkshop(
    workshop,
    createFoundationRetentionState(
      workshop.id,
      retentionStatus,
      workshop.updatedAt,
    ),
  );
}

export function buildFoundationReadinessViewmodel(
  workshopId: string,
  readinessStatus: FoundationWorkshopState["readinessStatus"],
  findings: readonly FoundationReadinessFinding[],
): FoundationReadinessReport {
  const blockingCount = findings.filter(
    (finding) => finding.severity === "blocking" && !finding.resolved,
  ).length;
  const warningCount = findings.filter(
    (finding) => finding.severity === "warning" && !finding.resolved,
  ).length;
  return buildFoundationReadinessReport({
    workshopId,
    readinessStatus,
    findings,
    blockingCount,
    warningCount,
    evaluatedAt: Date.now(),
  });
}
