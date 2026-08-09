import {
  QUALITY_BASELINE_SCHEMA_URN,
  QUALITY_BASELINE_PREVIEW_SCHEMA_URN,
  QUALITY_BASELINE_RATCHET_SCHEMA_URN,
  QUALITY_BASELINE_REDUCTION_SCHEMA_URN,
  type EngineeringQualityBaselinePreview,
  type EngineeringQualityBaselineRatchetIssue,
  type EngineeringQualityBaselineRatchetResult,
  type EngineeringQualityBaselineReduction,
  type QualityBaselineRatchetIssueKind,
} from "@intentloom/protocol";
import { isObject } from "./common.js";
import { validateEngineeringQualityBaseline } from "./baseline-exception.js";
import { validateEngineeringQualityFinding } from "./evidence-finding.js";

const ISSUE_KINDS: readonly QualityBaselineRatchetIssueKind[] = [
  "new-violation",
  "growth",
  "stale",
  "expired",
  "resolved",
];

function requireString(value: unknown, field: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${field} must be a non-empty string`);
  }
  return value;
}

function requireTimestamp(value: unknown, field: string): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    throw new Error(`${field} must be a positive timestamp`);
  }
  return value;
}

function optionalNumber(value: unknown, field: string): number | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    throw new Error(`${field} must be non-negative`);
  }
  return value;
}

function validateItem(value: unknown, projectId: string) {
  return validateEngineeringQualityBaseline({
    schemaVersion: QUALITY_BASELINE_SCHEMA_URN,
    projectId,
    items: [value],
  }).items[0]!;
}

function validateIssue(value: unknown): EngineeringQualityBaselineRatchetIssue {
  if (!isObject(value)) {
    throw new Error("ratchet issue must be an object");
  }
  const baselineMeasuredValue = optionalNumber(
    value.baselineMeasuredValue,
    "ratchet issue.baselineMeasuredValue",
  );
  const measuredValue = optionalNumber(
    value.measuredValue,
    "ratchet issue.measuredValue",
  );
  const allowedCeiling = optionalNumber(
    value.allowedCeiling,
    "ratchet issue.allowedCeiling",
  );
  if (!ISSUE_KINDS.includes(value.kind as QualityBaselineRatchetIssueKind)) {
    throw new Error("ratchet issue.kind must be valid");
  }
  const issue = {
    kind: value.kind as QualityBaselineRatchetIssueKind,
    ruleId: requireString(value.ruleId, "ratchet issue.ruleId"),
    artifactPath: requireString(
      value.artifactPath,
      "ratchet issue.artifactPath",
    ),
    message: requireString(value.message, "ratchet issue.message"),
    ...(value.baselineItemId !== undefined
      ? {
          baselineItemId: requireString(value.baselineItemId, "baselineItemId"),
        }
      : {}),
    ...(value.findingId !== undefined
      ? { findingId: requireString(value.findingId, "findingId") }
      : {}),
    ...(baselineMeasuredValue !== undefined ? { baselineMeasuredValue } : {}),
    ...(measuredValue !== undefined ? { measuredValue } : {}),
    ...(allowedCeiling !== undefined ? { allowedCeiling } : {}),
  };
  return issue;
}

export function validateEngineeringQualityBaselinePreview(
  value: unknown,
): EngineeringQualityBaselinePreview {
  if (!isObject(value)) {
    throw new Error("baseline preview must be an object");
  }
  if (value.schemaVersion !== QUALITY_BASELINE_PREVIEW_SCHEMA_URN) {
    throw new Error("baseline preview schema version is unsupported");
  }
  if (value.approvalRequired !== true) {
    throw new Error("baseline preview requires explicit approval");
  }
  if (!Array.isArray(value.candidateItems)) {
    throw new Error("baseline preview candidateItems must be an array");
  }
  if (!Array.isArray(value.sourceFindingIds)) {
    throw new Error("baseline preview sourceFindingIds must be an array");
  }
  return {
    schemaVersion: QUALITY_BASELINE_PREVIEW_SCHEMA_URN,
    projectId: requireString(value.projectId, "preview.projectId"),
    policyId: requireString(value.policyId, "preview.policyId"),
    ...(value.policyVersion !== undefined
      ? { policyVersion: requireString(value.policyVersion, "policyVersion") }
      : {}),
    generatedAt: requireTimestamp(value.generatedAt, "preview.generatedAt"),
    candidateItems: value.candidateItems.map((item) =>
      validateItem(item, "preview"),
    ),
    sourceFindingIds: value.sourceFindingIds.map((id) =>
      requireString(id, "preview.sourceFindingId"),
    ),
    approvalRequired: true,
  };
}

export function validateEngineeringQualityBaselineRatchetResult(
  value: unknown,
): EngineeringQualityBaselineRatchetResult {
  if (!isObject(value)) {
    throw new Error("baseline ratchet result must be an object");
  }
  if (value.schemaVersion !== QUALITY_BASELINE_RATCHET_SCHEMA_URN) {
    throw new Error("baseline ratchet schema version is unsupported");
  }
  if (value.status !== "passed" && value.status !== "failed") {
    throw new Error("baseline ratchet status must be passed or failed");
  }
  if (typeof value.requiresReview !== "boolean") {
    throw new Error("baseline ratchet requiresReview must be boolean");
  }
  if (!Array.isArray(value.issues)) {
    throw new Error("baseline ratchet issues must be an array");
  }
  if (!Array.isArray(value.legacyFindings)) {
    throw new Error("baseline ratchet legacyFindings must be an array");
  }
  if (!Array.isArray(value.newViolations)) {
    throw new Error("baseline ratchet newViolations must be an array");
  }
  if (!Array.isArray(value.growthViolations)) {
    throw new Error("baseline ratchet growthViolations must be an array");
  }
  for (const field of [
    "staleItems",
    "expiredItems",
    "resolvedItems",
  ] as const) {
    if (!Array.isArray(value[field])) {
      throw new Error(`baseline ratchet ${field} must be an array`);
    }
  }
  const staleItems = value.staleItems as readonly unknown[];
  const expiredItems = value.expiredItems as readonly unknown[];
  const resolvedItems = value.resolvedItems as readonly unknown[];
  for (const findings of [
    value.legacyFindings,
    value.newViolations,
    value.growthViolations,
  ]) {
    findings.map(validateEngineeringQualityFinding);
  }
  return {
    schemaVersion: QUALITY_BASELINE_RATCHET_SCHEMA_URN,
    projectId: requireString(value.projectId, "ratchet.projectId"),
    status: value.status,
    requiresReview: value.requiresReview,
    issues: value.issues.map(validateIssue),
    legacyFindings: value.legacyFindings.map(validateEngineeringQualityFinding),
    newViolations: value.newViolations.map(validateEngineeringQualityFinding),
    growthViolations: value.growthViolations.map(
      validateEngineeringQualityFinding,
    ),
    staleItems: staleItems.map((item) => validateItem(item, "ratchet")),
    expiredItems: expiredItems.map((item) => validateItem(item, "ratchet")),
    resolvedItems: resolvedItems.map((item) => validateItem(item, "ratchet")),
  };
}

export function validateEngineeringQualityBaselineReduction(
  value: unknown,
): EngineeringQualityBaselineReduction {
  if (!isObject(value)) {
    throw new Error("baseline reduction must be an object");
  }
  if (value.schemaVersion !== QUALITY_BASELINE_REDUCTION_SCHEMA_URN) {
    throw new Error("baseline reduction schema version is unsupported");
  }
  if (
    !Array.isArray(value.removedItems) ||
    !Array.isArray(value.retainedItems)
  ) {
    throw new Error("baseline reduction item collections must be arrays");
  }
  return {
    schemaVersion: QUALITY_BASELINE_REDUCTION_SCHEMA_URN,
    projectId: requireString(value.projectId, "reduction.projectId"),
    preparedAt: requireTimestamp(value.preparedAt, "reduction.preparedAt"),
    baseline: validateEngineeringQualityBaseline(value.baseline),
    removedItems: value.removedItems.map((item) =>
      validateItem(item, "reduction"),
    ),
    retainedItems: value.retainedItems.map((item) =>
      validateItem(item, "reduction"),
    ),
  };
}
