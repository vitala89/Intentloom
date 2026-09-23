import type { NeutronMutationClass } from "./neutron-mutation.js";
import { PROTOCOL_VERSION } from "./jsonrpc.js";

export const NEUTRON_MUTATION_REVIEW_VIEW_SCHEMA_URN =
  "urn:intentloom:schema:neutron-mutation-review-view:1" as const;
export const NEUTRON_MUTATION_REVIEW_LIST_SCHEMA_URN =
  "urn:intentloom:schema:neutron-mutation-review-list:1" as const;
export const NEUTRON_MUTATION_REVIEW_GET_SCHEMA_URN =
  "urn:intentloom:schema:neutron-mutation-review-get:1" as const;

export const NEUTRON_MUTATION_REVIEW_OUTCOMES = [
  "ok",
  "proposal-not-found",
  "review-unavailable",
  "preview-not-authoritative",
  "root-mismatch",
  "project-mismatch",
  "session-mismatch",
  "graph-mismatch",
  "payload-mismatch",
  "path-security-failed",
  "review-too-large",
] as const;
export type NeutronMutationReviewOutcome =
  (typeof NEUTRON_MUTATION_REVIEW_OUTCOMES)[number];

export const NEUTRON_MUTATION_REVIEW_CURRENTNESS = [
  "current",
  "stale",
  "expired",
  "cancelled",
] as const;
export type NeutronMutationReviewCurrentness =
  (typeof NEUTRON_MUTATION_REVIEW_CURRENTNESS)[number];

export const NEUTRON_MUTATION_REVIEW_FILE_OPERATIONS = [
  "create",
  "update",
  "unchanged",
] as const;
export type NeutronMutationReviewFileOperation =
  (typeof NEUTRON_MUTATION_REVIEW_FILE_OPERATIONS)[number];

export const NEUTRON_MUTATION_REVIEW_FILE_STATUSES = [
  "available",
  "secret-path-unavailable",
] as const;
export type NeutronMutationReviewFileStatus =
  (typeof NEUTRON_MUTATION_REVIEW_FILE_STATUSES)[number];

export interface NeutronMutationReviewFileView {
  readonly path: string;
  readonly operation: NeutronMutationReviewFileOperation;
  readonly status: NeutronMutationReviewFileStatus;
  readonly proposedContentDigest: string;
  readonly existedBefore: boolean;
  readonly currentExists: boolean;
  readonly proposedContent?: string;
  readonly currentContent?: string;
  readonly currentContentDigest?: string;
}

export interface NeutronMutationReviewView {
  readonly schemaVersion: typeof NEUTRON_MUTATION_REVIEW_VIEW_SCHEMA_URN;
  readonly sessionId: string;
  readonly projectId: string;
  readonly root: string;
  readonly graphId: string;
  readonly taskId: string;
  readonly attempt: number;
  readonly proposalId: string;
  readonly proposalDigest: string;
  readonly planDigest: string;
  readonly reviewArtifactDigest: string;
  readonly projectStateDigest: string;
  readonly mutationClass: NeutronMutationClass;
  readonly currentness: NeutronMutationReviewCurrentness;
  readonly files: readonly NeutronMutationReviewFileView[];
  readonly expiresAt?: number;
}

export interface NeutronMutationReviewSummary {
  readonly proposalId: string;
  readonly proposalDigest: string;
  readonly planDigest: string;
  readonly reviewArtifactDigest: string;
  readonly projectStateDigest: string;
  readonly mutationClass: NeutronMutationClass;
  readonly graphId: string;
  readonly taskId: string;
  readonly attempt: number;
  readonly changedPathCount: number;
  readonly currentness: NeutronMutationReviewCurrentness;
  readonly expiresAt?: number;
}

export interface NeutronMutationReviewListResult {
  readonly protocolVersion: typeof PROTOCOL_VERSION;
  readonly schemaVersion: typeof NEUTRON_MUTATION_REVIEW_LIST_SCHEMA_URN;
  readonly outcome: NeutronMutationReviewOutcome;
  readonly reviews: readonly NeutronMutationReviewSummary[];
}

export interface NeutronMutationReviewGetResult {
  readonly protocolVersion: typeof PROTOCOL_VERSION;
  readonly schemaVersion: typeof NEUTRON_MUTATION_REVIEW_GET_SCHEMA_URN;
  readonly outcome: NeutronMutationReviewOutcome;
  readonly review?: NeutronMutationReviewView;
}
