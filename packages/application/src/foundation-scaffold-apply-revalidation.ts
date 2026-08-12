import type {
  BlueprintApproval,
  FoundationScaffoldPlanRecord,
  FoundationScaffoldTemplateVersion,
  ProjectBlueprint,
} from "@intentloom/protocol";
import { INTENTLOOM_VERSION } from "@intentloom/core";
import { satisfiesVersionRange } from "./engineering-quality/semver-range.js";
import { getFoundationBlueprintApproval } from "./foundation-blueprint-store.js";
import { proposeFoundationBlueprints } from "./foundation-blueprint.js";
import { getFoundationWorkshop } from "./foundation-workshop.js";
import { diffScaffoldPlan } from "./inception-scaffold-planner.js";

const MIN_SCAFFOLD_INTENTLOOM_VERSION = ">=1.0.0";

export interface FoundationScaffoldApplyRevalidationInput {
  readonly workshopId: string;
  readonly record: FoundationScaffoldPlanRecord;
  readonly existingPaths?: readonly string[];
  readonly existingFiles?: Record<string, string>;
  readonly grantedCapabilities?: readonly string[];
  readonly rootIsSymlink?: boolean;
  readonly now?: number;
}

function templateVersionsFor(
  blueprint: ProjectBlueprint,
): readonly FoundationScaffoldTemplateVersion[] {
  if (blueprint.topology === "pnpm-workspace") {
    return [{ id: "typescript-pnpm-workspace-starter", version: "1" }];
  }
  return [{ id: "typescript-library-starter", version: "1" }];
}

function requireApprovedBlueprint(workshopId: string): {
  readonly blueprint: ProjectBlueprint;
  readonly approval: BlueprintApproval;
} {
  const approvalRecord = getFoundationBlueprintApproval(workshopId);
  if (!approvalRecord || approvalRecord.approval.status !== "approved") {
    throw new Error(
      `Foundation scaffold apply requires an approved blueprint for workshop '${workshopId}'`,
    );
  }
  const now = Date.now();
  if (now > approvalRecord.approval.expiry) {
    throw new Error(
      `Foundation blueprint approval for workshop '${workshopId}' has expired`,
    );
  }
  const proposal = proposeFoundationBlueprints(workshopId);
  const candidate = [...proposal.alternatives, proposal.recommended].find(
    (entry) => entry.tier === approvalRecord.tier,
  );
  if (!candidate) {
    throw new Error(
      `Approved blueprint tier '${approvalRecord.tier}' is no longer available`,
    );
  }
  if (candidate.blueprint.digest !== approvalRecord.approval.blueprintDigest) {
    throw new Error(
      "Approved blueprint digest no longer matches the current proposal",
    );
  }
  return {
    blueprint: candidate.blueprint,
    approval: approvalRecord.approval,
  };
}

function assertTargetRootIdentity(planRoot: string): void {
  if (planRoot.trim().length === 0) {
    throw new Error("Scaffold apply requires a non-empty target root");
  }
}

function assertEmptyRoot(
  record: FoundationScaffoldPlanRecord,
  existingPaths: readonly string[],
  existingFiles?: Record<string, string>,
): void {
  const diff = diffScaffoldPlan(record.plan, existingPaths);
  if (diff.collisions.length > 0) {
    throw new Error(
      `Scaffold apply requires an empty root; collisions: ${diff.collisions.join(", ")}`,
    );
  }
  if (existingFiles) {
    const occupied = Object.keys(existingFiles).filter((path) =>
      record.plan.files.some(
        (file) => file.path === path && file.action !== "skip",
      ),
    );
    if (occupied.length > 0) {
      throw new Error(
        `Scaffold apply requires an empty root; existing files: ${occupied.join(", ")}`,
      );
    }
  }
}

function assertPathSafety(record: FoundationScaffoldPlanRecord): void {
  for (const file of record.plan.files) {
    const path = file.path;
    if (path.includes("\0")) {
      throw new Error(`Unsafe scaffold path contains null byte: ${path}`);
    }
    if (path.startsWith("/") || path.startsWith("\\")) {
      throw new Error(`Unsafe absolute scaffold path: ${path}`);
    }
    if (path.split("/").some((segment) => segment === "..")) {
      throw new Error(`Unsafe scaffold path traversal: ${path}`);
    }
    if (path.includes("\\")) {
      throw new Error(`Unsafe scaffold path separator: ${path}`);
    }
  }
}

function assertTemplateIntegrity(
  record: FoundationScaffoldPlanRecord,
  blueprint: ProjectBlueprint,
): void {
  const expected = templateVersionsFor(blueprint);
  const actual = [...record.templateVersions].sort((left, right) =>
    left.id.localeCompare(right.id),
  );
  const expectedSorted = [...expected].sort((left, right) =>
    left.id.localeCompare(right.id),
  );
  if (JSON.stringify(actual) !== JSON.stringify(expectedSorted)) {
    throw new Error(
      "Scaffold plan template versions no longer match blueprint",
    );
  }
}

function assertCapabilityGrants(
  record: FoundationScaffoldPlanRecord,
  grantedCapabilities: readonly string[],
): void {
  const granted = new Set(grantedCapabilities);
  for (const required of record.requiredCapabilities) {
    if (!granted.has(required)) {
      throw new Error(`Missing capability grant: ${required}`);
    }
  }
}

function assertIntentloomCompatibility(): void {
  if (
    !satisfiesVersionRange(INTENTLOOM_VERSION, MIN_SCAFFOLD_INTENTLOOM_VERSION)
  ) {
    throw new Error(
      `Intentloom ${INTENTLOOM_VERSION} is incompatible with scaffold apply (${MIN_SCAFFOLD_INTENTLOOM_VERSION})`,
    );
  }
}

export function revalidateFoundationScaffoldApply(
  input: FoundationScaffoldApplyRevalidationInput,
): { readonly approval: BlueprintApproval; readonly revalidatedAt: number } {
  const now = input.now ?? Date.now();
  getFoundationWorkshop(input.workshopId);
  const approved = requireApprovedBlueprint(input.workshopId);
  const record = input.record;

  if (record.plan.blueprintDigest !== approved.blueprint.digest) {
    throw new Error("Scaffold plan blueprint digest does not match approval");
  }
  if (now > record.expiresAt) {
    throw new Error(`Scaffold plan '${record.plan.planId}' has expired`);
  }

  assertTargetRootIdentity(record.plan.root);
  assertEmptyRoot(record, input.existingPaths ?? [], input.existingFiles);
  assertPathSafety(record);
  assertTemplateIntegrity(record, approved.blueprint);
  assertCapabilityGrants(record, input.grantedCapabilities ?? []);
  if (input.rootIsSymlink === true) {
    throw new Error("Scaffold apply rejects symlinked target roots");
  }
  assertIntentloomCompatibility();

  return { approval: approved.approval, revalidatedAt: now };
}
