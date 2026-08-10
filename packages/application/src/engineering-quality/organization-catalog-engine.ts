import { createHash } from "node:crypto";
import {
  QUALITY_ORGANIZATION_CATALOG_SCHEMA_URN,
  type QualityOrganizationAuditAction,
  type QualityOrganizationAuditRecord,
  type QualityOrganizationAuditStatus,
  type QualityOrganizationPolicyComposition,
  type QualityOrganizationPolicyPrecedence,
  type QualityOrganizationSignatureAlgorithm,
  type QualityOrganizationTrustRoot,
} from "@intentloom/protocol";
import {
  validateQualityOrganizationAuditRecord,
  validateQualityOrganizationPolicyComposition,
  validateQualityOrganizationTrustRoot,
} from "@intentloom/validator";

function sha256(content: string): string {
  return createHash("sha256").update(content, "utf8").digest("hex");
}

export function registerOrganizationTrustRoot(options: {
  readonly id?: string;
  readonly orgId: string;
  readonly orgName: string;
  readonly publicKeyContent: string;
  readonly algorithm?: QualityOrganizationSignatureAlgorithm;
  readonly createdAt?: string;
  readonly expiresAt?: string;
}): QualityOrganizationTrustRoot {
  const createdAt = options.createdAt ?? new Date().toISOString();
  const publicKeySha256 = sha256(options.publicKeyContent);
  const id =
    options.id ??
    `trustroot-${sha256(`${options.orgId}:${publicKeySha256}`).slice(0, 12)}`;

  return validateQualityOrganizationTrustRoot({
    schemaVersion: QUALITY_ORGANIZATION_CATALOG_SCHEMA_URN,
    id,
    orgId: options.orgId,
    orgName: options.orgName,
    publicKeySha256,
    algorithm: options.algorithm ?? "ed25519",
    status: "active",
    createdAt,
    ...(options.expiresAt !== undefined
      ? { expiresAt: options.expiresAt }
      : {}),
  });
}

export function revokeOrganizationTrustRoot(
  trustRoot: QualityOrganizationTrustRoot,
): QualityOrganizationTrustRoot {
  return validateQualityOrganizationTrustRoot({
    ...trustRoot,
    status: "revoked",
  });
}

export function verifyOrganizationArtifactSignature(
  artifactContent: string,
  signature: string,
  trustRoot: QualityOrganizationTrustRoot,
): { readonly valid: boolean; readonly reason?: string } {
  if (trustRoot.status === "revoked") {
    return {
      valid: false,
      reason: "organization trust root has been revoked",
    };
  }

  const expectedSignature = `sig:${sha256(`${artifactContent}:${trustRoot.publicKeySha256}`)}`;
  if (signature !== expectedSignature) {
    return {
      valid: false,
      reason: "artifact signature mismatch for target trust root",
    };
  }

  return { valid: true };
}

export function composeOrganizationPolicy(options: {
  readonly orgId: string;
  readonly basePolicyId: string;
  readonly projectRules: readonly string[];
  readonly orgRules: readonly string[];
  readonly precedence?: QualityOrganizationPolicyPrecedence;
  readonly composedAt?: string;
}): QualityOrganizationPolicyComposition {
  const precedence = options.precedence ?? "organization-override";
  const composedAt = options.composedAt ?? new Date().toISOString();

  let effectiveRules: readonly string[];
  let overridesCount = 0;

  if (precedence === "organization-override") {
    const combined = new Set([...options.orgRules, ...options.projectRules]);
    effectiveRules = Array.from(combined);
    overridesCount = options.orgRules.filter((r) =>
      options.projectRules.includes(r),
    ).length;
  } else {
    const combined = new Set([...options.projectRules, ...options.orgRules]);
    effectiveRules = Array.from(combined);
    overridesCount = options.projectRules.filter((r) =>
      options.orgRules.includes(r),
    ).length;
  }

  return validateQualityOrganizationPolicyComposition({
    orgId: options.orgId,
    basePolicyId: options.basePolicyId,
    effectiveRules,
    precedence,
    overridesCount,
    composedAt,
  });
}

export function auditOrganizationCatalogAccess(options: {
  readonly auditId?: string;
  readonly orgId: string;
  readonly action: QualityOrganizationAuditAction;
  readonly entityId: string;
  readonly status: QualityOrganizationAuditStatus;
  readonly timestamp?: string;
  readonly details?: string;
}): QualityOrganizationAuditRecord {
  const timestamp = options.timestamp ?? new Date().toISOString();
  const auditId =
    options.auditId ??
    `audit-${sha256(`${options.orgId}:${options.action}:${timestamp}`).slice(0, 12)}`;

  return validateQualityOrganizationAuditRecord({
    auditId,
    orgId: options.orgId,
    action: options.action,
    entityId: options.entityId,
    status: options.status,
    timestamp,
    ...(options.details !== undefined ? { details: options.details } : {}),
  });
}
