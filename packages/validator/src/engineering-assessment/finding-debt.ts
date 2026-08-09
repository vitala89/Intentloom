import type {
  AssessmentEvidenceQuality,
  AssessmentFindingCategory,
  AssessmentFindingConfidence,
  AssessmentFindingProjection,
  AssessmentFindingProvenance,
  AssessmentFindingSeverity,
  TechnicalDebtCategory,
  TechnicalDebtItem,
  TechnicalDebtMap,
} from "@intentloom/protocol";
import {
  EVIDENCE_QUALITIES,
  FINDING_CATEGORIES,
  FINDING_CONFIDENCES,
  FINDING_PROVENANCES,
  FINDING_SEVERITIES,
  isObject,
  stringArray,
  TECHNICAL_DEBT_CATEGORIES,
} from "./common.js";

export function validateAssessmentFindingProjection(
  value: unknown,
): AssessmentFindingProjection {
  if (!isObject(value)) {
    throw new Error("finding projection must be an object");
  }
  if (typeof value.id !== "string" || !value.id.trim()) {
    throw new Error("findingProjection.id must be a non-empty string");
  }
  if (
    value.sourceFindingRef !== undefined &&
    (typeof value.sourceFindingRef !== "string" ||
      !value.sourceFindingRef.trim())
  ) {
    throw new Error(
      "findingProjection.sourceFindingRef must be a non-empty string when provided",
    );
  }
  if (
    !FINDING_CATEGORIES.includes(value.category as AssessmentFindingCategory)
  ) {
    throw new Error(
      "findingProjection.category must be a valid AssessmentFindingCategory",
    );
  }
  if (typeof value.scope !== "string" || !value.scope.trim()) {
    throw new Error("findingProjection.scope must be a non-empty string");
  }
  const evidenceReferences = stringArray(
    value.evidenceReferences,
    "findingProjection.evidenceReferences",
  );
  if (typeof value.ruleReference !== "string" || !value.ruleReference.trim()) {
    throw new Error(
      "findingProjection.ruleReference must be a non-empty string",
    );
  }
  if (
    !FINDING_SEVERITIES.includes(value.severity as AssessmentFindingSeverity)
  ) {
    throw new Error(
      "findingProjection.severity must be a valid AssessmentFindingSeverity",
    );
  }
  if (
    !FINDING_CONFIDENCES.includes(
      value.confidence as AssessmentFindingConfidence,
    )
  ) {
    throw new Error(
      "findingProjection.confidence must be a valid AssessmentFindingConfidence",
    );
  }
  if (
    !EVIDENCE_QUALITIES.includes(
      value.evidenceQuality as AssessmentEvidenceQuality,
    )
  ) {
    throw new Error(
      "findingProjection.evidenceQuality must be a valid AssessmentEvidenceQuality",
    );
  }
  if (typeof value.impactSummary !== "string" || !value.impactSummary.trim()) {
    throw new Error(
      "findingProjection.impactSummary must be a non-empty string",
    );
  }
  const recommendationReferences = stringArray(
    value.recommendationReferences,
    "findingProjection.recommendationReferences",
  );
  if (
    !FINDING_PROVENANCES.includes(
      value.provenanceClassification as AssessmentFindingProvenance,
    )
  ) {
    throw new Error(
      "findingProjection.provenanceClassification must be a valid AssessmentFindingProvenance",
    );
  }

  return {
    id: value.id,
    ...(value.sourceFindingRef !== undefined
      ? { sourceFindingRef: value.sourceFindingRef as string }
      : {}),
    category: value.category as AssessmentFindingCategory,
    scope: value.scope,
    evidenceReferences,
    ruleReference: value.ruleReference,
    severity: value.severity as AssessmentFindingSeverity,
    confidence: value.confidence as AssessmentFindingConfidence,
    evidenceQuality: value.evidenceQuality as AssessmentEvidenceQuality,
    impactSummary: value.impactSummary,
    recommendationReferences,
    provenanceClassification:
      value.provenanceClassification as AssessmentFindingProvenance,
  };
}

export function validateTechnicalDebtItem(value: unknown): TechnicalDebtItem {
  if (!isObject(value)) {
    throw new Error("technical debt item must be an object");
  }
  if (typeof value.id !== "string" || !value.id.trim()) {
    throw new Error("technicalDebtItem.id must be a non-empty string");
  }
  if (
    typeof value.findingProjectionId !== "string" ||
    !value.findingProjectionId.trim()
  ) {
    throw new Error(
      "technicalDebtItem.findingProjectionId must be a non-empty string",
    );
  }
  if (
    !TECHNICAL_DEBT_CATEGORIES.includes(value.category as TechnicalDebtCategory)
  ) {
    throw new Error(
      "technicalDebtItem.category must be a valid TechnicalDebtCategory",
    );
  }
  const affectedScopes = stringArray(
    value.affectedScopes,
    "technicalDebtItem.affectedScopes",
  );
  if (
    !["low", "medium", "high"].includes(
      value.estimatedRemediationComplexity as string,
    )
  ) {
    throw new Error(
      "technicalDebtItem.estimatedRemediationComplexity must be low, medium, or high",
    );
  }
  const prerequisites = stringArray(
    value.prerequisites,
    "technicalDebtItem.prerequisites",
  );
  if (
    typeof value.recommendedOrder !== "number" ||
    !Number.isInteger(value.recommendedOrder) ||
    value.recommendedOrder < 1
  ) {
    throw new Error(
      "technicalDebtItem.recommendedOrder must be a positive integer",
    );
  }

  return {
    id: value.id,
    findingProjectionId: value.findingProjectionId,
    category: value.category as TechnicalDebtCategory,
    affectedScopes,
    estimatedRemediationComplexity:
      value.estimatedRemediationComplexity as TechnicalDebtItem["estimatedRemediationComplexity"],
    prerequisites,
    recommendedOrder: value.recommendedOrder,
  };
}

export function validateTechnicalDebtMap(value: unknown): TechnicalDebtMap {
  if (!isObject(value)) {
    throw new Error("technical debt map must be an object");
  }
  if (!Array.isArray(value.items)) {
    throw new Error("technicalDebtMap.items must be an array");
  }
  const items = value.items.map(validateTechnicalDebtItem);
  return { items };
}
