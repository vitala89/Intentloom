import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  activateExternalSpecializedPack,
  computeExternalSpecializedPackDigest,
  prepareExternalSpecializedPackLockEntry,
  previewExternalSpecializedPack,
  validateExternalSpecializedPackLockEntry,
} from "@intentloom/application";
import {
  QUALITY_PACK_ACTIVATION_SCHEMA_URN,
  QUALITY_SPECIALIZED_PACK_SCHEMA_URN,
  type ExtensionLockEntry,
  type QualitySpecializedPackManifest,
} from "@intentloom/protocol";
import {
  createArtifactValidator,
  validateExtensionLockDocument,
  validateQualitySpecializedPackManifest,
} from "@intentloom/validator";

const schemaRoot = resolve("catalog/schemas");
const declaredLicense = "MIT";

function externalManifest(
  overrides: Partial<QualitySpecializedPackManifest> = {},
): QualitySpecializedPackManifest {
  return {
    schemaVersion: QUALITY_SPECIALIZED_PACK_SCHEMA_URN,
    id: "pack-reviewed-org-mlops",
    version: "1.0.0",
    name: "Reviewed Org MLOps Pack",
    publisher: "Example Org",
    targetDisciplineIds: ["discipline-ml-ai"],
    providedArchitectureStrategies: ["batch-inference"],
    providedRuleIds: ["MLOPS-001-dataset-pin"],
    requiredTooling: [],
    permissionsRequired: ["project.files.read"],
    conflicts: [],
    dependencies: [],
    ...overrides,
  };
}

function previewInput(manifest: QualitySpecializedPackManifest) {
  return {
    payload: JSON.stringify(manifest),
    source: {
      kind: "local" as const,
      locator: "./packs/mlops.json",
      pin: "local-v1",
      digest: computeExternalSpecializedPackDigest(manifest),
    },
    declaredPublisher: manifest.publisher,
    declaredLicense,
  };
}

function activatedPack(manifest = externalManifest()) {
  const preview = previewExternalSpecializedPack(previewInput(manifest));
  return activateExternalSpecializedPack(preview, {
    schemaVersion: QUALITY_PACK_ACTIVATION_SCHEMA_URN,
    decision: "approve",
    reviewerId: "reviewer-ada",
    source: preview.source,
  });
}

