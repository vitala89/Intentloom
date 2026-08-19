import { dirname, resolve, sep } from "node:path";
import {
  EXISTING_PROJECT_ADOPTION_APPROVAL_SOURCE,
  EXISTING_PROJECT_ADOPTION_PREPARED_PLAN_SCHEMA_VERSION,
  isAdoptionPreparedPlanReason,
  type AdoptionApplyReason,
  type ExistingProjectAdoptionApproval,
  type ExistingProjectAdoptionPreparedPlan,
} from "@intentloom/protocol";
import type { FileSystem } from "./index.js";
import { inspectProject } from "./index.js";
import {
  spreadExistingProjectAdoptionGeneration,
  type ExistingProjectAdoptionGenerationOptions,
} from "./existing-project-adoption-generation.js";
import { adoptionPreparedPlanClock } from "./existing-project-adoption-prepared-plan.js";
import { revalidateExistingProjectAdoptionPreparedPlan } from "./existing-project-adoption-prepared-plan-revalidate.js";
import { expectedExistingProjectAdoptionApprovalIntegrity } from "./existing-project-adoption-approval.js";

export interface ExistingProjectAdoptionApplyGateInput extends ExistingProjectAdoptionGenerationOptions {
  readonly root: string;
  readonly preparedPlanId: string;
  readonly planDigest: string;
  readonly preparedPlan: ExistingProjectAdoptionPreparedPlan;
  readonly approval: ExistingProjectAdoptionApproval;
  readonly now?: () => number;
}

function contained(root: string, relativePath: string): string | null {
  if (
    relativePath.length === 0 ||
    relativePath.includes("\\") ||
    relativePath.includes("\0") ||
    relativePath.split("/").some((segment) => segment === "..")
  ) {
    return null;
  }
  const target = resolve(root, relativePath);
  const canonicalRoot = resolve(root);
  if (
    target !== canonicalRoot &&
    !target.startsWith(`${canonicalRoot}${sep}`)
  ) {
    return null;
  }
  return target;
}

async function destinationUnsafe(
  root: string,
  relativePath: string,
  fs: FileSystem,
): Promise<boolean> {
  const start = contained(root, relativePath);
  if (start === null) return true;
  let current = start;
  while (true) {
    if (await fs.isSymbolicLink(current)) return true;
    if (current === resolve(root)) return false;
    current = dirname(current);
  }
}

function writeCandidatePaths(
  plan: ExistingProjectAdoptionPreparedPlan,
): readonly string[] {
  return [
    ...new Set([
      ...plan.plannedActions
        .filter(
          (action) =>
            action.action === "create" ||
            action.action === "generated-candidate",
        )
        .map((action) => action.path),
      ".aif/config.yaml",
      ".aif/manifest.lock.json",
      ".aif/source-map.json",
    ]),
  ];
}

export async function evaluateExistingProjectAdoptionApplyGates(
  input: ExistingProjectAdoptionApplyGateInput,
  fs: FileSystem,
): Promise<readonly AdoptionApplyReason[]> {
  const reasons: AdoptionApplyReason[] = [];
  const root = resolve(input.root);
  const plan = input.preparedPlan;
  const approval = input.approval;
  const now = adoptionPreparedPlanClock(input.now);
  if (await fs.isSymbolicLink(root)) {
    return ["symlink-root"];
  }
  if (root !== resolve(approval.root) || root !== resolve(plan.root)) {
    reasons.push("root-mismatch");
  }
  if (
    plan.schemaVersion !==
    EXISTING_PROJECT_ADOPTION_PREPARED_PLAN_SCHEMA_VERSION
  ) {
    reasons.push("unsupported-schema");
  }
  if (now > plan.expiresAt) reasons.push("expired");
  if (now > approval.approvalValidUntil) reasons.push("expired-approval");
  if (approval.preparedPlanId !== plan.preparedPlanId) {
    reasons.push("approval-mismatch");
  }
  if (approval.planDigest !== plan.planDigest)
    reasons.push("approval-mismatch");
  if (input.preparedPlanId !== plan.preparedPlanId) {
    reasons.push("tampered-plan-id");
  }
  if (input.planDigest !== plan.planDigest) reasons.push("tampered-digest");
  if (approval.approvalSource !== EXISTING_PROJECT_ADOPTION_APPROVAL_SOURCE) {
    reasons.push("approval-mismatch");
  }
  const expected = expectedExistingProjectAdoptionApprovalIntegrity({
    plan,
    approval,
  });
  if (
    expected.approvalDigest !== approval.approvalDigest ||
    expected.approvalId !== approval.approvalId
  ) {
    reasons.push("tampered-approval");
  }
  const revalidated = await revalidateExistingProjectAdoptionPreparedPlan(
    {
      root,
      preparedPlan: plan,
      ...spreadExistingProjectAdoptionGeneration(input),
      ...(input.now !== undefined ? { now: input.now } : {}),
    },
    fs,
  );
  for (const reason of revalidated.reasons) {
    if (isAdoptionPreparedPlanReason(reason)) reasons.push(reason);
  }
  if (revalidated.status !== "valid") {
    if (reasons.length === 0) reasons.push("stale-digest");
  }
  if (approval.projectFingerprint !== plan.projectFingerprint) {
    reasons.push("stale-fingerprint");
  }
  if (plan.remainingManualDecisionPaths.length > 0) {
    reasons.push("invalid-decisions");
  }
  const inspection = await inspectProject(root, fs);
  if (inspection.readiness === "partial-metadata") {
    reasons.push("incomplete-rollback");
  }
  for (const path of [...plan.affectedPaths, ...writeCandidatePaths(plan)]) {
    if (contained(root, path) === null) reasons.push("root-mismatch");
  }
  for (const path of writeCandidatePaths(plan)) {
    if (await destinationUnsafe(root, path, fs)) {
      reasons.push("unsafe-destination");
    }
  }
  return [...new Set(reasons)];
}
