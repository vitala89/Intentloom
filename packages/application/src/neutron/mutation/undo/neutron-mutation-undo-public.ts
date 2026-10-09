import type { NeutronMutationUndoPreflightResult } from "../../../../../protocol/src/neutron/mutation/undo/neutron-mutation-undo-result.js";
import {
  assembleNeutronMutationUndoExecutionResult,
  type NeutronMutationUndoExecutionBody,
  type NeutronMutationUndoExecutionOutcome,
  type NeutronMutationUndoExecutionPath,
  type NeutronMutationUndoExecutionResult,
} from "../../../../../protocol/src/neutron/mutation/undo/neutron-mutation-undo-execution.js";
import type { NeutronMutationUndoRequest } from "../../../../../protocol/src/neutron/mutation/undo/neutron-mutation-undo-request.js";
import type { NeutronMutationUndoPlan } from "./neutron-mutation-undo-plan.js";

export function closedUndoExecution(
  intent: Pick<NeutronMutationUndoRequest, "proposalId" | "transactionId">,
  outcome: NeutronMutationUndoExecutionOutcome,
  historicalApplied = false,
): NeutronMutationUndoExecutionResult {
  return finish({
    outcome,
    proposalId: intent.proposalId,
    transactionId: intent.transactionId,
    undone: false,
    verification: "not-run",
    historicalApplied,
    reconciliationRequired: outcome === "reconciliation-required",
    affectedPathCount: 0,
    createdPathCount: 0,
    updatedPathCount: 0,
    unchangedPathCount: 0,
  });
}

export function executionFromPreflight(
  preview: NeutronMutationUndoPreflightResult,
): NeutronMutationUndoExecutionResult {
  if (preview.outcome === "eligible") {
    return closedUndoExecution(
      {
        proposalId: preview.proposalId,
        transactionId: preview.transactionId,
      },
      "integrity-failure",
      preview.historicalApplied,
    );
  }
  const outcome: NeutronMutationUndoExecutionOutcome = preview.outcome;
  return finish({
    outcome,
    proposalId: preview.proposalId,
    transactionId: preview.transactionId,
    undone: false,
    verification: "not-run",
    historicalApplied: preview.historicalApplied,
    reconciliationRequired: outcome === "reconciliation-required",
    affectedPathCount: preview.affectedPathCount,
    createdPathCount: preview.createdPathCount,
    updatedPathCount: preview.updatedPathCount,
    unchangedPathCount: preview.unchangedPathCount,
  });
}

export function undoneExecution(input: {
  readonly intent: NeutronMutationUndoRequest;
  readonly undoTransactionId: string;
  readonly plan: NeutronMutationUndoPlan;
  readonly unchangedPathCount: number;
  readonly outcome?: "undone" | "replay" | "already-undone";
}): NeutronMutationUndoExecutionResult {
  const createdPathCount = input.plan.files.filter(
    (file) => file.effect === "remove-created",
  ).length;
  const updatedPathCount = input.plan.files.length - createdPathCount;
  return finish({
    outcome: input.outcome ?? "undone",
    proposalId: input.intent.proposalId,
    transactionId: input.intent.transactionId,
    undoTransactionId: input.undoTransactionId,
    undone: true,
    verification: "pending",
    historicalApplied: true,
    reconciliationRequired: false,
    affectedPathCount: input.plan.files.length,
    createdPathCount,
    updatedPathCount,
    unchangedPathCount: input.unchangedPathCount,
    paths: executionPaths(input.plan),
  });
}

export function replayExecution(
  stored: NeutronMutationUndoExecutionResult,
  outcome: "replay" | "already-undone",
): NeutronMutationUndoExecutionResult {
  return finish({
    outcome,
    proposalId: stored.proposalId,
    transactionId: stored.transactionId,
    ...(stored.undoTransactionId === undefined
      ? {}
      : { undoTransactionId: stored.undoTransactionId }),
    undone: true,
    verification: "pending",
    historicalApplied: stored.historicalApplied,
    reconciliationRequired: false,
    affectedPathCount: stored.affectedPathCount,
    createdPathCount: stored.createdPathCount,
    updatedPathCount: stored.updatedPathCount,
    unchangedPathCount: stored.unchangedPathCount,
    ...(stored.paths === undefined ? {} : { paths: stored.paths }),
  });
}

function executionPaths(
  plan: NeutronMutationUndoPlan,
): readonly NeutronMutationUndoExecutionPath[] {
  return plan.files.map((file) => ({ path: file.path, effect: file.effect }));
}

function finish(
  body: NeutronMutationUndoExecutionBody,
): NeutronMutationUndoExecutionResult {
  return assembleNeutronMutationUndoExecutionResult(body);
}