describe("Specialized Engineering Packs Phase S8b", () => {
  describe("canonical digest", () => {
    it("produces the same digest when object key order differs", () => {
      const manifest = externalManifest();
      const reordered = validateQualitySpecializedPackManifest({
        permissionsRequired: manifest.permissionsRequired,
        conflicts: manifest.conflicts,
        dependencies: manifest.dependencies,
        providedRuleIds: manifest.providedRuleIds,
        requiredTooling: manifest.requiredTooling,
        providedArchitectureStrategies: manifest.providedArchitectureStrategies,
        targetDisciplineIds: manifest.targetDisciplineIds,
        publisher: manifest.publisher,
        name: manifest.name,
        version: manifest.version,
        id: manifest.id,
        schemaVersion: manifest.schemaVersion,
      });

      expect(computeExternalSpecializedPackDigest(manifest)).toBe(
        computeExternalSpecializedPackDigest(reordered),
      );
    });

    it("changes the digest when a semantic field changes", () => {
      const base = externalManifest();
      const changed = externalManifest({ version: "1.0.1" });
      expect(computeExternalSpecializedPackDigest(base)).not.toBe(
        computeExternalSpecializedPackDigest(changed),
      );
    });

    it("is deterministic across repeated computation", () => {
      const manifest = externalManifest();
      const first = computeExternalSpecializedPackDigest(manifest);
      const second = computeExternalSpecializedPackDigest(manifest);
      expect(first).toBe(second);
      expect(first).toMatch(/^sha256:[a-f0-9]{64}$/);
    });
  });

  describe("lock preparation", () => {
    it("prepares a deterministic extension lock entry from an approved activation", () => {
      const activation = activatedPack();
      const first = prepareExternalSpecializedPackLockEntry({
        activation,
        declaredLicense,
      });
      const second = prepareExternalSpecializedPackLockEntry({
        activation,
        declaredLicense,
      });
      expect(first).toEqual(second);
      expect(first.extensionId).toBe(activation.manifest.id);
      expect(first.resolvedVersion).toBe("1.0.0");
      expect(first.source).toEqual({
        registry: "local",
        package: "./packs/mlops.json",
        resolved: "local-v1",
      });
      expect(first.integrity).toBe(activation.digest);
      expect(first.category).toBe("policy-pack");
      expect(first.installationType).toBe("referenced");
      expect(first.manifestSchemaVersion).toBe(
        QUALITY_SPECIALIZED_PACK_SCHEMA_URN,
      );
      expect(first.publisher).toEqual({ name: "Example Org" });
      expect(first.license).toEqual({ spdxId: declaredLicense });
      expect(first.approvedBy).toBe("reviewer-ada");
      expect(first.grantedCapabilities).toEqual({});
    });

    it("validates the prepared entry against the extension-lock schema", async () => {
      const activation = activatedPack();
      const entry = prepareExternalSpecializedPackLockEntry({
        activation,
        declaredLicense,
      });
      const validator = await createArtifactValidator(schemaRoot);
      const lockResult = validateExtensionLockDocument(
        validator,
        ".aif/extension-lock.json",
        JSON.stringify({
          lockVersion: 1,
          updatedAt: entry.approvedAt,
          extensions: {
            [entry.extensionId]: entry,
          },
        }),
      );
      expect(lockResult.status).toBe("valid");
    });

    it("rejects a digest mismatch against the activation", () => {
      const activation = activatedPack();
      const entry = prepareExternalSpecializedPackLockEntry({
        activation,
        declaredLicense,
      });
      const tampered: ExtensionLockEntry = {
        ...entry,
        integrity:
          "sha256:0000000000000000000000000000000000000000000000000000000000000000",
      };
      expect(() =>
        validateExternalSpecializedPackLockEntry(activation, tampered, {
          declaredLicense,
        }),
      ).toThrow(/digest/);
    });

    it("rejects a source pin mismatch", () => {
      const activation = activatedPack();
      const entry = prepareExternalSpecializedPackLockEntry({
        activation,
        declaredLicense,
      });
      const tampered: ExtensionLockEntry = {
        ...entry,
        source: {
          registry: entry.source?.registry ?? "local",
          package: entry.source?.package ?? "./packs/mlops.json",
          resolved: "wrong-pin",
        },
      };
      expect(() =>
        validateExternalSpecializedPackLockEntry(activation, tampered, {
          declaredLicense,
        }),
      ).toThrow(/pin/);
    });

    it("rejects a source locator mismatch", () => {
      const activation = activatedPack();
      const entry = prepareExternalSpecializedPackLockEntry({
        activation,
        declaredLicense,
      });
      const tampered: ExtensionLockEntry = {
        ...entry,
        source: {
          registry: entry.source?.registry ?? "local",
          package: "./packs/other.json",
          resolved: entry.source?.resolved ?? "local-v1",
        },
      };
      expect(() =>
        validateExternalSpecializedPackLockEntry(activation, tampered, {
          declaredLicense,
        }),
      ).toThrow(/locator/);
    });

    it("rejects a pack id mismatch", () => {
      const activation = activatedPack();
      const entry = prepareExternalSpecializedPackLockEntry({
        activation,
        declaredLicense,
      });
      const tampered: ExtensionLockEntry = {
        ...entry,
        extensionId: "pack-other-id",
      };
      expect(() =>
        validateExternalSpecializedPackLockEntry(activation, tampered, {
          declaredLicense,
        }),
      ).toThrow(/pack id/);
    });
  });
});
