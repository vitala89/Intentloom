import { resolve } from "node:path";
import { checksum } from "@intentloom/core";
import { deterministicId } from "@intentloom/core/adoption";
import {
  EXISTING_PROJECT_ADOPTION_APPROVAL_SCHEMA_VERSION,
  EXISTING_PROJECT_ADOPTION_APPROVAL_SOURCE,
  parseExistingProjectAdoptionApproveViewModel,
  type AdoptionPreparedPlanReason,
  type ExistingProjectAdoptionApproval,
  type ExistingProjectAdoptionApproveViewModel,
  type ExistingProjectAdoptionPreparedPlan,
} from "@intentloom/protocol";
import type { FileSystem } from "./index.js";
import { canonicalJson } from "./canonical-json.js";
import { adoptionPreparedPlanClock } from "./existing-project-adoption-prepared-plan.js";
import { revalidateExistingProjectAdoptionPreparedPlan } from "./existing-project-adoption-prepared-plan-revalidate.js";

export interface ApproveExistingProjectAdoptionPreparedPlanOptions {
  readonly root: string;
  readonly preparedPlanId: string;
  readonly planDigest: string;
  readonly preparedPlan: ExistingProjectAdoptionPreparedPlan;
  readonly now?: () => number;
}

function approvalTokenFor(planDigest: string): string {
  return `approved:${planDigest}`;
}

function buildApproval(input: {
  readonly plan: ExistingProjectAdoptionPreparedPlan;
  readonly approvedAt: number;
}): ExistingProjectAdoptionApproval {
  const approvalValidUntil = input.plan.expiresAt;
  const unsigned = {
    schemaVersion:
      EXISTING_PROJECT_ADOPTION_APPROVAL_SCHEMA_VERSION as typeof EXISTING_PROJECT_ADOPTION_APPROVAL_SCHEMA_VERSION,
    readOnly: true as const,
    classification: "read-only" as const,
    approved: true as const,
    applied: false as const,
    changesApplied: 0 as const,
    approvalId: deterministicId("adoption-approval", {
      preparedPlanId: input.plan.preparedPlanId,
      planDigest: input.plan.planDigest,
      approvedAt: input.approvedAt,
    }),
    approvalSource: EXISTING_PROJECT_ADOPTION_APPROVAL_SOURCE,
    approvalToken: approvalTokenFor(input.plan.planDigest),
    root: input.plan.root,
    previewIdentity: input.plan.previewIdentity,
    preparedPlanId: input.plan.preparedPlanId,
    planDigest: input.plan.planDigest,
    projectFingerprint: input.plan.projectFingerprint,
    approvedAt: input.approvedAt,
    approvalValidUntil,
    preparedPlanExpiresAt: input.plan.expiresAt,
  };
  return {
    ...unsigned,
    approvalDigest: checksum(canonicalJson(unsigned)),
  };
}

export async function approveExistingProjectAdoptionPreparedPlan(
  options: ApproveExistingProjectAdoptionPreparedPlanOptions,
  fs: FileSystem,
): Promise<ExistingProjectAdoptionApproveViewModel> {
  const root = resolve(options.root);
  if (await fs.isSymbolicLink(root)) {
    throw new Error(
      "adoption approve requires a non-symbolic explicit project root",
    );
  }
  const plan = options.preparedPlan;
  const reasons: AdoptionPreparedPlanReason[] = [];
  if (options.preparedPlanId !== plan.preparedPlanId) {
    reasons.push("tampered-plan-id");
  }
  if (options.planDigest !== plan.planDigest) {
    reasons.push("tampered-digest");
  }
  const revalidated = await revalidateExistingProjectAdoptionPreparedPlan(
    {
      root,
      preparedPlan: plan,
      ...(options.now !== undefined ? { now: options.now } : {}),
    },
    fs,
  );
  reasons.push(...revalidated.reasons);
  if (plan.remainingManualDecisionPaths.length > 0) {
    reasons.push("invalid-decisions");
  }
  const uniqueReasons = [...new Set(reasons)];
  const allowed =
    uniqueReasons.length === 0 &&
    revalidated.status === "valid" &&
    options.preparedPlanId === plan.preparedPlanId &&
    options.planDigest === plan.planDigest;
  if (!allowed) {
    return parseExistingProjectAdoptionApproveViewModel({
      readOnly: true,
      classification: "read-only",
      applied: false,
      changesApplied: 0,
      approved: false,
      status: "denied",
      reasons: uniqueReasons.length > 0 ? uniqueReasons : ["invalid-decisions"],
      approval: null,
      plan,
    });
  }
  const approvedAt = adoptionPreparedPlanClock(options.now);
  if (approvedAt > plan.expiresAt) {
    return parseExistingProjectAdoptionApproveViewModel({
      readOnly: true,
      classification: "read-only",
      applied: false,
      changesApplied: 0,
      approved: false,
      status: "denied",
      reasons: ["expired"],
      approval: null,
      plan,
    });
  }
  return parseExistingProjectAdoptionApproveViewModel({
    readOnly: true,
    classification: "read-only",
    applied: false,
    changesApplied: 0,
    approved: true,
    status: "approved",
    reasons: [],
    approval: buildApproval({ plan, approvedAt }),
    plan,
  });
}
