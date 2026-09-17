import type { NeutronMutationApplyResult } from "../../protocol/src/neutron-mutation-apply.js";
import type { NeutronRuntimeSession } from "../../protocol/src/neutron-runtime.js";
import {
  acquireNeutronMutationApplyLock,
  releaseNeutronMutationApplyLock,
} from "./neutron-mutation-apply-durable-lock.js";
import { executeTrustedDeclaredPathApply } from "./neutron-mutation-apply-execute.js";
import type { ParsedNeutronMutationApplyRequest } from "./neutron-mutation-apply-parse.js";
import {
  persistBeforeWrite,
  persistTerminal,
  persistUnknown,
} from "./neutron-mutation-apply-persist.js";
import { redactApprovalToken } from "./neutron-mutation-apply-result.js";
import type {
  NeutronMutationApprovalStore,
  NeutronMutationTransactionRecord,
} from "./neutron-mutation-apply-store.js";
import type { NeutronMutationApplyInput } from "./neutron-mutation-apply-types.js";
import { persistExecutionWithVerification } from "./neutron-mutation-apply-verify.js";
import { validateNeutronMutationApplyPreWrite } from "./neutron-mutation-apply-validate.js";
import { snapshotHiddenGeneratedMetadata } from "./neutron-mutation-verification-hidden.js";
import { digestNeutronMutationObservedState } from "./neutron-mutation-verification-state.js";
import { fingerprintNeutronProjectRoot } from "./neutron-session-fingerprint.js";

export async function continueClaimedApplyWithLock(
  input: NeutronMutationApplyInput,
  request: ParsedNeutronMutationApplyRequest,
  session: NeutronRuntimeSession | undefined,
  actualRoot: string,
  lockKey: string,
  store: NeutronMutationApprovalStore,
  claimed: NeutronMutationTransactionRecord,
  nowMs: number,
): Promise<NeutronMutationApplyResult> {
  const lock = await acquireNeutronMutationApplyLock({
    canonicalRoot: lockKey,
    transactionId: request.transactionId,
    ...(input.durableStateDirectory !== undefined
      ? { durableStateDirectory: input.durableStateDirectory }
      : {}),
  });
  if (!lock.ok) {
    return persistBeforeWrite(store, claimed, request, "lock-conflict");
  }
  try {
    const result = await continueClaimedApply(
      input,
      request,
      session,
      actualRoot,
      store,
      claimed,
      nowMs,
    );
    if (shouldReleaseMutationLock(result)) {
      await releaseNeutronMutationApplyLock({
        key: lock.key,
        transactionId: request.transactionId,
        ...(input.durableStateDirectory !== undefined
          ? { durableStateDirectory: input.durableStateDirectory }
          : {}),
      });
    }
    return result;
  } catch (error) {
    return persistCaughtUnknown(store, claimed, request, error);
  }
}

function shouldReleaseMutationLock(
  result: NeutronMutationApplyResult,
): boolean {
  return (
    result.reconciliationRequired !== true &&
    result.status !== "mutation-state-unknown"
  );
}

async function continueClaimedApply(
  input: NeutronMutationApplyInput,
  request: ParsedNeutronMutationApplyRequest,
  session: NeutronRuntimeSession | undefined,
  actualRoot: string,
  store: NeutronMutationApprovalStore,
  claimed: NeutronMutationTransactionRecord,
  nowMs: number,
): Promise<NeutronMutationApplyResult> {
  if (input.signal?.aborted === true) {
    return persistBeforeWrite(
      store,
      claimed,
      request,
      "cancelled-before-write",
    );
  }
  const currentProjectStateDigest = await resolveProjectStateDigest(
    input,
    actualRoot,
  );
  const invalid = await validateNeutronMutationApplyPreWrite({
    proposal: request.proposal,
    approval: request.approval,
    artifact: request.artifact,
    files: request.files,
    authorization: request.authorization,
    fs: input.fs,
    actualRoot,
    currentProjectStateDigest,
    nowMs,
    transactionId: request.transactionId,
    lockOwner: request.transactionId,
    ...(input.signal !== undefined ? { signal: input.signal } : {}),
    ...(session !== undefined ? { session } : {}),
    ...(input.graphStale !== undefined ? { graphStale: input.graphStale } : {}),
    ...(input.roleCapabilities !== undefined
      ? { roleCapabilities: input.roleCapabilities }
      : {}),
    ...(input.delegatedRole !== undefined
      ? { delegatedRole: input.delegatedRole }
      : {}),
  });
  if (invalid !== undefined) {
    return persistBeforeWrite(store, claimed, request, invalid);
  }
  const executing = await store.transition({
    approvalId: claimed.approvalId,
    expected: "claimed",
    next: "executing",
    updatedAt: input.now?.() ?? Date.now(),
  });
  if (executing === undefined) return persistUnknown(store, claimed, request);
  return finishExecutingApply(
    input,
    request,
    store,
    executing,
    currentProjectStateDigest,
  );
}

async function finishExecutingApply(
  input: NeutronMutationApplyInput,
  request: ParsedNeutronMutationApplyRequest,
  store: NeutronMutationApprovalStore,
  executing: NeutronMutationTransactionRecord,
  currentProjectStateDigest: string,
): Promise<NeutronMutationApplyResult> {
  try {
    const hiddenMetadataExistedBefore = await snapshotHiddenGeneratedMetadata(
      request.proposal.root,
      input.fs,
    );
    const preApplyObservedDigest = await digestNeutronMutationObservedState({
      root: request.proposal.root,
      fs: input.fs,
      paths: request.artifact.changedPaths,
    });
    const execution = await executeTrustedDeclaredPathApply({
      transactionId: request.transactionId,
      plan: request.proposal.plan,
      files: request.files,
      fs: input.fs,
      currentProjectStateDigest,
      ...(input.now !== undefined ? { now: input.now } : {}),
      ...(input.failAt !== undefined ? { failAt: input.failAt } : {}),
      ...(input.rollbackFailPaths !== undefined
        ? { rollbackFailPaths: input.rollbackFailPaths }
        : {}),
    });
    return persistExecutionWithVerification(
      input,
      request,
      store,
      executing,
      execution,
      preApplyObservedDigest,
      hiddenMetadataExistedBefore,
    );
  } catch (error) {
    return persistCaughtUnknown(store, executing, request, error);
  }
}

function persistCaughtUnknown(
  store: NeutronMutationApprovalStore,
  current: NeutronMutationTransactionRecord,
  request: ParsedNeutronMutationApplyRequest,
  error: unknown,
): Promise<NeutronMutationApplyResult> {
  return persistTerminal(store, current, request, {
    status: "mutation-state-unknown",
    applied: false,
    failureCode: "mutation-state-unknown",
    rollbackCompleted: false,
    reconciliationRequired: true,
    diagnostics: [
      redactApprovalToken(
        error instanceof Error ? error.message : "mutation-state-unknown",
        request.approval.approvalToken,
      ),
    ],
    state: "failed-needs-reconciliation",
  });
}

async function resolveProjectStateDigest(
  input: NeutronMutationApplyInput,
  actualRoot: string,
): Promise<string> {
  if (input.evaluateProjectStateDigest !== undefined) {
    return input.evaluateProjectStateDigest(actualRoot);
  }
  const hex = await fingerprintNeutronProjectRoot(actualRoot, input.fs);
  return hex.startsWith("sha256:") ? hex : `sha256:${hex}`;
}
