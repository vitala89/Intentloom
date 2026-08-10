import {
  QUALITY_SPECIALIZED_PACK_SCHEMA_URN,
  QUALITY_SPECIALIZED_PACK_TRUST_STATE_SCHEMA_URN,
  type QualitySpecializedPackManifest,
  type QualitySpecializedPackTrustLevel,
  type QualitySpecializedPackTrustState,
} from "@intentloom/protocol";
import { isObject } from "./common.js";
import { stringField } from "./task-validation-common.js";

const TRUST_LEVELS: readonly QualitySpecializedPackTrustLevel[] = [
  "verified-first-party",
  "reviewed-organization",
  "untrusted-external",
  "quarantined",
];

function strings(value: unknown, fieldName: string): readonly string[] {
  if (!Array.isArray(value)) throw new Error(`${fieldName} must be an array`);
  return value.map((item, index) =>
    stringField(item, `${fieldName}[${index}]`),
  );
}

export function validateQualitySpecializedPackManifest(
  value: unknown,
): QualitySpecializedPackManifest {
  if (!isObject(value))
    throw new Error("specialized pack manifest must be an object");
  if (value.schemaVersion !== QUALITY_SPECIALIZED_PACK_SCHEMA_URN) {
    throw new Error(
      `specializedPackManifest.schemaVersion must equal ${QUALITY_SPECIALIZED_PACK_SCHEMA_URN}`,
    );
  }
  return {
    schemaVersion: QUALITY_SPECIALIZED_PACK_SCHEMA_URN,
    id: stringField(value.id, "specializedPackManifest.id"),
    version: stringField(value.version, "specializedPackManifest.version"),
    name: stringField(value.name, "specializedPackManifest.name"),
    publisher: stringField(
      value.publisher,
      "specializedPackManifest.publisher",
    ),
    targetDisciplineIds: strings(
      value.targetDisciplineIds,
      "specializedPackManifest.targetDisciplineIds",
    ),
    providedArchitectureStrategies: strings(
      value.providedArchitectureStrategies,
      "specializedPackManifest.providedArchitectureStrategies",
    ),
    providedRuleIds: strings(
      value.providedRuleIds,
      "specializedPackManifest.providedRuleIds",
    ),
    requiredTooling: strings(
      value.requiredTooling,
      "specializedPackManifest.requiredTooling",
    ),
    permissionsRequired: strings(
      value.permissionsRequired,
      "specializedPackManifest.permissionsRequired",
    ),
    conflicts: strings(value.conflicts, "specializedPackManifest.conflicts"),
    dependencies: strings(
      value.dependencies,
      "specializedPackManifest.dependencies",
    ),
  };
}

export function validateQualitySpecializedPackTrustState(
  value: unknown,
): QualitySpecializedPackTrustState {
  if (!isObject(value))
    throw new Error("specialized pack trust state must be an object");
  if (value.schemaVersion !== QUALITY_SPECIALIZED_PACK_TRUST_STATE_SCHEMA_URN) {
    throw new Error(
      `specializedPackTrustState.schemaVersion must equal ${QUALITY_SPECIALIZED_PACK_TRUST_STATE_SCHEMA_URN}`,
    );
  }
  if (
    !TRUST_LEVELS.includes(value.trustLevel as QualitySpecializedPackTrustLevel)
  ) {
    throw new Error("specializedPackTrustState.trustLevel must be valid");
  }
  return {
    schemaVersion: QUALITY_SPECIALIZED_PACK_TRUST_STATE_SCHEMA_URN,
    packId: stringField(value.packId, "specializedPackTrustState.packId"),
    trustLevel: value.trustLevel as QualitySpecializedPackTrustLevel,
    verifiedAt: stringField(
      value.verifiedAt,
      "specializedPackTrustState.verifiedAt",
    ),
    ...(typeof value.verifiedBy === "string"
      ? {
          verifiedBy: stringField(
            value.verifiedBy,
            "specializedPackTrustState.verifiedBy",
          ),
        }
      : {}),
    ...(typeof value.revocationReason === "string"
      ? {
          revocationReason: stringField(
            value.revocationReason,
            "specializedPackTrustState.revocationReason",
          ),
        }
      : {}),
  };
}
