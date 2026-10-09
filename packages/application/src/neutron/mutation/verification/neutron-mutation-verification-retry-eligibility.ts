import type { NeutronMutationVerificationStatus } from "../../../../../protocol/src/neutron/mutation/verification/neutron-mutation-verification.js";
import type { NeutronMutationTransactionRecord } from "../apply/neutron-mutation-apply-store.js";

/**
 * Retry is allowed only when the canonical record proves the mutation was
 * applied and the current verification status is independently re-checkable.
 * `reconciliation-required` stays closed. The boolean `reconciliationRequired`
 * is true for every non-verified Slice 4 evidence record, so eligibility uses
 * the verification status enum.
 */
export function neutronMutationVerificationRetryEligible(
  record: NeutronMutationTransactionRecord,
): boolean {
  const result = record.result;
  if (record.state !== "applied" || result?.applied !== true) return false;
  const status = verificationStatus(record);
  return (
    status === "verification-failed" || status === "verification-incomplete"
  );
}

function verificationStatus(
  record: NeutronMutationTransactionRecord,
): NeutronMutationVerificationStatus | undefined {
  return (
    record.result?.verificationStatus ?? record.result?.verification?.status
  );
}
