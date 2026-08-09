import {
  QUALITY_POLICY_SCHEMA_URN,
  type EngineeringQualityPolicy,
  type EngineeringQualityRule,
  type EngineeringQualityScope,
  type EngineeringQualityThreshold,
  type QualityArtifactClassification,
  type QualityRuleSeverity,
  type QualityThresholdLevel,
} from "@intentloom/protocol";
import {
  isObject,
  QUALITY_ARTIFACT_CLASSIFICATIONS,
  QUALITY_RULE_SEVERITIES,
  QUALITY_THRESHOLD_LEVELS,
} from "./common.js";

export function validateEngineeringQualityThreshold(
  value: unknown,
): EngineeringQualityThreshold {
  if (!isObject(value)) {
    throw new Error("quality threshold must be an object");
  }
  if (
    !QUALITY_THRESHOLD_LEVELS.includes(value.level as QualityThresholdLevel)
  ) {
    throw new Error("threshold.level must be a valid QualityThresholdLevel");
  }
  if (
    typeof value.maxPhysicalLines !== "number" ||
    !Number.isInteger(value.maxPhysicalLines) ||
    value.maxPhysicalLines < 1
  ) {
    throw new Error("threshold.maxPhysicalLines must be a positive integer");
  }
  return {
    level: value.level as QualityThresholdLevel,
    maxPhysicalLines: value.maxPhysicalLines,
  };
}

export function validateEngineeringQualityRule(
  value: unknown,
): EngineeringQualityRule {
  if (!isObject(value)) {
    throw new Error("quality rule must be an object");
  }
  if (typeof value.id !== "string" || !value.id.trim()) {
    throw new Error("rule.id must be a non-empty string");
  }
  if (typeof value.name !== "string" || !value.name.trim()) {
    throw new Error("rule.name must be a non-empty string");
  }
  if (typeof value.description !== "string" || !value.description.trim()) {
    throw new Error("rule.description must be a non-empty string");
  }
  if (
    ![
      "code-quality",
      "architecture",
      "maintainability",
      "security",
      "performance",
    ].includes(value.category as string)
  ) {
    throw new Error(
      "rule.category must be code-quality, architecture, maintainability, security, or performance",
    );
  }
  if (
    !QUALITY_RULE_SEVERITIES.includes(value.severity as QualityRuleSeverity)
  ) {
    throw new Error("rule.severity must be a valid QualityRuleSeverity");
  }
  if (!Array.isArray(value.applicableClassifications)) {
    throw new Error("rule.applicableClassifications must be an array");
  }
  for (const c of value.applicableClassifications) {
    if (
      !QUALITY_ARTIFACT_CLASSIFICATIONS.includes(
        c as QualityArtifactClassification,
      )
    ) {
      throw new Error(
        `rule.applicableClassifications contains invalid classification: ${String(c)}`,
      );
    }
  }
  if (!Array.isArray(value.thresholds) || value.thresholds.length === 0) {
    throw new Error("rule.thresholds must be a non-empty array");
  }
  const thresholds = value.thresholds.map(validateEngineeringQualityThreshold);

  return {
    id: value.id,
    name: value.name,
    description: value.description,
    category: value.category as EngineeringQualityRule["category"],
    severity: value.severity as QualityRuleSeverity,
    applicableClassifications:
      value.applicableClassifications as readonly QualityArtifactClassification[],
    thresholds,
  };
}

export function validateEngineeringQualityScope(
  value: unknown,
): EngineeringQualityScope {
  if (!isObject(value)) {
    throw new Error("quality scope must be an object");
  }
  if (typeof value.pathPattern !== "string" || !value.pathPattern.trim()) {
    throw new Error("scope.pathPattern must be a non-empty string");
  }
  if (
    value.classification !== undefined &&
    !QUALITY_ARTIFACT_CLASSIFICATIONS.includes(
      value.classification as QualityArtifactClassification,
    )
  ) {
    throw new Error(
      "scope.classification must be a valid QualityArtifactClassification",
    );
  }
  return {
    pathPattern: value.pathPattern,
    ...(value.classification !== undefined
      ? {
          classification: value.classification as QualityArtifactClassification,
        }
      : {}),
  };
}

export function validateEngineeringQualityPolicy(
  value: unknown,
): EngineeringQualityPolicy {
  if (!isObject(value)) {
    throw new Error("quality policy must be an object");
  }
  if (value.schemaVersion !== QUALITY_POLICY_SCHEMA_URN) {
    throw new Error(
      `policy.schemaVersion must equal ${QUALITY_POLICY_SCHEMA_URN}`,
    );
  }
  if (typeof value.policyId !== "string" || !value.policyId.trim()) {
    throw new Error("policy.policyId must be a non-empty string");
  }
  if (
    !["balanced", "strict", "legacy-ratchet", "custom"].includes(
      value.profileName as string,
    )
  ) {
    throw new Error(
      "policy.profileName must be balanced, strict, legacy-ratchet, or custom",
    );
  }
  if (!Array.isArray(value.defaultRules)) {
    throw new Error("policy.defaultRules must be an array");
  }
  const defaultRules = value.defaultRules.map(validateEngineeringQualityRule);
  let scopes: readonly EngineeringQualityScope[] | undefined = undefined;
  if (value.scopes !== undefined) {
    if (!Array.isArray(value.scopes)) {
      throw new Error("policy.scopes must be an array when provided");
    }
    scopes = value.scopes.map(validateEngineeringQualityScope);
  }

  return {
    schemaVersion: QUALITY_POLICY_SCHEMA_URN,
    policyId: value.policyId,
    profileName: value.profileName as EngineeringQualityPolicy["profileName"],
    defaultRules,
    ...(scopes !== undefined ? { scopes } : {}),
  };
}
