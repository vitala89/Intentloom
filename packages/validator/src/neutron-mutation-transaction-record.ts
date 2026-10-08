import {
  NEUTRON_MUTATION_TRANSACTION_RECORD_SCHEMA_URN,
  NEUTRON_MUTATION_TRANSACTION_STATES,
  type NeutronMutationDurableTransactionRecord,
} from "../../protocol/src/neutron-mutation-apply.js";
import {
  NEUTRON_MUTATION_UNDO_RESTORATION_SCHEMA_URN,
  type NeutronMutationUndoRestorationClaim,
} from "../../protocol/src/neutron-mutation-undo-snapshot.js";
import { checksum } from "@intentloom/core";
import {
  assertNeutronMutationDigest,
  canonicalNeutronMutationJson,
} from "./neutron-mutation-canonical.js";
import { isObject, nonEmpty, oneOf } from "./neutron-runtime-helpers.js";
import { validateNeutronMutationApplyResult } from "./neutron-mutation-apply.js";

const SECRET_FIELDS = [
  "approvalToken",
  "previousContent",
  "grantedApprovals",
  "files",
  "prompt",
  "reasoning",
] as const;

export function digestNeutronMutationTransactionRecord(
  record: Omit<NeutronMutationDurableTransactionRecord, "recordDigest">,
): string {
  return `sha256:${checksum(canonicalNeutronMutationJson(record))}`;
}

export function validateNeutronMutationDurableTransactionRecord(
  value: unknown,
): NeutronMutationDurableTransactionRecord {
  if (!isObject(value)) {
    throw new Error("mutation transaction record must be an object");
  }
  if (value.schemaVersion !== NEUTRON_MUTATION_TRANSACTION_RECORD_SCHEMA_URN) {
    throw new Error("unsupported neutron mutation transaction record schema");
  }
  for (const field of SECRET_FIELDS) {
    if (Object.hasOwn(value, field)) {
      throw new Error(`mutation transaction record must not include ${field}`);
    }
  }
  const result =
    value.result === undefined
      ? undefined
      : validateNeutronMutationApplyResult(value.result);
  const undoRestoration =
    value.undoRestoration === undefined
      ? undefined
      : validateUndoRestorationClaim(value.undoRestoration);
  const unsigned = {
    schemaVersion: NEUTRON_MUTATION_TRANSACTION_RECORD_SCHEMA_URN,
    transactionId: nonEmpty(value.transactionId, "transactionId"),
    approvalId: nonEmpty(value.approvalId, "approvalId"),
    approvalDigest: assertNeutronMutationDigest(
      value.approvalDigest,
      "approvalDigest",
    ),
    reviewArtifactDigest: assertNeutronMutationDigest(
      value.reviewArtifactDigest,
      "reviewArtifactDigest",
    ),
    planDigest: assertNeutronMutationDigest(value.planDigest, "planDigest"),
    lockKey: nonEmpty(value.lockKey, "lockKey"),
    state: oneOf(value.state, NEUTRON_MUTATION_TRANSACTION_STATES, "state"),
    claimedAt: assertTimestamp(value.claimedAt, "claimedAt"),
    updatedAt: assertTimestamp(value.updatedAt, "updatedAt"),
    ...(result !== undefined ? { result } : {}),
    ...(undoRestoration !== undefined ? { undoRestoration } : {}),
  };
  const recordDigest = assertNeutronMutationDigest(
    value.recordDigest,
    "recordDigest",
  );
  if (recordDigest !== digestNeutronMutationTransactionRecord(unsigned)) {
    throw new Error("mutation transaction record digest mismatch");
  }
  return { ...unsigned, recordDigest };
}

function validateUndoRestorationClaim(
  value: unknown,
): NeutronMutationUndoRestorationClaim {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error("undo restoration claim must be an object");
  }
  const claim = value as Record<string, unknown>;
  const keys = Object.keys(claim);
  if (
    keys.length !== 3 ||
    !keys.includes("schemaVersion") ||
    !keys.includes("state") ||
    !keys.includes("manifestDigest")
  ) {
    throw new Error("undo restoration claim shape is invalid");
  }
  if (claim.schemaVersion !== NEUTRON_MUTATION_UNDO_RESTORATION_SCHEMA_URN) {
    throw new Error("unsupported undo restoration claim schema");
  }
  if (claim.state !== "applied-source") {
    throw new Error("undo restoration claim state is invalid");
  }
  return {
    schemaVersion: NEUTRON_MUTATION_UNDO_RESTORATION_SCHEMA_URN,
    state: "applied-source",
    manifestDigest: assertNeutronMutationDigest(
      claim.manifestDigest,
      "manifestDigest",
    ),
  };
}

function assertTimestamp(value: unknown, field: string): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    throw new Error(`${field} must be a finite non-negative number`);
  }
  return value;
}
