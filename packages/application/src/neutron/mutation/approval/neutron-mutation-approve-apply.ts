import type { NeutronMutationApprovalIntent } from "../../../../../protocol/src/neutron/mutation/approval/neutron-mutation-approval-intent.js";
import type { NeutronMutationApproveAndApplyResult } from "../../../../../protocol/src/neutron/mutation/approval/neutron-mutation-approve-apply-result.js";
import type { FileSystem, TransactionStage } from "../../../index.js";
import { applyApprovedNeutronGraphMutation } from "../apply/neutron-graph-mutation-apply.js";
import { issueNeutronMutationApprovalFromIntent } from "./neutron-mutation-approval-issue.js";
import type { IssueNeutronMutationApprovalInput } from "./neutron-mutation-approval-issue-types.js";
import {
  HOST_MUTATION_AUTHORIZATION,
  publicApproveAndApplyResult,
  rejectedApproveAndApplyResult,
} from "./neutron-mutation-approve-apply-public.js";

export interface ApproveAndApplyNeutronGraphMutationInput extends IssueNeutronMutationApprovalInput {
  readonly durableStateDirectory: string | undefined;
  readonly fs: FileSystem;
  readonly signal?: AbortSignal;
  readonly evaluateProjectStateDigest?: (root: string) => Promise<string>;
  readonly failAt?: TransactionStage;
  readonly rollbackFailPaths?: readonly string[];
  readonly undoSnapshotFault?: "persist" | "validate";
  readonly afterWriteBeforeVerification?: () => Promise<void>;
  readonly deferVerification?: boolean;
}

/**
 * Combined host operation. Issues a D3 approval in-process and immediately
 * calls canonical graph Apply. The approval token is not returned.
 */
export async function approveAndApplyNeutronGraphMutation(
  input: ApproveAndApplyNeutronGraphMutationInput,
): Promise<NeutronMutationApproveAndApplyResult> {
  const proposalId = proposalIdFrom(input.intent);
  const durableStateDirectory = input.durableStateDirectory?.trim() ?? "";
  if (durableStateDirectory === "") {
    return rejectedApproveAndApplyResult(
      "durable-state-unavailable",
      proposalId,
    );
  }
  if (input.session !== undefined && input.graphStale === undefined) {
    return rejectedApproveAndApplyResult("graph-mismatch", proposalId);
  }
  const issued = issueNeutronMutationApprovalFromIntent(input);
  if (!issued.issued) {
    return rejectedApproveAndApplyResult(issued.outcome, proposalId);
  }
  if (input.store === undefined) {
    return rejectedApproveAndApplyResult(
      "review-unavailable",
      issued.approval.proposalId,
    );
  }
  if (input.session === undefined || input.graphStale === undefined) {
    return rejectedApproveAndApplyResult(
      "graph-mismatch",
      issued.approval.proposalId,
    );
  }
  const graph = await applyApprovedNeutronGraphMutation({
    apply: {
      actualRoot: input.session.root,
      authorization: HOST_MUTATION_AUTHORIZATION,
      durableStateDirectory,
      fs: input.fs,
      now: () => input.now,
      ...(input.afterWriteBeforeVerification === undefined
        ? {}
        : { afterWriteBeforeVerification: input.afterWriteBeforeVerification }),
      ...(input.deferVerification === undefined
        ? {}
        : { deferVerification: input.deferVerification }),
      ...(input.evaluateProjectStateDigest === undefined
        ? {}
        : { evaluateProjectStateDigest: input.evaluateProjectStateDigest }),
      ...(input.failAt === undefined ? {} : { failAt: input.failAt }),
      ...(input.undoSnapshotFault === undefined
        ? {}
        : { undoSnapshotFault: input.undoSnapshotFault }),
      ...(input.rollbackFailPaths === undefined
        ? {}
        : { rollbackFailPaths: input.rollbackFailPaths }),
      ...(input.signal === undefined ? {} : { signal: input.signal }),
    },
    approval: issued.approval,
    graphStale: input.graphStale,
    proposalId: issued.approval.proposalId,
    session: input.session,
    store: input.store,
  });
  return publicApproveAndApplyResult(graph, issued.approval);
}

function proposalIdFrom(intent: unknown): string | undefined {
  if (typeof intent !== "object" || intent === null) return undefined;
  const proposalId = (intent as NeutronMutationApprovalIntent).proposalId;
  return typeof proposalId === "string" && proposalId.length > 0
    ? proposalId
    : undefined;
}
