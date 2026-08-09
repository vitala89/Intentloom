import {
  QUALITY_PULL_REQUEST_EVIDENCE_SCHEMA_URN,
  QUALITY_TASK_DIFF_SCHEMA_URN,
  type EngineeringQualityAcceptanceResult,
  type EngineeringQualityFinalChange,
  type EngineeringQualityTaskDiff,
  type QualityTaskChangeStatus,
  type QualityTaskDiffStatus,
  type QualityTaskPlanStatus,
} from "@intentloom/protocol";
import { isObject } from "./common.js";
import {
  stringField,
  nonNegative,
  validateConflict,
} from "./task-validation-common.js";

const CHANGE_STATUSES: readonly QualityTaskChangeStatus[] = [
  "within-plan",
  "under-projected",
  "over-projected",
  "hard-limit-exceeded",
  "unexpected-path",
  "missing-final-evidence",
];

function validateFinalChange(value: unknown): EngineeringQualityFinalChange {
  if (!isObject(value)) throw new Error("final change must be an object");
  if (!CHANGE_STATUSES.includes(value.status as QualityTaskChangeStatus)) {
    throw new Error("finalChange.status must be valid");
  }
  return {
    path: stringField(value.path, "finalChange.path"),
    ...(value.finalLines === undefined
      ? {}
      : {
          finalLines: nonNegative(value.finalLines, "finalChange.finalLines"),
        }),
    ...(value.actualGrowth === undefined
      ? {}
      : {
          actualGrowth:
            typeof value.actualGrowth === "number" &&
            Number.isFinite(value.actualGrowth)
              ? value.actualGrowth
              : (() => {
                  throw new Error("finalChange.actualGrowth must be finite");
                })(),
        }),
    ...(value.projectedLikely === undefined
      ? {}
      : {
          projectedLikely: nonNegative(
            value.projectedLikely,
            "finalChange.projectedLikely",
          ),
        }),
    status: value.status as QualityTaskChangeStatus,
  };
}

function validateAcceptanceResult(
  value: unknown,
): EngineeringQualityAcceptanceResult {
  if (!isObject(value)) throw new Error("acceptance result must be an object");
  if (typeof value.satisfied !== "boolean")
    throw new Error("acceptanceResult.satisfied must be a boolean");
  return {
    criterionId: stringField(value.criterionId, "acceptanceResult.criterionId"),
    satisfied: value.satisfied,
    details: stringField(value.details, "acceptanceResult.details"),
  };
}

export function validateEngineeringQualityTaskDiff(
  value: unknown,
): EngineeringQualityTaskDiff {
  if (!isObject(value)) throw new Error("quality task diff must be an object");
  if (value.schemaVersion !== QUALITY_TASK_DIFF_SCHEMA_URN) {
    throw new Error(
      `taskDiff.schemaVersion must equal ${QUALITY_TASK_DIFF_SCHEMA_URN}`,
    );
  }
  if (value.status !== "passed" && value.status !== "conflict")
    throw new Error("taskDiff.status must be valid");
  if (
    !Array.isArray(value.changes) ||
    !Array.isArray(value.acceptanceResults) ||
    !Array.isArray(value.conflicts)
  ) {
    throw new Error("taskDiff arrays are required");
  }
  return {
    schemaVersion: QUALITY_TASK_DIFF_SCHEMA_URN,
    projectId: stringField(value.projectId, "taskDiff.projectId"),
    taskId: stringField(value.taskId, "taskDiff.taskId"),
    status: value.status as QualityTaskDiffStatus,
    changes: value.changes.map(validateFinalChange),
    acceptanceResults: value.acceptanceResults.map(validateAcceptanceResult),
    conflicts: value.conflicts.map(validateConflict),
  };
}

export function validateEngineeringQualityPullRequestEvidence(value: unknown) {
  if (!isObject(value))
    throw new Error("pull-request evidence must be an object");
  if (value.schemaVersion !== QUALITY_PULL_REQUEST_EVIDENCE_SCHEMA_URN) {
    throw new Error(
      `pullRequestEvidence.schemaVersion must equal ${QUALITY_PULL_REQUEST_EVIDENCE_SCHEMA_URN}`,
    );
  }
  if (value.status !== "ready" && value.status !== "conflict")
    throw new Error("pullRequestEvidence.status must be valid");
  if (
    !["accepted", "review-required", "conflict"].includes(
      value.planStatus as string,
    )
  ) {
    throw new Error("pullRequestEvidence.planStatus must be valid");
  }
  if (!["passed", "conflict"].includes(value.diffStatus as string)) {
    throw new Error("pullRequestEvidence.diffStatus must be valid");
  }
  if (!Array.isArray(value.conflicts))
    throw new Error("pullRequestEvidence.conflicts must be an array");
  const status: "ready" | "conflict" = value.status;
  return {
    schemaVersion: QUALITY_PULL_REQUEST_EVIDENCE_SCHEMA_URN,
    projectId: stringField(value.projectId, "pullRequestEvidence.projectId"),
    taskId: stringField(value.taskId, "pullRequestEvidence.taskId"),
    planStatus: value.planStatus as QualityTaskPlanStatus,
    diffStatus: value.diffStatus as QualityTaskDiffStatus,
    status,
    markdown: stringField(value.markdown, "pullRequestEvidence.markdown"),
    conflicts: value.conflicts.map(validateConflict),
  };
}
