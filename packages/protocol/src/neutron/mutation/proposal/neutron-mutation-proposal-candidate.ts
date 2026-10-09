export const NEUTRON_MUTATION_PROPOSAL_CANDIDATE_SCHEMA_URN =
  "urn:intentloom:schema:neutron-mutation-proposal-candidate:1" as const;

export const NEUTRON_MUTATION_PROPOSAL_CAPABILITY =
  "mutation-proposal" as const;

export const NEUTRON_MUTATION_PROPOSAL_ROLE = "feature-builder" as const;

/**
 * Strict model/node output for proposing exact file changes. Host computes
 * digests, identity, and approval. Not mutation authority.
 */
export interface NeutronMutationProposalCandidateFile {
  readonly path: string;
  readonly content: string;
  readonly sources?: readonly string[];
}

export interface NeutronMutationProposalCandidate {
  readonly schemaVersion: typeof NEUTRON_MUTATION_PROPOSAL_CANDIDATE_SCHEMA_URN;
  readonly files: readonly NeutronMutationProposalCandidateFile[];
}
