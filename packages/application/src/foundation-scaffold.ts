import { createHash } from "node:crypto";
import type {
  FoundationScaffoldCompareResult,
  FoundationScaffoldGetResult,
  FoundationScaffoldPlanRecord,
  FoundationScaffoldPrepareResult,
  FoundationScaffoldValidateResult,
  ProjectBlueprint,
  ScaffoldPlan,
} from "@intentloom/protocol";
import {
  FOUNDATION_SCAFFOLD_COMPARE_SCHEMA_URN,
  FOUNDATION_SCAFFOLD_GET_SCHEMA_URN,
  FOUNDATION_SCAFFOLD_PLAN_SCHEMA_URN,
  FOUNDATION_SCAFFOLD_PREPARE_SCHEMA_URN,
  FOUNDATION_SCAFFOLD_VALIDATE_SCHEMA_URN,
} from "@intentloom/protocol";
import {
  validateFoundationScaffoldCompareResult,
  validateFoundationScaffoldGetResult,
  validateFoundationScaffoldPlanRecord,
  validateFoundationScaffoldPrepareResult,
  validateFoundationScaffoldValidateResult,
} from "@intentloom/validator";
import { getFoundationBlueprintApproval } from "./foundation-blueprint-store.js";
import { proposeFoundationBlueprints } from "./foundation-blueprint.js";
import { getFoundationWorkshop } from "./foundation-workshop.js";
import {
  diffScaffoldPlan,
  formatScaffoldPlanDryRun,
  prepareProjectScaffoldPlan,
} from "./inception-scaffold-planner.js";
import { validateWorkspaceScaffoldPlan } from "./inception-workspace-scaffold-validation.js";
import {
  clearFoundationScaffoldPlans,
  getFoundationScaffoldPlan,
  setFoundationScaffoldPlan,
} from "./foundation-scaffold-store.js";

const REQUIRED_CAPABILITIES = ["filesystem.write", "scaffold.apply"] as const;

function computePlanDigest(plan: ScaffoldPlan): string {
  const payload = JSON.stringify({
    root: plan.root,
    blueprintDigest: plan.blueprintDigest,
    files: plan.files.map((file) => ({
      path: file.path,
      action: file.action,
      content: file.content,
      isManaged: file.isManaged,
    })),
    dependencies: [...plan.dependencies].sort(),
    scripts: Object.keys(plan.scripts)
      .sort()
      .reduce<Record<string, string>>((acc, key) => {
        acc[key] = plan.scripts[key] ?? "";
        return acc;
      }, {}),
  });
  return createHash("sha256").update(payload).digest("hex");
}

function verificationChecksFor(plan: ScaffoldPlan): readonly string[] {
  const checks = Object.keys(plan.scripts)
    .sort()
    .map((script) => `script:${script}`);
  if (plan.dependencies.includes("typescript")) {
    return [...checks, "typecheck:tsc"];
  }
  return checks;
}

function templateVersionsFor(
  blueprint: ProjectBlueprint,
): FoundationScaffoldPlanRecord["templateVersions"] {
  if (blueprint.topology === "pnpm-workspace") {
    return [{ id: "typescript-pnpm-workspace-starter", version: "1" }];
  }
  return [{ id: "typescript-library-starter", version: "1" }];
}

function requireApprovedBlueprint(workshopId: string): {
  readonly blueprint: ProjectBlueprint;
  readonly expiresAt: number;
  readonly approvedAt: number;
} {
  const approval = getFoundationBlueprintApproval(workshopId);
  if (!approval || approval.approval.status !== "approved") {
    throw new Error(
      `Foundation scaffold requires an approved blueprint for workshop '${workshopId}'`,
    );
  }
  if (Date.now() > approval.approval.expiry) {
    throw new Error(
      `Foundation blueprint approval for workshop '${workshopId}' has expired`,
    );
  }
  const proposal = proposeFoundationBlueprints(workshopId);
  const candidate = [...proposal.alternatives, proposal.recommended].find(
    (entry) => entry.tier === approval.tier,
  );
  if (!candidate) {
    throw new Error(
      `Approved blueprint tier '${approval.tier}' is no longer available`,
    );
  }
  if (candidate.blueprint.digest !== approval.approval.blueprintDigest) {
    throw new Error(
      "Approved blueprint digest no longer matches the current proposal",
    );
  }
  return {
    blueprint: candidate.blueprint,
    expiresAt: approval.approval.expiry,
    approvedAt: approval.approval.approvedAt,
  };
}

