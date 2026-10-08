import type { NeutronMutationApplyResult } from "../../protocol/src/neutron-mutation-apply.js";
import type { NeutronRuntimeSession } from "../../protocol/src/neutron-runtime.js";
import { continueClaimedApplyWithLock } from "./neutron-mutation-apply-after-claim.js";
import { neutronMutationApplyLockOwnedByLiveProcess } from "./neutron-mutation-apply-durable-lock.js";
import type { ParsedNeutronMutationApplyRequest } from "./neutron-mutation-apply-parse.js";
import {
  persistUnknown,
  rejectAfterClaim,
} from "./neutron-mutation-apply-persist.js";
import {
  needsVerificationResume,
  resumeReadOnlyVerification,
} from "./neutron-mutation-apply-verify.js";
import type {
  NeutronMutationApprovalStore,
  NeutronMutationClaimOutcome,
  NeutronMutationTransactionRecord,
} from "./neutron-mutation-apply-store.js";
import type { NeutronMutationApplyInput } from "./neutron-mutation-apply-types.js";
import { NeutronMutationStatusIndexError } from "./neutron-mutation-status-index.js";
import {
  linkNeutronMutationStatus,
  linkNeutronMutationStatusQuietly,
} from "./neutron-mutation-status-link.js";

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
  if (claim.kind === "claimed") {
    try {
      await linkNeutronMutationStatus({
        directory: input.durableStateDirectory,
        request,
        session,
        approvalId: claim.record.approvalId,
        transactionId: claim.record.transactionId,
      });
    } catch (error) {
      if (error instanceof NeutronMutationStatusIndexError) {
        return rejectAfterClaim(request, "mutation-state-unknown", true);
      }
      throw error;
    }
  }
  const resolved = await resolveClaim(input, store, request, claim);
  if (resolved.kind === "result") {
    if (claim.kind !== "storage-failed") {
      await linkResolvedStatus(input, request, session, claim.record);
    }
    return resolved.result;
  }
  const result = await continueClaimedApplyWithLock(
    input,
    request,
    session,
    actualRoot,
    lockKey,
    store,
    resolved.record,
    nowMs,
  );
  await linkResolvedStatus(input, request, session, resolved.record);
  return result;
}

async function linkResolvedStatus(
  input: NeutronMutationApplyInput,
  request: ParsedNeutronMutationApplyRequest,
  session: NeutronRuntimeSession | undefined,
  record: NeutronMutationTransactionRecord,
): Promise<void> {
  await linkNeutronMutationStatusQuietly({
    directory: input.durableStateDirectory,
    request,
    session,
    approvalId: record.approvalId,
    transactionId: record.transactionId,
  });
}

async function resolveClaim(
  input: NeutronMutationApplyInput,
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
    if (needsVerificationResume(claim.record.result)) {
      return {
        kind: "result",
        result: await resumeReadOnlyVerification(
          input,
          request,
          store,
          claim.record,
        ),
      };
    }
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
      result: await rejectInFlight(input, store, request, claim.record),
    };
  }
  return { kind: "claimed", record: claim.record };
}

async function rejectInFlight(
  input: NeutronMutationApplyInput,
  store: NeutronMutationApprovalStore,
  request: ParsedNeutronMutationApplyRequest,
  existing: NeutronMutationTransactionRecord,
): Promise<NeutronMutationApplyResult> {
  if (
    existing.state === "executing" &&
    !(await executingOwnerIsLive(input, existing))
  ) {
    return persistUnknown(store, existing, request);
  }
  return rejectAfterClaim(request, "transaction-conflict", true);
}

async function executingOwnerIsLive(
  input: NeutronMutationApplyInput,
  existing: NeutronMutationTransactionRecord,
): Promise<boolean> {
  const directory = input.durableStateDirectory;
  if (directory === undefined) return false;
  return neutronMutationApplyLockOwnedByLiveProcess({
    canonicalRoot: existing.lockKey,
    transactionId: existing.transactionId,
    durableStateDirectory: directory,
  });
}
