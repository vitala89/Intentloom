import type { EngineeringQualityPackCompatibility } from "./packs.js";

export const QUALITY_CATALOG_ENTRY_SCHEMA_URN =
  "urn:intentloom:schema:engineering-quality-catalog-entry:1" as const;

export const QUALITY_CATALOG_LOCK_SCHEMA_URN =
  "urn:intentloom:schema:engineering-quality-catalog-lock:1" as const;

export const QUALITY_CATALOG_UPDATE_DIFF_SCHEMA_URN =
  "urn:intentloom:schema:engineering-quality-catalog-update-diff:1" as const;

export const QUALITY_CATALOG_REVOCATION_SCHEMA_URN =
  "urn:intentloom:schema:engineering-quality-catalog-revocation:1" as const;

export const QUALITY_CATALOG_QUARANTINE_SCHEMA_URN =
  "urn:intentloom:schema:engineering-quality-catalog-quarantine:1" as const;

export type CatalogTrustClass =
  "first-party" | "curated-third-party" | "organization";

export type CatalogPackClass =
  "data-only" | "executable-checker" | "remediation";

export type CatalogSupportStatus =
  "supported" | "deprecated" | "yanking" | "revoked";

export interface CatalogSearchQuery {
  readonly query?: string;
  readonly trustClass?: CatalogTrustClass;
  readonly category?: string;
  readonly tags?: readonly string[];
  readonly limit?: number;
  readonly offset?: number;
}

export interface CatalogEntry {
  readonly schemaVersion: typeof QUALITY_CATALOG_ENTRY_SCHEMA_URN;
  readonly id: string;
  readonly name: string;
  readonly summary: string;
  readonly publisher: string;
  readonly trustClass: CatalogTrustClass;
  readonly packClass: CatalogPackClass;
  readonly version: string;
  readonly sourceIdentity: string;
  readonly contentDigest: string;
  readonly signature?: string;
  readonly license: string;
  readonly compatibility: EngineeringQualityPackCompatibility;
  readonly capabilities: readonly string[];
  readonly networkBehavior: "none" | "declarative" | "network-required";
  readonly filesystemBehavior: "none" | "read-only" | "project-scoped";
  readonly executable: boolean;
  readonly postInstallBehavior: "none" | "review-required";
  readonly conflicts: readonly string[];
  readonly supportStatus: CatalogSupportStatus;
  readonly publishedAt: string;
  readonly reviewedAt: string;
  readonly revokedAt?: string;
  readonly yankedAt?: string;
  readonly yankReason?: string;
}

export interface CatalogSearchResult {
  readonly entries: readonly CatalogEntry[];
  readonly total: number;
  readonly offset: number;
  readonly limit: number;
}

export interface QuarantineArtifact {
  readonly schemaVersion: typeof QUALITY_CATALOG_QUARANTINE_SCHEMA_URN;
  readonly catalogEntryId: string;
  readonly version: string;
  readonly relativeLocation: string;
  readonly rawContentDigest: string;
  readonly verifiedAt: string;
  readonly quarantineState: "quarantined" | "verified" | "failed";
  readonly failureReason?: string;
}

export interface EngineeringQualityPackLockEntry {
  readonly id: string;
  readonly version: string;
  readonly digest: string;
  readonly source: string;
  readonly pinnedAt: string;
  readonly integrityStatus: "verified" | "unverified" | "mismatched";
}

export interface EngineeringQualityPackLock {
  readonly schemaVersion: typeof QUALITY_CATALOG_LOCK_SCHEMA_URN;
  readonly lockVersion: number;
  readonly packs: readonly EngineeringQualityPackLockEntry[];
}

export interface EngineeringQualityPackRuleChange {
  readonly ruleId: string;
  readonly changeKind: "added" | "removed" | "modified";
  readonly description: string;
}

export interface EngineeringQualityPackUpdateDiff {
  readonly schemaVersion: typeof QUALITY_CATALOG_UPDATE_DIFF_SCHEMA_URN;
  readonly packId: string;
  readonly currentVersion: string;
  readonly targetVersion: string;
  readonly changeType: "upgrade" | "downgrade" | "yanked_migration";
  readonly ruleChanges: readonly EngineeringQualityPackRuleChange[];
  readonly compatibilityDelta: string;
  readonly riskAssessment: "low" | "medium" | "high";
  readonly revocationWarning?: string;
}

export interface EngineeringQualityRevocationState {
  readonly schemaVersion: typeof QUALITY_CATALOG_REVOCATION_SCHEMA_URN;
  readonly packId: string;
  readonly version: string;
  readonly isRevoked: boolean;
  readonly isYanked: boolean;
  readonly reason?: string;
  readonly revokedAt?: string;
  readonly replacementVersion?: string;
  readonly failClosed: boolean;
}
