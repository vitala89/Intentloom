import {
  QUALITY_DISCIPLINE_ALIAS_SCHEMA_URN,
  type QualityDisciplineAlias,
} from "@intentloom/protocol";
import { isObject } from "./common.js";
import { stringField } from "./task-validation-common.js";

export function validateQualityDisciplineAlias(
  value: unknown,
): QualityDisciplineAlias {
  if (!isObject(value)) throw new Error("discipline alias must be an object");
  if (value.schemaVersion !== QUALITY_DISCIPLINE_ALIAS_SCHEMA_URN) {
    throw new Error(
      `disciplineAlias.schemaVersion must equal ${QUALITY_DISCIPLINE_ALIAS_SCHEMA_URN}`,
    );
  }
  return {
    schemaVersion: QUALITY_DISCIPLINE_ALIAS_SCHEMA_URN,
    aliasId: stringField(value.aliasId, "disciplineAlias.aliasId"),
    humanTitle: stringField(value.humanTitle, "disciplineAlias.humanTitle"),
    targetDisciplineId: stringField(
      value.targetDisciplineId,
      "disciplineAlias.targetDisciplineId",
    ),
    ...(typeof value.organizationScope === "string"
      ? {
          organizationScope: stringField(
            value.organizationScope,
            "disciplineAlias.organizationScope",
          ),
        }
      : {}),
    createdAt: stringField(value.createdAt, "disciplineAlias.createdAt"),
  };
}
