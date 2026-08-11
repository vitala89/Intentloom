import type {
  FoundationScaffoldCompareResult,
  FoundationScaffoldPrepareResult,
  FoundationScaffoldValidateResult,
  ScaffoldFilePlan,
} from "@intentloom/protocol";
import type { FoundationClientSurfaceState } from "./foundation-client-viewmodel.js";

export interface FoundationScaffoldFileRow {
  readonly path: string;
  readonly action: string;
  readonly ownership: "managed" | "project-owned";
}

export interface FoundationScaffoldPrepareViewModel {
  readonly workshopId: string;
  readonly planId: string;
  readonly root: string;
  readonly planDigest: string;
  readonly blueprintDigest: string;
  readonly expiresAt: number;
  readonly workshopUnchanged: true;
  readonly files: readonly FoundationScaffoldFileRow[];
  readonly dependencies: readonly string[];
  readonly scripts: readonly string[];
  readonly verificationChecks: readonly string[];
  readonly requiredCapabilities: readonly string[];
  readonly templateVersions: readonly string[];
  readonly dryRun: string;
  readonly surfaceState: FoundationClientSurfaceState;
}

export interface FoundationScaffoldCompareViewModel {
  readonly workshopId: string;
  readonly planId: string;
  readonly created: readonly string[];
  readonly skipped: readonly string[];
  readonly collisions: readonly string[];
  readonly surfaceState: FoundationClientSurfaceState;
}

export interface FoundationScaffoldValidateViewModel {
  readonly workshopId: string;
  readonly planId: string;
  readonly valid: true;
  readonly planDigest: string;
  readonly approvalRequired: true;
  readonly expiresAt: number;
  readonly surfaceState: FoundationClientSurfaceState;
}

function mapFile(file: ScaffoldFilePlan): FoundationScaffoldFileRow {
  return {
    path: file.path,
    action: file.action,
    ownership: file.isManaged ? "managed" : "project-owned",
  };
}

export function buildFoundationScaffoldPrepareViewModel(
  prepare: FoundationScaffoldPrepareResult,
  surfaceState: FoundationClientSurfaceState = "ready",
): FoundationScaffoldPrepareViewModel {
  const { record } = prepare;
  return {
    workshopId: prepare.workshopId,
    planId: record.plan.planId,
    root: record.plan.root,
    planDigest: record.planDigest,
    blueprintDigest: record.plan.blueprintDigest,
    expiresAt: record.expiresAt,
    workshopUnchanged: true,
    files: record.plan.files.map(mapFile),
    dependencies: record.plan.dependencies,
    scripts: Object.keys(record.plan.scripts).sort(),
    verificationChecks: record.verificationChecks,
    requiredCapabilities: record.requiredCapabilities,
    templateVersions: record.templateVersions.map(
      (entry) => `${entry.id}@${entry.version}`,
    ),
    dryRun: record.dryRun,
    surfaceState,
  };
}

export function buildFoundationScaffoldCompareViewModel(
  compare: FoundationScaffoldCompareResult,
  surfaceState: FoundationClientSurfaceState = "ready",
): FoundationScaffoldCompareViewModel {
  return {
    workshopId: compare.workshopId,
    planId: compare.planId,
    created: compare.created,
    skipped: compare.skipped,
    collisions: compare.collisions,
    surfaceState,
  };
}

export function buildFoundationScaffoldValidateViewModel(
  validate: FoundationScaffoldValidateResult,
  surfaceState: FoundationClientSurfaceState = "ready",
): FoundationScaffoldValidateViewModel {
  return {
    workshopId: validate.workshopId,
    planId: validate.planId,
    valid: true,
    planDigest: validate.planDigest,
    approvalRequired: true,
    expiresAt: validate.expiresAt,
    surfaceState,
  };
}
