import type { AdoptionPreparedPlanReason } from "./adoption-prepared-plan.js";
import type { ExistingProjectAdoptionApproval } from "./adoption-approval.js";
import type { ExistingProjectAdoptionPreparedPlan } from "./adoption-prepared-plan.js";

export const EXISTING_PROJECT_ADOPTION_APPLY_SCHEMA_VERSION = 1;

export const ADOPTION_APPLY_STATUSES = [
  "applied",
  "already-applied",
  "denied",
  "rolled-back",
  "failed-incomplete",
  "applied-needs-attention",
] as const;

export type AdoptionApplyStatus = (typeof ADOPTION_APPLY_STATUSES)[number];

export const ADOPTION_APPLY_REASONS = [
  "expired",
  "stale-preview",
  "stale-fingerprint",
  "stale-digest",
  "root-mismatch",
  "project-id-mismatch",
  "decisions-changed",
  "proposal-changed",
  "tampered-digest",
  "tampered-plan-id",
  "invalid-decisions",
  "duplicate-decision",
  "unsupported-decision",
  "blocked-diagnostics",
  "expired-approval",
  "tampered-approval",
  "approval-mismatch",
  "symlink-root",
  "unsafe-destination",
  "cancelled",
  "incomplete-rollback",
  "collision",
  "unsupported-schema",
] as const;

export type AdoptionApplyReason = (typeof ADOPTION_APPLY_REASONS)[number];

export interface ExistingProjectAdoptionApplyDoctorSummary {
  readonly errorCount: number;
  readonly warningCount: number;
  readonly codes: readonly string[];
}

export interface ExistingProjectAdoptionApplyDiffSummary {
  readonly unmanagedDriftPaths: readonly string[];
}

export interface ExistingProjectAdoptionApplyViewModel {
  readonly schemaVersion: typeof EXISTING_PROJECT_ADOPTION_APPLY_SCHEMA_VERSION;
  readonly readOnly: false;
  readonly classification: "mutating";
  readonly status: AdoptionApplyStatus;
  readonly reasons: readonly AdoptionApplyReason[];
  readonly applied: boolean;
  readonly alreadyApplied: boolean;
  readonly ready: boolean;
  readonly changesApplied: number;
  readonly canonicalRoot: string;
  readonly preparedPlanId: string;
  readonly planDigest: string;
  readonly approvalId: string;
  readonly appliedPaths: readonly string[];
  readonly unchangedPaths: readonly string[];
  readonly rollbackAttempted: boolean;
  readonly rollbackCompleted: boolean;
  readonly rollbackFailures: readonly string[];
  readonly doctor: ExistingProjectAdoptionApplyDoctorSummary | null;
  readonly diff: ExistingProjectAdoptionApplyDiffSummary | null;
  readonly inspectionReadiness: string | null;
  readonly recoveryGuidance: string | null;
  readonly diagnostics: readonly string[];
  readonly cancelledAfterCommit: boolean;
  readonly approval: ExistingProjectAdoptionApproval;
  readonly plan: ExistingProjectAdoptionPreparedPlan;
}

export function isAdoptionPreparedPlanReason(
  value: string,
): value is AdoptionPreparedPlanReason {
  return (
    value === "expired" ||
    value === "stale-preview" ||
    value === "stale-fingerprint" ||
    value === "stale-digest" ||
    value === "root-mismatch" ||
    value === "project-id-mismatch" ||
    value === "decisions-changed" ||
    value === "proposal-changed" ||
    value === "tampered-digest" ||
    value === "tampered-plan-id" ||
    value === "invalid-decisions" ||
    value === "duplicate-decision" ||
    value === "unsupported-decision" ||
    value === "blocked-diagnostics"
  );
}
