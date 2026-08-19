import type { SelectedAdoptionDecision } from "./adoption-decision.js";
import { ADOPTION_PREVIEW_IDENTITY_PATTERN } from "./adoption-plan.js";

export const EXISTING_PROJECT_ADOPTION_PREPARED_PLAN_SCHEMA_VERSION = 1;
export const EXISTING_PROJECT_ADOPTION_PREPARED_PLAN_TTL_MS = 15 * 60 * 1000;
export const SHA256_HEX_PATTERN = ADOPTION_PREVIEW_IDENTITY_PATTERN;

export const ADOPTION_PREPARED_PLAN_STATUSES = [
  "prepared",
  "valid",
  "stale",
  "expired",
  "blocked",
  "invalid",
] as const;

export type AdoptionPreparedPlanStatus =
  (typeof ADOPTION_PREPARED_PLAN_STATUSES)[number];

export const ADOPTION_PREPARED_PLAN_REASONS = [
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
] as const;

export type AdoptionPreparedPlanReason =
  (typeof ADOPTION_PREPARED_PLAN_REASONS)[number];

export interface AdoptionPreparedPlanAction {
  readonly path: string;
  readonly action: string;
  readonly currentClassification: string;
  readonly proposedClassification: string;
  readonly manualDecisionRequired: boolean;
}

export interface ExistingProjectAdoptionPreparedPlan {
  readonly schemaVersion: typeof EXISTING_PROJECT_ADOPTION_PREPARED_PLAN_SCHEMA_VERSION;
  readonly readOnly: true;
  readonly classification: "read-only";
  readonly applied: false;
  readonly changesApplied: 0;
  readonly approved: false;
  readonly root: string;
  readonly projectId: string;
  readonly profile: string;
  readonly workspaceTopology: string;
  readonly detectedAdapters: readonly string[];
  readonly previewIdentity: string;
  readonly preparedPlanId: string;
  readonly planDigest: string;
  readonly projectFingerprint: string;
  readonly createdAt: number;
  readonly expiresAt: number;
  readonly decisions: readonly SelectedAdoptionDecision[];
  readonly affectedPaths: readonly string[];
  readonly plannedActions: readonly AdoptionPreparedPlanAction[];
  readonly diagnostics: readonly string[];
  readonly remainingManualDecisionPaths: readonly string[];
}

export interface ExistingProjectAdoptionPrepareViewModel {
  readonly readOnly: true;
  readonly classification: "read-only";
  readonly applied: false;
  readonly changesApplied: 0;
  readonly approved: false;
  readonly status: "prepared" | "invalid";
  readonly reasons: readonly AdoptionPreparedPlanReason[];
  readonly plan: ExistingProjectAdoptionPreparedPlan | null;
}

export interface ExistingProjectAdoptionRevalidateViewModel {
  readonly readOnly: true;
  readonly classification: "read-only";
  readonly applied: false;
  readonly changesApplied: 0;
  readonly approved: false;
  readonly status: AdoptionPreparedPlanStatus;
  readonly reasons: readonly AdoptionPreparedPlanReason[];
  readonly plan: ExistingProjectAdoptionPreparedPlan;
}
