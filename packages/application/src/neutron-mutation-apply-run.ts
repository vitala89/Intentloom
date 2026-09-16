import type { NeutronMutationApplyResult } from "../../protocol/src/neutron-mutation-apply.js";
import type { NeutronRuntimeSession } from "../../protocol/src/neutron-runtime.js";
import { continueClaimedApplyWithLock } from "./neutron-mutation-apply-after-claim.js";
import type { ParsedNeutronMutationApplyRequest } from "./neutron-mutation-apply-parse.js";
import {
  persistUnknown,
  rejectAfterClaim,
} from "./neutron-mutation-apply-persist.js";
import type {
  NeutronMutationApprovalStore,
  NeutronMutationClaimOutcome,
  NeutronMutationTransactionRecord,
} from "./neutron-mutation-apply-store.js";
import type { NeutronMutationApplyInput } from "./neutron-mutation-apply-types.js";

export async function runLockedApply(
  input: NeutronMutationApplyInput,
  request: ParsedNeutronMutationApplyRequest,
  session: NeutronRuntimeSession | undefined,
  actualRoot: string,
  lockKey: string,
  store: NeutronMutationApprovalStore,
): Promise<NeutronMutationApplyResult> {
  const nowMs = input.now?.() ?? Date.now();
  const claim = await store.claim({
    transactionId: request.transactionId,
    approvalId: request.approval.approvalId,
    approvalDigest: request.approval.approvalDigest,
    reviewArtifactDigest: request.artifact.artifactDigest,
    planDigest: request.artifact.planDigest,
    lockKey,
    state: "claimed",
    claimedAt: nowMs,
    updatedAt: nowMs,
  });
  const resolved = await resolveClaim(store, request, claim);
  if (resolved.kind === "result") return resolved.result;
  return continueClaimedApplyWithLock(
    input,
    request,
    session,
    actualRoot,
    lockKey,
    store,
    resolved.record,
    nowMs,
  );
}

async function resolveClaim(
  store: NeutronMutationApprovalStore,
  request: ParsedNeutronMutationApplyRequest,
  claim: NeutronMutationClaimOutcome,
): Promise<
  | { readonly kind: "result"; readonly result: NeutronMutationApplyResult }
  | {
      readonly kind: "claimed";
      readonly record: NeutronMutationTransactionRecord;
    }
> {
  if (claim.kind === "storage-failed") {
    return {
      kind: "result",
      result: rejectAfterClaim(request, "mutation-state-unknown", true),
    };
  }
  if (claim.kind === "replay" && claim.record.result !== undefined) {
    return { kind: "result", result: claim.record.result };
  }
  if (claim.kind === "conflict") {
    return {
      kind: "result",
      result: rejectAfterClaim(request, claim.code, false),
    };
  }
  if (claim.kind === "in-flight") {
    return {
      kind: "result",
      result: await rejectInFlight(store, request, claim.record),
    };
  }
  return { kind: "claimed", record: claim.record };
}

async function rejectInFlight(
  store: NeutronMutationApprovalStore,
  request: ParsedNeutronMutationApplyRequest,
  existing: NeutronMutationTransactionRecord,
): Promise<NeutronMutationApplyResult> {
  if (existing.state === "executing") {
    return persistUnknown(store, existing, request);
  }
  return rejectAfterClaim(request, "transaction-conflict", true);
}
