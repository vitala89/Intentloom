import {
  QUALITY_TASK_PLAN_SCHEMA_URN,
  type EngineeringQualityProjectedChange,
  type EngineeringQualityTaskPlan,
  type QualityTaskPlanStatus,
  type QualityTaskProjectionDisposition,
} from "@intentloom/protocol";
import { isObject } from "./common.js";
import {
  nonNegative,
  stringField,
  validateCriterion,
  validateConflict,
  validateGrowth,
  validateResolution,
} from "./task-validation-common.js";

const PLAN_STATUSES: readonly QualityTaskPlanStatus[] = [
  "accepted",
  "review-required",
  "conflict",
];
const DISPOSITIONS: readonly QualityTaskProjectionDisposition[] = [
  "within-policy",
  "likely-review-threshold-crossing",
  "likely-hard-limit-crossing",
  "unsupported",
];

function validateProjectedChange(
  value: unknown,
): EngineeringQualityProjectedChange {
  if (!isObject(value)) throw new Error("task change must be an object");
  const currentLines = nonNegative(value.currentLines, "change.currentLines");
  const projectedMinimum = nonNegative(
    value.projectedMinimum,
    "change.projectedMinimum",
  );
  const projectedLikely = nonNegative(
    value.projectedLikely,
    "change.projectedLikely",
  );
  if (projectedLikely < projectedMinimum) {
    throw new Error("change.projectedLikely must be at least projectedMinimum");
  }
  if (
    !DISPOSITIONS.includes(
      value.disposition as QualityTaskProjectionDisposition,
    )
  ) {
    throw new Error("change.disposition must be valid");
  }
  return {
    path: stringField(value.path, "change.path"),
    currentLines,
    projectedMinimum,
    projectedLikely,
    estimatedGrowth: validateGrowth(value.estimatedGrowth),
    policy: validateResolution(value.policy),
    disposition: value.disposition as QualityTaskProjectionDisposition,
  };
}

export function validateEngineeringQualityTaskPlan(
  value: unknown,
): EngineeringQualityTaskPlan {
  if (!isObject(value)) throw new Error("quality task plan must be an object");
  if (value.schemaVersion !== QUALITY_TASK_PLAN_SCHEMA_URN) {
    throw new Error(
      `taskPlan.schemaVersion must equal ${QUALITY_TASK_PLAN_SCHEMA_URN}`,
    );
  }
  if (!PLAN_STATUSES.includes(value.status as QualityTaskPlanStatus)) {
    throw new Error("taskPlan.status must be valid");
  }
  if (
    !Array.isArray(value.changes) ||
    !Array.isArray(value.acceptanceCriteria) ||
    !Array.isArray(value.conflicts)
  ) {
    throw new Error(
      "taskPlan changes, acceptanceCriteria, and conflicts must be arrays",
    );
  }
  return {
    schemaVersion: QUALITY_TASK_PLAN_SCHEMA_URN,
    projectId: stringField(value.projectId, "taskPlan.projectId"),
    taskId: stringField(value.taskId, "taskPlan.taskId"),
    policyId: stringField(value.policyId, "taskPlan.policyId"),
    changes: value.changes.map(validateProjectedChange),
    acceptanceCriteria: value.acceptanceCriteria.map(validateCriterion),
    status: value.status as QualityTaskPlanStatus,
    conflicts: value.conflicts.map(validateConflict),
  };
}
