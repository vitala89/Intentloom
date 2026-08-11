import type {
  FoundationScaffoldCompareResult,
  FoundationScaffoldPrepareResult,
  FoundationScaffoldValidateResult,
} from "@intentloom/protocol";

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
}

export interface FoundationScaffoldCompareViewModel {
  readonly workshopId: string;
  readonly planId: string;
  readonly created: readonly string[];
  readonly skipped: readonly string[];
  readonly collisions: readonly string[];
}

export interface FoundationScaffoldValidateViewModel {
  readonly workshopId: string;
  readonly planId: string;
  readonly valid: true;
  readonly planDigest: string;
  readonly approvalRequired: true;
  readonly expiresAt: number;
}

export function buildScaffoldPrepareProgress(
  payload: unknown,
): FoundationScaffoldPrepareViewModel {
  const prepare = payload as FoundationScaffoldPrepareResult;
  if (typeof prepare !== "object" || prepare === null || !prepare.record) {
    throw new Error("Invalid foundation scaffold prepare viewmodel");
  }
  const { record } = prepare;
  return {
    workshopId: prepare.workshopId,
    planId: record.plan.planId,
    root: record.plan.root,
    planDigest: record.planDigest,
    blueprintDigest: record.plan.blueprintDigest,
    expiresAt: record.expiresAt,
    workshopUnchanged: true,
    files: record.plan.files.map((file) => ({
      path: file.path,
      action: file.action,
      ownership: file.isManaged ? "managed" : "project-owned",
    })),
    dependencies: record.plan.dependencies,
    scripts: Object.keys(record.plan.scripts).sort(),
    verificationChecks: record.verificationChecks,
    requiredCapabilities: record.requiredCapabilities,
    templateVersions: record.templateVersions.map(
      (entry) => `${entry.id}@${entry.version}`,
    ),
  };
}

export function buildScaffoldCompareProgress(
  payload: unknown,
): FoundationScaffoldCompareViewModel {
  const compare = payload as FoundationScaffoldCompareResult;
  if (typeof compare !== "object" || compare === null) {
    throw new Error("Invalid foundation scaffold compare viewmodel");
  }
  return {
    workshopId: compare.workshopId,
    planId: compare.planId,
    created: compare.created,
    skipped: compare.skipped,
    collisions: compare.collisions,
  };
}

export function buildScaffoldValidateProgress(
  payload: unknown,
): FoundationScaffoldValidateViewModel {
  const validate = payload as FoundationScaffoldValidateResult;
  if (typeof validate !== "object" || validate === null) {
    throw new Error("Invalid foundation scaffold validate viewmodel");
  }
  return {
    workshopId: validate.workshopId,
    planId: validate.planId,
    valid: true,
    planDigest: validate.planDigest,
    approvalRequired: true,
    expiresAt: validate.expiresAt,
  };
}
