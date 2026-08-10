import type { QUALITY_ORGANIZATION_CATALOG_SCHEMA_URN } from "./common.js";

export type QualityOrganizationTrustRootStatus = "active" | "revoked";

export type QualityOrganizationSignatureAlgorithm = "ed25519" | "rsa-sha256";

export interface QualityOrganizationTrustRoot {
  readonly schemaVersion: typeof QUALITY_ORGANIZATION_CATALOG_SCHEMA_URN;
  readonly id: string;
  readonly orgId: string;
  readonly orgName: string;
  readonly publicKeySha256: string;
  readonly algorithm: QualityOrganizationSignatureAlgorithm;
  readonly status: QualityOrganizationTrustRootStatus;
  readonly createdAt: string;
  readonly expiresAt?: string;
}

export interface QualityOrganizationCatalogEntry {
  readonly id: string;
  readonly orgId: string;
  readonly packId: string;
  readonly version: string;
  readonly signature: string;
  readonly trustRootId: string;
  readonly retentionDays: number;
  readonly auditRequired: boolean;
  readonly contentDigest: string;
  readonly createdAt: string;
}

export type QualityOrganizationPolicyPrecedence =
  "organization-override" | "project-override";

export interface QualityOrganizationPolicyComposition {
  readonly orgId: string;
  readonly basePolicyId: string;
  readonly effectiveRules: readonly string[];
  readonly precedence: QualityOrganizationPolicyPrecedence;
  readonly overridesCount: number;
  readonly composedAt: string;
}

export type QualityOrganizationAuditAction =
  | "catalog-read"
  | "trust-root-register"
  | "trust-root-revoke"
  | "policy-compose"
  | "signature-verify";

export type QualityOrganizationAuditStatus = "success" | "denied";

export interface QualityOrganizationAuditRecord {
  readonly auditId: string;
  readonly orgId: string;
  readonly action: QualityOrganizationAuditAction;
  readonly entityId: string;
  readonly status: QualityOrganizationAuditStatus;
  readonly timestamp: string;
  readonly details?: string;
}