function requireStoredPlan(
  workshopId: string,
  planId: string,
): FoundationScaffoldPlanRecord {
  const record = getFoundationScaffoldPlan(workshopId, planId);
  if (!record) {
    throw new Error(
      `No scaffold plan '${planId}' found for workshop '${workshopId}'`,
    );
  }
  return record;
}

export function prepareProjectScaffold(
  workshopId: string,
  root?: string,
): FoundationScaffoldPrepareResult {
  const before = getFoundationWorkshop(workshopId);
  const approved = requireApprovedBlueprint(workshopId);
  const targetRoot = root?.trim() || before.root;
  const drafted = prepareProjectScaffoldPlan(approved.blueprint, targetRoot);
  const planId = `scaffold_${approved.blueprint.digest.slice(0, 16)}`;
  const plan: ScaffoldPlan = {
    ...drafted,
    planId,
    createdAt: approved.approvedAt,
  };
  if (approved.blueprint.topology === "pnpm-workspace") {
    const workspaceValidation = validateWorkspaceScaffoldPlan(plan);
    if (!workspaceValidation.valid) {
      throw new Error(
        `Invalid workspace scaffold plan: ${workspaceValidation.violations.join("; ")}`,
      );
    }
  }
  const record = validateFoundationScaffoldPlanRecord({
    schemaVersion: FOUNDATION_SCAFFOLD_PLAN_SCHEMA_URN,
    workshopId,
    plan,
    planDigest: computePlanDigest(plan),
    expiresAt: approved.expiresAt,
    verificationChecks: verificationChecksFor(plan),
    requiredCapabilities: [...REQUIRED_CAPABILITIES],
    templateVersions: templateVersionsFor(approved.blueprint),
    dryRun: formatScaffoldPlanDryRun(plan),
  });
  setFoundationScaffoldPlan(record);

  const result: FoundationScaffoldPrepareResult = {
    schemaVersion: FOUNDATION_SCAFFOLD_PREPARE_SCHEMA_URN,
    workshopId,
    record,
    workshopUnchanged: true,
  };
  validateFoundationScaffoldPrepareResult(result);
  const after = getFoundationWorkshop(workshopId);
  if (JSON.stringify(before) !== JSON.stringify(after)) {
    throw new Error(
      "foundation scaffold prepare must not mutate workshop state",
    );
  }
  return result;
}

export function getProjectScaffoldPlan(
  workshopId: string,
  planId: string,
): FoundationScaffoldGetResult {
  getFoundationWorkshop(workshopId);
  const record = requireStoredPlan(workshopId, planId);
  return validateFoundationScaffoldGetResult({
    schemaVersion: FOUNDATION_SCAFFOLD_GET_SCHEMA_URN,
    workshopId,
    record,
  });
}

export function compareProjectScaffoldPlan(
  workshopId: string,
  planId: string,
  existingPaths: readonly string[] = [],
): FoundationScaffoldCompareResult {
  getFoundationWorkshop(workshopId);
  const record = requireStoredPlan(workshopId, planId);
  const diff = diffScaffoldPlan(record.plan, existingPaths);
  return validateFoundationScaffoldCompareResult({
    schemaVersion: FOUNDATION_SCAFFOLD_COMPARE_SCHEMA_URN,
    workshopId,
    planId,
    created: diff.created,
    skipped: diff.skipped,
    collisions: diff.collisions,
  });
}

export function validateProjectScaffoldPlan(
  workshopId: string,
  planId: string,
): FoundationScaffoldValidateResult {
  getFoundationWorkshop(workshopId);
  requireApprovedBlueprint(workshopId);
  const record = requireStoredPlan(workshopId, planId);
  if (Date.now() > record.expiresAt) {
    throw new Error(`Scaffold plan '${planId}' has expired`);
  }
  const recomputed = computePlanDigest(record.plan);
  if (recomputed !== record.planDigest) {
    throw new Error(`Scaffold plan '${planId}' digest mismatch`);
  }
  return validateFoundationScaffoldValidateResult({
    schemaVersion: FOUNDATION_SCAFFOLD_VALIDATE_SCHEMA_URN,
    workshopId,
    planId,
    valid: true,
    planDigest: record.planDigest,
    approvalRequired: true,
    expiresAt: record.expiresAt,
  });
}

export function clearFoundationScaffoldStore(): void {
  clearFoundationScaffoldPlans();
}

export { getFoundationScaffoldPlan };
