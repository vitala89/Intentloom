import type { ApprovedApplyPlan } from "./approved-apply.js";
import type { NeutronMutationApproval } from "./neutron-mutation-approval.js";
import type { NeutronSessionState } from "./neutron-runtime.js";

export {
  NEUTRON_MUTATION_APPROVAL_SCHEMA_URN,
  NEUTRON_MUTATION_APPROVAL_SOURCE,
} from "./neutron-mutation-approval.js";
export type {
  NeutronMutationApproval,
  NeutronMutationApprovalSource,
} from "./neutron-mutation-approval.js";

export const NEUTRON_MUTATION_PROPOSAL_SCHEMA_URN =
  "urn:intentloom:schema:neutron-mutation-proposal:1" as const;
export const NEUTRON_MUTATION_PREFLIGHT_REQUEST_SCHEMA_URN =
  "urn:intentloom:schema:neutron-mutation-preflight-request:1" as const;
export const NEUTRON_MUTATION_PREFLIGHT_RESULT_SCHEMA_URN =
  "urn:intentloom:schema:neutron-mutation-preflight-result:1" as const;

export const NEUTRON_MUTATION_CLASS = "approved-transaction-apply" as const;
export type NeutronMutationClass = typeof NEUTRON_MUTATION_CLASS;

/**
 * Future host-bridge note: after Slice 2 validates a bound approval, only the
 * host adapter may construct `ApprovedApplyRequest.grantedApprovals`. That
 * array is never a substitute for `NeutronMutationApproval`.
 */
export const NEUTRON_MUTATION_INNER_APPLY_APPROVAL = "atomic-commit-approval";

export const NEUTRON_MUTATION_PREFLIGHT_DECISIONS = [
  "eligible",
  "rejected",
] as const;
export type NeutronMutationPreflightDecision =
  (typeof NEUTRON_MUTATION_PREFLIGHT_DECISIONS)[number];

export const NEUTRON_MUTATION_PREFLIGHT_REJECTION_REASONS = [
  "invalid-approval",
  "approval-expired",
  "approval-scope-mismatch",
  "proposal-digest-mismatch",
  "root-mismatch",
  "project-state-mismatch",
  "affected-path-mismatch",
  "capability-denied",
  "cancelled",
  "replayed-approval",
] as const;
export type NeutronMutationPreflightRejectionReason =
  (typeof NEUTRON_MUTATION_PREFLIGHT_REJECTION_REASONS)[number];

/**
 * Typed mutation intent. Wraps `ApprovedApplyPlan` so changedPaths, planDigest,
 * projectStateDigest, and targetRoot are not duplicated. Carries no Apply
 * authority.
 */
export interface NeutronMutationProposal {
  readonly schemaVersion: typeof NEUTRON_MUTATION_PROPOSAL_SCHEMA_URN;
  readonly proposalId: string;
  readonly sessionId: string;
  readonly projectId: string;
  readonly root: string;
  readonly taskId?: string;
  readonly graphId?: string;
  readonly mutationClass: NeutronMutationClass;
  readonly plan: ApprovedApplyPlan;
  readonly proposalDigest: string;
}

export interface NeutronMutationPreflightRequest {
  readonly schemaVersion: typeof NEUTRON_MUTATION_PREFLIGHT_REQUEST_SCHEMA_URN;
  readonly proposal: NeutronMutationProposal;
  readonly approval: NeutronMutationApproval;
  readonly currentProjectStateDigest: string;
  readonly sessionState?: NeutronSessionState;
}

export interface NeutronMutationPreflightResult {
  readonly schemaVersion: typeof NEUTRON_MUTATION_PREFLIGHT_RESULT_SCHEMA_URN;
  readonly decision: NeutronMutationPreflightDecision;
  readonly reasons: readonly NeutronMutationPreflightRejectionReason[];
  readonly proposalDigest: string;
  readonly approvalId: string;
}
