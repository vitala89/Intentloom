import { describe, expect, it } from "vitest";
import {
  composeRoleDefinition,
  registerDisciplineDefinition,
  resolveRoleCompositionForPath,
} from "@intentloom/application";
import {
  QUALITY_DISCIPLINE_SCHEMA_URN,
  QUALITY_ROLE_COMPOSITION_SCHEMA_URN,
} from "@intentloom/protocol";
import {
  validateQualityDisciplineDefinition,
  validateQualityRoleComposition,
} from "@intentloom/validator";

describe("Specialized Engineering Packs Phase S1: Canonical Disciplines & Role Composition", () => {
  it("registers canonical discipline definitions with valid category and default concerns", () => {
    const desktopDiscipline = registerDisciplineDefinition({
      name: "Desktop Engineering",
      category: "desktop",
      defaultConcerns: ["ipc-boundary", "window-lifecycle", "native-security"],
      supportedArchitectureStrategies: ["tauri-rust-hal", "electron-sandbox"],
    });

    expect(desktopDiscipline.schemaVersion).toBe(QUALITY_DISCIPLINE_SCHEMA_URN);
    expect(desktopDiscipline.id).toBe("discipline-desktop");
    expect(desktopDiscipline.category).toBe("desktop");
    expect(desktopDiscipline.defaultConcerns).toContain("ipc-boundary");

    const validated = validateQualityDisciplineDefinition(desktopDiscipline);
    expect(validated.id).toBe(desktopDiscipline.id);
  });

  it("composes role definitions from title aliases with primary and secondary disciplines", () => {
    const productEngineerRole = composeRoleDefinition({
      titleAlias: "Desktop Platform Engineer",
      primaryDisciplineId: "discipline-desktop",
      secondaryDisciplineIds: [
        "discipline-security",
        "discipline-quality-engineering",
      ],
      taskScopeFilter: ["apps/desktop", "src-tauri"],
      createdAt: "2026-08-10T12:00:00.000Z",
    });

    expect(productEngineerRole.schemaVersion).toBe(
      QUALITY_ROLE_COMPOSITION_SCHEMA_URN,
    );
    expect(productEngineerRole.titleAlias).toBe("Desktop Platform Engineer");
    expect(productEngineerRole.primaryDisciplineId).toBe("discipline-desktop");
    expect(productEngineerRole.secondaryDisciplineIds).toContain(
      "discipline-security",
    );

    const validated = validateQualityRoleComposition(productEngineerRole);
    expect(validated.id).toBe(productEngineerRole.id);
  });

  it("resolves role compositions for target file paths and combines effective concerns", () => {
    const desktopDisc = registerDisciplineDefinition({
      id: "disc-desktop",
      name: "Desktop Engineering",
      category: "desktop",
      defaultConcerns: ["ipc-security", "memory-budget"],
    });

    const securityDisc = registerDisciplineDefinition({
      id: "disc-security",
      name: "AppSec",
      category: "security",
      defaultConcerns: ["credential-redaction", "input-sanitization"],
    });

    const role = composeRoleDefinition({
      id: "role-desktop-sec",
      titleAlias: "Desktop Platform Engineer",
      primaryDisciplineId: "disc-desktop",
      secondaryDisciplineIds: ["disc-security"],
      taskScopeFilter: ["apps/desktop"],
    });

    const pathResolution = resolveRoleCompositionForPath(
      "apps/desktop/src-tauri/src/main.rs",
      [role],
      [desktopDisc, securityDisc],
    );

    expect(pathResolution.matchingRole?.id).toBe("role-desktop-sec");
    expect(pathResolution.effectiveConcerns).toContain("ipc-security");
    expect(pathResolution.effectiveConcerns).toContain("credential-redaction");

    const nonMatchingResolution = resolveRoleCompositionForPath(
      "apps/web/src/index.tsx",
      [role],
      [desktopDisc, securityDisc],
    );
    expect(nonMatchingResolution.matchingRole).toBeNull();
  });

  it("validates discipline and role composition schema boundaries", () => {
    expect(() =>
      validateQualityDisciplineDefinition({
        schemaVersion: QUALITY_DISCIPLINE_SCHEMA_URN,
        id: "disc-invalid",
        name: "Invalid",
        category: "invalid-category-name",
        defaultConcerns: [],
        supportedArchitectureStrategies: [],
      }),
    ).toThrow(/disciplineDefinition.category/i);

    expect(() =>
      validateQualityRoleComposition({
        schemaVersion: QUALITY_ROLE_COMPOSITION_SCHEMA_URN,
        id: "role-invalid",
        titleAlias: "Invalid Role",
        primaryDisciplineId: "disc-1",
        secondaryDisciplineIds: "not-an-array",
        createdAt: "2026-08-10T12:00:00.000Z",
      }),
    ).toThrow(/roleComposition.secondaryDisciplineIds/i);
  });
});
