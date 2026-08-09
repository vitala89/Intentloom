import { createHash } from "node:crypto";
import {
  QUALITY_BASELINE_SCHEMA_URN,
  QUALITY_BASELINE_PREVIEW_SCHEMA_URN,
  type EngineeringQualityBaseline,
  type EngineeringQualityBaselineApproval,
  type EngineeringQualityBaselineItem,
  type EngineeringQualityBaselinePreview,
  type EngineeringQualityFinding,
  type QualityBaselineReviewTrigger,
} from "@intentloom/protocol";
import {
  validateEngineeringQualityBaseline,
  validateEngineeringQualityBaselinePreview,
} from "@intentloom/validator";

export interface PrepareEngineeringQualityBaselineOptions {
  readonly projectId: string;
  readonly policyId: string;
  readonly policyVersion?: string;
  readonly ruleVersions?: Readonly<Record<string, string>>;
  readonly findings: readonly EngineeringQualityFinding[];
  readonly reason: string;
  readonly owner: string;
  readonly createdAt?: number;
  readonly allowedGrowth?: number;
  readonly reviewTrigger?: QualityBaselineReviewTrigger;
  readonly reviewAt?: number;
  readonly expiresAt?: number;
}

function baselineItemId(finding: EngineeringQualityFinding): string {
  const key = `${finding.ruleId}\u0000${finding.artifactPath}`;
  return `baseline-${createHash("sha256").update(key).digest("hex").slice(0, 16)}`;
}

function isBaselineCandidate(finding: EngineeringQualityFinding): boolean {
  return (
    finding.measuredValue > finding.thresholdValue &&
    ["preferred-exceeded", "review-required", "hard-limit-exceeded"].includes(
      finding.state,
    )
  );
}

function requireText(value: string, field: string): void {
  if (!value.trim()) {
    throw new Error(`${field} must be a non-empty string`);
  }
}

export function prepareEngineeringQualityBaseline(
  options: PrepareEngineeringQualityBaselineOptions,
): EngineeringQualityBaselinePreview {
  requireText(options.projectId, "projectId");
  requireText(options.policyId, "policyId");
  requireText(options.reason, "reason");
  requireText(options.owner, "owner");
  const createdAt = options.createdAt ?? Date.now();
  const allowedGrowth = options.allowedGrowth ?? 0;
  if (createdAt <= 0 || !Number.isFinite(createdAt)) {
    throw new Error("createdAt must be a positive timestamp");
  }
  if (allowedGrowth < 0 || !Number.isFinite(allowedGrowth)) {
    throw new Error("allowedGrowth must be non-negative");
  }

  const candidates = options.findings.filter(isBaselineCandidate);
  const candidateItems = candidates.map<EngineeringQualityBaselineItem>(
    (finding) => ({
      id: baselineItemId(finding),
      ruleId: finding.ruleId,
      artifactPath: finding.artifactPath,
      baselineMeasuredValue: finding.measuredValue,
      contentDigest: finding.evidence.contentDigest,
      reason: options.reason,
      owner: options.owner,
      createdAt,
      allowedGrowth,
      classification: finding.classification,
      ...(options.ruleVersions?.[finding.ruleId] !== undefined
        ? { ruleVersion: options.ruleVersions[finding.ruleId] }
        : {}),
      reviewTrigger: options.reviewTrigger ?? "manual",
      ...(options.reviewAt !== undefined ? { reviewAt: options.reviewAt } : {}),
      ...(options.expiresAt !== undefined
        ? { expiresAt: options.expiresAt }
        : {}),
      status: "active",
    }),
  );

  return validateEngineeringQualityBaselinePreview({
    schemaVersion: QUALITY_BASELINE_PREVIEW_SCHEMA_URN,
    projectId: options.projectId,
    policyId: options.policyId,
    ...(options.policyVersion !== undefined
      ? { policyVersion: options.policyVersion }
      : {}),
    generatedAt: createdAt,
    candidateItems,
    sourceFindingIds: candidates.map((finding) => finding.findingId),
    approvalRequired: true,
  });
}

export function approveEngineeringQualityBaseline(
  preview: EngineeringQualityBaselinePreview,
  approval: EngineeringQualityBaselineApproval,
): EngineeringQualityBaseline {
  const validatedPreview = validateEngineeringQualityBaselinePreview(preview);
  requireText(approval.approvedBy, "approvedBy");
  if (
    approval.approvedAt <= 0 ||
    !Number.isFinite(approval.approvedAt) ||
    approval.approvedAt < validatedPreview.generatedAt
  ) {
    throw new Error("approvedAt must be on or after preview generation");
  }
  return validateEngineeringQualityBaseline({
    schemaVersion: QUALITY_BASELINE_SCHEMA_URN,
    projectId: validatedPreview.projectId,
    policyId: validatedPreview.policyId,
    ...(validatedPreview.policyVersion !== undefined
      ? { policyVersion: validatedPreview.policyVersion }
      : {}),
    createdAt: validatedPreview.generatedAt,
    approvedBy: approval.approvedBy,
    approvedAt: approval.approvedAt,
    items: validatedPreview.candidateItems,
  });
}
