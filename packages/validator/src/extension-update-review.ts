import type {
  ExtensionCapabilityDelta,
  ExtensionCompatibilityReport,
  ExtensionLicenseAudit,
  ExtensionLockEntry,
  ExtensionUpdateCandidate,
} from "@intentloom/protocol";
import {
  auditExtensionLicense,
  compareSemver,
  computeExtensionCapabilityDelta,
  evaluateExtensionCompatibility,
  parseSemver,
  satisfiesSemverRange,
  type InspectionEnvironment,
} from "./extension-inspection.js";

interface ExtensionUpdateReview {
  readonly capabilityDelta: ExtensionCapabilityDelta;
  readonly compatibility: ExtensionCompatibilityReport;
  readonly licenseAudit: ExtensionLicenseAudit;
  readonly licenseChanged: boolean;
  readonly publisherChanged: boolean;
  readonly sourceChanged: boolean;
  readonly integrityChanged: boolean;
  readonly breakingChanges: readonly string[];
  readonly approvalReasons: readonly string[];
  readonly diagnostics: readonly string[];
  readonly rejected: boolean;
}

export function compareExtensionVersions(
  left: string,
  right: string,
): number | null {
  const parsedLeft = parseSemver(left);
  const parsedRight = parseSemver(right);
  if (!parsedLeft || !parsedRight) return null;
  return compareSemver(parsedLeft, parsedRight);
}

function sourceIdentity(entry: ExtensionLockEntry): string {
  return `${entry.source?.registry ?? ""}:${entry.source?.package ?? ""}`;
}

function candidateSourceIdentity(candidate: ExtensionUpdateCandidate): string {
  const source = candidate.manifest.source;
  return `${source?.registry ?? ""}:${source?.package ?? ""}`;
}

function candidateRequiresIntegrity(candidate: ExtensionUpdateCandidate) {
  const installationType = candidate.manifest.installationType ?? "downloaded";
  return installationType === "bundled" || installationType === "downloaded";
}

function reviewVersion(
  current: ExtensionLockEntry,
  candidate: ExtensionUpdateCandidate,
) {
  const diagnostics: string[] = [];
  const breakingChanges = [...(candidate.breakingChanges ?? [])];
  const comparison = compareExtensionVersions(
    candidate.resolvedVersion,
    current.resolvedVersion,
  );
  const currentVersion = parseSemver(current.resolvedVersion);
  const candidateVersion = parseSemver(candidate.resolvedVersion);
  if (
    currentVersion &&
    candidateVersion &&
    candidateVersion.major > currentVersion.major
  )
    breakingChanges.unshift(
      `major version changes from ${currentVersion.major} to ${candidateVersion.major}`,
    );
  if (comparison === null) diagnostics.push("update-version-unparseable");
  if (
    !satisfiesSemverRange(candidate.resolvedVersion, candidate.manifest.version)
  )
    diagnostics.push(
      `resolved version "${candidate.resolvedVersion}" does not satisfy candidate range "${candidate.manifest.version}"`,
    );
  return { breakingChanges, comparison, diagnostics };
}

function collectApprovalReasons(input: {
  readonly capabilityExpansion: boolean;
  readonly licenseChanged: boolean;
  readonly publisherChanged: boolean;
  readonly sourceChanged: boolean;
  readonly breaking: boolean;
  readonly migration: boolean;
}): string[] {
  const reasons = ["extension updates require explicit human approval"];
  if (input.capabilityExpansion)
    reasons.push("candidate requests expanded capabilities");
  if (input.licenseChanged) reasons.push("extension license changed");
  if (input.publisherChanged) reasons.push("extension publisher changed");
  if (input.sourceChanged) reasons.push("extension source identity changed");
  if (input.breaking)
    reasons.push("candidate declares or implies breaking changes");
  if (input.migration)
    reasons.push("candidate requires project-local migrations");
  return reasons;
}

export function reviewExtensionUpdate(
  current: ExtensionLockEntry,
  candidate: ExtensionUpdateCandidate,
  environment: InspectionEnvironment,
): ExtensionUpdateReview {
  const version = reviewVersion(current, candidate);
  const compatibility = evaluateExtensionCompatibility(
    candidate.manifest.compatibility,
    environment,
  );
  const capabilityDelta = computeExtensionCapabilityDelta(
    candidate.manifest.capabilities,
    current.grantedCapabilities,
  );
  const licenseAudit = auditExtensionLicense(
    candidate.manifest.license,
    candidate.manifest.publisher,
    current.publisher?.name,
  );
  const licenseChanged =
    current.license?.spdxId !== candidate.manifest.license.spdxId;
  const publisherChanged =
    current.publisher?.name !== candidate.manifest.publisher.name;
  const sourceChanged =
    sourceIdentity(current) !== candidateSourceIdentity(candidate);
  const integrityChanged = current.integrity !== candidate.integrity;
  const migrations = candidate.migrations ?? [];
  const diagnostics = [
    ...version.diagnostics,
    ...compatibility.diagnostics,
    ...licenseAudit.diagnostics,
  ];
  if (candidateRequiresIntegrity(candidate) && !candidate.integrity)
    diagnostics.push("candidate-integrity-required");
  if (migrations.some((migration) => !migration.reversible))
    diagnostics.push("irreversible-migration-not-supported");
  const rejected =
    version.comparison === null ||
    version.comparison <= 0 ||
    !compatibility.isCompatible ||
    licenseAudit.hasRestrictiveTerms ||
    diagnostics.some(
      (item) =>
        item === "candidate-integrity-required" ||
        item === "irreversible-migration-not-supported" ||
        item.includes("does not satisfy"),
    );
  return {
    capabilityDelta,
    compatibility,
    licenseAudit,
    licenseChanged,
    publisherChanged,
    sourceChanged,
    integrityChanged,
    breakingChanges: version.breakingChanges,
    approvalReasons: collectApprovalReasons({
      capabilityExpansion: capabilityDelta.hasExpansions,
      licenseChanged,
      publisherChanged,
      sourceChanged,
      breaking: version.breakingChanges.length > 0,
      migration: migrations.length > 0,
    }),
    diagnostics,
    rejected,
  };
}

export function buildExtensionUpdateLockEntry(
  current: ExtensionLockEntry,
  candidate: ExtensionUpdateCandidate,
): ExtensionLockEntry {
  const manifest = candidate.manifest;
  return {
    ...current,
    requestedVersion: manifest.version,
    resolvedVersion: candidate.resolvedVersion,
    source: candidate.resolvedUrl
      ? {
          registry: manifest.source?.registry ?? "unknown",
          package: manifest.source?.package ?? manifest.extensionId,
          resolved: candidate.resolvedUrl,
        }
      : manifest.source,
    publisher: manifest.publisher,
    integrity: candidate.integrity,
    grantedCapabilities: manifest.capabilities,
    license: manifest.license,
    pendingMigration: (candidate.migrations?.length ?? 0) > 0,
    installationType: manifest.installationType ?? current.installationType,
  };
}
