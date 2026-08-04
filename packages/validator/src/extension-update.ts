import type {
  ExtensionLockEntry,
  ExtensionLockfile,
  ExtensionUpdateCandidate,
  ExtensionUpdateDiscoveryReport,
  ExtensionUpdatePlan,
} from "@intentloom/protocol";
import type { InspectionEnvironment } from "./extension-inspection.js";
import {
  buildExtensionUpdateLockEntry,
  compareExtensionVersions,
  reviewExtensionUpdate,
} from "./extension-update-review.js";

function buildUpdatePlan(
  current: ExtensionLockEntry,
  candidate: ExtensionUpdateCandidate,
  environment: InspectionEnvironment,
): ExtensionUpdatePlan {
  const review = reviewExtensionUpdate(current, candidate, environment);
  return {
    status: review.rejected ? "rejected" : "requires-approval",
    extensionId: current.extensionId,
    currentVersion: current.resolvedVersion,
    candidateVersion: candidate.resolvedVersion,
    releaseChannel:
      candidate.releaseChannel ?? candidate.manifest.updateChannel ?? "stable",
    currentLockEntry: current,
    candidateManifest: candidate.manifest,
    proposedLockEntry: buildExtensionUpdateLockEntry(current, candidate),
    capabilityDelta: review.capabilityDelta,
    compatibility: review.compatibility,
    licenseAudit: review.licenseAudit,
    licenseChanged: review.licenseChanged,
    publisherChanged: review.publisherChanged,
    sourceChanged: review.sourceChanged,
    integrityChanged: review.integrityChanged,
    breakingChanges: review.breakingChanges,
    releaseNotes: candidate.releaseNotes ?? [],
    migrations: candidate.migrations ?? [],
    requiresApproval: true,
    approvalReasons: review.approvalReasons,
    diagnostics: review.diagnostics,
  };
}

export function discoverExtensionUpdatePlans(
  lockfile: ExtensionLockfile,
  candidates: readonly ExtensionUpdateCandidate[],
  environment: InspectionEnvironment = {},
): ExtensionUpdateDiscoveryReport {
  const updates: ExtensionUpdatePlan[] = [];
  const upToDateExtensionIds: string[] = [];
  const diagnostics: string[] = [];

  for (const candidate of candidates) {
    const extensionId = candidate.manifest.extensionId;
    const current = lockfile.extensions[extensionId];
    if (!current) {
      diagnostics.push(`candidate-not-locked:${extensionId}`);
      continue;
    }
    const comparison = compareExtensionVersions(
      candidate.resolvedVersion,
      current.resolvedVersion,
    );
    if (comparison !== null && comparison <= 0) {
      upToDateExtensionIds.push(extensionId);
      continue;
    }
    updates.push(buildUpdatePlan(current, candidate, environment));
  }

  return {
    lockVersion: lockfile.lockVersion,
    updates,
    upToDateExtensionIds: upToDateExtensionIds.sort(),
    diagnostics,
  };
}
