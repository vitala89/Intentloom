import {
  QUALITY_REMEDIATION_PLAN_SCHEMA_URN,
  type EngineeringQualityRemediationPlan,
  type QualityRemediationApplyOptions,
  type QualityRemediationFileDiff,
  type QualityRemediationKind,
  type QualityRemediationProposal,
  type QualityRemediationRollbackResult,
  type QualityRemediationStatus,
} from "@intentloom/protocol";
import { isObject } from "./common.js";
import { stringField } from "./task-validation-common.js";

const KINDS: readonly QualityRemediationKind[] = [
  "decomposition-plan",
  "baseline-reduction",
  "exception-expiry",
  "rule-fix",
];

const STATUSES: readonly QualityRemediationStatus[] = [
  "draft",
  "approved",
  "applied",
  "rolled-back",
  "rejected",
  "stale",
];

function strings(value: unknown, fieldName: string): readonly string[] {
  if (!Array.isArray(value)) throw new Error(`${fieldName} must be an array`);
  return value.map((item, index) =>
    stringField(item, `${fieldName}[${index}]`),
  );
}

export function validateQualityRemediationProposal(
  value: unknown,
): QualityRemediationProposal {
  if (!isObject(value))
    throw new Error("remediation proposal must be an object");
  if (!KINDS.includes(value.kind as QualityRemediationKind)) {
    throw new Error("remediation proposal.kind must be valid");
  }
  return {
    id: stringField(value.id, "remediation proposal.id"),
    kind: value.kind as QualityRemediationKind,
    title: stringField(value.title, "remediation proposal.title"),
    rationale: stringField(value.rationale, "remediation proposal.rationale"),
    targetFindingIds: strings(
      value.targetFindingIds,
      "remediation proposal.targetFindingIds",
    ),
    affectedPaths: strings(
      value.affectedPaths,
      "remediation proposal.affectedPaths",
    ),
  };
}

export function validateQualityRemediationFileDiff(
  value: unknown,
): QualityRemediationFileDiff {
  if (!isObject(value))
    throw new Error("remediation file diff must be an object");
  return {
    path: stringField(value.path, "remediation file diff.path"),
    beforeDigest: stringField(
      value.beforeDigest,
      "remediation file diff.beforeDigest",
    ),
    afterDigest: stringField(
      value.afterDigest,
      "remediation file diff.afterDigest",
    ),
    beforeContent: stringField(
      value.beforeContent,
      "remediation file diff.beforeContent",
    ),
    afterContent: stringField(
      value.afterContent,
      "remediation file diff.afterContent",
    ),
  };
}

export function validateEngineeringQualityRemediationPlan(
  value: unknown,
): EngineeringQualityRemediationPlan {
  if (!isObject(value)) throw new Error("remediation plan must be an object");
  if (value.schemaVersion !== QUALITY_REMEDIATION_PLAN_SCHEMA_URN) {
    throw new Error(
      `remediationPlan.schemaVersion must equal ${QUALITY_REMEDIATION_PLAN_SCHEMA_URN}`,
    );
  }
  if (!STATUSES.includes(value.status as QualityRemediationStatus)) {
    throw new Error("remediationPlan.status must be valid");
  }
  if (!Array.isArray(value.diffs)) {
    throw new Error("remediationPlan.diffs must be an array");
  }
  const proposal = validateQualityRemediationProposal(value.proposal);
  const diffs = value.diffs.map(validateQualityRemediationFileDiff);

  return {
    schemaVersion: QUALITY_REMEDIATION_PLAN_SCHEMA_URN,
    planId: stringField(value.planId, "remediationPlan.planId"),
    projectRoot: stringField(value.projectRoot, "remediationPlan.projectRoot"),
    status: value.status as QualityRemediationStatus,
    proposal,
    diffs,
    contentDigest: stringField(
      value.contentDigest,
      "remediationPlan.contentDigest",
    ),
    createdAt: stringField(value.createdAt, "remediationPlan.createdAt"),
    ...(typeof value.approvedAt === "string"
      ? { approvedAt: value.approvedAt }
      : {}),
    ...(typeof value.appliedAt === "string"
      ? { appliedAt: value.appliedAt }
      : {}),
  };
}

export function validateQualityRemediationApplyOptions(
  value: unknown,
): QualityRemediationApplyOptions {
  if (!isObject(value))
    throw new Error("remediation apply options must be an object");
  const plan = validateEngineeringQualityRemediationPlan(value.plan);
  return {
    projectRoot: stringField(
      value.projectRoot,
      "remediation apply options.projectRoot",
    ),
    plan,
    humanApprovalToken: stringField(
      value.humanApprovalToken,
      "remediation apply options.humanApprovalToken",
    ),
    ...(typeof value.createBackup === "boolean"
      ? { createBackup: value.createBackup }
      : {}),
  };
}

export function validateQualityRemediationRollbackResult(
  value: unknown,
): QualityRemediationRollbackResult {
  if (!isObject(value))
    throw new Error("remediation rollback result must be an object");
  if (value.status !== "success" && value.status !== "failed") {
    throw new Error(
      "remediation rollback result.status must be 'success' or 'failed'",
    );
  }
  return {
    status: value.status,
    restoredFiles: strings(
      value.restoredFiles,
      "remediation rollback result.restoredFiles",
    ),
    ...(typeof value.error === "string" ? { error: value.error } : {}),
  };
}
