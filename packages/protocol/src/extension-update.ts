import type {
  ExtensionCapabilityDelta,
  ExtensionCompatibilityReport,
  ExtensionLicenseAudit,
  ExtensionLockEntry,
  ExtensionManifest,
} from "./extension-lifecycle.js";

export type ExtensionMigrationTarget = "configuration" | "project-local-state";

export interface ExtensionMigrationPreview {
  readonly id: string;
  readonly target: ExtensionMigrationTarget;
  readonly path: string;
  readonly description: string;
  readonly action: "create" | "update";
  readonly beforeDigest?: string | undefined;
  readonly afterDigest: string;
  readonly reversible: boolean;
}

export interface ExtensionUpdateCandidate {
  readonly manifest: ExtensionManifest;
  readonly resolvedVersion: string;
  readonly integrity?: string | undefined;
  readonly resolvedUrl?: string | undefined;
  readonly releaseChannel?: string | undefined;
  readonly releaseNotes?: readonly string[] | undefined;
  readonly breakingChanges?: readonly string[] | undefined;
  readonly migrations?: readonly ExtensionMigrationPreview[] | undefined;
}

export interface ExtensionUpdatePlan {
  readonly status: "requires-approval" | "rejected";
  readonly extensionId: string;
  readonly currentVersion: string;
  readonly candidateVersion: string;
  readonly releaseChannel: string;
  readonly currentLockEntry: ExtensionLockEntry;
  readonly candidateManifest: ExtensionManifest;
  readonly proposedLockEntry: ExtensionLockEntry;
  readonly capabilityDelta: ExtensionCapabilityDelta;
  readonly compatibility: ExtensionCompatibilityReport;
  readonly licenseAudit: ExtensionLicenseAudit;
  readonly licenseChanged: boolean;
  readonly publisherChanged: boolean;
  readonly sourceChanged: boolean;
  readonly integrityChanged: boolean;
  readonly breakingChanges: readonly string[];
  readonly releaseNotes: readonly string[];
  readonly migrations: readonly ExtensionMigrationPreview[];
  readonly requiresApproval: true;
  readonly approvalReasons: readonly string[];
  readonly diagnostics: readonly string[];
}

export interface ExtensionUpdateDiscoveryReport {
  readonly lockVersion: number;
  readonly updates: readonly ExtensionUpdatePlan[];
  readonly upToDateExtensionIds: readonly string[];
  readonly diagnostics: readonly string[];
}

export interface ExtensionUpdateApproval {
  readonly approvedBy: string;
  readonly approvedAt: string;
}

export interface ExtensionUpdateApplicationResult {
  readonly status: "updated" | "unchanged" | "failed";
  readonly lockfileUpdated: boolean;
  readonly failedStage?:
    | "preflight"
    | "stage"
    | "integrity"
    | "migration"
    | "health-check"
    | "commit"
    | undefined;
  readonly diagnostics: readonly string[];
  readonly rollbackAttempted: boolean;
  readonly rollbackCompleted: boolean;
  readonly rollbackFailures: readonly string[];
}

export interface ExtensionRemovalFileTarget {
  readonly path: string;
  readonly description: string;
  readonly beforeDigest: string;
}

export interface ExtensionRemovalConfigurationChange {
  readonly path: string;
  readonly description: string;
  readonly beforeDigest: string;
  readonly afterDigest: string;
  readonly afterContent: string;
}

export interface ExtensionRemovalPlan {
  readonly status: "requires-approval" | "rejected";
  readonly extensionId: string;
  readonly lockfilePath: string;
  readonly currentLockEntry?: ExtensionLockEntry | undefined;
  readonly filesToRemove: readonly ExtensionRemovalFileTarget[];
  readonly configurationChanges: readonly ExtensionRemovalConfigurationChange[];
  readonly processesToStop: readonly string[];
  readonly projectOwnedPaths: readonly string[];
  readonly retainedPaths: readonly string[];
  readonly noticePaths: readonly string[];
  readonly requiresApproval: true;
  readonly diagnostics: readonly string[];
}

export interface ExtensionRemovalApproval {
  readonly approvedBy: string;
  readonly approvedAt: string;
}

export interface ExtensionRemovalApplicationResult {
  readonly status: "removed" | "unchanged" | "failed";
  readonly lockfileUpdated: boolean;
  readonly failedStage?: "preflight" | "stop" | "remove" | "commit" | undefined;
  readonly diagnostics: readonly string[];
  readonly rollbackAttempted: boolean;
  readonly rollbackCompleted: boolean;
  readonly rollbackFailures: readonly string[];
}
