import { randomUUID } from "node:crypto";
import type { NeutronMutationUndoExecutionResult } from "../../protocol/src/neutron-mutation-undo-execution.js";
import type { NeutronMutationUndoRequest } from "../../protocol/src/neutron-mutation-undo-request.js";
import {
  issueHostUndoApproval,
  isHostUndoApproval,
  type HostUndoApproval,
} from "./neutron-mutation-undo-approval.js";
import { canonicalizeNeutronMutationRoot } from "./neutron-mutation-containment.js";
import {
  acquireNeutronMutationApplyLock,
  releaseNeutronMutationApplyLock,
} from "./neutron-mutation-apply-durable-lock.js";
import {
  claimPreparedUndo,
  executeClaimedUndo,
} from "./neutron-mutation-undo-finish.js";
import { undoTransactionIdentity } from "./neutron-mutation-undo-plan.js";
import type { NeutronMutationUndoPlan } from "./neutron-mutation-undo-plan.js";
import { closedUndoExecution } from "./neutron-mutation-undo-public.js";
import {
  previewUndoExecution,
  reloadUndoPlan,
  type ApproveAndUndoNeutronMutationInput,
} from "./neutron-mutation-undo-preview.js";

export type { ApproveAndUndoNeutronMutationInput };

export async function undoUnderProjectLock(
  input: ApproveAndUndoNeutronMutationInput,
): Promise<NeutronMutationUndoExecutionResult> {
  const canonicalRoot = await canonicalizeNeutronMutationRoot(
    input.intent.root,
    input.fs,
  );
  if (canonicalRoot === undefined) {
    return closedUndoExecution(input.intent, "integrity-failure", true);
  }
  const prepared = await prepareUndo(input);
  if (prepared.kind !== "ready") return prepared.result;
  if (prepared.plan.lockKey !== canonicalRoot) {
    return closedUndoExecution(input.intent, "integrity-failure", true);
  }
  const lockOwner = `${prepared.undoTransactionId}:${randomUUID()}`;
  const lock = await acquireNeutronMutationApplyLock({
    canonicalRoot,
    transactionId: lockOwner,
    durableStateDirectory: input.directory,
  });
  if (!lock.ok)
    return closedUndoExecution(input.intent, "project-locked", true);
  try {
    return await runClaimedUndo(
      input,
      prepared.plan,
      prepared.undoTransactionId,
    );
  } finally {
    await releaseNeutronMutationApplyLock({
      key: lock.key,
      transactionId: lockOwner,
      durableStateDirectory: input.directory,
    });
  }
}

async function prepareUndo(input: ApproveAndUndoNeutronMutationInput): Promise<
  | {
      readonly kind: "ready";
      readonly plan: NeutronMutationUndoPlan;
      readonly undoTransactionId: string;
    }
  | {
      readonly kind: "closed";
      readonly result: NeutronMutationUndoExecutionResult;
    }
> {
  const preview = await previewUndoExecution(input);
  if (preview.kind !== "eligible")
    return { kind: "closed", result: preview.result };
  const plan = await reloadUndoPlan(input, preview.paths);
  if (plan.kind !== "ready") return { kind: "closed", result: plan.result };
  return {
    kind: "ready",
    plan: plan.plan,
    undoTransactionId: undoTransactionIdentity({
      originalTransactionId: input.intent.transactionId,
      snapshotManifestDigest: plan.plan.manifestDigest,
      attempt: input.attempt,
    }),
  };
}

async function runClaimedUndo(
  input: ApproveAndUndoNeutronMutationInput,
  plan: NeutronMutationUndoPlan,
  undoTransactionId: string,
): Promise<NeutronMutationUndoExecutionResult> {
  const current = await previewUndoExecution(input);
  if (current.kind !== "eligible") return current.result;
  const reloaded = await reloadUndoPlan(input, current.paths);
  if (reloaded.kind !== "ready") return reloaded.result;
  if (reloaded.plan.pathSetDigest !== plan.pathSetDigest) {
    return closedUndoExecution(input.intent, "integrity-failure", true);
  }
  const approval = issueHostUndoApproval({
    ...scope(input.intent, undoTransactionId, reloaded.plan),
    now: input.now,
  });
  if (!approvalBinds(approval, input, reloaded.plan, undoTransactionId)) {
    return closedUndoExecution(input.intent, "integrity-failure", true);
  }
  const claimed = await claimPreparedUndo(input, approval, reloaded.plan);
  if (claimed.kind !== "claimed") return claimed.result;
  return executeClaimedUndo(input, claimed.record, reloaded.plan);
}

function scope(
  intent: NeutronMutationUndoRequest,
  undoTransactionId: string,
  plan: NeutronMutationUndoPlan,
) {
  return {
    originalTransactionId: intent.transactionId,
    undoTransactionId,
    root: intent.root,
    projectId: intent.projectId,
    sessionId: intent.sessionId,
    graphId: intent.graphId,
    proposalId: intent.proposalId,
    pathSetDigest: plan.pathSetDigest,
    snapshotManifestDigest: plan.manifestDigest,
    expectedContentDigests: plan.files.map((file) => ({
      path: file.path,
      digest: file.expectedContentDigest,
    })),
    restorationPayloadDigests: plan.files.map((file) => ({
      path: file.path,
      payloadDigest: file.payloadDigest,
    })),
  };
}

function approvalBinds(
  approval: HostUndoApproval,
  input: ApproveAndUndoNeutronMutationInput,
  plan: NeutronMutationUndoPlan,
  undoTransactionId: string,
): boolean {
  return (
    isHostUndoApproval(approval, input.now) &&
    approval.mutationClass === "undo" &&
    approval.originalTransactionId === input.intent.transactionId &&
    approval.undoTransactionId === undoTransactionId &&
    approval.snapshotManifestDigest === plan.manifestDigest &&
    approval.pathSetDigest === plan.pathSetDigest &&
    approval.root === input.intent.root &&
    approval.projectId === input.intent.projectId &&
    approval.sessionId === input.intent.sessionId &&
    approval.graphId === input.intent.graphId &&
    approval.proposalId === input.intent.proposalId
  );
}
