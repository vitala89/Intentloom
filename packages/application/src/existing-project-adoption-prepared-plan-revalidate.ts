import { resolve } from "node:path";
import {
  parseExistingProjectAdoptionRevalidateViewModel,
  type AdoptionPreparedPlanReason,
  type AdoptionPreparedPlanStatus,
  type ExistingProjectAdoptionPreparedPlan,
  type ExistingProjectAdoptionRevalidateViewModel,
} from "@intentloom/protocol";
import type { FileSystem } from "./index.js";
import type { ExistingProjectAdoptionGenerationOptions } from "./existing-project-adoption-generation.js";
import {
  adoptionPreparedPlanClock,
  adoptionPreparedPlanDecisionReasons,
  envelopeFromLiveExistingProjectAdoptionPreparedPlan,
  liveExistingProjectAdoptionPreparedPlanState,
} from "./existing-project-adoption-prepared-plan.js";
import {
  computeExistingProjectAdoptionPlanDigest,
  computeExistingProjectAdoptionPreparedPlanId,
  digestInputFromPreparedPlan,
} from "./existing-project-adoption-prepared-plan-digest.js";

export interface RevalidateExistingProjectAdoptionPreparedPlanOptions extends ExistingProjectAdoptionGenerationOptions {
  readonly root: string;
  readonly preparedPlan: ExistingProjectAdoptionPreparedPlan;
  readonly now?: () => number;
}

function statusFor(
  reasons: readonly AdoptionPreparedPlanReason[],
): AdoptionPreparedPlanStatus {
  if (
    reasons.some(
      (reason) =>
        reason === "tampered-digest" ||
        reason === "tampered-plan-id" ||
        reason === "unsupported-decision" ||
        reason === "duplicate-decision" ||
        reason === "invalid-decisions",
    )
  ) {
    return "invalid";
  }
  if (reasons.includes("expired")) return "expired";
  if (
    reasons.some(
      (reason) =>
        reason === "stale-fingerprint" ||
        reason === "stale-preview" ||
        reason === "stale-digest" ||
        reason === "root-mismatch" ||
        reason === "project-id-mismatch" ||
        reason === "decisions-changed" ||
        reason === "proposal-changed",
    )
  ) {
    return "stale";
  }
  if (reasons.includes("blocked-diagnostics")) return "blocked";
  return "valid";
}

export async function revalidateExistingProjectAdoptionPreparedPlan(
  options: RevalidateExistingProjectAdoptionPreparedPlanOptions,
  fs: FileSystem,
): Promise<ExistingProjectAdoptionRevalidateViewModel> {
  const root = resolve(options.root);
  const plan = options.preparedPlan;
  const reasons: AdoptionPreparedPlanReason[] = [];
  const expectedDigest = computeExistingProjectAdoptionPlanDigest(
    digestInputFromPreparedPlan(plan),
  );
  if (expectedDigest !== plan.planDigest) reasons.push("tampered-digest");
  if (
    computeExistingProjectAdoptionPreparedPlanId(expectedDigest) !==
    plan.preparedPlanId
  ) {
    reasons.push("tampered-plan-id");
  }
  if (adoptionPreparedPlanClock(options.now) > plan.expiresAt) {
    reasons.push("expired");
  }
  if (root !== resolve(plan.root)) reasons.push("root-mismatch");
  const live = await liveExistingProjectAdoptionPreparedPlanState(
    root,
    plan.projectId,
    plan.decisions,
    fs,
    options,
  );
  if (live.preview.projectId !== plan.projectId) {
    reasons.push("project-id-mismatch");
  }
  if (live.preview.previewIdentity !== plan.previewIdentity) {
    reasons.push("stale-preview");
    reasons.push("proposal-changed");
  }
  if (live.fingerprint !== plan.projectFingerprint) {
    reasons.push("stale-fingerprint");
  }
  const decisionDrift = adoptionPreparedPlanDecisionReasons(live.validated);
  reasons.push(...decisionDrift);
  if (
    JSON.stringify(live.validated.evaluations.map((item) => item.kind)) !==
      JSON.stringify(plan.decisions.map((item) => item.kind)) ||
    live.validated.decisionsPrepared !== plan.decisions.length
  ) {
    if (decisionDrift.length === 0) reasons.push("decisions-changed");
  }
  const livePlan = envelopeFromLiveExistingProjectAdoptionPreparedPlan({
    root,
    preview: live.preview,
    validated: live.validated,
    decisions: plan.decisions,
    fingerprint: live.fingerprint,
    createdAt: plan.createdAt,
    expiresAt: plan.expiresAt,
  });
  if (
    livePlan.planDigest !== plan.planDigest &&
    !reasons.includes("stale-digest")
  ) {
    reasons.push("stale-digest");
  }
  if (
    live.preview.diagnostics.some((diagnostic) =>
      diagnostic.includes("mapping invalid:"),
    )
  ) {
    reasons.push("blocked-diagnostics");
  }
  const uniqueReasons = [...new Set(reasons)];
  return parseExistingProjectAdoptionRevalidateViewModel({
    readOnly: true,
    classification: "read-only",
    applied: false,
    changesApplied: 0,
    approved: false,
    status: statusFor(uniqueReasons),
    reasons: uniqueReasons,
    plan,
  });
}
