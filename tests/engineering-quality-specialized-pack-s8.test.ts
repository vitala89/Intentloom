import { describe, expect, it } from "vitest";
import {
  activateExternalSpecializedPack,
  computeExternalSpecializedPackDigest,
  evaluateSpecializedPackCompatibility,
  previewExternalSpecializedPack,
  registerSpecializedPackManifest,
} from "@intentloom/application";
import {
  QUALITY_PACK_ACTIVATION_SCHEMA_URN,
  QUALITY_SPECIALIZED_PACK_SCHEMA_URN,
  type QualitySpecializedPackManifest,
} from "@intentloom/protocol";

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
    declaredLicense: "MIT",
  };
}

describe("Specialized Engineering Packs Phase S8", () => {
  it("previews a pinned external pack with provenance, permissions, and untrusted trust", () => {
    const manifest = externalManifest();
    const preview = previewExternalSpecializedPack(previewInput(manifest));

    expect(preview.status).toBe("ready-for-review");
    expect(preview.source.pin).toBe("local-v1");
    expect(preview.trustState.trustLevel).toBe("untrusted-external");
    expect(preview.compatible).toBe(false);
    expect(preview.extensionPlan.targetExtensionId).toBe(manifest.id);
    expect(preview.manifest.permissionsRequired).toEqual([
      "project.files.read",
    ]);
  });

  it("keeps an untrusted preview out of the compatible set until human activation", () => {
    const manifest = externalManifest();
    const preview = previewExternalSpecializedPack(previewInput(manifest));
    const before = evaluateSpecializedPackCompatibility(
      [manifest],
      [preview.trustState],
    );
    expect(before.compatiblePacks).toEqual([]);
    expect(before.rejectedPacks[0]?.reason).toMatch(/untrusted-external/);

    const activated = activateExternalSpecializedPack(preview, {
      schemaVersion: QUALITY_PACK_ACTIVATION_SCHEMA_URN,
      decision: "approve",
      reviewerId: "reviewer-ada",
      source: preview.source,
    });
    expect(activated.trustState.trustLevel).toBe("reviewed-organization");
    expect(activated.trustState.verifiedBy).toBe("reviewer-ada");

    const after = evaluateSpecializedPackCompatibility(
      [manifest],
      [activated.trustState],
    );
    expect(after.compatiblePacks.map((item) => item.id)).toEqual([manifest.id]);
  });

  it("rejects a digest mismatch, first-party id collision, and safety-expanding permissions", () => {
    const manifest = externalManifest();
    expect(() =>
      previewExternalSpecializedPack({
        ...previewInput(manifest),
        source: {
          ...previewInput(manifest).source,
          digest:
            "sha256:0000000000000000000000000000000000000000000000000000000000000000",
        },
      }),
    ).toThrow(/digest/);

    const firstParty = registerSpecializedPackManifest({
      id: "pack-tauri-desktop",
      version: "1.0.0",
      name: "Desktop",
      publisher: "Intentloom First-Party",
    });
    const colliding = previewExternalSpecializedPack({
      ...previewInput(externalManifest({ id: firstParty.id })),
      existingManifests: [firstParty],
    });
    expect(colliding.status).toBe("rejected");
    expect(colliding.diagnostics.join(" ")).toMatch(/first-party/);

    const unsafe = previewExternalSpecializedPack(
      previewInput(
        externalManifest({
          id: "pack-unsafe-net",
          permissionsRequired: ["network.connect"],
        }),
      ),
    );
    expect(unsafe.status).toBe("rejected");
    expect(unsafe.diagnostics.join(" ")).toMatch(/safety capability/);
  });

  it("does not activate a rejected preview and does not write project files", () => {
    const unsafe = previewExternalSpecializedPack(
      previewInput(
        externalManifest({
          id: "pack-unsafe-shell",
          permissionsRequired: ["generic-shell"],
        }),
      ),
    );
    expect(() =>
      activateExternalSpecializedPack(unsafe, {
        schemaVersion: QUALITY_PACK_ACTIVATION_SCHEMA_URN,
        decision: "approve",
        reviewerId: "reviewer-ada",
        source: unsafe.source,
      }),
    ).toThrow(/ready-for-review/);
  });
});
