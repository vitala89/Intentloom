import { describe, expect, it } from "vitest";
import {
  registerDisciplineAlias,
  registerDisciplineDefinition,
  resolveDisciplineFromAlias,
} from "@intentloom/application";
import { QUALITY_DISCIPLINE_ALIAS_SCHEMA_URN } from "@intentloom/protocol";
import { validateQualityDisciplineAlias } from "@intentloom/validator";

describe("Specialized Engineering Packs Phase S3: Discipline Aliases", () => {
  it("registers discipline aliases mapping human job titles to canonical discipline IDs", () => {
    const sdetAlias = registerDisciplineAlias({
      aliasId: "alias-sdet",
      humanTitle: "Software Development Engineer in Test",
      targetDisciplineId: "discipline-quality-engineering",
      organizationScope: "corp-qa-org",
      createdAt: "2026-08-10T12:00:00.000Z",
    });

    expect(sdetAlias.schemaVersion).toBe(QUALITY_DISCIPLINE_ALIAS_SCHEMA_URN);
    expect(sdetAlias.aliasId).toBe("alias-sdet");
    expect(sdetAlias.targetDisciplineId).toBe("discipline-quality-engineering");
    expect(sdetAlias.organizationScope).toBe("corp-qa-org");

    const validated = validateQualityDisciplineAlias(sdetAlias);
    expect(validated.aliasId).toBe(sdetAlias.aliasId);
  });

  it("resolves discipline aliases to canonical discipline definitions without duplicating rules", () => {
    const platformDiscipline = registerDisciplineDefinition({
      id: "disc-platform",
      name: "Platform Engineering",
      category: "platform-engineering",
      defaultConcerns: ["developer-experience", "internal-developer-portal"],
    });

    const alias = registerDisciplineAlias({
      humanTitle: "DevOps Lead",
      targetDisciplineId: "disc-platform",
    });

    const resultByTitle = resolveDisciplineFromAlias(
      "devops lead",
      [alias],
      [platformDiscipline],
    );

    expect(resultByTitle.matchingAlias?.humanTitle).toBe("DevOps Lead");
    expect(resultByTitle.canonicalDiscipline?.id).toBe("disc-platform");
    expect(resultByTitle.canonicalDiscipline?.category).toBe(
      "platform-engineering",
    );

    const resultById = resolveDisciplineFromAlias(
      alias.aliasId,
      [alias],
      [platformDiscipline],
    );
    expect(resultById.matchingAlias?.aliasId).toBe(alias.aliasId);

    const nonMatching = resolveDisciplineFromAlias(
      "unknown title",
      [alias],
      [platformDiscipline],
    );
    expect(nonMatching.matchingAlias).toBeNull();
    expect(nonMatching.canonicalDiscipline).toBeNull();
  });

  it("validates discipline alias schema boundary and rejects invalid schemaVersion", () => {
    expect(() =>
      validateQualityDisciplineAlias({
        schemaVersion: "urn:intentloom:schema:invalid-alias-schema",
        aliasId: "alias-1",
        humanTitle: "Title",
        targetDisciplineId: "disc-1",
        createdAt: "2026-08-10T12:00:00.000Z",
      }),
    ).toThrow(/disciplineAlias.schemaVersion/i);
  });
});
