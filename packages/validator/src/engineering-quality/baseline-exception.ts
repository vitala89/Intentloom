import {
  QUALITY_BASELINE_SCHEMA_URN,
  type EngineeringQualityBaseline,
  type EngineeringQualityBaselineItem,
  type EngineeringQualityException,
} from "@intentloom/protocol";
import { isObject } from "./common.js";

export function validateEngineeringQualityBaselineItem(
  value: unknown,
): EngineeringQualityBaselineItem {
  if (!isObject(value)) {
    throw new Error("baseline item must be an object");
  }
  if (typeof value.id !== "string" || !value.id.trim()) {
    throw new Error("baselineItem.id must be a non-empty string");
  }
  if (typeof value.ruleId !== "string" || !value.ruleId.trim()) {
    throw new Error("baselineItem.ruleId must be a non-empty string");
  }
  if (typeof value.artifactPath !== "string" || !value.artifactPath.trim()) {
    throw new Error("baselineItem.artifactPath must be a non-empty string");
  }
  if (
    typeof value.baselineMeasuredValue !== "number" ||
    !Number.isFinite(value.baselineMeasuredValue) ||
    value.baselineMeasuredValue < 0
  ) {
    throw new Error(
      "baselineItem.baselineMeasuredValue must be a non-negative number",
    );
  }
  if (typeof value.contentDigest !== "string" || !value.contentDigest.trim()) {
    throw new Error("baselineItem.contentDigest must be a non-empty string");
  }
  if (typeof value.reason !== "string" || !value.reason.trim()) {
    throw new Error("baselineItem.reason must be a non-empty string");
  }
  if (typeof value.owner !== "string" || !value.owner.trim()) {
    throw new Error("baselineItem.owner must be a non-empty string");
  }
  if (
    typeof value.createdAt !== "number" ||
    !Number.isFinite(value.createdAt) ||
    value.createdAt <= 0
  ) {
    throw new Error("baselineItem.createdAt must be a positive timestamp");
  }
  if (
    typeof value.allowedGrowth !== "number" ||
    !Number.isFinite(value.allowedGrowth) ||
    value.allowedGrowth < 0
  ) {
    throw new Error("baselineItem.allowedGrowth must be a non-negative number");
  }
  return {
    id: value.id,
    ruleId: value.ruleId,
    artifactPath: value.artifactPath,
    baselineMeasuredValue: value.baselineMeasuredValue,
    contentDigest: value.contentDigest,
    reason: value.reason,
    owner: value.owner,
    createdAt: value.createdAt,
    allowedGrowth: value.allowedGrowth,
  };
}

export function validateEngineeringQualityBaseline(
  value: unknown,
): EngineeringQualityBaseline {
  if (!isObject(value)) {
    throw new Error("quality baseline must be an object");
  }
  if (value.schemaVersion !== QUALITY_BASELINE_SCHEMA_URN) {
    throw new Error(
      `baseline.schemaVersion must equal ${QUALITY_BASELINE_SCHEMA_URN}`,
    );
  }
  if (typeof value.projectId !== "string" || !value.projectId.trim()) {
    throw new Error("baseline.projectId must be a non-empty string");
  }
  if (!Array.isArray(value.items)) {
    throw new Error("baseline.items must be an array");
  }
  const items = value.items.map(validateEngineeringQualityBaselineItem);
  return {
    schemaVersion: QUALITY_BASELINE_SCHEMA_URN,
    projectId: value.projectId,
    items,
  };
}

export function validateEngineeringQualityException(
  value: unknown,
): EngineeringQualityException {
  if (!isObject(value)) {
    throw new Error("quality exception must be an object");
  }
  if (typeof value.exceptionId !== "string" || !value.exceptionId.trim()) {
    throw new Error("exception.exceptionId must be a non-empty string");
  }
  if (typeof value.ruleId !== "string" || !value.ruleId.trim()) {
    throw new Error("exception.ruleId must be a non-empty string");
  }
  if (typeof value.pathPattern !== "string" || !value.pathPattern.trim()) {
    throw new Error("exception.pathPattern must be a non-empty string");
  }
  if (typeof value.reason !== "string" || !value.reason.trim()) {
    throw new Error("exception.reason must be a non-empty string");
  }
  if (typeof value.owner !== "string" || !value.owner.trim()) {
    throw new Error("exception.owner must be a non-empty string");
  }
  if (
    typeof value.approvedAt !== "number" ||
    !Number.isFinite(value.approvedAt) ||
    value.approvedAt <= 0
  ) {
    throw new Error("exception.approvedAt must be a positive timestamp");
  }
  if (
    value.expiresAt !== undefined &&
    (typeof value.expiresAt !== "number" ||
      !Number.isFinite(value.expiresAt) ||
      value.expiresAt <= value.approvedAt)
  ) {
    throw new Error(
      "exception.expiresAt must be a timestamp after approvedAt when provided",
    );
  }
  return {
    exceptionId: value.exceptionId,
    ruleId: value.ruleId,
    pathPattern: value.pathPattern,
    reason: value.reason,
    owner: value.owner,
    approvedAt: value.approvedAt,
    ...(value.expiresAt !== undefined ? { expiresAt: value.expiresAt } : {}),
  };
}
