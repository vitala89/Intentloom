import {
  NEUTRON_MUTATION_APPLY_RESULT_SCHEMA_URN,
  type NeutronMutationApplyFailureCode,
  type NeutronMutationApplyResult,
  type NeutronMutationApplyStatus,
} from "../../protocol/src/neutron-mutation-apply.js";
import { validateNeutronMutationApplyResult } from "../../validator/src/neutron-mutation-apply.js";

export function buildNeutronMutationApplyResult(input: {
  readonly transactionId: string;
  readonly approvalId: string;
  readonly reviewArtifactDigest: string;
  readonly planDigest: string;
  readonly status: NeutronMutationApplyStatus;
  readonly applied: boolean;
  readonly changedPaths: readonly string[];
  readonly createdPaths?: readonly string[];
  readonly updatedPaths?: readonly string[];
  readonly unchangedPaths?: readonly string[];
  readonly rollbackCompleted: boolean;
  readonly reconciliationRequired: boolean;
  readonly failureCode?: NeutronMutationApplyFailureCode;
  readonly diagnostics?: readonly string[];
}): NeutronMutationApplyResult {
  return validateNeutronMutationApplyResult({
    schemaVersion: NEUTRON_MUTATION_APPLY_RESULT_SCHEMA_URN,
    transactionId: input.transactionId,
    approvalId: input.approvalId,
    reviewArtifactDigest: input.reviewArtifactDigest,
    planDigest: input.planDigest,
    status: input.status,
    applied: input.applied,
    changedPaths: input.changedPaths,
    createdPaths: input.createdPaths ?? [],
    updatedPaths: input.updatedPaths ?? [],
    unchangedPaths: input.unchangedPaths ?? [],
    rollbackCompleted: input.rollbackCompleted,
    reconciliationRequired: input.reconciliationRequired,
    ...(input.failureCode !== undefined
      ? { failureCode: input.failureCode }
      : {}),
    diagnostics: input.diagnostics ?? [],
  });
}

export function neutronMutationApplyLeaksToken(
  value: unknown,
  approvalToken: string,
): boolean {
  if (approvalToken.length === 0) return false;
  return JSON.stringify(value).includes(approvalToken);
}

export function redactApprovalToken(
  value: string,
  approvalToken: string,
): string {
  if (approvalToken.length === 0) return value;
  return value.split(approvalToken).join("[redacted-approval-token]");
}
