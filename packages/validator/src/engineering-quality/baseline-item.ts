import {
  type EngineeringQualityBaselineItem,
  type QualityArtifactClassification,
  type QualityBaselineItemStatus,
  type QualityBaselineReviewTrigger,
} from "@intentloom/protocol";
import { isObject, QUALITY_ARTIFACT_CLASSIFICATIONS } from "./common.js";

const REVIEW_TRIGGERS = [
  "manual",
  "expiry",
  "artifact-touch",
  "policy-change",
] as const;
const BASELINE_ITEM_STATUSES = [
  "active",
  "stale",
  "expired",
  "resolved",
] as const;

export function validateEngineeringQualityBaselineItem(
  value: unknown,
): EngineeringQualityBaselineItem {
  if (!isObject(value)) throw new Error("baseline item must be an object");
  const requiredStrings = [
    "id",
    "ruleId",
    "artifactPath",
    "contentDigest",
    "reason",
    "owner",
  ] as const;
  for (const field of requiredStrings) {
    if (typeof value[field] !== "string" || !value[field].trim()) {
      throw new Error(`baselineItem.${field} must be a non-empty string`);
    }
  }
  const id = value.id as string;
  const ruleId = value.ruleId as string;
  const artifactPath = value.artifactPath as string;
  const contentDigest = value.contentDigest as string;
  const reason = value.reason as string;
  const owner = value.owner as string;
  if (
    typeof value.baselineMeasuredValue !== "number" ||
    !Number.isFinite(value.baselineMeasuredValue) ||
    value.baselineMeasuredValue < 0
  ) {
    throw new Error("baselineItem.baselineMeasuredValue must be non-negative");
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
    throw new Error("baselineItem.allowedGrowth must be non-negative");
  }
  const ruleVersion =
    typeof value.ruleVersion === "string" ? value.ruleVersion : undefined;
  const classification = value.classification as
    QualityArtifactClassification | undefined;
  const reviewTrigger = value.reviewTrigger as
    QualityBaselineReviewTrigger | undefined;
  const reviewAt =
    typeof value.reviewAt === "number" ? value.reviewAt : undefined;
  const expiresAt =
    typeof value.expiresAt === "number" ? value.expiresAt : undefined;
  const status = value.status as QualityBaselineItemStatus | undefined;
  if (
    value.ruleVersion !== undefined &&
    (!ruleVersion || !ruleVersion.trim())
  ) {
    throw new Error("baselineItem.ruleVersion must be a non-empty string");
  }
  if (
    classification !== undefined &&
    !QUALITY_ARTIFACT_CLASSIFICATIONS.includes(classification)
  ) {
    throw new Error("baselineItem.classification must be valid");
  }
  if (reviewTrigger !== undefined && !REVIEW_TRIGGERS.includes(reviewTrigger)) {
    throw new Error("baselineItem.reviewTrigger must be valid");
  }
  for (const [field, fieldValue] of [
    ["reviewAt", reviewAt],
    ["expiresAt", expiresAt],
  ] as const) {
    if (
      value[field] !== undefined &&
      (fieldValue === undefined ||
        fieldValue <= 0 ||
        !Number.isFinite(fieldValue))
    ) {
      throw new Error(`baselineItem.${field} must be a positive timestamp`);
    }
  }
  if (
    reviewAt !== undefined &&
    expiresAt !== undefined &&
    expiresAt < reviewAt
  ) {
    throw new Error("baselineItem.expiresAt must not precede reviewAt");
  }
  if (status !== undefined && !BASELINE_ITEM_STATUSES.includes(status)) {
    throw new Error("baselineItem.status must be valid");
  }
  return {
    id,
    ruleId,
    artifactPath,
    baselineMeasuredValue: value.baselineMeasuredValue,
    contentDigest,
    reason,
    owner,
    createdAt: value.createdAt,
    allowedGrowth: value.allowedGrowth,
    ...(ruleVersion !== undefined ? { ruleVersion } : {}),
    ...(classification !== undefined ? { classification } : {}),
    ...(reviewTrigger !== undefined ? { reviewTrigger } : {}),
    ...(reviewAt !== undefined ? { reviewAt } : {}),
    ...(expiresAt !== undefined ? { expiresAt } : {}),
    ...(status !== undefined ? { status } : {}),
  };
}
