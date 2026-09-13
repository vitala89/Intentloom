import type { NeutronMutationProposal } from "@intentloom/protocol";

export const NEUTRON_MUTATION_NOT_AUTHORIZED_COPY =
  "Mutation not authorized" as const;

export function mutationProposalPanelLines(
  proposal: NeutronMutationProposal,
): readonly string[] {
  return [
    NEUTRON_MUTATION_NOT_AUTHORIZED_COPY,
    `Proposal ${proposal.proposalId}`,
    `Class ${proposal.mutationClass}`,
    `Changed paths ${proposal.plan.changedPaths.length}`,
    `Plan digest ${proposal.plan.planDigest}`,
    `Baseline digest ${proposal.plan.projectStateDigest}`,
  ];
}
