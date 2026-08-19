import { resolve } from "node:path";
import {
  EXISTING_PROJECT_ADOPTION_PREPARED_PLAN_SCHEMA_VERSION,
  EXISTING_PROJECT_ADOPTION_PREPARED_PLAN_TTL_MS,
  parseExistingProjectAdoptionPrepareViewModel,
  type AdoptionPreparedPlanReason,
  type ExistingProjectAdoptionPreparedPlan,
  type ExistingProjectAdoptionPrepareViewModel,
  type SelectedAdoptionDecision,
} from "@intentloom/protocol";
import type { FileSystem } from "./index.js";
import { validateExistingProjectAdoptionDecisions } from "./existing-project-adoption-decisions.js";
import { prepareExistingProjectAdoptionPlan } from "./existing-project-adoption-plan.js";
import { computeExistingProjectAdoptionFingerprint } from "./existing-project-adoption-project-fingerprint.js";
import {
  computeExistingProjectAdoptionPlanDigest,
  computeExistingProjectAdoptionPreparedPlanId,
} from "./existing-project-adoption-prepared-plan-digest.js";

export interface PrepareExistingProjectAdoptionPreparedPlanOptions {
  readonly root: string;
  readonly previewIdentity: string;
  readonly projectId?: string;
  readonly decisions: readonly SelectedAdoptionDecision[];
  readonly now?: () => number;
}

export function adoptionPreparedPlanClock(now?: () => number): number {
  return now?.() ?? Date.now();
}

export function adoptionPreparedPlanDecisionReasons(
  validated: Awaited<
    ReturnType<typeof validateExistingProjectAdoptionDecisions>
  >,
): AdoptionPreparedPlanReason[] {
  const reasons: AdoptionPreparedPlanReason[] = [];
  if (validated.stalePreview) reasons.push("stale-preview");
  for (const evaluation of validated.evaluations) {
    if (evaluation.reason === "duplicate-decision") {
      reasons.push("duplicate-decision");
    } else if (evaluation.reason === "unsupported-decision") {
      reasons.push("unsupported-decision");
    } else if (evaluation.status === "invalid") {
      reasons.push("invalid-decisions");
    }
  }
  return [...new Set(reasons)];
}

export async function liveExistingProjectAdoptionPreparedPlanState(
  root: string,
  projectId: string | undefined,
  decisions: readonly SelectedAdoptionDecision[],
  fs: FileSystem,
): Promise<{
  fingerprint: string;
  preview: Awaited<ReturnType<typeof prepareExistingProjectAdoptionPlan>>;
  validated: Awaited<
    ReturnType<typeof validateExistingProjectAdoptionDecisions>
  >;
}> {
  const preview = await prepareExistingProjectAdoptionPlan(
    {
      root,
      ...(projectId !== undefined ? { projectId } : {}),
    },
    fs,
  );
  const validated = await validateExistingProjectAdoptionDecisions(
    {
      root,
      previewIdentity: preview.previewIdentity,
      decisions,
      ...(projectId !== undefined ? { projectId } : {}),
    },
    fs,
  );
  const paths = [
    ...preview.instructionPaths,
    ...preview.items.map((item) => item.path),
    ...decisions.map((decision) => decision.path),
  ];
  return {
    fingerprint: await computeExistingProjectAdoptionFingerprint(
      root,
      paths,
      fs,
    ),
    preview,
    validated,
  };
}

function plannedActionsFrom(
  validated: Awaited<
    ReturnType<typeof validateExistingProjectAdoptionDecisions>
  >,
  preview: Awaited<ReturnType<typeof prepareExistingProjectAdoptionPlan>>,
) {
  const items = validated.evaluations.some(
    (evaluation) => evaluation.resolvedItem !== null,
  )
    ? validated.evaluations
        .map((evaluation) => evaluation.resolvedItem)
        .filter((item): item is NonNullable<typeof item> => item !== null)
    : preview.items;
  const byPath = new Map(preview.items.map((item) => [item.path, item]));
  for (const item of items) byPath.set(item.path, item);
  return [...byPath.values()]
    .map((item) => ({
      path: item.path,
      action: item.action,
      currentClassification: item.currentClassification,
      proposedClassification: item.proposedClassification,
      manualDecisionRequired: item.manualDecisionRequired,
    }))
    .sort((left, right) => left.path.localeCompare(right.path));
}

