export type ExtensionCategory =
  | "skill"
  | "mcp-server"
  | "knowledge-provider"
  | "adapter-pack"
  | "policy-pack"
  | "daemon-integration";

export interface ExtensionFilesystemCapabilities {
  readonly read?: readonly string[];
  readonly write?: readonly string[];
}

export interface ExtensionProcessCapabilities {
  readonly exec?: readonly string[];
}

export interface ExtensionNetworkCapabilities {
  readonly connect?: readonly string[];
}

export interface ExtensionCapabilities {
  readonly filesystem?: ExtensionFilesystemCapabilities;
  readonly process?: ExtensionProcessCapabilities;
  readonly network?: ExtensionNetworkCapabilities;
}

export interface ExtensionPublisher {
  readonly name: string;
  readonly url?: string;
}

export interface ExtensionSource {
  readonly registry: string;
  readonly package: string;
  readonly resolved?: string;
}

export interface ExtensionCompatibility {
  readonly intentloomCore: string;
  readonly node?: string;
  readonly os?: readonly string[];
  readonly arch?: readonly string[];
}

export interface ExtensionLicense {
  readonly spdxId: string;
  readonly licenseFile?: string;
  readonly noticeRequired?: boolean;
  readonly noticeFile?: string;
}

export interface ExtensionEntrypoint {
  readonly type: string;
  readonly command?: string;
  readonly args?: readonly string[];
}

export interface ExtensionManifest {
  readonly $schema?: string;
  readonly extensionId: string;
  readonly name: string;
  readonly category: ExtensionCategory;
  readonly version: string;
  readonly publisher: ExtensionPublisher;
  readonly source?: ExtensionSource;
  readonly compatibility: ExtensionCompatibility;
  readonly license: ExtensionLicense;
  readonly capabilities: ExtensionCapabilities;
  readonly entrypoint: ExtensionEntrypoint;
  readonly updateChannel?: string;
  readonly installationType?:
    "bundled" | "downloaded" | "externally-installed" | "referenced";
  readonly configSchema?: string;
}

export interface ExtensionLockEntry {
  readonly extensionId: string;
  readonly category: ExtensionCategory;
  readonly requestedVersion: string;
  readonly resolvedVersion: string;
  readonly source?: ExtensionSource | undefined;
  readonly publisher?: ExtensionPublisher | undefined;
  readonly integrity?: string | undefined;
  readonly manifestSchemaVersion?: string | undefined;
  readonly grantedCapabilities: ExtensionCapabilities;
  readonly license?: ExtensionLicense | undefined;
  readonly configDigest?: string | undefined;
  readonly approvedAt: string;
  readonly approvedBy: string;
  readonly lastHealthCheck?: string | undefined;
  readonly pendingMigration?: boolean | undefined;
  readonly installationType?: string | undefined;
}

export interface ExtensionLockfile {
  readonly lockVersion: number;
  readonly updatedAt: string;
  readonly extensions: Record<string, ExtensionLockEntry>;
}

export interface ExtensionCapabilityDelta {
  readonly filesystemReadAdded: readonly string[];
  readonly filesystemWriteAdded: readonly string[];
  readonly processExecAdded: readonly string[];
  readonly networkConnectAdded: readonly string[];
  readonly hasExpansions: boolean;
}

export interface ExtensionCompatibilityReport {
  readonly isCompatible: boolean;
  readonly nodeCompatible: boolean;
  readonly osCompatible: boolean;
  readonly archCompatible: boolean;
  readonly coreApiCompatible: boolean;
  readonly diagnostics: readonly string[];
}

export interface ExtensionLicenseAudit {
  readonly spdxId: string;
  readonly noticeRequired: boolean;
  readonly isPermissive: boolean;
  readonly hasRestrictiveTerms: boolean;
  readonly publisherChanged: boolean;
  readonly diagnostics: readonly string[];
}

export interface ExtensionInspectionReport {
  readonly status: "approved" | "warning" | "rejected";
  readonly extensionId: string;
  readonly name: string;
  readonly category: ExtensionCategory;
  readonly version: string;
  readonly publisher: ExtensionPublisher;
  readonly licenseAudit: ExtensionLicenseAudit;
  readonly capabilityDelta: ExtensionCapabilityDelta;
  readonly compatibility: ExtensionCompatibilityReport;
  readonly diagnostics: readonly string[];
}

export interface ExtensionAdoptionPlan {
  readonly status: "ready" | "requires-approval" | "rejected";
  readonly targetExtensionId: string;
  readonly requestedVersion: string;
  readonly resolvedVersion: string;
  readonly integrity?: string | undefined;
  readonly capabilityDelta: ExtensionCapabilityDelta;
  readonly compatibility: ExtensionCompatibilityReport;
  readonly licenseAudit: ExtensionLicenseAudit;
  readonly proposedLockEntry: ExtensionLockEntry;
  readonly requiresApproval: boolean;
  readonly approvalReasons: readonly string[];
  readonly diagnostics: readonly string[];
}

export type ExtensionSourceHealth =
  "available" | "unavailable" | "revoked" | "compromised";

export type ExtensionEndpointHealth = "healthy" | "unhealthy" | "unavailable";

/** Read-only evidence supplied by a local extension adapter. */
export interface ExtensionHealthEvidence {
  readonly extensionId: string;
  readonly sourceStatus?: ExtensionSourceHealth | undefined;
  readonly artifactIntegrity?: string | undefined;
  readonly declaredCapabilities?: ExtensionCapabilities | undefined;
  readonly grantedCapabilities?: ExtensionCapabilities | undefined;
  readonly configDigest?: string | undefined;
  readonly entrypointAvailable?: boolean | undefined;
  readonly healthCheckStatus?: ExtensionEndpointHealth | undefined;
}

export interface ExtensionHealthFinding {
  readonly extensionId: string;
  readonly code: string;
  readonly severity: "error" | "warning" | "info";
  readonly path: string;
  readonly message: string;
  readonly remediation: string;
}

export interface ExtensionHealthReport {
  readonly status: "healthy" | "warning" | "failed";
  readonly checkedExtensionIds: readonly string[];
  readonly findings: readonly ExtensionHealthFinding[];
  readonly diagnostics: readonly string[];
}

export * from "./extension-update.js";
