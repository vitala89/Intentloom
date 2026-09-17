import type { NeutronMutationApplyResult } from "../../protocol/src/neutron-mutation-apply.js";
import { buildNeutronMutationApplyResult } from "./neutron-mutation-apply-result.js";
import type { ParsedNeutronMutationApplyRequest } from "./neutron-mutation-apply-parse.js";
import type {
  NeutronMutationApprovalStore,
  NeutronMutationTransactionRecord,
} from "./neutron-mutation-apply-store.js";

const FALLBACK_DIGEST = `sha256:${"0".repeat(64)}`;

export function fallbackMutationDigest(): string {
  return FALLBACK_DIGEST;
}

export function rejectBeforeClaim(input: {
  readonly transactionId: string;
  readonly approval: unknown;
  readonly artifact: unknown;
  readonly failureCode: NonNullable<NeutronMutationApplyResult["failureCode"]>;
}): NeutronMutationApplyResult {
  const cancelled = input.failureCode === "cancelled-before-write";
  return buildNeutronMutationApplyResult({
    transactionId: input.transactionId,
    approvalId: readApprovalId(input.approval),
    reviewArtifactDigest: readDigest(input.artifact, "artifactDigest"),
    planDigest: FALLBACK_DIGEST,
    status: cancelled ? "cancelled-before-write" : "rejected",
    applied: false,
    changedPaths: [],
    rollbackCompleted: true,
    reconciliationRequired: false,
    failureCode: input.failureCode,
    diagnostics: [input.failureCode],
  });
}

export function rejectAfterClaim(
  request: ParsedNeutronMutationApplyRequest,
  failureCode:
    | "approval-already-claimed"
    | "approval-consumed"
    | "transaction-conflict"
    | "mutation-state-unknown",
  reconciliationRequired: boolean,
): NeutronMutationApplyResult {
  const unknown = failureCode === "mutation-state-unknown";
  return buildNeutronMutationApplyResult({
    transactionId: request.transactionId,
    approvalId: request.approval.approvalId,
    reviewArtifactDigest: request.artifact.artifactDigest,
    planDigest: request.artifact.planDigest,
    status: unknown ? "mutation-state-unknown" : "rejected",
    applied: false,
    changedPaths: request.artifact.changedPaths,
    rollbackCompleted: true,
    reconciliationRequired: unknown || reconciliationRequired,
    failureCode,
    diagnostics: [failureCode],
  });
}

export async function persistBeforeWrite(
  store: NeutronMutationApprovalStore,
  claimed: NeutronMutationTransactionRecord,
  request: ParsedNeutronMutationApplyRequest,
  failureCode: NonNullable<NeutronMutationApplyResult["failureCode"]>,
): Promise<NeutronMutationApplyResult> {
  const cancelled = failureCode === "cancelled-before-write";
  return persistTerminal(store, claimed, request, {
    status: cancelled ? "cancelled-before-write" : "rejected",
    applied: false,
    failureCode,
    rollbackCompleted: true,
    reconciliationRequired: false,
    diagnostics: [failureCode],
    state: "failed-before-write",
  });
}

export async function persistUnknown(
  store: NeutronMutationApprovalStore,
  claimed: NeutronMutationTransactionRecord,
  request: ParsedNeutronMutationApplyRequest,
): Promise<NeutronMutationApplyResult> {
  return persistTerminal(store, claimed, request, {
    status: "mutation-state-unknown",
    applied: false,
    failureCode: "mutation-state-unknown",
    rollbackCompleted: false,
    reconciliationRequired: true,
    diagnostics: ["mutation-state-unknown"],
    state: "failed-needs-reconciliation",
  });
}

export async function persistTerminal(
  store: NeutronMutationApprovalStore,
  current: NeutronMutationTransactionRecord,
  request: ParsedNeutronMutationApplyRequest,
  outcome: {
    readonly status: NeutronMutationApplyResult["status"];
    readonly applied: boolean;
    readonly failureCode?: NonNullable<
      NeutronMutationApplyResult["failureCode"]
    >;
    readonly rollbackCompleted: boolean;
    readonly reconciliationRequired: boolean;
    readonly createdPaths?: readonly string[];
    readonly updatedPaths?: readonly string[];
    readonly unchangedPaths?: readonly string[];
    readonly diagnostics: readonly string[];
    readonly state: NeutronMutationTransactionRecord["state"];
    readonly verification?: NeutronMutationApplyResult["verification"];
    readonly now?: number;
  },
): Promise<NeutronMutationApplyResult> {
  const result = buildNeutronMutationApplyResult({
    transactionId: request.transactionId,
    approvalId: request.approval.approvalId,
    reviewArtifactDigest: request.artifact.artifactDigest,
    planDigest: request.artifact.planDigest,
    status: outcome.status,
    applied: outcome.applied,
    changedPaths: request.artifact.changedPaths,
    createdPaths: outcome.createdPaths ?? [],
    updatedPaths: outcome.updatedPaths ?? [],
    unchangedPaths: outcome.unchangedPaths ?? [],
    rollbackCompleted: outcome.rollbackCompleted,
    reconciliationRequired: outcome.reconciliationRequired,
    ...(outcome.failureCode !== undefined
      ? { failureCode: outcome.failureCode }
      : {}),
    diagnostics: outcome.diagnostics,
    ...(outcome.verification !== undefined
      ? { verification: outcome.verification }
      : {}),
  });
  await store.transition({
    approvalId: current.approvalId,
    expected: current.state,
    next: outcome.state,
    result,
    updatedAt: outcome.now ?? Date.now(),
  });
  return result;
}

export function readApprovalToken(approval: unknown): string {
  if (typeof approval !== "object" || approval === null) return "";
  const token = (approval as { approvalToken?: unknown }).approvalToken;
  return typeof token === "string" ? token : "";
}

export function readApprovalId(approval: unknown): string {
  if (typeof approval !== "object" || approval === null) {
    return "invalid-approval";
  }
  const id = (approval as { approvalId?: unknown }).approvalId;
  return typeof id === "string" && id.length > 0 ? id : "invalid-approval";
}

export function readDigest(container: unknown, field: string): string {
  if (typeof container !== "object" || container === null) {
    return FALLBACK_DIGEST;
  }
  const value = (container as Record<string, unknown>)[field];
  return typeof value === "string" && /^sha256:[0-9a-f]{64}$/u.test(value)
    ? value
    : FALLBACK_DIGEST;
}
