import { describe, expect, it } from "vitest";
import { resolveEngineeringQualityPacks } from "@intentloom/application";
import {
  QUALITY_PACK_RESOLUTION_SCHEMA_URN,
  type EngineeringQualityPack,
} from "@intentloom/protocol";
import { validateEngineeringQualityPack } from "@intentloom/validator";
import { FIRST_PARTY_ENGINEERING_QUALITY_PACKS } from "../catalog/packs/engineering-quality/index.js";

const context = {
  intentloomVersion: "1.0.2",
  technologies: [
    { technologyId: "typescript", version: "5.8.2" },
    { technologyId: "@angular/core", version: "19.0.0" },
    { technologyId: "react", version: "19.0.0" },
    { technologyId: "rust", version: "1.85.0" },
    { technologyId: "tauri", version: "2.5.0" },
  ],
};

const allIds = FIRST_PARTY_ENGINEERING_QUALITY_PACKS.map((pack) => pack.id);
const reversed = <T>(values: readonly T[]): T[] => {
  const result: T[] = [];
  for (let index = values.length - 1; index >= 0; index -= 1) {
    result.push(values[index]!);
  }
  return result;
};

describe("Engineering Quality Packs (Phase Q6)", () => {
  it("validates and resolves every first-party pack with dependencies", () => {
    const resolution = resolveEngineeringQualityPacks({
      packs: FIRST_PARTY_ENGINEERING_QUALITY_PACKS,
      requestedPackIds: allIds,
      context,
    });

    expect(resolution.schemaVersion).toBe(QUALITY_PACK_RESOLUTION_SCHEMA_URN);
    expect(resolution.status).toBe("resolved");
    expect(resolution.resolvedPacks[0]!.id).toBe("intentloom/base-quality");
    expect(resolution.resolvedPacks).toHaveLength(9);
    expect(resolution.entries).toHaveLength(25);
    expect(
      new Set(resolution.entries.map((entry) => entry.meaningId)).size,
    ).toBe(resolution.entries.length);
  });

  it("produces identical output independent of input ordering", () => {
    const first = resolveEngineeringQualityPacks({
      packs: FIRST_PARTY_ENGINEERING_QUALITY_PACKS,
      requestedPackIds: allIds,
      context,
    });
    const second = resolveEngineeringQualityPacks({
      packs: reversed(FIRST_PARTY_ENGINEERING_QUALITY_PACKS),
      requestedPackIds: reversed(allIds),
      context,
    });

    expect(second).toEqual(first);
  });

  it("fails truthfully when a technology compatibility range is unavailable", () => {
    const resolution = resolveEngineeringQualityPacks({
      packs: FIRST_PARTY_ENGINEERING_QUALITY_PACKS,
      requestedPackIds: ["intentloom/typescript"],
      context: { intentloomVersion: "1.0.2" },
    });

    expect(resolution.status).toBe("incompatible");
    expect(resolution.conflicts[0]!.kind).toBe("incompatible-pack");
    expect(resolution.resolvedPacks).toEqual([]);
  });

  it("rejects duplicate and conflicting canonical meanings", () => {
    const base = FIRST_PARTY_ENGINEERING_QUALITY_PACKS[0]!;
    const duplicateMeaningPack: EngineeringQualityPack = {
      ...base,
      id: "test/duplicate-meaning",
      entries: [
        ...base.entries,
        {
          ...base.entries[0]!,
          id: "duplicate-file-size",
          meaningId: "quality.file.same-semantic-meaning",
        },
      ],
    };
    const conflictingMeaningPack: EngineeringQualityPack = {
      ...base,
      id: "test/conflicting-meaning",
      entries: [
        {
          ...base.entries[0]!,
          id: "conflicting-file-size",
          severity: "warning",
        },
      ],
    };

    const duplicate = resolveEngineeringQualityPacks({
      packs: [base, duplicateMeaningPack],
      requestedPackIds: [base.id, duplicateMeaningPack.id],
      context,
    });
    const conflict = resolveEngineeringQualityPacks({
      packs: [base, conflictingMeaningPack],
      requestedPackIds: [base.id, conflictingMeaningPack.id],
      context,
    });

    expect(duplicate.conflicts.map((item) => item.kind)).toContain(
      "duplicate-meaning",
    );
    expect(conflict.conflicts.map((item) => item.kind)).toContain(
      "conflicting-meaning",
    );
  });

  it("validates untrusted provenance and entry data at the boundary", () => {
    expect(() =>
      validateEngineeringQualityPack({
        ...FIRST_PARTY_ENGINEERING_QUALITY_PACKS[0],
        provenance: {
          ...FIRST_PARTY_ENGINEERING_QUALITY_PACKS[0]!.provenance,
          references: [
            {
              id: "bad",
              title: "Bad source",
              uri: "javascript:alert(1)",
              kind: "official-documentation",
            },
          ],
        },
      }),
    ).toThrow(/HTTPS or repository-relative/);

    expect(() =>
      validateEngineeringQualityPack({
        ...FIRST_PARTY_ENGINEERING_QUALITY_PACKS[0],
        entries: [
          FIRST_PARTY_ENGINEERING_QUALITY_PACKS[0]!.entries[0],
          FIRST_PARTY_ENGINEERING_QUALITY_PACKS[0]!.entries[0],
        ],
      }),
    ).toThrow(/duplicate entry id/);
  });

  it("does not mutate pack data while resolving", () => {
    const before = structuredClone(FIRST_PARTY_ENGINEERING_QUALITY_PACKS);

    resolveEngineeringQualityPacks({
      packs: FIRST_PARTY_ENGINEERING_QUALITY_PACKS,
      requestedPackIds: allIds,
      context,
    });

    expect(FIRST_PARTY_ENGINEERING_QUALITY_PACKS).toEqual(before);
  });
});
