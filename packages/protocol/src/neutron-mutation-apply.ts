export const NEUTRON_MUTATION_APPLY_RESULT_SCHEMA_URN =
  "urn:intentloom:schema:neutron-mutation-apply-result:1" as const;

export const NEUTRON_MUTATION_TRANSACTION_RECORD_SCHEMA_URN =
  "urn:intentloom:schema:neutron-mutation-transaction-record:1" as const;

export const NEUTRON_MUTATION_TRANSACTION_STATES = [
  "claimed",
  "executing",
  "applied",
  "failed-before-write",
  "failed-needs-reconciliation",
] as const;
export type NeutronMutationTransactionState =
  (typeof NEUTRON_MUTATION_TRANSACTION_STATES)[number];

export const NEUTRON_MUTATION_APPLY_STATUSES = [
  "applied",
  "rejected",
  "cancelled-before-write",
  "replay-recovered",
  "transaction-failed",
  "rollback-incomplete",
  "mutation-state-unknown",
] as const;
export type NeutronMutationApplyStatus =
  (typeof NEUTRON_MUTATION_APPLY_STATUSES)[number];

export const NEUTRON_MUTATION_APPLY_FAILURE_CODES = [
  "approval-invalid",
  "approval-expired",
  "approval-consumed",
  "approval-already-claimed",
  "artifact-mismatch",
  "content-mismatch",
  "plan-digest-mismatch",
  "project-stale",
  "graph-stale",
  "transaction-conflict",
  "lock-conflict",
  "path-scope-mismatch",
  "containment-failed",
  "cancelled-before-write",
  "transaction-failed",
  "rollback-incomplete",
  "mutation-state-unknown",
  "replay-rejected",
] as const;
export type NeutronMutationApplyFailureCode =
  (typeof NEUTRON_MUTATION_APPLY_FAILURE_CODES)[number];

/**
 * Host Apply result. Must never include approvalToken, previous file bodies,
 * secret bodies, or model reasoning.
 */
export interface NeutronMutationApplyResult {
  readonly schemaVersion: typeof NEUTRON_MUTATION_APPLY_RESULT_SCHEMA_URN;
  readonly transactionId: string;
  readonly approvalId: string;
  readonly reviewArtifactDigest: string;
  readonly planDigest: string;
  readonly status: NeutronMutationApplyStatus;
  readonly applied: boolean;
  readonly changedPaths: readonly string[];
  readonly createdPaths: readonly string[];
  readonly updatedPaths: readonly string[];
  readonly unchangedPaths: readonly string[];
  readonly rollbackCompleted: boolean;
  readonly reconciliationRequired: boolean;
  readonly failureCode?: NeutronMutationApplyFailureCode;
  readonly diagnostics: readonly string[];
}

/**
 * Durable host transaction record. Must never include approvalToken,
 * file bodies, model prompts, or other secrets.
 */
export interface NeutronMutationDurableTransactionRecord {
  readonly schemaVersion: typeof NEUTRON_MUTATION_TRANSACTION_RECORD_SCHEMA_URN;
  readonly recordDigest: string;
  readonly transactionId: string;
  readonly approvalId: string;
  readonly approvalDigest: string;
  readonly reviewArtifactDigest: string;
  readonly planDigest: string;
  readonly lockKey: string;
  readonly state: NeutronMutationTransactionState;
  readonly claimedAt: number;
  readonly updatedAt: number;
  readonly result?: NeutronMutationApplyResult;
}
