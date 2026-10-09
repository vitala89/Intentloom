import { NEUTRON_MUTATION_CLASS } from "../../../../../protocol/src/neutron-mutation.js";
import type { NeutronMutationApproval } from "../../../../../protocol/src/neutron-mutation.js";
import { PROTOCOL_VERSION } from "../../../../../protocol/src/jsonrpc.js";
import {
  NEUTRON_MUTATION_APPROVE_AND_APPLY_SCHEMA_URN,
  type NeutronMutationApproveAndApplyApprovalOutcome,
} from "../../../../../protocol/src/neutron-mutation-approve-apply-rpc.js";
import {
  validateNeutronMutationApproveAndApplyResult,
  type NeutronMutationApproveAndApplyResult,
} from "../../../../../protocol/src/neutron-mutation-approve-apply-result.js";
import { redactApprovalToken } from "../apply/neutron-mutation-apply-result.js";
import type { ApplyApprovedNeutronGraphMutationResult } from "../apply/neutron-graph-mutation-apply.js";

export function rejectedApproveAndApplyResult(
  approvalOutcome: NeutronMutationApproveAndApplyApprovalOutcome,
  proposalId?: string,
): NeutronMutationApproveAndApplyResult {
  return validateNeutronMutationApproveAndApplyResult({
    approvalOutcome,
    protocolVersion: PROTOCOL_VERSION,
    schemaVersion: NEUTRON_MUTATION_APPROVE_AND_APPLY_SCHEMA_URN,
    stage: "approval-rejected",
    ...(proposalId === undefined ? {} : { proposalId }),
  });
}

export function publicApproveAndApplyResult(
  graph: ApplyApprovedNeutronGraphMutationResult,
  approval: NeutronMutationApproval,
): NeutronMutationApproveAndApplyResult {
  const apply = graph.apply;
  if (apply === undefined) return rejectedBeforeWrite(graph, approval);
  return validateNeutronMutationApproveAndApplyResult({
    applied: apply.applied,
    approvalId: apply.approvalId,
    changedPaths: [...apply.changedPaths],
    diagnostics: safeDiagnostics(apply.diagnostics, approval.approvalToken),
    planDigest: apply.planDigest,
    proposalId: approval.proposalId,
    protocolVersion: PROTOCOL_VERSION,
    reconciliationRequired: apply.reconciliationRequired,
    reviewArtifactDigest: apply.reviewArtifactDigest,
    schemaVersion: NEUTRON_MUTATION_APPROVE_AND_APPLY_SCHEMA_URN,
    stage: "apply",
    status: apply.status,
    transactionId: apply.transactionId,
    ...(apply.failureCode === undefined
      ? {}
      : { failureCode: apply.failureCode }),
    ...(apply.verificationStatus === undefined
      ? {}
      : { verificationStatus: apply.verificationStatus }),
  });
}

export const HOST_MUTATION_AUTHORIZATION = {
  kind: "host" as const,
  mutationClass: NEUTRON_MUTATION_CLASS,
};

function rejectedBeforeWrite(
  graph: ApplyApprovedNeutronGraphMutationResult,
  approval: NeutronMutationApproval,
): NeutronMutationApproveAndApplyResult {
  const failureCode = graph.failureCode ?? "transaction-failed";
  const status =
    failureCode === "cancelled-before-write"
      ? "cancelled-before-write"
      : "rejected";
  return validateNeutronMutationApproveAndApplyResult({
    applied: false,
    changedPaths: [],
    diagnostics: safeDiagnostics(graph.diagnostics, approval.approvalToken),
    failureCode,
    proposalId: approval.proposalId,
    protocolVersion: PROTOCOL_VERSION,
    reconciliationRequired: false,
    schemaVersion: NEUTRON_MUTATION_APPROVE_AND_APPLY_SCHEMA_URN,
    stage: "apply",
    status,
  });
}

function safeDiagnostics(
  lines: readonly string[],
  approvalToken: string,
): readonly string[] {
  return lines.map((line) => redactApprovalToken(line, approvalToken));
}

export function applyResultLeaksToken(
  result: NeutronMutationApproveAndApplyResult,
  approvalToken: string,
): boolean {
  return (
    approvalToken.length > 0 && JSON.stringify(result).includes(approvalToken)
  );
}
