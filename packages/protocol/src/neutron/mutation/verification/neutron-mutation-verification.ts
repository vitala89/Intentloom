export const NEUTRON_MUTATION_VERIFICATION_EVIDENCE_SCHEMA_URN =
  "urn:intentloom:schema:neutron-mutation-verification-evidence:1" as const;

export const NEUTRON_MUTATION_VERIFICATION_STATUSES = [
  "verified",
  "verification-failed",
  "verification-incomplete",
  "reconciliation-required",
] as const;
export type NeutronMutationVerificationStatus =
  (typeof NEUTRON_MUTATION_VERIFICATION_STATUSES)[number];

export const NEUTRON_MUTATION_CHECK_STATUSES = [
  "matched",
  "mismatched",
  "not-applicable",
  "incomplete",
] as const;
export type NeutronMutationCheckStatus =
  (typeof NEUTRON_MUTATION_CHECK_STATUSES)[number];

export const NEUTRON_MUTATION_PROJECT_STATE_CHANGES = [
  "changed",
  "unchanged",
  "unknown",
] as const;
export type NeutronMutationProjectStateChange =
  (typeof NEUTRON_MUTATION_PROJECT_STATE_CHANGES)[number];

export const NEUTRON_HIDDEN_GENERATED_METADATA_PATHS = [
  ".aif/manifest.lock.json",
  ".aif/source-map.json",
] as const;

export interface NeutronMutationByteCheck {
  readonly path: string;
  readonly expectedContentDigest: string;
  readonly actualContentDigest?: string;
  readonly existed: boolean;
  readonly matched: boolean;
}

export interface NeutronMutationByteVerification {
  readonly status: NeutronMutationCheckStatus;
  readonly files: readonly NeutronMutationByteCheck[];
}

export interface NeutronMutationWriteSetVerification {
  readonly status: NeutronMutationCheckStatus;
  readonly undeclaredPaths: readonly string[];
  readonly missingApprovedPaths: readonly string[];
}

export interface NeutronMutationConsistencyVerification {
  readonly status: NeutronMutationCheckStatus;
  readonly code: "independent-filesystem-read";
}

export interface NeutronMutationPreviousContentDigest {
  readonly path: string;
  readonly existedBefore: boolean;
  readonly restored: boolean;
  readonly digest: string | null;
}

export interface NeutronMutationRollbackProjection {
  readonly attempted: boolean;
  readonly completed: boolean;
  readonly verified: boolean;
  readonly createdPaths: readonly string[];
  readonly restoredPaths: readonly string[];
  readonly failedPaths: readonly string[];
  readonly previousContentDigests: readonly NeutronMutationPreviousContentDigest[];
  readonly postRollbackProjectStateDigest?: string;
}

/**
 * Host/operator verification record. Must never include approvalToken,
 * file bodies, previousContent, prompts, or model reasoning.
 */
export interface NeutronMutationVerificationEvidence {
  readonly schemaVersion: typeof NEUTRON_MUTATION_VERIFICATION_EVIDENCE_SCHEMA_URN;
  readonly evidenceId: string;
  readonly transactionId: string;
  readonly approvalId: string;
  readonly reviewArtifactDigest: string;
  readonly planDigest: string;
  readonly projectId: string;
  readonly rootIdentity: string;
  readonly preApplyProjectStateDigest: string;
  readonly postApplyProjectStateDigest?: string;
  readonly projectStateChange: NeutronMutationProjectStateChange;
  readonly approvedChangedPaths: readonly string[];
  readonly observedChangedPaths: readonly string[];
  readonly verifiedPaths: readonly string[];
  readonly status: NeutronMutationVerificationStatus;
  readonly applied: boolean;
  readonly byteVerification: NeutronMutationByteVerification;
  readonly writeSetVerification: NeutronMutationWriteSetVerification;
  readonly consistencyVerification: NeutronMutationConsistencyVerification;
  readonly rollback: NeutronMutationRollbackProjection;
  readonly reconciliationRequired: boolean;
  readonly verifiedAt: number;
  readonly evidenceDigest: string;
  readonly diagnostics: readonly string[];
}
