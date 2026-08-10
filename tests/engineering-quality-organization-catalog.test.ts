import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  auditOrganizationCatalogAccess,
  composeOrganizationPolicy,
  registerOrganizationTrustRoot,
  revokeOrganizationTrustRoot,
  verifyOrganizationArtifactSignature,
} from "@intentloom/application";
import { QUALITY_ORGANIZATION_CATALOG_SCHEMA_URN } from "@intentloom/protocol";
import {
  validateQualityOrganizationAuditRecord,
  validateQualityOrganizationCatalogEntry,
  validateQualityOrganizationPolicyComposition,
  validateQualityOrganizationTrustRoot,
} from "@intentloom/validator";

function sha256(content: string): string {
  return createHash("sha256").update(content, "utf8").digest("hex");
}

describe("Engineering Quality Phase Q17: Organization Catalogs", () => {
  const publicKeyContent = "MHYwEAYHKoZIzj0CAQYFK4EEACIDYgAE...";
  const publicKeySha256 = sha256(publicKeyContent);

  it("registers an organization trust root with valid schema and active status", () => {
    const trustRoot = registerOrganizationTrustRoot({
      orgId: "org-acme",
      orgName: "Acme Corp",
      publicKeyContent,
      algorithm: "ed25519",
      createdAt: "2026-08-10T12:00:00.000Z",
    });

    expect(trustRoot.schemaVersion).toBe(
      QUALITY_ORGANIZATION_CATALOG_SCHEMA_URN,
    );
    expect(trustRoot.orgId).toBe("org-acme");
    expect(trustRoot.orgName).toBe("Acme Corp");
    expect(trustRoot.publicKeySha256).toBe(publicKeySha256);
    expect(trustRoot.status).toBe("active");
    expect(trustRoot.algorithm).toBe("ed25519");

    const validated = validateQualityOrganizationTrustRoot(trustRoot);
    expect(validated.id).toBe(trustRoot.id);
  });

  it("revokes an active organization trust root", () => {
    const activeRoot = registerOrganizationTrustRoot({
      orgId: "org-acme",
      orgName: "Acme Corp",
      publicKeyContent,
    });

    const revokedRoot = revokeOrganizationTrustRoot(activeRoot);
    expect(revokedRoot.status).toBe("revoked");
  });

  it("verifies artifact signature against active trust root and rejects revoked root", () => {
    const trustRoot = registerOrganizationTrustRoot({
      orgId: "org-acme",
      orgName: "Acme Corp",
      publicKeyContent,
    });

    const artifactContent = JSON.stringify({
      packId: "acme/security-pack",
      version: "1.0.0",
    });
    const signature = `sig:${sha256(`${artifactContent}:${publicKeySha256}`)}`;

    const validResult = verifyOrganizationArtifactSignature(
      artifactContent,
      signature,
      trustRoot,
    );
    expect(validResult.valid).toBe(true);

    const invalidResult = verifyOrganizationArtifactSignature(
      artifactContent,
      "sig:invalid",
      trustRoot,
    );
    expect(invalidResult.valid).toBe(false);
    expect(invalidResult.reason).toContain("mismatch");

    const revokedRoot = revokeOrganizationTrustRoot(trustRoot);
    const revokedResult = verifyOrganizationArtifactSignature(
      artifactContent,
      signature,
      revokedRoot,
    );
    expect(revokedResult.valid).toBe(false);
    expect(revokedResult.reason).toContain("revoked");
  });

  it("composes organization and project policies according to precedence", () => {
    const projectRules = ["rule-no-any", "rule-max-lines"];
    const orgRules = ["rule-security-audit", "rule-max-lines"];

    const orgOverride = composeOrganizationPolicy({
      orgId: "org-acme",
      basePolicyId: "policy-balanced",
      projectRules,
      orgRules,
      precedence: "organization-override",
    });

    expect(orgOverride.orgId).toBe("org-acme");
    expect(orgOverride.precedence).toBe("organization-override");
    expect(orgOverride.effectiveRules).toContain("rule-security-audit");
    expect(orgOverride.overridesCount).toBe(1);

    const validated = validateQualityOrganizationPolicyComposition(orgOverride);
    expect(validated.orgId).toBe("org-acme");
  });

  it("records organization audit log entries for catalog access", () => {
    const auditRecord = auditOrganizationCatalogAccess({
      orgId: "org-acme",
      action: "signature-verify",
      entityId: "pack-acme-security@1.0.0",
      status: "success",
      details: "Signature matched active trust root ed25519",
    });

    expect(auditRecord.orgId).toBe("org-acme");
    expect(auditRecord.action).toBe("signature-verify");
    expect(auditRecord.status).toBe("success");

    const validated = validateQualityOrganizationAuditRecord(auditRecord);
    expect(validated.auditId).toBe(auditRecord.auditId);
  });

  it("validates organization catalog entry schema boundary", () => {
    const entry = validateQualityOrganizationCatalogEntry({
      id: "entry-001",
      orgId: "org-acme",
      packId: "acme/security",
      version: "1.0.0",
      signature: "sig:abc123",
      trustRootId: "trustroot-001",
      retentionDays: 90,
      auditRequired: true,
      contentDigest: "sha256:digest123",
      createdAt: "2026-08-10T12:00:00.000Z",
    });

    expect(entry.retentionDays).toBe(90);
    expect(entry.auditRequired).toBe(true);

    expect(() =>
      validateQualityOrganizationCatalogEntry({
        id: "entry-001",
        orgId: "org-acme",
        packId: "acme/security",
        version: "1.0.0",
        signature: "sig:abc123",
        trustRootId: "trustroot-001",
        retentionDays: -5,
        auditRequired: true,
        contentDigest: "sha256:digest123",
        createdAt: "2026-08-10T12:00:00.000Z",
      }),
    ).toThrow(/organizationCatalogEntry.retentionDays/i);
  });
});
