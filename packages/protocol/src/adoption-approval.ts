import type {
  AdoptionPreparedPlanReason,
  ExistingProjectAdoptionPreparedPlan,
} from "./adoption-prepared-plan.js";

export const EXISTING_PROJECT_ADOPTION_APPROVAL_SCHEMA_VERSION = 1;
export const EXISTING_PROJECT_ADOPTION_APPROVAL_SOURCE =
  "local-interactive" as const;

export type ExistingProjectAdoptionApprovalSource =
  typeof EXISTING_PROJECT_ADOPTION_APPROVAL_SOURCE;

export const ADOPTION_APPROVE_STATUSES = ["approved", "denied"] as const;
export type AdoptionApproveStatus = (typeof ADOPTION_APPROVE_STATUSES)[number];

export interface ExistingProjectAdoptionApproval {
  readonly schemaVersion: typeof EXISTING_PROJECT_ADOPTION_APPROVAL_SCHEMA_VERSION;
  readonly readOnly: true;
  readonly classification: "read-only";
  readonly approved: true;
  readonly applied: false;
  readonly changesApplied: 0;
  readonly approvalId: string;
  readonly approvalDigest: string;
  readonly approvalSource: ExistingProjectAdoptionApprovalSource;
  readonly approvalToken: string;
  readonly root: string;
  readonly previewIdentity: string;
  readonly preparedPlanId: string;
  readonly planDigest: string;
  readonly projectFingerprint: string;
  readonly approvedAt: number;
  readonly approvalValidUntil: number;
  readonly preparedPlanExpiresAt: number;
}

export interface ExistingProjectAdoptionApproveViewModel {
  readonly readOnly: true;
  readonly classification: "read-only";
  readonly applied: false;
  readonly changesApplied: 0;
  readonly approved: boolean;
  readonly status: AdoptionApproveStatus;
  readonly reasons: readonly AdoptionPreparedPlanReason[];
  readonly approval: ExistingProjectAdoptionApproval | null;
  readonly plan: ExistingProjectAdoptionPreparedPlan;
}
