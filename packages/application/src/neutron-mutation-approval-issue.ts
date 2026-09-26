import type { NeutronMutationApproval } from "../../protocol/src/neutron-mutation-approval.js";
import { NEUTRON_MUTATION_APPROVAL_SOURCE } from "../../protocol/src/neutron-mutation-approval.js";
import type { NeutronMutationApprovalIntent } from "../../protocol/src/neutron-mutation-approval-intent.js";
import { validateNeutronMutationApprovalIntent } from "../../validator/src/neutron-mutation-approval-intent.js";
import { tryHostApproval } from "./neutron-mutation-approval-construct.js";
import { resolveEligibleReviewBundle } from "./neutron-mutation-approval-eligibility.js";
import {
  NEUTRON_MUTATION_HOST_APPROVING_ACTOR,
  type IssueNeutronMutationApprovalInput,
  type IssueNeutronMutationApprovalResult,
  type NeutronMutationApprovalIssueOutcome,
  type PublicNeutronMutationApprovalIssueFacts,
} from "./neutron-mutation-approval-issue-types.js";

export {
  NEUTRON_MUTATION_APPROVAL_ISSUE_OUTCOMES,
  NEUTRON_MUTATION_APPROVAL_MAX_LIFETIME_MS,
  NEUTRON_MUTATION_HOST_APPROVING_ACTOR,
} from "./neutron-mutation-approval-issue-types.js";
export type {
  IssueNeutronMutationApprovalInput,
  IssueNeutronMutationApprovalResult,
  NeutronMutationApprovalIssueOutcome,
  PublicNeutronMutationApprovalIssueFacts,
} from "./neutron-mutation-approval-issue-types.js";

/**
 * In-process host issuer. The approval object, including `approvalToken`,
 * stays inside the application process. Public results must use
 * `publicNeutronMutationApprovalIssueFacts`.
 */
export function issueNeutronMutationApprovalFromIntent(
  input: IssueNeutronMutationApprovalInput,
): IssueNeutronMutationApprovalResult {
  const intent = parseApprovalIntent(input.intent);
  if (intent === undefined) return denied("intent-rejected");
  const eligible = resolveEligibleReviewBundle(input, intent);
  if (!eligible.ok) return denied(eligible.outcome);
  const approval = tryHostApproval(eligible.bundle, input.now);
  if (approval === undefined) return denied("not-eligible");
  return { issued: true, approval };
}

export function publicNeutronMutationApprovalIssueFacts(
  result: IssueNeutronMutationApprovalResult,
): PublicNeutronMutationApprovalIssueFacts {
  if (!result.issued) return { issued: false, outcome: result.outcome };
  return publicApprovalFacts(result.approval);
}

function denied(
  outcome: NeutronMutationApprovalIssueOutcome,
): IssueNeutronMutationApprovalResult {
  return { issued: false, outcome };
}

function parseApprovalIntent(
  value: unknown,
): NeutronMutationApprovalIntent | undefined {
  try {
    return validateNeutronMutationApprovalIntent(value);
  } catch {
    return undefined;
  }
}

function publicApprovalFacts(
  approval: NeutronMutationApproval,
): PublicNeutronMutationApprovalIssueFacts {
  return {
    issued: true,
    approvalId: approval.approvalId,
    proposalId: approval.proposalId,
    proposalDigest: approval.proposalDigest,
    planDigest: approval.planDigest,
    projectStateDigest: approval.projectStateDigest,
    ...(approval.reviewArtifactDigest === undefined
      ? {}
      : { reviewArtifactDigest: approval.reviewArtifactDigest }),
    approvalSource: NEUTRON_MUTATION_APPROVAL_SOURCE,
    approvingActor: NEUTRON_MUTATION_HOST_APPROVING_ACTOR,
  };
}
