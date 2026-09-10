import type { ApprovedApplyPlan } from "@intentloom/protocol";
import {
  NEUTRON_MUTATION_PROPOSAL_SCHEMA_URN,
  type NeutronMutationProposal,
} from "../../protocol/src/neutron-mutation.js";
import {
  NEUTRON_MUTATION_APPROVAL_SCHEMA_URN,
  type NeutronMutationApproval,
} from "../../protocol/src/neutron-mutation-approval.js";
import {
  canonicalNeutronMutationJson,
  canonicalizeNeutronMutationPaths,
  neutronMutationApprovalToken,
  neutronMutationContentDigest,
} from "./neutron-mutation-canonical.js";

export interface NeutronMutationProposalFacts {
  readonly proposalId: string;
  readonly sessionId: string;
  readonly projectId: string;
  readonly root: string;
  readonly taskId?: string;
  readonly graphId?: string;
  readonly mutationClass: NeutronMutationProposal["mutationClass"];
  readonly plan: ApprovedApplyPlan;
}

export function digestNeutronMutationProposal(
  facts: NeutronMutationProposalFacts,
): string {
  const changedPaths = canonicalizeNeutronMutationPaths(
    facts.plan.changedPaths,
    "plan.changedPaths",
  );
  return neutronMutationContentDigest(
    canonicalNeutronMutationJson({
      schemaVersion: NEUTRON_MUTATION_PROPOSAL_SCHEMA_URN,
      proposalId: facts.proposalId,
      sessionId: facts.sessionId,
      projectId: facts.projectId,
      root: facts.root,
      taskId: facts.taskId ?? null,
      graphId: facts.graphId ?? null,
      mutationClass: facts.mutationClass,
      planDigest: facts.plan.planDigest,
      projectStateDigest: facts.plan.projectStateDigest,
      targetRoot: facts.plan.targetRoot,
      changedPaths,
      expiresAt: facts.plan.expiresAt ?? null,
    }),
  );
}

export function digestNeutronMutationApproval(
  approval: Omit<NeutronMutationApproval, "approvalDigest">,
): string {
  const changedPaths = canonicalizeNeutronMutationPaths(
    approval.changedPaths,
    "changedPaths",
  );
  return neutronMutationContentDigest(
    canonicalNeutronMutationJson({
      schemaVersion: NEUTRON_MUTATION_APPROVAL_SCHEMA_URN,
      approvalId: approval.approvalId,
      approvalToken: approval.approvalToken,
      approvalSource: approval.approvalSource,
      approvingActor: approval.approvingActor,
      root: approval.root,
      projectId: approval.projectId,
      sessionId: approval.sessionId,
      taskId: approval.taskId ?? null,
      graphId: approval.graphId ?? null,
      proposalId: approval.proposalId,
      proposalDigest: approval.proposalDigest,
      planDigest: approval.planDigest,
      projectStateDigest: approval.projectStateDigest,
      changedPaths,
      mutationClass: approval.mutationClass,
      approvedAt: approval.approvedAt,
      approvalValidUntil: approval.approvalValidUntil,
    }),
  );
}

export function expectedNeutronMutationApprovalToken(
  proposalDigest: string,
): string {
  return neutronMutationApprovalToken(proposalDigest);
}
