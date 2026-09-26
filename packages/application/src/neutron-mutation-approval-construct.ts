import type { NeutronMutationApproval } from "../../protocol/src/neutron-mutation-approval.js";
import {
  NEUTRON_MUTATION_APPROVAL_SCHEMA_URN,
  NEUTRON_MUTATION_APPROVAL_SOURCE,
} from "../../protocol/src/neutron-mutation-approval.js";
import {
  canonicalNeutronMutationJson,
  canonicalizeNeutronMutationPaths,
  neutronMutationContentDigest,
} from "../../validator/src/neutron-mutation-canonical.js";
import {
  digestNeutronMutationApproval,
  expectedNeutronMutationApprovalToken,
} from "../../validator/src/neutron-mutation-digest.js";
import { validateNeutronMutationApproval } from "../../validator/src/neutron-mutation-approval.js";
import type { NeutronGraphMutationReviewBundle } from "./neutron-graph-mutation-store.js";
import {
  NEUTRON_MUTATION_APPROVAL_MAX_LIFETIME_MS,
  NEUTRON_MUTATION_HOST_APPROVING_ACTOR,
} from "./neutron-mutation-approval-issue-types.js";

export function tryHostApproval(
  bundle: NeutronGraphMutationReviewBundle,
  now: number,
): NeutronMutationApproval | undefined {
  try {
    return hostApproval(bundle, now);
  } catch {
    return undefined;
  }
}

function hostApproval(
  bundle: NeutronGraphMutationReviewBundle,
  now: number,
): NeutronMutationApproval {
  const unsigned = unsignedHostApproval(bundle, now);
  return validateNeutronMutationApproval({
    ...unsigned,
    approvalDigest: digestNeutronMutationApproval(unsigned),
  });
}

function unsignedHostApproval(
  bundle: NeutronGraphMutationReviewBundle,
  now: number,
): Omit<NeutronMutationApproval, "approvalDigest"> {
  const until = approvalValidUntil(bundle.proposal.plan.expiresAt, now);
  if (until < now) throw new Error("approval lifetime is not current");
  const proposalDigest = bundle.proposal.proposalDigest;
  return {
    schemaVersion: NEUTRON_MUTATION_APPROVAL_SCHEMA_URN,
    approvalId: hostApprovalId(bundle),
    approvalToken: expectedNeutronMutationApprovalToken(proposalDigest),
    approvalSource: NEUTRON_MUTATION_APPROVAL_SOURCE,
    approvingActor: NEUTRON_MUTATION_HOST_APPROVING_ACTOR,
    root: bundle.proposal.root,
    projectId: bundle.proposal.projectId,
    sessionId: bundle.proposal.sessionId,
    ...(bundle.proposal.taskId === undefined
      ? {}
      : { taskId: bundle.proposal.taskId }),
    ...(bundle.proposal.graphId === undefined
      ? {}
      : { graphId: bundle.proposal.graphId }),
    proposalId: bundle.proposal.proposalId,
    proposalDigest,
    planDigest: bundle.proposal.plan.planDigest,
    projectStateDigest: bundle.proposal.plan.projectStateDigest,
    changedPaths: canonicalizeNeutronMutationPaths(
      bundle.artifact.changedPaths,
      "changedPaths",
    ),
    mutationClass: bundle.proposal.mutationClass,
    approvedAt: now,
    approvalValidUntil: until,
    reviewArtifactDigest: bundle.artifact.artifactDigest,
  };
}

function approvalValidUntil(
  expiresAt: number | undefined,
  now: number,
): number {
  const bounded = now + NEUTRON_MUTATION_APPROVAL_MAX_LIFETIME_MS;
  if (expiresAt === undefined || expiresAt > bounded) return bounded;
  return expiresAt;
}

function hostApprovalId(bundle: NeutronGraphMutationReviewBundle): string {
  return neutronMutationContentDigest(
    canonicalNeutronMutationJson({
      kind: "neutron-mutation-approval-id",
      planDigest: bundle.proposal.plan.planDigest,
      projectStateDigest: bundle.proposal.plan.projectStateDigest,
      proposalId: bundle.proposal.proposalId,
      reviewArtifactDigest: bundle.artifact.artifactDigest,
    }),
  );
}
