import type { NeutronMutationClass } from "./neutron-mutation.js";

export const NEUTRON_MUTATION_REVIEW_ARTIFACT_SCHEMA_URN =
  "urn:intentloom:schema:neutron-mutation-review-artifact:1" as const;

/** Bounded limits for model/host supplied review artifacts. */
export const NEUTRON_MUTATION_REVIEW_MAX_FILES = 256 as const;
export const NEUTRON_MUTATION_REVIEW_MAX_PATH_LENGTH = 512 as const;
export const NEUTRON_MUTATION_REVIEW_MAX_FILE_CONTENT_BYTES =
  1_048_576 as const;
export const NEUTRON_MUTATION_REVIEW_MAX_AGGREGATE_CONTENT_BYTES =
  8_388_608 as const;

export interface NeutronMutationReviewFileBinding {
  readonly path: string;
  readonly contentDigest: string;
}

/**
 * Immutable reviewed transaction facts. Host materializes this before human
 * approval; Apply (Slice 3) must verify payload bytes against it. Not approval
 * authority.
 */
export interface NeutronMutationReviewArtifact {
  readonly schemaVersion: typeof NEUTRON_MUTATION_REVIEW_ARTIFACT_SCHEMA_URN;
  readonly artifactId: string;
  readonly transactionId: string;
  readonly proposalId: string;
  readonly sessionId: string;
  readonly projectId: string;
  readonly root: string;
  readonly taskId?: string;
  readonly graphId?: string;
  readonly mutationClass: NeutronMutationClass;
  readonly projectStateDigest: string;
  readonly changedPaths: readonly string[];
  readonly fileBindings: readonly NeutronMutationReviewFileBinding[];
  readonly planDigest: string;
  readonly expiresAt?: number;
  readonly artifactDigest: string;
}
