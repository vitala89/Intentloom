import { describe, expect, it } from "vitest";
import {
  FIRST_PARTY_CATALOG_ENTRIES,
  comparePackLock,
  diffEngineeringQualityPackUpdates,
  evaluateRevocationState,
  inspectEngineeringCatalogEntry,
  searchEngineeringCatalog,
  verifyQuarantineArtifact,
} from "@intentloom/application";
import type { CatalogEntry } from "@intentloom/protocol";
import { QUALITY_CATALOG_LOCK_SCHEMA_URN } from "@intentloom/protocol";

import {
  validateCatalogEntry,
  validateCatalogSearchQuery,
  validateEngineeringQualityPackLock,
  validateEngineeringQualityPackUpdateDiff,
  validateEngineeringQualityRevocationState,
  validateQuarantineArtifact,
} from "@intentloom/validator";

describe("Engineering Quality Packs Phase Q10 - Curated Catalog", () => {
  const sampleEntry: CatalogEntry = FIRST_PARTY_CATALOG_ENTRIES[0];

  describe("Catalog Search & Inspection", () => {
    it("searches catalog entries by query string", () => {
      const result = searchEngineeringCatalog(FIRST_PARTY_CATALOG_ENTRIES, {
        query: "TypeScript",
      });
      expect(result.total).toBe(1);
      expect(result.entries[0].id).toBe("intentloom/typescript");
    });

    it("filters catalog entries by trustClass and pagination", () => {
      const result = searchEngineeringCatalog(FIRST_PARTY_CATALOG_ENTRIES, {
        trustClass: "first-party",
        limit: 1,
        offset: 0,
      });
      expect(result.entries.length).toBe(1);
      expect(result.total).toBe(2);
    });

    it("inspects catalog entry by id and version", () => {
      const entry = inspectEngineeringCatalogEntry(
        FIRST_PARTY_CATALOG_ENTRIES,
        "intentloom/base",
        "1.0.0",
      );
      expect(entry.id).toBe("intentloom/base");
      expect(entry.version).toBe("1.0.0");
    });

    it("throws when inspecting non-existent pack entry", () => {
      expect(() =>
        inspectEngineeringCatalogEntry(
          FIRST_PARTY_CATALOG_ENTRIES,
          "non-existent/pack",
        ),
      ).toThrow("Catalog entry not found: non-existent/pack");
    });
  });

  describe("Quarantine Verification & Digest Boundary", () => {
    it("verifies quarantine artifact with valid digest", () => {
      const emptyDigest =
        "sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";
      const artifact = verifyQuarantineArtifact(sampleEntry, "", emptyDigest);
      expect(artifact.quarantineState).toBe("verified");
      expect(artifact.catalogEntryId).toBe(sampleEntry.id);
      expect(artifact.failureReason).toBeUndefined();
    });

    it("fails quarantine verification on digest mismatch", () => {
      const artifact = verifyQuarantineArtifact(
        sampleEntry,
        "unexpected content",
      );
      expect(artifact.quarantineState).toBe("failed");
      expect(artifact.failureReason).toContain("Content digest mismatch");
    });

    it("fails closed when verifying revoked or yanked catalog entries", () => {
      const revokedEntry: CatalogEntry = {
        ...sampleEntry,
        supportStatus: "revoked",
        revokedAt: "2026-08-05T00:00:00Z",
        yankReason: "Security vulnerability",
      };
      const artifact = verifyQuarantineArtifact(revokedEntry, "");
      expect(artifact.quarantineState).toBe("failed");
      expect(artifact.failureReason).toContain(
        "Quarantine verification failed closed",
      );
    });
  });

  describe("Pack Lock & Deterministic Update Diff", () => {
    it("compares and updates pack lock representations", () => {
      const initialLock = validateEngineeringQualityPackLock({
        schemaVersion: QUALITY_CATALOG_LOCK_SCHEMA_URN,
        lockVersion: 1,
        packs: [],
      });
      const updatedLock = comparePackLock(initialLock, [
        {
          id: "intentloom/base",
          version: "1.0.0",
          digest:
            "sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
        },
      ]);
      expect(updatedLock.lockVersion).toBe(2);
      expect(updatedLock.packs.length).toBe(1);
      expect(updatedLock.packs[0].integrityStatus).toBe("verified");
    });

    it("computes deterministic pack update diff for upgrade", () => {
      const targetEntry: CatalogEntry = {
        ...sampleEntry,
        version: "1.1.0",
      };
      const diff = diffEngineeringQualityPackUpdates(sampleEntry, targetEntry);
      expect(diff.changeType).toBe("upgrade");
      expect(diff.currentVersion).toBe("1.0.0");
      expect(diff.targetVersion).toBe("1.1.0");
      expect(diff.riskAssessment).toBe("low");
    });

    it("evaluates high risk and warning for revoked or yanked target packs", () => {
      const targetEntry: CatalogEntry = {
        ...sampleEntry,
        version: "1.0.1",
        supportStatus: "yanking",
        yankReason: "Deprecation",
      };
      const diff = diffEngineeringQualityPackUpdates(sampleEntry, targetEntry);
      expect(diff.changeType).toBe("yanked_migration");
      expect(diff.riskAssessment).toBe("high");
      expect(diff.revocationWarning).toBeDefined();
    });
  });

  describe("Revocation State & Untrusted Payload Validation", () => {
    it("evaluates revocation state fail-closed flags", () => {
      const revState = evaluateRevocationState(sampleEntry);
      expect(revState.failClosed).toBe(false);
      expect(revState.isRevoked).toBe(false);

      const revokedState = evaluateRevocationState({
        ...sampleEntry,
        supportStatus: "revoked",
      });
      expect(revokedState.failClosed).toBe(true);
      expect(revokedState.isRevoked).toBe(true);
    });

    it("validates untrusted catalog search queries and entries", () => {
      const parsedQuery = validateCatalogSearchQuery({
        query: "test",
        limit: 10,
      });
      expect(parsedQuery.query).toBe("test");
      expect(parsedQuery.limit).toBe(10);

      expect(() =>
        validateCatalogEntry({ schemaVersion: "invalid-urn" }),
      ).toThrow("catalog entry schema must equal");
    });

    it("validates quarantine, lock, update diff, and revocation state payloads", () => {
      expect(() =>
        validateQuarantineArtifact({ schemaVersion: "invalid-urn" }),
      ).toThrow("quarantine schema must equal");

      expect(() =>
        validateEngineeringQualityPackUpdateDiff({
          schemaVersion: "invalid-urn",
        }),
      ).toThrow("update diff schema must equal");

      expect(() =>
        validateEngineeringQualityRevocationState({
          schemaVersion: "invalid-urn",
        }),
      ).toThrow("revocation state schema must equal");
    });
  });
});
