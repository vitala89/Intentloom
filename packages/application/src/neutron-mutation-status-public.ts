import type { NeutronMutationApplyResult } from "../../protocol/src/neutron-mutation-apply.js";
import type { NeutronMutationTransactionState } from "../../protocol/src/neutron-mutation-apply.js";
import { validateNeutronMutationStatusResult } from "../../protocol/src/neutron-mutation-status-result.js";
import type { NeutronMutationStatusResult } from "../../protocol/src/neutron-mutation-status-result.js";
import { NEUTRON_MUTATION_STATUS_SCHEMA_URN } from "../../protocol/src/neutron-mutation-status-rpc.js";
import { PROTOCOL_VERSION } from "../../protocol/src/jsonrpc.js";
import type { NeutronMutationTransactionRecord } from "./neutron-mutation-apply-store.js";

const DIAGNOSTIC_LIMIT = 500;

export function publicNeutronMutationStatus(input: {
  readonly proposalId: string;
  readonly record: NeutronMutationTransactionRecord;
}): NeutronMutationStatusResult {
  const result = input.record.result;
  return validateNeutronMutationStatusResult({
    schemaVersion: NEUTRON_MUTATION_STATUS_SCHEMA_URN,
    protocolVersion: PROTOCOL_VERSION,
    outcome: "recorded",
    proposalId: input.proposalId,
    applied: appliedFact(input.record.state, result),
    transactionState: input.record.state,
    reconciliationRequired: reconciliationFact(input.record.state, result),
    transactionId: input.record.transactionId,
    approvalId: input.record.approvalId,
    reviewArtifactDigest: input.record.reviewArtifactDigest,
    planDigest: input.record.planDigest,
    changedPaths: safePaths(result?.changedPaths ?? []),
    diagnostics: safeDiagnostics(result?.diagnostics ?? []),
    ...(result?.status === undefined ? {} : { status: result.status }),
    ...(result?.verificationStatus === undefined
      ? {}
      : { verificationStatus: result.verificationStatus }),
    ...(result?.failureCode === undefined
      ? {}
      : { failureCode: result.failureCode }),
  });
}

function appliedFact(
  state: NeutronMutationTransactionState,
  result: NeutronMutationApplyResult | undefined,
): boolean {
  if (result !== undefined) return result.applied;
  return state === "applied";
}

function reconciliationFact(
  state: NeutronMutationTransactionState,
  result: NeutronMutationApplyResult | undefined,
): boolean {
  if (state === "failed-needs-reconciliation") return true;
  if (result?.verificationStatus === "reconciliation-required") return true;
  return result?.reconciliationRequired === true;
}

function safePaths(paths: readonly string[]): readonly string[] {
  return paths.filter(
    (path) =>
      path.length > 0 &&
      path.length <= DIAGNOSTIC_LIMIT &&
      !path.includes("\n"),
  );
}

function safeDiagnostics(diagnostics: readonly string[]): readonly string[] {
  return diagnostics
    .filter(
      (line) =>
        line.length > 0 &&
        line.length <= DIAGNOSTIC_LIMIT &&
        !line.includes("\n") &&
        !line.includes("approvalToken"),
    )
    .slice(0, 64);
}