export function envelopeFromLiveExistingProjectAdoptionPreparedPlan(input: {
  readonly root: string;
  readonly preview: Awaited<
    ReturnType<typeof prepareExistingProjectAdoptionPlan>
  >;
  readonly validated: Awaited<
    ReturnType<typeof validateExistingProjectAdoptionDecisions>
  >;
  readonly decisions: readonly SelectedAdoptionDecision[];
  readonly fingerprint: string;
  readonly createdAt: number;
  readonly expiresAt: number;
}): ExistingProjectAdoptionPreparedPlan {
  const plannedActions = plannedActionsFrom(input.validated, input.preview);
  const digestInput = {
    root: input.root,
    projectId: input.preview.projectId,
    profile: input.preview.profile,
    workspaceTopology: input.preview.workspaceTopology,
    detectedAdapters: input.preview.detectedAdapters,
    previewIdentity: input.preview.previewIdentity,
    projectFingerprint: input.fingerprint,
    decisions: input.decisions,
    affectedPaths: plannedActions.map((action) => action.path),
    plannedActions,
    diagnostics: input.preview.diagnostics,
    remainingManualDecisionPaths: input.validated.remainingManualDecisionPaths,
  };
  const planDigest = computeExistingProjectAdoptionPlanDigest(digestInput);
  return {
    schemaVersion: EXISTING_PROJECT_ADOPTION_PREPARED_PLAN_SCHEMA_VERSION,
    readOnly: true,
    classification: "read-only",
    applied: false,
    changesApplied: 0,
    approved: false,
    root: input.root,
    projectId: input.preview.projectId,
    profile: input.preview.profile,
    workspaceTopology: input.preview.workspaceTopology,
    detectedAdapters: [...input.preview.detectedAdapters].sort((left, right) =>
      left.localeCompare(right),
    ),
    previewIdentity: input.preview.previewIdentity,
    preparedPlanId: computeExistingProjectAdoptionPreparedPlanId(planDigest),
    planDigest,
    projectFingerprint: input.fingerprint,
    createdAt: input.createdAt,
    expiresAt: input.expiresAt,
    decisions: [...input.decisions].sort((left, right) =>
      left.path.localeCompare(right.path),
    ),
    affectedPaths: digestInput.affectedPaths,
    plannedActions,
    diagnostics: [...input.preview.diagnostics].sort((left, right) =>
      left.localeCompare(right),
    ),
    remainingManualDecisionPaths: [
      ...input.validated.remainingManualDecisionPaths,
    ].sort((left, right) => left.localeCompare(right)),
  };
}

export async function prepareExistingProjectAdoptionPreparedPlan(
  options: PrepareExistingProjectAdoptionPreparedPlanOptions,
  fs: FileSystem,
): Promise<ExistingProjectAdoptionPrepareViewModel> {
  const root = resolve(options.root);
  if (await fs.isSymbolicLink(root)) {
    throw new Error(
      "adoption prepare requires a non-symbolic explicit project root",
    );
  }
  const live = await liveExistingProjectAdoptionPreparedPlanState(
    root,
    options.projectId,
    options.decisions,
    fs,
  );
  const reasons = adoptionPreparedPlanDecisionReasons({
    ...live.validated,
    stalePreview:
      live.validated.stalePreview ||
      options.previewIdentity !== live.preview.previewIdentity,
  });
  if (reasons.length > 0 || live.preview.applied || live.validated.applied) {
    return parseExistingProjectAdoptionPrepareViewModel({
      readOnly: true,
      classification: "read-only",
      applied: false,
      changesApplied: 0,
      approved: false,
      status: "invalid",
      reasons: reasons.length > 0 ? reasons : ["invalid-decisions"],
      plan: null,
    });
  }
  const createdAt = adoptionPreparedPlanClock(options.now);
  const plan = envelopeFromLiveExistingProjectAdoptionPreparedPlan({
    root,
    preview: live.preview,
    validated: live.validated,
    decisions: options.decisions,
    fingerprint: live.fingerprint,
    createdAt,
    expiresAt: createdAt + EXISTING_PROJECT_ADOPTION_PREPARED_PLAN_TTL_MS,
  });
  return parseExistingProjectAdoptionPrepareViewModel({
    readOnly: true,
    classification: "read-only",
    applied: false,
    changesApplied: 0,
    approved: false,
    status: "prepared",
    reasons: [],
    plan,
  });
}
