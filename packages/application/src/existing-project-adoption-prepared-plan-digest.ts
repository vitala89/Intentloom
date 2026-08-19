import { checksum } from "@intentloom/core";
import { deterministicId } from "@intentloom/core/adoption";
import { canonicalJson } from "./canonical-json.js";
import type {
  AdoptionPreparedPlanAction,
  ExistingProjectAdoptionPreparedPlan,
  SelectedAdoptionDecision,
} from "@intentloom/protocol";

export interface ExistingProjectAdoptionDigestInput {
  readonly root: string;
  readonly projectId: string;
  readonly profile: string;
  readonly workspaceTopology: string;
  readonly detectedAdapters: readonly string[];
  readonly previewIdentity: string;
  readonly projectFingerprint: string;
  readonly decisions: readonly SelectedAdoptionDecision[];
  readonly affectedPaths: readonly string[];
  readonly plannedActions: readonly AdoptionPreparedPlanAction[];
  readonly diagnostics: readonly string[];
  readonly remainingManualDecisionPaths: readonly string[];
}

function sortedStrings(values: readonly string[]): readonly string[] {
  return [...values].sort((left, right) => left.localeCompare(right));
}

export function normalizeExistingProjectAdoptionDigestInput(
  input: ExistingProjectAdoptionDigestInput,
): ExistingProjectAdoptionDigestInput {
  return {
    root: input.root,
    projectId: input.projectId,
    profile: input.profile,
    workspaceTopology: input.workspaceTopology,
    detectedAdapters: sortedStrings(input.detectedAdapters),
    previewIdentity: input.previewIdentity,
    projectFingerprint: input.projectFingerprint,
    decisions: [...input.decisions].sort((left, right) =>
      left.path.localeCompare(right.path),
    ),
    affectedPaths: sortedStrings(input.affectedPaths),
    plannedActions: [...input.plannedActions].sort((left, right) =>
      left.path.localeCompare(right.path),
    ),
    diagnostics: sortedStrings(input.diagnostics),
    remainingManualDecisionPaths: sortedStrings(
      input.remainingManualDecisionPaths,
    ),
  };
}

export function computeExistingProjectAdoptionPlanDigest(
  input: ExistingProjectAdoptionDigestInput,
): string {
  return checksum(
    canonicalJson(normalizeExistingProjectAdoptionDigestInput(input)),
  );
}

export function computeExistingProjectAdoptionPreparedPlanId(
  planDigest: string,
): string {
  return deterministicId("prepared-plan", { planDigest });
}

export function digestInputFromPreparedPlan(
  plan: ExistingProjectAdoptionPreparedPlan,
): ExistingProjectAdoptionDigestInput {
  return {
    root: plan.root,
    projectId: plan.projectId,
    profile: plan.profile,
    workspaceTopology: plan.workspaceTopology,
    detectedAdapters: plan.detectedAdapters,
    previewIdentity: plan.previewIdentity,
    projectFingerprint: plan.projectFingerprint,
    decisions: plan.decisions,
    affectedPaths: plan.affectedPaths,
    plannedActions: plan.plannedActions,
    diagnostics: plan.diagnostics,
    remainingManualDecisionPaths: plan.remainingManualDecisionPaths,
  };
}
