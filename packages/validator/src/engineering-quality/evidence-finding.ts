import {
  QUALITY_FINDING_SCHEMA_URN,
  type EngineeringQualityEvidence,
  type EngineeringQualityFinding,
  type QualityArtifactClassification,
  type QualityFindingState,
  type QualityRuleSeverity,
  type QualityThresholdLevel,
} from "@intentloom/protocol";
import {
  isObject,
  QUALITY_ARTIFACT_CLASSIFICATIONS,
  QUALITY_FINDING_STATES,
  QUALITY_RULE_SEVERITIES,
  QUALITY_THRESHOLD_LEVELS,
} from "./common.js";

export function validateEngineeringQualityEvidence(
  value: unknown,
): EngineeringQualityEvidence {
  if (!isObject(value)) {
    throw new Error("quality evidence must be an object");
  }
  if (typeof value.artifactPath !== "string" || !value.artifactPath.trim()) {
    throw new Error("evidence.artifactPath must be a non-empty string");
  }
  if (
    !QUALITY_ARTIFACT_CLASSIFICATIONS.includes(
      value.classification as QualityArtifactClassification,
    )
  ) {
    throw new Error(
      "evidence.classification must be a valid QualityArtifactClassification",
    );
  }
  if (
    typeof value.measuredValue !== "number" ||
    !Number.isFinite(value.measuredValue) ||
    value.measuredValue < 0
  ) {
    throw new Error("evidence.measuredValue must be a non-negative number");
  }
  if (
    value.unit !== "physical-lines" &&
    value.unit !== "function-lines" &&
    value.unit !== "cyclomatic-complexity"
  ) {
    throw new Error(
      "evidence.unit must be physical-lines, function-lines, or cyclomatic-complexity",
    );
  }
  if (typeof value.contentDigest !== "string" || !value.contentDigest.trim()) {
    throw new Error("evidence.contentDigest must be a non-empty string");
  }
  if (
    value.lineEnding !== "lf" &&
    value.lineEnding !== "crlf" &&
    value.lineEnding !== "mixed"
  ) {
    throw new Error("evidence.lineEnding must be lf, crlf, or mixed");
  }
  return {
    artifactPath: value.artifactPath,
    classification: value.classification as QualityArtifactClassification,
    measuredValue: value.measuredValue,
    unit: value.unit,
    contentDigest: value.contentDigest,
    lineEnding: value.lineEnding,
  };
}

export function validateEngineeringQualityFinding(
  value: unknown,
): EngineeringQualityFinding {
  if (!isObject(value)) {
    throw new Error("quality finding must be an object");
  }
  if (value.schemaVersion !== QUALITY_FINDING_SCHEMA_URN) {
    throw new Error(
      `finding.schemaVersion must equal ${QUALITY_FINDING_SCHEMA_URN}`,
    );
  }
  if (typeof value.findingId !== "string" || !value.findingId.trim()) {
    throw new Error("finding.findingId must be a non-empty string");
  }
  if (typeof value.ruleId !== "string" || !value.ruleId.trim()) {
    throw new Error("finding.ruleId must be a non-empty string");
  }
  if (typeof value.artifactPath !== "string" || !value.artifactPath.trim()) {
    throw new Error("finding.artifactPath must be a non-empty string");
  }
  if (
    !QUALITY_ARTIFACT_CLASSIFICATIONS.includes(
      value.classification as QualityArtifactClassification,
    )
  ) {
    throw new Error(
      "finding.classification must be a valid QualityArtifactClassification",
    );
  }
  if (!QUALITY_FINDING_STATES.includes(value.state as QualityFindingState)) {
    throw new Error("finding.state must be a valid QualityFindingState");
  }
  if (
    !QUALITY_RULE_SEVERITIES.includes(value.severity as QualityRuleSeverity)
  ) {
    throw new Error("finding.severity must be a valid QualityRuleSeverity");
  }
  if (
    value.exceededThresholdLevel !== undefined &&
    !QUALITY_THRESHOLD_LEVELS.includes(
      value.exceededThresholdLevel as QualityThresholdLevel,
    )
  ) {
    throw new Error(
      "finding.exceededThresholdLevel must be a valid QualityThresholdLevel",
    );
  }
  if (
    typeof value.measuredValue !== "number" ||
    !Number.isFinite(value.measuredValue) ||
    value.measuredValue < 0
  ) {
    throw new Error("finding.measuredValue must be a non-negative number");
  }
  if (
    typeof value.thresholdValue !== "number" ||
    !Number.isFinite(value.thresholdValue) ||
    value.thresholdValue < 0
  ) {
    throw new Error("finding.thresholdValue must be a non-negative number");
  }
  if (typeof value.message !== "string" || !value.message.trim()) {
    throw new Error("finding.message must be a non-empty string");
  }
  const evidence = validateEngineeringQualityEvidence(value.evidence);

  return {
    schemaVersion: QUALITY_FINDING_SCHEMA_URN,
    findingId: value.findingId,
    ruleId: value.ruleId,
    artifactPath: value.artifactPath,
    classification: value.classification as QualityArtifactClassification,
    state: value.state as QualityFindingState,
    severity: value.severity as QualityRuleSeverity,
    ...(value.exceededThresholdLevel !== undefined
      ? {
          exceededThresholdLevel:
            value.exceededThresholdLevel as QualityThresholdLevel,
        }
      : {}),
    measuredValue: value.measuredValue,
    thresholdValue: value.thresholdValue,
    message: value.message,
    evidence,
  };
}
