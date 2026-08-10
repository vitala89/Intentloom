import {
  QUALITY_DISCIPLINE_SCHEMA_URN,
  QUALITY_ROLE_COMPOSITION_SCHEMA_URN,
  type QualityDisciplineCategory,
  type QualityDisciplineDefinition,
  type QualityRoleComposition,
} from "@intentloom/protocol";
import { isObject } from "./common.js";
import { stringField } from "./task-validation-common.js";

const DISCIPLINE_CATEGORIES: readonly QualityDisciplineCategory[] = [
  "frontend",
  "backend",
  "full-stack",
  "mobile",
  "desktop",
  "quality-engineering",
  "devops-sre",
  "platform-engineering",
  "security",
  "data-engineering",
  "ml-ai",
  "embedded-iot",
  "spatial-graphics",
  "documentation",
];

function strings(value: unknown, fieldName: string): readonly string[] {
  if (!Array.isArray(value)) throw new Error(`${fieldName} must be an array`);
  return value.map((item, index) =>
    stringField(item, `${fieldName}[${index}]`),
  );
}

export function validateQualityDisciplineDefinition(
  value: unknown,
): QualityDisciplineDefinition {
  if (!isObject(value))
    throw new Error("discipline definition must be an object");
  if (value.schemaVersion !== QUALITY_DISCIPLINE_SCHEMA_URN) {
    throw new Error(
      `disciplineDefinition.schemaVersion must equal ${QUALITY_DISCIPLINE_SCHEMA_URN}`,
    );
  }
  if (
    !DISCIPLINE_CATEGORIES.includes(value.category as QualityDisciplineCategory)
  ) {
    throw new Error("disciplineDefinition.category must be valid");
  }
  return {
    schemaVersion: QUALITY_DISCIPLINE_SCHEMA_URN,
    id: stringField(value.id, "disciplineDefinition.id"),
    name: stringField(value.name, "disciplineDefinition.name"),
    category: value.category as QualityDisciplineCategory,
    defaultConcerns: strings(
      value.defaultConcerns,
      "disciplineDefinition.defaultConcerns",
    ),
    supportedArchitectureStrategies: strings(
      value.supportedArchitectureStrategies,
      "disciplineDefinition.supportedArchitectureStrategies",
    ),
  };
}

export function validateQualityRoleComposition(
  value: unknown,
): QualityRoleComposition {
  if (!isObject(value)) throw new Error("role composition must be an object");
  if (value.schemaVersion !== QUALITY_ROLE_COMPOSITION_SCHEMA_URN) {
    throw new Error(
      `roleComposition.schemaVersion must equal ${QUALITY_ROLE_COMPOSITION_SCHEMA_URN}`,
    );
  }
  return {
    schemaVersion: QUALITY_ROLE_COMPOSITION_SCHEMA_URN,
    id: stringField(value.id, "roleComposition.id"),
    titleAlias: stringField(value.titleAlias, "roleComposition.titleAlias"),
    primaryDisciplineId: stringField(
      value.primaryDisciplineId,
      "roleComposition.primaryDisciplineId",
    ),
    secondaryDisciplineIds: strings(
      value.secondaryDisciplineIds,
      "roleComposition.secondaryDisciplineIds",
    ),
    ...(value.taskScopeFilter !== undefined
      ? {
          taskScopeFilter: strings(
            value.taskScopeFilter,
            "roleComposition.taskScopeFilter",
          ),
        }
      : {}),
    createdAt: stringField(value.createdAt, "roleComposition.createdAt"),
  };
}
