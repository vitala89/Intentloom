export const NEUTRON_GRAPH_MUTATION_PROPOSAL_EVIDENCE_SCHEMA_URN =
  "urn:intentloom:schema:neutron-graph-mutation-proposal-evidence:1" as const;

export const NEUTRON_GRAPH_MUTATION_APPLY_EVIDENCE_SCHEMA_URN =
  "urn:intentloom:schema:neutron-graph-mutation-apply-evidence:1" as const;

export const NEUTRON_MUTATION_PROPOSAL_SOURCES = [
  "preview",
  "authoritative",
] as const;
export type NeutronMutationProposalSource =
  (typeof NEUTRON_MUTATION_PROPOSAL_SOURCES)[number];

export const NEUTRON_GRAPH_MUTATION_PROPOSAL_STATUSES = [
  "review-required",
] as const;
export type NeutronGraphMutationProposalStatus =
  (typeof NEUTRON_GRAPH_MUTATION_PROPOSAL_STATUSES)[number];

/**
 * Safe graph-linked proposal facts. No file bodies, tokens, or prompts.
 */
export interface NeutronGraphMutationProposalEvidence {
  readonly schemaVersion: typeof NEUTRON_GRAPH_MUTATION_PROPOSAL_EVIDENCE_SCHEMA_URN;
  readonly proposalId: string;
  readonly proposalDigest: string;
  readonly planDigest: string;
  readonly reviewArtifactDigest: string;
  readonly graphId: string;
  readonly taskId: string;
  readonly attempt: number;
  readonly outputDigest: string;
  readonly sessionId: string;
  readonly projectId: string;
  readonly root: string;
  readonly changedPaths: readonly string[];
  readonly status: NeutronGraphMutationProposalStatus;
  readonly reviewRequired: true;
  readonly source: "authoritative";
  readonly evidenceDigest: string;
  readonly materializedAt: number;
}

/**
 * Safe graph-linked Apply facts. Node/task state is not rewritten.
 */
export interface NeutronGraphMutationApplyEvidence {
  readonly schemaVersion: typeof NEUTRON_GRAPH_MUTATION_APPLY_EVIDENCE_SCHEMA_URN;
  readonly graphId: string;
  readonly taskId: string;
  readonly attempt: number;
  readonly proposalId: string;
  readonly proposalDigest: string;
  readonly planDigest: string;
  readonly reviewArtifactDigest: string;
  readonly approvalId: string;
  readonly transactionId: string;
  readonly applyStatus: string;
  readonly applied: boolean;
  readonly verificationStatus?: string;
  readonly verificationEvidenceDigest?: string;
  readonly reconciliationRequired: boolean;
  readonly evidenceDigest: string;
}
