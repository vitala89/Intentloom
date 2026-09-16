import { createHash } from "node:crypto";
import { join } from "node:path";
import { NEUTRON_MUTATION_TRANSACTION_RECORD_SCHEMA_URN } from "../../protocol/src/neutron-mutation-apply.js";
import {
  digestNeutronMutationTransactionRecord,
  validateNeutronMutationDurableTransactionRecord,
} from "../../validator/src/neutron-mutation-transaction-record.js";
import type { NeutronMutationTransactionRecord } from "./neutron-mutation-apply-store.js";

export function durableApprovalRecordPath(
  directory: string,
  approvalId: string,
): string {
  const digest = createHash("sha256").update(approvalId).digest("hex");
  return join(directory, "approvals", `${digest}.json`);
}

export function durableApprovalGatePath(recordPath: string): string {
  return `${recordPath}.gate`;
}

export function encodeDurableTransactionRecord(
  record: NeutronMutationTransactionRecord,
): string {
  const unsigned = {
    schemaVersion: NEUTRON_MUTATION_TRANSACTION_RECORD_SCHEMA_URN,
    transactionId: record.transactionId,
    approvalId: record.approvalId,
    approvalDigest: record.approvalDigest,
    reviewArtifactDigest: record.reviewArtifactDigest,
    planDigest: record.planDigest,
    lockKey: record.lockKey,
    state: record.state,
    claimedAt: record.claimedAt,
    updatedAt: record.updatedAt,
    ...(record.result !== undefined ? { result: record.result } : {}),
  };
  return `${JSON.stringify({
    ...unsigned,
    recordDigest: digestNeutronMutationTransactionRecord(unsigned),
  })}\n`;
}

export function decodeDurableTransactionRecord(
  raw: string,
): NeutronMutationTransactionRecord {
  const parsed: unknown = JSON.parse(raw);
  const durable = validateNeutronMutationDurableTransactionRecord(parsed);
  return {
    transactionId: durable.transactionId,
    approvalId: durable.approvalId,
    approvalDigest: durable.approvalDigest,
    reviewArtifactDigest: durable.reviewArtifactDigest,
    planDigest: durable.planDigest,
    lockKey: durable.lockKey,
    state: durable.state,
    claimedAt: durable.claimedAt,
    updatedAt: durable.updatedAt,
    ...(durable.result !== undefined ? { result: durable.result } : {}),
  };
}
