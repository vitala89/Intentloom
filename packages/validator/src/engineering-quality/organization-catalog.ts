import {
  QUALITY_ORGANIZATION_CATALOG_SCHEMA_URN,
  type QualityOrganizationAuditAction,
  type QualityOrganizationAuditRecord,
  type QualityOrganizationAuditStatus,
  type QualityOrganizationCatalogEntry,
  type QualityOrganizationPolicyComposition,
  type QualityOrganizationPolicyPrecedence,
  type QualityOrganizationSignatureAlgorithm,
  type QualityOrganizationTrustRoot,
  type QualityOrganizationTrustRootStatus,
} from "@intentloom/protocol";
import { isObject } from "./common.js";
import { stringField } from "./task-validation-common.js";

const ALGORITHMS: readonly QualityOrganizationSignatureAlgorithm[] = [
  "ed25519",
  "rsa-sha256",
];

const TRUST_ROOT_STATUSES: readonly QualityOrganizationTrustRootStatus[] = [
  "active",
  "revoked",
];

const PRECEDENCES: readonly QualityOrganizationPolicyPrecedence[] = [
  "organization-override",
  "project-override",
];

const AUDIT_ACTIONS: readonly QualityOrganizationAuditAction[] = [
  "catalog-read",
  "trust-root-register",
  "trust-root-revoke",
  "policy-compose",
  "signature-verify",
];

const AUDIT_STATUSES: readonly QualityOrganizationAuditStatus[] = [
  "success",
  "denied",
];

function strings(value: unknown, fieldName: string): readonly string[] {
  if (!Array.isArray(value)) throw new Error(`${fieldName} must be an array`);
  return value.map((item, index) =>
    stringField(item, `${fieldName}[${index}]`),
  );
}

export function validateQualityOrganizationTrustRoot(
  value: unknown,
): QualityOrganizationTrustRoot {
  if (!isObject(value))
    throw new Error("organization trust root must be an object");
  if (value.schemaVersion !== QUALITY_ORGANIZATION_CATALOG_SCHEMA_URN) {
    throw new Error(
      `organizationTrustRoot.schemaVersion must equal ${QUALITY_ORGANIZATION_CATALOG_SCHEMA_URN}`,
    );
  }
  if (
    !ALGORITHMS.includes(
      value.algorithm as QualityOrganizationSignatureAlgorithm,
    )
  ) {
    throw new Error("organizationTrustRoot.algorithm must be valid");
  }
  if (
    !TRUST_ROOT_STATUSES.includes(
      value.status as QualityOrganizationTrustRootStatus,
    )
  ) {
    throw new Error("organizationTrustRoot.status must be valid");
  }
  return {
    schemaVersion: QUALITY_ORGANIZATION_CATALOG_SCHEMA_URN,
    id: stringField(value.id, "organizationTrustRoot.id"),
    orgId: stringField(value.orgId, "organizationTrustRoot.orgId"),
    orgName: stringField(value.orgName, "organizationTrustRoot.orgName"),
    publicKeySha256: stringField(
      value.publicKeySha256,
      "organizationTrustRoot.publicKeySha256",
    ),
    algorithm: value.algorithm as QualityOrganizationSignatureAlgorithm,
    status: value.status as QualityOrganizationTrustRootStatus,
    createdAt: stringField(value.createdAt, "organizationTrustRoot.createdAt"),
    ...(typeof value.expiresAt === "string"
      ? { expiresAt: value.expiresAt }
      : {}),
  };
}

export function validateQualityOrganizationCatalogEntry(
  value: unknown,
): QualityOrganizationCatalogEntry {
  if (!isObject(value))
    throw new Error("organization catalog entry must be an object");
  if (typeof value.retentionDays !== "number" || value.retentionDays < 0) {
    throw new Error(
      "organizationCatalogEntry.retentionDays must be a non-negative number",
    );
  }
  if (typeof value.auditRequired !== "boolean") {
    throw new Error("organizationCatalogEntry.auditRequired must be a boolean");
  }
  return {
    id: stringField(value.id, "organizationCatalogEntry.id"),
    orgId: stringField(value.orgId, "organizationCatalogEntry.orgId"),
    packId: stringField(value.packId, "organizationCatalogEntry.packId"),
    version: stringField(value.version, "organizationCatalogEntry.version"),
    signature: stringField(
      value.signature,
      "organizationCatalogEntry.signature",
    ),
    trustRootId: stringField(
      value.trustRootId,
      "organizationCatalogEntry.trustRootId",
    ),
    retentionDays: value.retentionDays,
    auditRequired: value.auditRequired,
    contentDigest: stringField(
      value.contentDigest,
      "organizationCatalogEntry.contentDigest",
    ),
    createdAt: stringField(
      value.createdAt,
      "organizationCatalogEntry.createdAt",
    ),
  };
}

export function validateQualityOrganizationPolicyComposition(
  value: unknown,
): QualityOrganizationPolicyComposition {
  if (!isObject(value))
    throw new Error("organization policy composition must be an object");
  if (
    !PRECEDENCES.includes(
      value.precedence as QualityOrganizationPolicyPrecedence,
    )
  ) {
    throw new Error("organizationPolicyComposition.precedence must be valid");
  }
  if (typeof value.overridesCount !== "number" || value.overridesCount < 0) {
    throw new Error(
      "organizationPolicyComposition.overridesCount must be a non-negative number",
    );
  }
  return {
    orgId: stringField(value.orgId, "organizationPolicyComposition.orgId"),
    basePolicyId: stringField(
      value.basePolicyId,
      "organizationPolicyComposition.basePolicyId",
    ),
    effectiveRules: strings(
      value.effectiveRules,
      "organizationPolicyComposition.effectiveRules",
    ),
    precedence: value.precedence as QualityOrganizationPolicyPrecedence,
    overridesCount: value.overridesCount,
    composedAt: stringField(
      value.composedAt,
      "organizationPolicyComposition.composedAt",
    ),
  };
}

export function validateQualityOrganizationAuditRecord(
  value: unknown,
): QualityOrganizationAuditRecord {
  if (!isObject(value))
    throw new Error("organization audit record must be an object");
  if (!AUDIT_ACTIONS.includes(value.action as QualityOrganizationAuditAction)) {
    throw new Error("organizationAuditRecord.action must be valid");
  }
  if (
    !AUDIT_STATUSES.includes(value.status as QualityOrganizationAuditStatus)
  ) {
    throw new Error("organizationAuditRecord.status must be valid");
  }
  return {
    auditId: stringField(value.auditId, "organizationAuditRecord.auditId"),
    orgId: stringField(value.orgId, "organizationAuditRecord.orgId"),
    action: value.action as QualityOrganizationAuditAction,
    entityId: stringField(value.entityId, "organizationAuditRecord.entityId"),
    status: value.status as QualityOrganizationAuditStatus,
    timestamp: stringField(
      value.timestamp,
      "organizationAuditRecord.timestamp",
    ),
    ...(typeof value.details === "string" ? { details: value.details } : {}),
  };
}
