export const QUALITY_POLICY_SCHEMA_URN =
  "urn:intentloom:schema:engineering-quality-policy:1" as const;

export const QUALITY_FINDING_SCHEMA_URN =
  "urn:intentloom:schema:engineering-quality-finding:1" as const;

export const QUALITY_BASELINE_SCHEMA_URN =
  "urn:intentloom:schema:engineering-quality-baseline:1" as const;

export const QUALITY_BASELINE_PREVIEW_SCHEMA_URN =
  "urn:intentloom:schema:engineering-quality-baseline-preview:1" as const;

export const QUALITY_BASELINE_RATCHET_SCHEMA_URN =
  "urn:intentloom:schema:engineering-quality-baseline-ratchet:1" as const;

export const QUALITY_BASELINE_REDUCTION_SCHEMA_URN =
  "urn:intentloom:schema:engineering-quality-baseline-reduction:1" as const;

export const QUALITY_TASK_PLAN_SCHEMA_URN =
  "urn:intentloom:schema:engineering-quality-task-plan:1" as const;

export const QUALITY_TASK_DIFF_SCHEMA_URN =
  "urn:intentloom:schema:engineering-quality-task-diff:1" as const;

export const QUALITY_PULL_REQUEST_EVIDENCE_SCHEMA_URN =
  "urn:intentloom:schema:engineering-quality-pull-request-evidence:1" as const;

export const QUALITY_DECOMPOSITION_PLAN_SCHEMA_URN =
  "urn:intentloom:schema:engineering-quality-decomposition-plan:1" as const;

export const QUALITY_PACK_SCHEMA_URN =
  "urn:intentloom:schema:engineering-quality-pack:1" as const;

export const QUALITY_PACK_RESOLUTION_SCHEMA_URN =
  "urn:intentloom:schema:engineering-quality-pack-resolution:1" as const;
export type QualityRuleSeverity = "error" | "warning" | "info";

export type QualityThresholdLevel =
  "preferred" | "review" | "hard" | "baseline";

export type QualityArtifactClassification =
  | "hand-written-production"
  | "hand-written-test"
  | "generated-source"
  | "vendored-source"
  | "declarative-config"
  | "schema-or-protocol"
  | "fixture-or-data-table"
  | "snapshot"
  | "migration"
  | "public-export-surface"
  | "documentation"
  | "unknown";

export type QualityFindingState =
  | "within-policy"
  | "preferred-exceeded"
  | "review-required"
  | "hard-limit-exceeded"
  | "legacy-baseline"
  | "legacy-growth"
  | "exception-active"
  | "exception-expired"
  | "unsupported-measurement"
  | "classification-required";
export type QualityBaselineReviewTrigger =
  "manual" | "expiry" | "artifact-touch" | "policy-change";

export type QualityBaselineItemStatus =
  "active" | "stale" | "expired" | "resolved";

export type QualityBaselineRatchetStatus = "passed" | "failed";

export type QualityBaselineRatchetIssueKind =
  "new-violation" | "growth" | "stale" | "expired" | "resolved";

export type QualityProjectionConfidence = "low" | "medium" | "high";

export type QualityTaskPlanStatus = "accepted" | "review-required" | "conflict";

export type QualityTaskProjectionDisposition =
  | "within-policy"
  | "likely-review-threshold-crossing"
  | "likely-hard-limit-crossing"
  | "unsupported";

export type QualityTaskConflictKind =
  | "hard-limit-crossing"
  | "policy-unresolved"
  | "missing-acceptance-criteria"
  | "projection-drift"
  | "unexpected-path"
  | "missing-final-evidence";

export type QualityTaskDiffStatus = "passed" | "conflict";

export type QualityTaskChangeStatus =
  | "within-plan"
  | "under-projected"
  | "over-projected"
  | "hard-limit-exceeded"
  | "unexpected-path"
  | "missing-final-evidence";

export type QualityResponsibilityCohesion = "high" | "medium" | "low";

export type QualityDependencyKind = "internal" | "public-api" | "test";

export type QualityPublicApiCompatibility = "preserve" | "review";

