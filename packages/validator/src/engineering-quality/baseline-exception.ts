import {
  QUALITY_BASELINE_SCHEMA_URN,
  type EngineeringQualityBaseline,
  type EngineeringQualityException,
  type QualityBaselineReviewTrigger,
} from "@intentloom/protocol";
import { isObject } from "./common.js";
import { validateEngineeringQualityBaselineItem } from "./baseline-item.js";

export { validateEngineeringQualityBaselineItem } from "./baseline-item.js";

const REVIEW_TRIGGERS = [
  "manual",
  "expiry",
  "artifact-touch",
  "policy-change",
] as const;

export function validateEngineeringQualityBaseline(
  value: unknown,
): EngineeringQualityBaseline {
  if (!isObject(value)) throw new Error("quality baseline must be an object");
  if (value.schemaVersion !== QUALITY_BASELINE_SCHEMA_URN) {
    throw new Error(
      `baseline.schemaVersion must equal ${QUALITY_BASELINE_SCHEMA_URN}`,
    );
  }
  if (typeof value.projectId !== "string" || !value.projectId.trim()) {
    throw new Error("baseline.projectId must be a non-empty string");
  }
  if (!Array.isArray(value.items))
    throw new Error("baseline.items must be an array");
  const items = value.items.map(validateEngineeringQualityBaselineItem);
  const policyId =
    typeof value.policyId === "string" ? value.policyId : undefined;
  const policyVersion =
    typeof value.policyVersion === "string" ? value.policyVersion : undefined;
  const createdAt =
    typeof value.createdAt === "number" ? value.createdAt : undefined;
  const reviewTrigger = value.reviewTrigger as
    QualityBaselineReviewTrigger | undefined;
  const reviewAt =
    typeof value.reviewAt === "number" ? value.reviewAt : undefined;
  const approvedBy =
    typeof value.approvedBy === "string" ? value.approvedBy : undefined;
  const approvedAt =
    typeof value.approvedAt === "number" ? value.approvedAt : undefined;
  if (value.policyId !== undefined && (!policyId || !policyId.trim())) {
    throw new Error("baseline.policyId must be a non-empty string");
  }
  if (
    value.policyVersion !== undefined &&
    (!policyVersion || !policyVersion.trim())
  ) {
    throw new Error("baseline.policyVersion must be a non-empty string");
  }
  for (const [field, fieldValue] of [
    ["createdAt", createdAt],
    ["reviewAt", reviewAt],
    ["approvedAt", approvedAt],
  ] as const) {
    if (
      value[field] !== undefined &&
      (fieldValue === undefined ||
        fieldValue <= 0 ||
        !Number.isFinite(fieldValue))
    ) {
      throw new Error(`baseline.${field} must be a positive timestamp`);
    }
  }
  if (reviewTrigger !== undefined && !REVIEW_TRIGGERS.includes(reviewTrigger)) {
    throw new Error("baseline.reviewTrigger must be valid");
  }
  if (value.approvedBy !== undefined && (!approvedBy || !approvedBy.trim())) {
    throw new Error("baseline.approvedBy must be a non-empty string");
  }
  if (value.approvedAt !== undefined && approvedBy === undefined) {
    throw new Error("baseline.approvedBy is required when approvedAt is set");
  }
  return {
    schemaVersion: QUALITY_BASELINE_SCHEMA_URN,
    projectId: value.projectId,
    items,
    ...(policyId !== undefined ? { policyId } : {}),
    ...(policyVersion !== undefined ? { policyVersion } : {}),
    ...(createdAt !== undefined ? { createdAt } : {}),
    ...(reviewTrigger !== undefined ? { reviewTrigger } : {}),
    ...(reviewAt !== undefined ? { reviewAt } : {}),
    ...(approvedBy !== undefined ? { approvedBy } : {}),
    ...(approvedAt !== undefined ? { approvedAt } : {}),
  };
}

export function validateEngineeringQualityException(
  value: unknown,
): EngineeringQualityException {
  if (!isObject(value)) throw new Error("quality exception must be an object");
  const fields = [
    "exceptionId",
    "ruleId",
    "pathPattern",
    "reason",
    "owner",
  ] as const;
  for (const field of fields) {
    if (typeof value[field] !== "string" || !value[field].trim()) {
      throw new Error(`exception.${field} must be a non-empty string`);
    }
  }
  const exceptionId = value.exceptionId as string;
  const ruleId = value.ruleId as string;
  const pathPattern = value.pathPattern as string;
  const reason = value.reason as string;
  const owner = value.owner as string;
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
    throw new Error("exception.expiresAt must be after approvedAt");
  }
  return {
    exceptionId,
    ruleId,
    pathPattern,
    reason,
    owner,
    approvedAt: value.approvedAt,
    ...(value.expiresAt !== undefined ? { expiresAt: value.expiresAt } : {}),
  };
}
