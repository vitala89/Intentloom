import { resolve } from "node:path";
import type {
  ContinuousLoopCheckpoint,
  ContinuousLoopGate,
  ContinuousLoopOperation,
  ContinuousLoopWorkspaceOverview,
} from "@intentloom/protocol";
import {
  CONTINUOUS_LOOP_OPERATIONS,
  CONTINUOUS_LOOP_WORKSPACE_OVERVIEW_SCHEMA_URN,
  type ContinuousLoopChangeKind,
  type ContinuousLoopSnapshot,
} from "@intentloom/protocol";
import { validateContinuousLoopWorkspaceOverview } from "@intentloom/validator";
import type { FileSystem } from "./index.js";
import {
  applyContinuousLoopMemory,
  draftLoopMemoryProposal,
} from "./continuous-loop-apply.js";
import { compareLoopSnapshots } from "./continuous-loop-compare.js";

export interface PrepareContinuousLoopWorkspaceOptions {
  readonly root: string;
  readonly previous: ContinuousLoopSnapshot;
  readonly current: ContinuousLoopSnapshot;
  readonly projectId?: string;
  readonly changeKind?: ContinuousLoopChangeKind;
  readonly memoryContent?: string;
  readonly applyRequested?: boolean;
  readonly grantedApprovals?: readonly string[];
  readonly now?: () => number;
}

function checkpointsFor(
  gate: ContinuousLoopGate,
): readonly ContinuousLoopCheckpoint[] {
  const blocked =
    gate === "blocked" ||
    gate === "unsupported" ||
    gate === "incompatible" ||
    gate === "w12-blocked" ||
    gate === "validation-failed";
  const status = blocked
    ? "blocked"
    : gate === "accepted"
      ? "passed"
      : "pending";
  return [
    { id: "refresh-assessment", label: "Refresh assessment", status },
    {
      id: "classify-findings",
      label: "Classify resolved and new findings",
      status,
    },
    { id: "propose-memory", label: "Propose project memory", status },
    { id: "review-memory", label: "Review memory update", status },
    { id: "next-feature", label: "Suggest next feature", status },
  ];
}

function nextFeatureFrom(
  newFindingIds: readonly string[],
  changeKind: ContinuousLoopChangeKind,
): { title: string; summary: string } {
  if (newFindingIds.length > 0) {
    return {
      title: `Address ${newFindingIds[0]}`,
      summary: `Next feature should close ${newFindingIds.length} new finding(s) without treating policy or model shifts as code.`,
    };
  }
  return {
    title: "Continue from refreshed assessment",
    summary: `No new findings. Change kind remains ${changeKind}.`,
  };
}

export async function prepareContinuousLoopWorkspace(
  options: PrepareContinuousLoopWorkspaceOptions,
  fs: FileSystem,
): Promise<ContinuousLoopWorkspaceOverview> {
  const root = resolve(options.root);
  if (root.length === 0) {
    throw new Error("root must be a non-empty string");
  }
  const projectId = options.projectId ?? options.current.projectId;
  const preparedAt = options.now ? options.now() : Date.now();
  const comparison = compareLoopSnapshots(
    options.previous,
    options.current,
    options.changeKind,
  );
  const diagnostics: string[] = [];
  let gate: ContinuousLoopGate = "ready";
  if (!comparison.compatible) {
    gate = "incompatible";
    diagnostics.push("historical-incompatible:schema-or-project");
  } else if (comparison.changeKind === "model-interpretation") {
    gate = "unsupported";
    diagnostics.push("model-interpretation-not-auto-accepted");
  }
  const draft = draftLoopMemoryProposal({
    projectId,
    content:
      options.memoryContent ??
      `Loop refresh: ${comparison.fixedFindingIds.length} fixed, ${comparison.newFindingIds.length} new, kind ${comparison.changeKind}.`,
  });
  const applyRequested = options.applyRequested === true && gate === "ready";
  if (options.applyRequested === true && gate !== "ready") {
    diagnostics.push("apply-blocked:loop-not-ready");
  }
  const applied = await applyContinuousLoopMemory({
    root,
    projectId,
    proposal: draft,
    applyRequested,
    grantedApprovals: options.grantedApprovals ?? [],
    fs,
    now: () => preparedAt,
  });
  if (applied.apply.attempted && !applied.apply.applied) {
    diagnostics.push(...applied.apply.diagnostics);
    if (gate === "ready") gate = "w12-blocked";
  }
  if (applied.apply.applied) gate = "accepted";
  return validateContinuousLoopWorkspaceOverview({
    schemaVersion: CONTINUOUS_LOOP_WORKSPACE_OVERVIEW_SCHEMA_URN,
    root,
    projectId,
    preparedAt,
    loopGate: gate,
    mutationAllowed: gate === "accepted",
    comparison,
    memoryProposal: applied.proposal,
    memoryApply: applied.apply,
    nextFeature: nextFeatureFrom(
      comparison.newFindingIds,
      comparison.changeKind,
    ),
    checkpoints: checkpointsFor(gate),
    diagnostics,
  });
}

export function listContinuousLoopOperations(): readonly ContinuousLoopOperation[] {
  return CONTINUOUS_LOOP_OPERATIONS;
}
