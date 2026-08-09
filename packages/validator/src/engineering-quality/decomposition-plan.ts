import {
  QUALITY_DECOMPOSITION_PLAN_SCHEMA_URN,
  type EngineeringQualityDecompositionConflict,
  type EngineeringQualityDecompositionPlan,
  type QualityDecompositionPlanStatus,
  type QualityDecompositionOptionKind,
} from "@intentloom/protocol";
import { isObject } from "./common.js";
import {
  CONFLICT_KINDS,
  OPTION_KINDS,
  strings,
  validateEvidence,
} from "./decomposition-common.js";
import { validateOption } from "./decomposition-option.js";
import { stringField } from "./task-validation-common.js";

export { validateEvidence as validateEngineeringQualityDecompositionEvidence } from "./decomposition-common.js";

const STATUSES: readonly QualityDecompositionPlanStatus[] = [
  "ready",
  "review-required",
  "unsupported",
];

function validateConflict(
  value: unknown,
): EngineeringQualityDecompositionConflict {
  if (!isObject(value))
    throw new Error("decomposition conflict must be an object");
  if (
    !CONFLICT_KINDS.includes(
      value.kind as EngineeringQualityDecompositionConflict["kind"],
    )
  ) {
    throw new Error("decomposition conflict.kind must be valid");
  }
  const responsibilityIds = value.responsibilityIds;
  if (responsibilityIds !== undefined && !Array.isArray(responsibilityIds)) {
    throw new Error(
      "decomposition conflict.responsibilityIds must be an array",
    );
  }
  return {
    kind: value.kind as EngineeringQualityDecompositionConflict["kind"],
    message: stringField(value.message, "decomposition conflict.message"),
    ...(responsibilityIds === undefined
      ? {}
      : {
          responsibilityIds: strings(
            responsibilityIds,
            "decomposition conflict.responsibilityIds",
          ),
        }),
  };
}

function validateOptions(value: unknown, responsibilityIds: readonly string[]) {
  if (!Array.isArray(value))
    throw new Error("decomposition options must be an array");
  const options = value.map(validateOption);
  const expected = new Set(responsibilityIds);
  for (const option of options) {
    if (
      new Set(option.extractedResponsibilityIds).size !==
      option.extractedResponsibilityIds.length
    ) {
      throw new Error("option extracted responsibility IDs must be unique");
    }
    if (
      new Set(option.retainedResponsibilityIds).size !==
      option.retainedResponsibilityIds.length
    ) {
      throw new Error("option retained responsibility IDs must be unique");
    }
    const combined = [
      ...option.extractedResponsibilityIds,
      ...option.retainedResponsibilityIds,
    ];
    if (
      new Set(combined).size !== combined.length ||
      combined.some((id) => !expected.has(id))
    ) {
      throw new Error(
        "option responsibility IDs must partition known responsibilities",
      );
    }
  }
  if (new Set(options.map((option) => option.kind)).size !== options.length) {
    throw new Error("decomposition option kinds must be unique");
  }
  for (const kind of OPTION_KINDS) {
    if (!options.some((option) => option.kind === kind)) {
      throw new Error(`decomposition option ${kind} is required`);
    }
  }
  return options;
}

export function validateEngineeringQualityDecompositionPlan(
  value: unknown,
): EngineeringQualityDecompositionPlan {
  if (!isObject(value)) throw new Error("decomposition plan must be an object");
  if (value.schemaVersion !== QUALITY_DECOMPOSITION_PLAN_SCHEMA_URN) {
    throw new Error(
      `decompositionPlan.schemaVersion must equal ${QUALITY_DECOMPOSITION_PLAN_SCHEMA_URN}`,
    );
  }
  if (!STATUSES.includes(value.status as QualityDecompositionPlanStatus)) {
    throw new Error("decompositionPlan.status must be valid");
  }
  if (
    !OPTION_KINDS.includes(
      value.recommendedOption as QualityDecompositionOptionKind,
    )
  ) {
    throw new Error("decompositionPlan.recommendedOption must be valid");
  }
  const evidence = validateEvidence(value.evidence);
  const options = validateOptions(
    value.options,
    evidence.responsibilities.map((item) => item.id),
  );
  if (!options.some((option) => option.kind === value.recommendedOption)) {
    throw new Error("recommended option must be present");
  }
  if (!Array.isArray(value.conflicts))
    throw new Error("decompositionPlan.conflicts must be an array");
  return {
    schemaVersion: QUALITY_DECOMPOSITION_PLAN_SCHEMA_URN,
    projectId: stringField(value.projectId, "decompositionPlan.projectId"),
    taskId: stringField(value.taskId, "decompositionPlan.taskId"),
    evidence,
    options,
    recommendedOption:
      value.recommendedOption as QualityDecompositionOptionKind,
    status: value.status as QualityDecompositionPlanStatus,
    conflicts: value.conflicts.map(validateConflict),
  };
}
