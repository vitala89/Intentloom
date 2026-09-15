import type { NeutronMutationApplyResult } from "../../protocol/src/neutron-mutation-apply.js";
import type { NeutronRuntimeSession } from "../../protocol/src/neutron-runtime.js";
import { executeTrustedDeclaredPathApply } from "./neutron-mutation-apply-execute.js";
import type { ParsedNeutronMutationApplyRequest } from "./neutron-mutation-apply-parse.js";
import {
  persistBeforeWrite,
  persistTerminal,
  persistUnknown,
  rejectAfterClaim,
} from "./neutron-mutation-apply-persist.js";
import { redactApprovalToken } from "./neutron-mutation-apply-result.js";
import type {
  NeutronMutationApprovalStore,
  NeutronMutationTransactionRecord,
} from "./neutron-mutation-apply-store.js";
import type { NeutronMutationApplyInput } from "./neutron-mutation-apply-types.js";
import { validateNeutronMutationApplyPreWrite } from "./neutron-mutation-apply-validate.js";
import { fingerprintNeutronProjectRoot } from "./neutron-session-fingerprint.js";

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
  if (claim.kind === "replay" && claim.record.result !== undefined) {
    return claim.record.result;
  }
  if (claim.kind === "conflict") {
    return rejectAfterClaim(request, claim.code, false);
  }
  if (claim.kind === "in-flight") {
    return rejectAfterClaim(request, "transaction-conflict", true);
  }
  return continueClaimedApply(
    input,
    request,
    session,
    actualRoot,
    store,
    claim.record,
    nowMs,
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
    return persistExecution(store, executing, request, execution);
  } catch (error) {
    const message = redactApprovalToken(
      error instanceof Error ? error.message : "mutation-state-unknown",
      request.approval.approvalToken,
    );
    return persistTerminal(store, executing, request, {
      status: "mutation-state-unknown",
      applied: false,
      failureCode: "mutation-state-unknown",
      rollbackCompleted: false,
      reconciliationRequired: true,
      diagnostics: [message],
      state: "failed-needs-reconciliation",
    });
  }
}

function persistExecution(
  store: NeutronMutationApprovalStore,
  executing: NeutronMutationTransactionRecord,
  request: ParsedNeutronMutationApplyRequest,
  execution: {
    readonly applied: boolean;
    readonly createdPaths: readonly string[];
    readonly updatedPaths: readonly string[];
    readonly unchangedPaths: readonly string[];
    readonly rollbackCompleted: boolean;
    readonly diagnostics: readonly string[];
  },
): Promise<NeutronMutationApplyResult> {
  if (execution.applied) {
    return persistTerminal(store, executing, request, {
      status: "applied",
      applied: true,
      rollbackCompleted: true,
      reconciliationRequired: false,
      createdPaths: execution.createdPaths,
      updatedPaths: execution.updatedPaths,
      unchangedPaths: execution.unchangedPaths,
      diagnostics: [],
      state: "applied",
    });
  }
  const incomplete = execution.rollbackCompleted === false;
  return persistTerminal(store, executing, request, {
    status: incomplete ? "rollback-incomplete" : "transaction-failed",
    applied: false,
    failureCode: incomplete ? "rollback-incomplete" : "transaction-failed",
    rollbackCompleted: execution.rollbackCompleted,
    reconciliationRequired: true,
    createdPaths: execution.createdPaths,
    updatedPaths: execution.updatedPaths,
    unchangedPaths: execution.unchangedPaths,
    diagnostics: execution.diagnostics,
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
