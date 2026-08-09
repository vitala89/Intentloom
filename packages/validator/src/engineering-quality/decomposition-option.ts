import {
  type EngineeringQualityDecompositionMigrationStep,
  type EngineeringQualityDecompositionOption,
  type QualityDecompositionOptionKind,
} from "@intentloom/protocol";
import { isObject } from "./common.js";
import { OPTION_KINDS, integer, strings } from "./decomposition-common.js";
import { stringField } from "./task-validation-common.js";

function validateMigrationStep(
  value: unknown,
): EngineeringQualityDecompositionMigrationStep {
  if (!isObject(value)) throw new Error("migration step must be an object");
  return {
    order: integer(value.order, "migration.order"),
    description: stringField(value.description, "migration.description"),
    responsibilityIds: strings(
      value.responsibilityIds,
      "migration.responsibilityIds",
    ),
    verification: stringField(value.verification, "migration.verification"),
  };
}

export function validateOption(
  value: unknown,
): EngineeringQualityDecompositionOption {
  if (!isObject(value))
    throw new Error("decomposition option must be an object");
  if (!OPTION_KINDS.includes(value.kind as QualityDecompositionOptionKind)) {
    throw new Error("option.kind must be valid");
  }
  if (typeof value.requiresApproval !== "boolean") {
    throw new Error("option.requiresApproval must be a boolean");
  }
  if (!Array.isArray(value.migrationSteps)) {
    throw new Error("option.migrationSteps must be an array");
  }
  return {
    kind: value.kind as QualityDecompositionOptionKind,
    title: stringField(value.title, "option.title"),
    rationale: stringField(value.rationale, "option.rationale"),
    extractedResponsibilityIds: strings(
      value.extractedResponsibilityIds,
      "option.extractedResponsibilityIds",
    ),
    retainedResponsibilityIds: strings(
      value.retainedResponsibilityIds,
      "option.retainedResponsibilityIds",
    ),
    projectedHostLines: integer(
      value.projectedHostLines,
      "option.projectedHostLines",
    ),
    publicApiActions: strings(
      value.publicApiActions,
      "option.publicApiActions",
    ),
    testPreservationSteps: strings(
      value.testPreservationSteps,
      "option.testPreservationSteps",
    ),
    migrationSteps: value.migrationSteps.map(validateMigrationStep),
    requiresApproval: value.requiresApproval,
  };
}
