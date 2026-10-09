import type { FileSystem } from "../../../index.js";
import type { NeutronMutationUndoExecutionResult } from "../../../../../protocol/src/neutron/mutation/undo/neutron-mutation-undo-execution.js";
import type { NeutronMutationUndoRequest } from "../../../../../protocol/src/neutron/mutation/undo/neutron-mutation-undo-request.js";
import type { NeutronMutationUndoPathProjection } from "../../../../../protocol/src/neutron/mutation/undo/neutron-mutation-undo-result.js";
import { preflightNeutronMutationUndo } from "./neutron-mutation-undo-preflight.js";
import {
  locateUndoApplyRecord,
  undoPreflightIntent,
} from "./neutron-mutation-undo-locate.js";
import {
  loadUndoPlan,
  type NeutronMutationUndoPlan,
} from "./neutron-mutation-undo-plan.js";
import {
  closedUndoExecution,
  executionFromPreflight,
} from "./neutron-mutation-undo-public.js";

export interface ApproveAndUndoNeutronMutationInput {
  readonly directory: string;
  readonly intent: NeutronMutationUndoRequest;
  readonly fs: FileSystem;
  readonly now: number;
  readonly unchangedPathCount: number;
  readonly attempt: number;
  readonly beforeMutation?: () => Promise<void>;
  readonly failAt?: "before-write" | "after-first-mutation" | "rollback";
}

export async function previewUndoExecution(
  input: ApproveAndUndoNeutronMutationInput,
): Promise<
  | {
      readonly kind: "eligible";
      readonly paths: readonly NeutronMutationUndoPathProjection[];
    }
  | {
      readonly kind: "closed";
      readonly result: NeutronMutationUndoExecutionResult;
    }
> {
  const preview = await preflightNeutronMutationUndo({
    directory: input.directory,
    fs: input.fs,
    intent: undoPreflightIntent(input.intent),
  });
  if (preview.outcome !== "eligible" || preview.paths === undefined) {
    return { kind: "closed", result: executionFromPreflight(preview) };
  }
  return { kind: "eligible", paths: preview.paths };
}

export async function reloadUndoPlan(
  input: ApproveAndUndoNeutronMutationInput,
  paths: readonly NeutronMutationUndoPathProjection[],
): Promise<
  | { readonly kind: "ready"; readonly plan: NeutronMutationUndoPlan }
  | {
      readonly kind: "closed";
      readonly result: NeutronMutationUndoExecutionResult;
    }
> {
  const located = await locateUndoApplyRecord(input.directory, input.intent);
  if (located.kind !== "record") {
    return {
      kind: "closed",
      result: closedUndoExecution(input.intent, "integrity-failure", true),
    };
  }
  const loaded = await loadUndoPlan({
    directory: input.directory,
    record: located.record,
    root: input.intent.root,
    proposalId: input.intent.proposalId,
    declaredPaths: paths,
  });
  if (loaded.kind === "ready") return { kind: "ready", plan: loaded.plan };
  const outcome =
    loaded.kind === "unavailable"
      ? "undo-source-unavailable"
      : "integrity-failure";
  return {
    kind: "closed",
    result: closedUndoExecution(input.intent, outcome, true),
  };
}
