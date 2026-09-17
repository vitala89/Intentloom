import type { NeutronMutationApplyResult } from "../../protocol/src/neutron-mutation-apply.js";
import type { NeutronMutationRollbackProjection } from "../../protocol/src/neutron-mutation-verification.js";
import type { NeutronTrustedApplyExecution } from "./neutron-mutation-apply-execute.js";
import type { ParsedNeutronMutationApplyRequest } from "./neutron-mutation-apply-parse.js";
import {
  persistTerminal,
  persistUnknown,
} from "./neutron-mutation-apply-persist.js";
import type {
  NeutronMutationApprovalStore,
  NeutronMutationTransactionRecord,
} from "./neutron-mutation-apply-store.js";
import type { NeutronMutationApplyInput } from "./neutron-mutation-apply-types.js";
import { buildNeutronMutationVerificationEvidence } from "./neutron-mutation-verification-build.js";
import {
  encodeHiddenMetadataDiagnostics,
  hiddenMetadataFromDiagnostics,
} from "./neutron-mutation-verification-hidden.js";
import { projectNeutronMutationRollbackEvidence } from "./neutron-mutation-verification-rollback.js";
import { verifyNeutronMutationResult } from "./neutron-mutation-verification.js";

export function needsVerificationResume(
  result: NeutronMutationApplyResult,
): boolean {
  const status = result.verification?.status ?? result.verificationStatus;
  return status === "verification-incomplete";
}

export async function persistExecutionWithVerification(
  input: NeutronMutationApplyInput,
  request: ParsedNeutronMutationApplyRequest,
  store: NeutronMutationApprovalStore,
  executing: NeutronMutationTransactionRecord,
  execution: NeutronTrustedApplyExecution,
  preApplyProjectStateDigest: string,
  hiddenMetadataExistedBefore: Readonly<Record<string, boolean>>,
): Promise<NeutronMutationApplyResult> {
  const rollback = projectNeutronMutationRollbackEvidence({
    attempted: execution.rollbackAttempted,
    completed: execution.rollbackCompleted,
    createdPaths: execution.createdPaths,
    rollbackFailures: execution.rollbackFailures,
    rollbackFiles: execution.rollbackFiles,
  });
  const pending = pendingEvidence(
    request,
    execution,
    rollback,
    preApplyProjectStateDigest,
    hiddenMetadataExistedBefore,
  );
  const writeOutcome = await persistWriteOutcome(
    store,
    executing,
    request,
    execution,
    pending,
    input.now?.() ?? Date.now(),
  );
  const stored = await store.getByApproval(executing.approvalId);
  if (stored === undefined || input.deferVerification === true) {
    return writeOutcome;
  }
  if (input.afterWriteBeforeVerification !== undefined) {
    await input.afterWriteBeforeVerification();
  }
  try {
    return persistVerifiedOutcome(
      input,
      request,
      store,
      stored,
      writeOutcome,
      await verifyNeutronMutationResult({
        transactionId: request.transactionId,
        approvalId: request.approval.approvalId,
        reviewArtifactDigest: request.artifact.artifactDigest,
        planDigest: request.artifact.planDigest,
        projectId: request.proposal.projectId,
        root: request.proposal.root,
        fs: input.fs,
        preApplyProjectStateDigest,
        approvedChangedPaths: request.artifact.changedPaths,
        createdPaths: execution.createdPaths,
        updatedPaths: execution.updatedPaths,
        unchangedPaths: execution.unchangedPaths,
        fileBindings: request.artifact.fileBindings,
        applied: execution.applied,
        rollback,
        hiddenMetadataExistedBefore,
        ...(input.now !== undefined ? { now: input.now } : {}),
      }),
    );
  } catch {
    return writeOutcome;
  }
}

