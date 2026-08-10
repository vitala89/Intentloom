import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  resolveDisciplineFromAlias,
  resolveFirstPartySpecializedPackDetection,
  validateFirstPartySpecializedPackCatalog,
} from "@intentloom/application";
import { QUALITY_SPECIALIZED_PACK_DETECTION_RESOLUTION_SCHEMA_URN } from "@intentloom/protocol";
import {
  validateQualitySpecializedPackDetectionResolution,
  validateQualitySpecializedPackManifest,
} from "@intentloom/validator";
import {
  FIRST_PARTY_SPECIALIZED_PACKS,
  FIRST_PARTY_SPECIALIZED_PACK_IDS,
} from "../catalog/packs/specialized-engineering/index.js";

type ProjectPathProfiles = Record<string, readonly string[]>;

const fixturePath = fileURLToPath(
  new URL(
    "./fixtures/specialized-packs/project-path-profiles.json",
    import.meta.url,
  ),
);
const projectPathProfiles = JSON.parse(
  readFileSync(fixturePath, "utf8"),
) as ProjectPathProfiles;

const reversed = <T>(values: readonly T[]): T[] => {
  const result: T[] = [];
  for (let index = values.length - 1; index >= 0; index -= 1) {
    result.push(values[index]!);
  }
  return result;
};

describe("Specialized Engineering Packs Phase S5: First-Party Pack Catalog and Fixtures", () => {
  it("validates every first-party specialized pack manifest and detection rule", () => {
    const catalog = validateFirstPartySpecializedPackCatalog(
      FIRST_PARTY_SPECIALIZED_PACKS,
    );

    expect(catalog.manifests).toHaveLength(4);
    expect(catalog.detectionRules).toHaveLength(4);
    expect(
      catalog.trustStates.every(
        (state) => state.trustLevel === "verified-first-party",
      ),
    ).toBe(true);
    expect(
      catalog.manifests.every(
        (manifest) =>
          validateQualitySpecializedPackManifest(manifest).id === manifest.id,
      ),
    ).toBe(true);
  });

  it("produces identical catalog validation independent of input ordering", () => {
    const first = validateFirstPartySpecializedPackCatalog(
      FIRST_PARTY_SPECIALIZED_PACKS,
    );
    const second = validateFirstPartySpecializedPackCatalog(
      reversed(FIRST_PARTY_SPECIALIZED_PACKS),
    );

    expect(second).toEqual(first);
  });

  it("detects compatible first-party packs from fixture project path profiles", () => {
    for (const entry of FIRST_PARTY_SPECIALIZED_PACKS) {
      const projectPaths = projectPathProfiles[entry.fixtureProfileId];
      expect(projectPaths).toBeDefined();

      const resolution = resolveFirstPartySpecializedPackDetection({
        projectPaths: projectPaths!,
        entries: FIRST_PARTY_SPECIALIZED_PACKS,
      });

      expect(resolution.schemaVersion).toBe(
        QUALITY_SPECIALIZED_PACK_DETECTION_RESOLUTION_SCHEMA_URN,
      );
      expect(resolution.compatiblePackIds).toContain(entry.manifest.id);
      expect(
        resolution.detection.candidates.some(
          (candidate) => candidate.packId === entry.manifest.id,
        ),
      ).toBe(true);
      expect(
        resolution.detection.candidates.every(
          (candidate) => candidate.requiresConfirmation === true,
        ),
      ).toBe(true);

      validateQualitySpecializedPackDetectionResolution(resolution);
    }
  });

  it("resolves discipline aliases bundled with first-party packs without duplicating rules", () => {
    const catalog = validateFirstPartySpecializedPackCatalog(
      FIRST_PARTY_SPECIALIZED_PACKS,
    );
    const desktopAlias = catalog.aliases.find(
      (alias) => alias.aliasId === "alias-desktop-platform-engineer",
    );

    expect(desktopAlias).toBeDefined();

    const resolved = resolveDisciplineFromAlias(
      "Desktop Platform Engineer",
      catalog.aliases,
      [
        {
          schemaVersion: "urn:intentloom:schema:quality-discipline:1",
          id: "discipline-desktop",
          name: "Desktop Engineering",
          category: "desktop",
          defaultConcerns: ["ipc-boundary"],
          supportedArchitectureStrategies: ["tauri-rust-hal"],
        },
      ],
    );

    expect(resolved.matchingAlias?.aliasId).toBe(
      "alias-desktop-platform-engineer",
    );
    expect(resolved.canonicalDiscipline?.id).toBe("discipline-desktop");
  });

  it("keeps first-party catalog entries immutable during resolution", () => {
    const before = structuredClone(FIRST_PARTY_SPECIALIZED_PACKS);

    resolveFirstPartySpecializedPackDetection({
      projectPaths: projectPathProfiles["desktop-tauri"]!,
      entries: FIRST_PARTY_SPECIALIZED_PACKS,
    });

    expect(FIRST_PARTY_SPECIALIZED_PACKS).toEqual(before);
    expect(FIRST_PARTY_SPECIALIZED_PACK_IDS).toEqual([
      "pack-tauri-desktop",
      "pack-embedded-firmware",
      "pack-cloud-terraform",
      "pack-game-development",
    ]);
  });
});
