import type { NeutronMutationUndoExecutionResult } from "../../../../../protocol/src/neutron/mutation/undo/neutron-mutation-undo-execution.js";
import type { HostUndoApproval } from "./neutron-mutation-undo-approval.js";
import { canonicalizeNeutronMutationRoot } from "../apply/neutron-mutation-containment.js";
import { executeUndoPlan } from "./neutron-mutation-undo-execute.js";
import type { NeutronMutationUndoPlan } from "./neutron-mutation-undo-plan.js";
import {
  closedUndoExecution,
  replayExecution,
  undoneExecution,
} from "./neutron-mutation-undo-public.js";
import {
  NEUTRON_MUTATION_UNDO_TRANSACTION_SCHEMA_URN,
  type NeutronMutationUndoTransactionRecord,
} from "./neutron-mutation-undo-record.js";
import {
  claimUndoTransaction,
  transitionUndoTransaction,
} from "./neutron-mutation-undo-store.js";
import type { ApproveAndUndoNeutronMutationInput } from "./neutron-mutation-undo-preview.js";
import { previewUndoExecution } from "./neutron-mutation-undo-preview.js";

export async function claimPreparedUndo(
  input: ApproveAndUndoNeutronMutationInput,
  approval: HostUndoApproval,
  plan: NeutronMutationUndoPlan,
): Promise<
  | {
      readonly kind: "claimed";
      readonly record: NeutronMutationUndoTransactionRecord;
    }
  | {
      readonly kind: "closed";
      readonly result: NeutronMutationUndoExecutionResult;
    }
> {
  const record = claimedRecord(input, approval, plan);
  const claim = await claimUndoTransaction({
    directory: input.directory,
    record,
  });
  if (claim.kind === "claimed") return { kind: "claimed", record };
  return { kind: "closed", result: claimResult(input, claim) };
}

export async function executeClaimedUndo(
  input: ApproveAndUndoNeutronMutationInput,
  claimed: NeutronMutationUndoTransactionRecord,
  plan: NeutronMutationUndoPlan,
): Promise<NeutronMutationUndoExecutionResult> {
  if (input.beforeMutation !== undefined) await input.beforeMutation();
  const current = await previewUndoExecution(input);
  if (current.kind !== "eligible")
    return failClaim(input, claimed, current.result);
  if (input.failAt === "before-write") {
    return failClaim(
      input,
      claimed,
      closedUndoExecution(input.intent, "failed-before-write", true),
    );
  }
  const canonicalRoot = await canonicalizeNeutronMutationRoot(
    input.intent.root,
    input.fs,
  );
  if (canonicalRoot === undefined || canonicalRoot !== plan.lockKey) {
    return failClaim(
      input,
      claimed,
      closedUndoExecution(input.intent, "integrity-failure", true),
    );
  }
  const executing = await mark(input.directory, claimed, "executing");
  if (executing === undefined) {
    return closedUndoExecution(input.intent, "in-flight", true);
  }
  const executed = await executeUndoPlan({
    canonicalRoot,
    fs: input.fs,
    files: plan.files,
    ...faultOption(input.failAt),
  });
  return finishExecution(input, executing, plan, executed);
}

function claimedRecord(
  input: ApproveAndUndoNeutronMutationInput,
  approval: HostUndoApproval,
  plan: NeutronMutationUndoPlan,
): NeutronMutationUndoTransactionRecord {
  return {
    schemaVersion: NEUTRON_MUTATION_UNDO_TRANSACTION_SCHEMA_URN,
    state: "claimed",
    undoTransactionId: approval.undoTransactionId,
    originalTransactionId: approval.originalTransactionId,
    snapshotManifestDigest: plan.manifestDigest,
    pathSetDigest: plan.pathSetDigest,
    root: input.intent.root,
    projectId: input.intent.projectId,
    sessionId: input.intent.sessionId,
    graphId: input.intent.graphId,
    proposalId: input.intent.proposalId,
    approvalId: approval.approvalId,
    approvalDigest: approval.approvalDigest,
    claimedAt: input.now,
    updatedAt: input.now,
    attempt: input.attempt,
  };
}

function claimResult(
  input: ApproveAndUndoNeutronMutationInput,
  claim: Awaited<ReturnType<typeof claimUndoTransaction>>,
): NeutronMutationUndoExecutionResult {
  if (claim.kind === "claimed") {
    return closedUndoExecution(input.intent, "integrity-failure", true);
  }
  if (claim.kind === "already-undone" && claim.record.result !== undefined) {
    return replayExecution(claim.record.result, "already-undone");
  }
  if (claim.kind === "reconciliation") {
    return closedUndoExecution(input.intent, "reconciliation-required", true);
  }
  if (claim.kind === "conflict" || claim.kind === "storage-failed") {
    return closedUndoExecution(input.intent, "integrity-failure", true);
  }
  return closedUndoExecution(input.intent, "in-flight", true);
}

function faultOption(failAt: ApproveAndUndoNeutronMutationInput["failAt"]): {
  failAt?: "after-first-mutation" | "rollback";
} {
  if (failAt === "after-first-mutation" || failAt === "rollback") {
    return { failAt };
  }
  return {};
}

async function finishExecution(
  input: ApproveAndUndoNeutronMutationInput,
  executing: NeutronMutationUndoTransactionRecord,
  plan: NeutronMutationUndoPlan,
  executed: Awaited<ReturnType<typeof executeUndoPlan>>,
): Promise<NeutronMutationUndoExecutionResult> {
  if (executed.kind === "undone") {
    const result = undoneExecution({
      intent: input.intent,
      undoTransactionId: executing.undoTransactionId,
      plan,
      unchangedPathCount: input.unchangedPathCount,
    });
    const saved = await mark(input.directory, executing, "undone", result);
    if (saved === undefined) {
      return closedUndoExecution(input.intent, "in-flight", true);
    }
    return result;
  }
  if (executed.kind === "not-current") {
    const outcome =
      executed.reason === "escape"
        ? "integrity-failure"
        : "stale-current-state";
    return failClaim(
      input,
      executing,
      closedUndoExecution(input.intent, outcome, true),
    );
  }
  if (executed.kind === "rolled-back") {
    return failClaim(
      input,
      executing,
      closedUndoExecution(input.intent, "transaction-failed", true),
      "failed-rolled-back",
    );
  }
  return failClaim(
    input,
    executing,
    closedUndoExecution(input.intent, "reconciliation-required", true),
    "failed-needs-reconciliation",
  );
}

async function failClaim(
  input: ApproveAndUndoNeutronMutationInput,
  current: NeutronMutationUndoTransactionRecord,
  result: NeutronMutationUndoExecutionResult,
  state: NeutronMutationUndoTransactionRecord["state"] = "failed-before-write",
): Promise<NeutronMutationUndoExecutionResult> {
  await mark(input.directory, current, state, result);
  return result;
}

async function mark(
  directory: string,
  current: NeutronMutationUndoTransactionRecord,
  state: NeutronMutationUndoTransactionRecord["state"],
  result?: NeutronMutationUndoExecutionResult,
): Promise<NeutronMutationUndoTransactionRecord | undefined> {
  return transitionUndoTransaction({
    directory,
    expected: current,
    next: {
      ...current,
      state,
      updatedAt: current.updatedAt,
      ...(result === undefined ? {} : { result }),
    },
  });
}
