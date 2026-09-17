import type {
  NeutronGraphMutationApplyEvidence,
  NeutronGraphMutationProposalEvidence,
} from "../../protocol/src/neutron-graph-mutation.js";
import {
  NEUTRON_GRAPH_MUTATION_APPLY_EVIDENCE_SCHEMA_URN,
  NEUTRON_GRAPH_MUTATION_PROPOSAL_EVIDENCE_SCHEMA_URN,
} from "../../protocol/src/neutron-graph-mutation.js";
import type { NeutronMutationProposal } from "../../protocol/src/neutron-mutation.js";
import type { NeutronMutationReviewArtifact } from "../../protocol/src/neutron-mutation-review-artifact.js";
import type { NeutronMutationApplyResult } from "../../protocol/src/neutron-mutation-apply.js";
import { canonicalNeutronMutationJson } from "../../validator/src/neutron-mutation-canonical.js";
import { neutronMutationContentDigest } from "../../validator/src/neutron-mutation-canonical.js";

export function buildNeutronGraphMutationProposalEvidence(input: {
  readonly proposal: NeutronMutationProposal;
  readonly artifact: NeutronMutationReviewArtifact;
  readonly graphId: string;
  readonly taskId: string;
  readonly attempt: number;
  readonly outputDigest: string;
  readonly materializedAt: number;
}): NeutronGraphMutationProposalEvidence {
  const facts = {
    schemaVersion: NEUTRON_GRAPH_MUTATION_PROPOSAL_EVIDENCE_SCHEMA_URN,
    proposalId: input.proposal.proposalId,
    proposalDigest: input.proposal.proposalDigest,
    planDigest: input.proposal.plan.planDigest,
    reviewArtifactDigest: input.artifact.artifactDigest,
    graphId: input.graphId,
    taskId: input.taskId,
    attempt: input.attempt,
    outputDigest: input.outputDigest,
    sessionId: input.proposal.sessionId,
    projectId: input.proposal.projectId,
    root: input.proposal.root,
    changedPaths: [...input.proposal.plan.changedPaths],
    status: "review-required" as const,
    reviewRequired: true as const,
    source: "authoritative" as const,
    materializedAt: input.materializedAt,
  };
  return {
    ...facts,
    evidenceDigest: digestGraphMutationEvidence(facts),
  };
}

export function buildNeutronGraphMutationApplyEvidence(input: {
  readonly proposalEvidence: NeutronGraphMutationProposalEvidence;
  readonly apply: NeutronMutationApplyResult;
}): NeutronGraphMutationApplyEvidence {
  const facts = {
    schemaVersion: NEUTRON_GRAPH_MUTATION_APPLY_EVIDENCE_SCHEMA_URN,
    graphId: input.proposalEvidence.graphId,
    taskId: input.proposalEvidence.taskId,
    attempt: input.proposalEvidence.attempt,
    proposalId: input.proposalEvidence.proposalId,
    proposalDigest: input.proposalEvidence.proposalDigest,
    planDigest: input.proposalEvidence.planDigest,
    reviewArtifactDigest: input.proposalEvidence.reviewArtifactDigest,
    approvalId: input.apply.approvalId,
    transactionId: input.apply.transactionId,
    applyStatus: input.apply.status,
    applied: input.apply.applied,
    reconciliationRequired: input.apply.reconciliationRequired,
    ...(input.apply.verificationStatus === undefined
      ? {}
      : { verificationStatus: input.apply.verificationStatus }),
    ...(input.apply.verificationEvidenceDigest === undefined
      ? {}
      : {
          verificationEvidenceDigest: input.apply.verificationEvidenceDigest,
        }),
  };
  return {
    ...facts,
    evidenceDigest: digestGraphMutationEvidence(facts),
  };
}

export function digestGraphMutationEvidence(facts: unknown): string {
  return neutronMutationContentDigest(canonicalNeutronMutationJson(facts));
}