export type QualityDecompositionOptionKind =
  "minimal" | "recommended" | "keep-together" | "defer" | "exception";

export type QualityDecompositionPlanStatus =
  "ready" | "review-required" | "unsupported";

export type QualityDecompositionConflictKind =
  | "insufficient-evidence"
  | "no-cohesive-extraction"
  | "public-api-risk"
  | "dependency-risk"
  | "oversized-retained";

export type QualityPackEntryKind = "rule" | "guidance";

export type QualityPackMetric =
  | "physical-lines"
  | "function-lines"
  | "cyclomatic-complexity"
  | "nesting-depth"
  | "parameter-count";

export type QualityPackEnforcement =
  "deterministic" | "checker-backed" | "review-checklist" | "guidance";

export type QualityPackResolutionStatus =
  "resolved" | "conflict" | "incompatible" | "unsupported";

export type QualityPackConflictKind =
  | "unknown-pack"
  | "duplicate-pack"
  | "missing-dependency"
  | "dependency-cycle"
  | "incompatible-pack"
  | "duplicate-meaning"
  | "conflicting-meaning";

export const QUALITY_REMEDIATION_PLAN_SCHEMA_URN =
  "urn:intentloom:schema:engineering-quality-remediation-plan:1" as const;

export type QualityRemediationKind =
  "decomposition-plan" | "baseline-reduction" | "exception-expiry" | "rule-fix";

export type QualityRemediationStatus =
  "draft" | "approved" | "applied" | "rolled-back" | "rejected" | "stale";

export const QUALITY_ORGANIZATION_CATALOG_SCHEMA_URN =
  "urn:intentloom:schema:quality-organization-catalog:1" as const;

export const QUALITY_EXECUTABLE_MARKETPLACE_SCHEMA_URN =
  "urn:intentloom:schema:quality-executable-marketplace:1" as const;

export const QUALITY_DISCIPLINE_SCHEMA_URN =
  "urn:intentloom:schema:quality-discipline:1" as const;

export const QUALITY_ROLE_COMPOSITION_SCHEMA_URN =
  "urn:intentloom:schema:quality-role-composition:1" as const;

export const QUALITY_SPECIALIZED_PACK_SCHEMA_URN =
  "urn:intentloom:schema:quality-specialized-pack:1" as const;

export const QUALITY_SPECIALIZED_PACK_TRUST_STATE_SCHEMA_URN =
  "urn:intentloom:schema:quality-specialized-pack-trust-state:1" as const;

export const QUALITY_DISCIPLINE_ALIAS_SCHEMA_URN =
  "urn:intentloom:schema:quality-discipline-alias:1" as const;

export const QUALITY_SPECIALIZED_PACK_DETECTION_RULE_SCHEMA_URN =
  "urn:intentloom:schema:quality-specialized-pack-detection-rule:1" as const;

export const QUALITY_SPECIALIZED_PACK_DETECTION_RESULT_SCHEMA_URN =
  "urn:intentloom:schema:quality-specialized-pack-detection-result:1" as const;

export const QUALITY_SPECIALIZED_PACK_DETECTION_RESOLUTION_SCHEMA_URN =
  "urn:intentloom:schema:quality-specialized-pack-detection-resolution:1" as const;

export const QUALITY_SPECIALIZED_PACK_CHECK_DEFINITION_SCHEMA_URN =
  "urn:intentloom:schema:quality-specialized-pack-check-definition:1" as const;

export const QUALITY_SPECIALIZED_PACK_CHECK_RESULT_SCHEMA_URN =
  "urn:intentloom:schema:quality-specialized-pack-check-result:1" as const;

export const QUALITY_SPECIALIZED_PACK_CHECK_REPORT_SCHEMA_URN =
  "urn:intentloom:schema:quality-specialized-pack-check-report:1" as const;

export type QualityDetectionConfidence = "low" | "medium" | "high";

export type QualityDetectionSecurityImpact =
  "none" | "review-required" | "elevated";

export type QualityDetectionPathMatchKind = "suffix" | "contains" | "exact";
