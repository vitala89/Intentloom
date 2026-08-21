import type { ExternalSpecializedPackPreview } from "./specialized-pack-external-lifecycle.js";
import type { ExternalSpecializedPackActivationApplyResult } from "./specialized-pack-external-apply.js";

export interface ExternalSpecializedPackPreviewViewModel {
  readonly status: ExternalSpecializedPackPreview["status"];
  readonly packId: string;
  readonly version: string;
  readonly name: string;
  readonly publisher: string;
  readonly declaredLicense: string;
  readonly source: ExternalSpecializedPackPreview["source"];
  readonly digest: string;
  readonly trustLevel: string;
  readonly compatible: boolean;
  readonly extensionPlanStatus: string;
  readonly diagnostics: readonly string[];
  readonly activationRequiresApproval: true;
}

export interface ExternalSpecializedPackApplyViewModel {
  readonly status: ExternalSpecializedPackActivationApplyResult["status"];
  readonly projectRoot: string;
  readonly packId: string;
  readonly digest: string;
  readonly pin: string;
  readonly changedPaths: readonly string[];
  readonly writes: number;
  readonly diagnostics: readonly string[];
  readonly rollbackAttempted: boolean;
  readonly rollbackCompleted: boolean;
  readonly rollbackFailures: readonly string[];
}

export function buildExternalSpecializedPackPreviewViewModel(
  preview: ExternalSpecializedPackPreview,
): ExternalSpecializedPackPreviewViewModel {
  return {
    status: preview.status,
    packId: preview.manifest.id,
    version: preview.manifest.version,
    name: preview.manifest.name,
    publisher: preview.manifest.publisher,
    declaredLicense: preview.declaredLicense,
    source: preview.source,
    digest: preview.digest,
    trustLevel: preview.trustState.trustLevel,
    compatible: preview.compatible,
    extensionPlanStatus: preview.extensionPlan.status,
    diagnostics: [...preview.diagnostics],
    activationRequiresApproval: true,
  };
}

export function buildExternalSpecializedPackApplyViewModel(
  result: ExternalSpecializedPackActivationApplyResult,
): ExternalSpecializedPackApplyViewModel {
  return {
    status: result.status,
    projectRoot: result.projectRoot,
    packId: result.extensionId,
    digest: result.digest,
    pin: result.pin,
    changedPaths: [...result.changedPaths],
    writes: result.writes,
    diagnostics: [...result.diagnostics],
    rollbackAttempted: result.rollbackAttempted,
    rollbackCompleted: result.rollbackCompleted,
    rollbackFailures: [...result.rollbackFailures],
  };
}

export function renderExternalSpecializedPackPreviewText(
  viewmodel: ExternalSpecializedPackPreviewViewModel,
): string {
  const lines = [
    "External specialized pack",
    `Pack: ${viewmodel.packId} (${viewmodel.name})`,
    `Version: ${viewmodel.version}`,
    `Publisher: ${viewmodel.publisher}`,
    `Source: ${viewmodel.source.kind} ${viewmodel.source.locator}`,
    `Pin: ${viewmodel.source.pin}`,
    `Digest: ${viewmodel.digest}`,
    `Trust: ${viewmodel.trustLevel}`,
    `Compatibility: ${viewmodel.compatible ? "compatible" : "not compatible"}`,
    `Preview status: ${viewmodel.status}`,
  ];
  if (viewmodel.diagnostics.length > 0) {
    lines.push(`Diagnostics: ${viewmodel.diagnostics.join("; ")}`);
  }
  if (viewmodel.status === "ready-for-review") {
    lines.push("Activation requires explicit approval.");
  }
  return lines.join("\n");
}

export function renderExternalSpecializedPackApplyText(
  viewmodel: ExternalSpecializedPackApplyViewModel,
): string {
  if (viewmodel.status === "applied") {
    const lockPath = viewmodel.changedPaths[0] ?? ".aif/extension-lock.json";
    return ["Applied", `Project lock updated: ${lockPath}`].join("\n");
  }
  if (viewmodel.status === "already-applied") {
    return ["Already applied", "No project files changed."].join("\n");
  }
  if (viewmodel.status === "conflict") {
    return [
      "Conflict",
      "The same pack id is pinned differently in .aif/extension-lock.json.",
      "External specialized-pack update semantics are not implemented yet.",
      ...(viewmodel.diagnostics.length > 0
        ? [`Diagnostics: ${viewmodel.diagnostics.join("; ")}`]
        : []),
    ].join("\n");
  }
  if (viewmodel.status === "denied") {
    return [
      "Denied",
      ...(viewmodel.diagnostics.length > 0
        ? [`Diagnostics: ${viewmodel.diagnostics.join("; ")}`]
        : ["Activation was denied."]),
    ].join("\n");
  }
  return [
    "Failed",
    ...(viewmodel.diagnostics.length > 0
      ? [`Diagnostics: ${viewmodel.diagnostics.join("; ")}`]
      : ["Activation failed."]),
    viewmodel.rollbackAttempted
      ? `Rollback completed: ${viewmodel.rollbackCompleted ? "yes" : "no"}`
      : "",
  ]
    .filter((line) => line.length > 0)
    .join("\n");
}

export function externalSpecializedPackPreviewExitCode(
  viewmodel: ExternalSpecializedPackPreviewViewModel,
): number {
  return viewmodel.status === "ready-for-review" ? 0 : 1;
}

export function externalSpecializedPackApplyExitCode(
  viewmodel: ExternalSpecializedPackApplyViewModel,
): number {
  if (
    viewmodel.status === "applied" ||
    viewmodel.status === "already-applied"
  ) {
    return 0;
  }
  return 1;
}
