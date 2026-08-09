import {
  type EngineeringQualityGrowthProjection,
  type EngineeringQualityPlanConflict,
  type EngineeringQualityPolicyResolution,
  type QualityProjectionConfidence,
  type QualityTaskConflictKind,
} from "@intentloom/protocol";
import { isObject } from "./common.js";

export const CONFIDENCES: readonly QualityProjectionConfidence[] = [
  "low",
  "medium",
  "high",
];

export const CONFLICTS: readonly QualityTaskConflictKind[] = [
  "hard-limit-crossing",
  "policy-unresolved",
  "missing-acceptance-criteria",
  "projection-drift",
  "unexpected-path",
  "missing-final-evidence",
];

export function stringField(value: unknown, field: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${field} must be a non-empty string`);
  }
  return value;
}

export function nonNegative(value: unknown, field: string): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    throw new Error(`${field} must be a non-negative number`);
  }
  return value;
}

export function optionalLimit(
  value: unknown,
  field: string,
): number | undefined {
  return value === undefined ? undefined : nonNegative(value, field);
}

export function validateGrowth(
  value: unknown,
): EngineeringQualityGrowthProjection {
  if (!isObject(value)) throw new Error("estimatedGrowth must be an object");
  const minimum = nonNegative(value.minimum, "estimatedGrowth.minimum");
  const likely = nonNegative(value.likely, "estimatedGrowth.likely");
  if (likely < minimum) {
    throw new Error("estimatedGrowth.likely must be at least minimum");
  }
  if (!CONFIDENCES.includes(value.confidence as QualityProjectionConfidence)) {
    throw new Error("estimatedGrowth.confidence must be valid");
  }
  return {
    minimum,
    likely,
    confidence: value.confidence as QualityProjectionConfidence,
  };
}

export function validateResolution(
  value: unknown,
): EngineeringQualityPolicyResolution {
  if (!isObject(value)) throw new Error("policy must be an object");
  const path = stringField(value.path, "policy.path");
  if (value.status !== "resolved" && value.status !== "no-applicable-rules") {
    throw new Error("policy.status must be valid");
  }
  if (
    !Array.isArray(value.matchedScopes) ||
    !value.matchedScopes.every((item) => typeof item === "string")
  ) {
    throw new Error("policy.matchedScopes must contain strings");
  }
  if (
    !Array.isArray(value.applicableRuleIds) ||
    !value.applicableRuleIds.every((item) => typeof item === "string")
  ) {
    throw new Error("policy.applicableRuleIds must contain strings");
  }
  const reviewLimit = optionalLimit(value.reviewLimit, "policy.reviewLimit");
  const hardLimit = optionalLimit(value.hardLimit, "policy.hardLimit");
  return {
    path,
    status: value.status,
    matchedScopes: value.matchedScopes,
    applicableRuleIds: value.applicableRuleIds,
    ...(reviewLimit === undefined ? {} : { reviewLimit }),
    ...(hardLimit === undefined ? {} : { hardLimit }),
  };
}

export function validateCriterion(value: unknown) {
  if (!isObject(value))
    throw new Error("acceptance criterion must be an object");
  return {
    id: stringField(value.id, "criterion.id"),
    description: stringField(value.description, "criterion.description"),
    required:
      typeof value.required === "boolean"
        ? value.required
        : (() => {
            throw new Error("criterion.required must be a boolean");
          })(),
  };
}

export function validateConflict(
  value: unknown,
): EngineeringQualityPlanConflict {
  if (!isObject(value)) throw new Error("plan conflict must be an object");
  if (!CONFLICTS.includes(value.kind as QualityTaskConflictKind)) {
    throw new Error("conflict.kind must be valid");
  }
  return {
    kind: value.kind as QualityTaskConflictKind,
    ...(value.path === undefined
      ? {}
      : { path: stringField(value.path, "conflict.path") }),
    ...(value.criterionId === undefined
      ? {}
      : {
          criterionId: stringField(value.criterionId, "conflict.criterionId"),
        }),
    message: stringField(value.message, "conflict.message"),
  };
}
