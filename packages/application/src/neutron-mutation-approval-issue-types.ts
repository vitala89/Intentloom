import type { NeutronMutationApproval } from "../../protocol/src/neutron-mutation-approval.js";
import { NEUTRON_MUTATION_APPROVAL_SOURCE } from "../../protocol/src/neutron-mutation-approval.js";
import type { NeutronMutationProposal } from "../../protocol/src/neutron-mutation.js";
import type { NeutronMutationProposalSource } from "../../protocol/src/neutron-graph-mutation.js";
import type { NeutronRuntimeSession } from "../../protocol/src/neutron-runtime.js";
import type { NeutronGraphMutationReviewBundle } from "./neutron-graph-mutation-store.js";
import type { NeutronGraphMutationPayloadStore } from "./neutron-graph-mutation-store.js";
import type {
  NeutronGraphStaleBaseline,
  NeutronGraphStaleSnapshot,
} from "./neutron-scheduler-stale.js";

/** Host-assigned actor. Renderer input cannot choose this identity. */
export const NEUTRON_MUTATION_HOST_APPROVING_ACTOR =
  "desktop-local-interactive" as const;

/** Routing brief default: approval must not outlive 30 minutes or the plan. */
export const NEUTRON_MUTATION_APPROVAL_MAX_LIFETIME_MS = 1_800_000 as const;

export const NEUTRON_MUTATION_APPROVAL_ISSUE_OUTCOMES = [
  "proposal-not-found",
  "review-unavailable",
  "preview-not-authoritative",
  "root-mismatch",
  "project-mismatch",
  "session-mismatch",
  "graph-mismatch",
  "payload-mismatch",
  "stale",
  "expired",
  "cancelled",
  "graph-stale",
  "intent-rejected",
  "not-eligible",
] as const;

export type NeutronMutationApprovalIssueOutcome =
  (typeof NEUTRON_MUTATION_APPROVAL_ISSUE_OUTCOMES)[number];

export interface IssueNeutronMutationApprovalInput {
  readonly intent: unknown;
  readonly session: NeutronRuntimeSession | undefined;
  readonly store: NeutronGraphMutationPayloadStore | undefined;
  readonly previewProposal?: NeutronMutationProposal | null;
  readonly previewSource?: NeutronMutationProposalSource | "ambiguous" | null;
  readonly currentProjectFingerprint: string;
  readonly now: number;
  readonly graphStale?: {
    readonly baseline: NeutronGraphStaleBaseline;
    readonly current: NeutronGraphStaleSnapshot;
  };
}

export type IssueNeutronMutationApprovalResult =
  | {
      readonly issued: true;
      readonly approval: NeutronMutationApproval;
    }
  | {
      readonly issued: false;
      readonly outcome: NeutronMutationApprovalIssueOutcome;
    };

export interface PublicNeutronMutationApprovalIssueFacts {
  readonly issued: boolean;
  readonly outcome?: NeutronMutationApprovalIssueOutcome;
  readonly approvalId?: string;
  readonly proposalId?: string;
  readonly proposalDigest?: string;
  readonly planDigest?: string;
  readonly projectStateDigest?: string;
  readonly reviewArtifactDigest?: string;
  readonly approvalSource?: typeof NEUTRON_MUTATION_APPROVAL_SOURCE;
  readonly approvingActor?: typeof NEUTRON_MUTATION_HOST_APPROVING_ACTOR;
}

export type EligibleReviewBundle =
  | { readonly ok: true; readonly bundle: NeutronGraphMutationReviewBundle }
  | {
      readonly ok: false;
      readonly outcome: NeutronMutationApprovalIssueOutcome;
    };
