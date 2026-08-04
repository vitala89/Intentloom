import type {
  ExtensionManifest,
  ExtensionLockfile,
  ExtensionLockEntry,
  ExtensionAdoptionPlan,
  ExtensionCapabilities,
} from "@intentloom/protocol";
import {
  inspectExtensionManifestDocument,
  satisfiesSemverRange,
} from "./extension-inspection.js";

export interface ResolveAdoptionProposalOptions {
  readonly lockfile?: ExtensionLockfile | undefined;
  readonly registryResolution?:
    | {
        readonly version: string;
        readonly integrity?: string | undefined;
        readonly resolvedUrl?: string | undefined;
      }
    | undefined;
  readonly approvedCapabilities?: ExtensionCapabilities | undefined;
  readonly approver?: string | undefined;
  readonly timestamp?: string | undefined;
}

export function resolveExtensionAdoptionProposal(
  manifest: ExtensionManifest,
  options: ResolveAdoptionProposalOptions = {},
): ExtensionAdoptionPlan {
  const diagnostics: string[] = [];
  const approvalReasons: string[] = [];

  const inspection = inspectExtensionManifestDocument(
    undefined,
    JSON.stringify(manifest),
    options.lockfile ? JSON.stringify(options.lockfile) : undefined,
  );
  diagnostics.push(...inspection.diagnostics);

  const requestedVersion = manifest.version;
  let resolvedVersion = options.registryResolution?.version ?? requestedVersion;

  const isUnpinned =
    requestedVersion === "latest" ||
    requestedVersion.includes("*") ||
    requestedVersion.startsWith("^") ||
    requestedVersion.startsWith("~") ||
    requestedVersion.startsWith(">=");

  if (isUnpinned && !options.registryResolution?.version) {
    diagnostics.push(
      `unpinned version specification "${requestedVersion}" requires explicit registry resolution`,
    );
  }

  if (
    options.registryResolution?.version &&
    !satisfiesSemverRange(options.registryResolution.version, requestedVersion)
  ) {
    diagnostics.push(
      `resolved version "${options.registryResolution.version}" does not satisfy requested range "${requestedVersion}"`,
    );
  }

  const integrity =
    options.registryResolution?.integrity ?? manifest.source?.resolved;

  if (inspection.capabilityDelta.hasExpansions) {
    approvalReasons.push(
      "manifest requests new capability grants not previously locked",
    );
  }
  if (inspection.licenseAudit.hasRestrictiveTerms) {
    approvalReasons.push(
      `manifest license "${inspection.licenseAudit.spdxId}" carries restrictive terms`,
    );
  }
  if (inspection.licenseAudit.publisherChanged) {
    approvalReasons.push("extension publisher identity changed");
  }

  const requiresApproval =
    inspection.status === "warning" || approvalReasons.length > 0;

  let status: ExtensionAdoptionPlan["status"] = "ready";
  if (
    inspection.status === "rejected" ||
    diagnostics.some(
      (d) => d.includes("requires explicit") || d.includes("does not satisfy"),
    )
  ) {
    status = "rejected";
  } else if (requiresApproval) {
    status = "requires-approval";
  }

  const timestamp = options.timestamp ?? new Date().toISOString();
  const approver = options.approver ?? "system:human-operator";

  const proposedLockEntry: ExtensionLockEntry = {
    extensionId: manifest.extensionId,
    category: manifest.category,
    requestedVersion,
    resolvedVersion,
    source: options.registryResolution?.resolvedUrl
      ? {
          registry: manifest.source?.registry ?? "npm",
          package: manifest.source?.package ?? manifest.extensionId,
          resolved: options.registryResolution.resolvedUrl,
        }
      : manifest.source,
    integrity,
    grantedCapabilities: options.approvedCapabilities ?? manifest.capabilities,
    license: manifest.license,
    approvedAt: timestamp,
    approvedBy: approver,
    installationType: manifest.installationType ?? "downloaded",
  };

  return {
    status,
    targetExtensionId: manifest.extensionId,
    requestedVersion,
    resolvedVersion,
    integrity,
    capabilityDelta: inspection.capabilityDelta,
    compatibility: inspection.compatibility,
    licenseAudit: inspection.licenseAudit,
    proposedLockEntry,
    requiresApproval,
    approvalReasons,
    diagnostics,
  };
}

export interface ApplyAdoptionPlanResult {
  readonly lockfile: ExtensionLockfile;
  readonly updated: boolean;
  readonly diagnostics: readonly string[];
}

export function applyExtensionAdoptionPlan(
  plan: ExtensionAdoptionPlan,
  currentLockfile: ExtensionLockfile,
  options: {
    forceApproval?: boolean | undefined;
    timestamp?: string | undefined;
  } = {},
): ApplyAdoptionPlanResult {
  if (plan.status === "rejected") {
    return {
      lockfile: currentLockfile,
      updated: false,
      diagnostics: [
        `cannot apply rejected adoption plan for extension "${plan.targetExtensionId}": ${plan.diagnostics.join("; ")}`,
      ],
    };
  }

  if (plan.requiresApproval && !options.forceApproval) {
    return {
      lockfile: currentLockfile,
      updated: false,
      diagnostics: [
        `adoption plan for extension "${plan.targetExtensionId}" requires explicit human approval (${plan.approvalReasons.join("; ")})`,
      ],
    };
  }

  const updatedAt = options.timestamp ?? new Date().toISOString();
  const updatedExtensions: Record<string, ExtensionLockEntry> = {
    ...currentLockfile.extensions,
    [plan.targetExtensionId]: plan.proposedLockEntry,
  };

  const updatedLockfile: ExtensionLockfile = {
    lockVersion: currentLockfile.lockVersion ?? 1,
    updatedAt,
    extensions: updatedExtensions,
  };

  return {
    lockfile: updatedLockfile,
    updated: true,
    diagnostics: [],
  };
}