export async function resumeReadOnlyVerification(
  input: NeutronMutationApplyInput,
  request: ParsedNeutronMutationApplyRequest,
  store: NeutronMutationApprovalStore,
  record: NeutronMutationTransactionRecord,
  force = false,
): Promise<NeutronMutationApplyResult> {
  const existing = record.result;
  if (existing === undefined) return persistUnknown(store, record, request);
  if (existing.verification?.status === "verified") return existing;
  if (existing.verification === undefined) return existing;
  if (!force && !needsVerificationResume(existing)) return existing;
  const pending = existing.verification;
  const verified = await verifyNeutronMutationResult({
    transactionId: request.transactionId,
    approvalId: request.approval.approvalId,
    reviewArtifactDigest: request.artifact.artifactDigest,
    planDigest: request.artifact.planDigest,
    projectId: request.proposal.projectId,
    root: request.proposal.root,
    fs: input.fs,
    preApplyProjectStateDigest: pending.preApplyProjectStateDigest,
    approvedChangedPaths: pending.approvedChangedPaths,
    createdPaths: existing.createdPaths,
    updatedPaths: existing.updatedPaths,
    unchangedPaths: existing.unchangedPaths,
    fileBindings: pending.byteVerification.files.map((file) => ({
      path: file.path,
      contentDigest: file.expectedContentDigest,
    })),
    applied: existing.applied,
    rollback: pending.rollback,
    hiddenMetadataExistedBefore: hiddenMetadataFromDiagnostics(
      pending.diagnostics,
    ),
    ...(input.now !== undefined ? { now: input.now } : {}),
  });
  return persistVerifiedOutcome(
    input,
    request,
    store,
    record,
    existing,
    verified,
  );
}

function persistVerifiedOutcome(
  input: NeutronMutationApplyInput,
  request: ParsedNeutronMutationApplyRequest,
  store: NeutronMutationApprovalStore,
  record: NeutronMutationTransactionRecord,
  existing: NeutronMutationApplyResult,
  verified: NonNullable<NeutronMutationApplyResult["verification"]>,
): Promise<NeutronMutationApplyResult> {
  return persistTerminal(store, record, request, {
    status: existing.status,
    applied: existing.applied,
    ...(existing.failureCode !== undefined
      ? { failureCode: existing.failureCode }
      : {}),
    rollbackCompleted: existing.rollbackCompleted,
    reconciliationRequired: verified.reconciliationRequired,
    createdPaths: existing.createdPaths,
    updatedPaths: existing.updatedPaths,
    unchangedPaths: existing.unchangedPaths,
    diagnostics: [
      ...new Set([...existing.diagnostics, ...verified.diagnostics]),
    ],
    state: record.state,
    verification: verified,
    now: input.now?.() ?? Date.now(),
  });
}

function persistWriteOutcome(
  store: NeutronMutationApprovalStore,
  executing: NeutronMutationTransactionRecord,
  request: ParsedNeutronMutationApplyRequest,
  execution: NeutronTrustedApplyExecution,
  pending: ReturnType<typeof pendingEvidence>,
  now: number,
): Promise<NeutronMutationApplyResult> {
  if (execution.applied) {
    return persistTerminal(store, executing, request, {
      status: "applied",
      applied: true,
      rollbackCompleted: true,
      reconciliationRequired: true,
      createdPaths: execution.createdPaths,
      updatedPaths: execution.updatedPaths,
      unchangedPaths: execution.unchangedPaths,
      diagnostics: [],
      state: "applied",
      verification: pending,
      now,
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
    verification: pending,
    now,
  });
}

function pendingEvidence(
  request: ParsedNeutronMutationApplyRequest,
  execution: NeutronTrustedApplyExecution,
  rollback: NeutronMutationRollbackProjection,
  preApplyProjectStateDigest: string,
  hidden: Readonly<Record<string, boolean>>,
) {
  return buildNeutronMutationVerificationEvidence({
    transactionId: request.transactionId,
    approvalId: request.approval.approvalId,
    reviewArtifactDigest: request.artifact.artifactDigest,
    planDigest: request.artifact.planDigest,
    projectId: request.proposal.projectId,
    rootIdentity: request.proposal.root,
    preApplyProjectStateDigest,
    approvedChangedPaths: request.artifact.changedPaths,
    observedChangedPaths: [
      ...execution.createdPaths,
      ...execution.updatedPaths,
    ],
    fileBindings: request.artifact.fileBindings,
    byteChecks: request.artifact.fileBindings.map((binding) => ({
      path: binding.path,
      expectedContentDigest: binding.contentDigest,
      existed: false,
      matched: false,
    })),
    writeSet: {
      status: "incomplete",
      undeclaredPaths: [],
      missingApprovedPaths: [],
    },
    applied: execution.applied,
    rollback,
    verifiedAt: 0,
    extraDiagnostics: encodeHiddenMetadataDiagnostics(hidden),
  });
}
