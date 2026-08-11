import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  registerSpecializedPackCheckDefinition,
  resolveFirstPartySpecializedPackChecks,
  runSpecializedPackDeterministicChecks,
  validateFirstPartySpecializedPackCatalog,
} from "@intentloom/application";
import {
  QUALITY_SPECIALIZED_PACK_CHECK_REPORT_SCHEMA_URN,
  QUALITY_SPECIALIZED_PACK_CHECK_RESULT_SCHEMA_URN,
} from "@intentloom/protocol";
import {
  validateQualitySpecializedPackCheckDefinition,
  validateQualitySpecializedPackCheckReport,
  validateQualitySpecializedPackCheckResult,
} from "@intentloom/validator";
import { FIRST_PARTY_SPECIALIZED_PACKS } from "../catalog/packs/specialized-engineering/index.js";

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

describe("Specialized Engineering Packs Phase S7: Deterministic Checks", () => {
  it("validates every first-party specialized pack check definition", () => {
    const catalog = validateFirstPartySpecializedPackCatalog(
      FIRST_PARTY_SPECIALIZED_PACKS,
    );

    expect(catalog.checkDefinitions).toHaveLength(8);
    expect(
      catalog.checkDefinitions.every(
        (definition) =>
          validateQualitySpecializedPackCheckDefinition(definition).ruleId ===
          definition.ruleId,
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

  it("passes stable path-presence checks for fixture project path profiles", () => {
    for (const entry of FIRST_PARTY_SPECIALIZED_PACKS) {
      const projectPaths = projectPathProfiles[entry.fixtureProfileId];
      expect(projectPaths).toBeDefined();

      const report = resolveFirstPartySpecializedPackChecks({
        projectPaths: projectPaths!,
        entries: FIRST_PARTY_SPECIALIZED_PACKS,
      });

      expect(report.schemaVersion).toBe(
        QUALITY_SPECIALIZED_PACK_CHECK_REPORT_SCHEMA_URN,
      );
      expect(report.activePackIds).toContain(entry.manifest.id);
      expect(
        report.result.findings.filter(
          (finding) =>
            finding.packId === entry.manifest.id && finding.state === "failed",
        ),
      ).toHaveLength(0);
      validateQualitySpecializedPackCheckReport(report);
    }
  });

  it("skips checks for packs that are not active in the project", () => {
    const catalog = validateFirstPartySpecializedPackCatalog(
      FIRST_PARTY_SPECIALIZED_PACKS,
    );
    const result = runSpecializedPackDeterministicChecks({
      projectPaths: projectPathProfiles["desktop-tauri"]!,
      definitions: catalog.checkDefinitions,
      activePackIds: ["pack-tauri-desktop"],
    });

    expect(
      result.findings.filter(
        (finding) => finding.packId !== "pack-tauri-desktop",
      ),
    ).toEqual(
      expect.arrayContaining([expect.objectContaining({ state: "skipped" })]),
    );
    validateQualitySpecializedPackCheckResult(result);
  });

  it("fails path-presence checks when required evidence is missing", () => {
    const definition = registerSpecializedPackCheckDefinition({
      packId: "pack-tauri-desktop",
      ruleId: "DESK-001-ipc-capability-review",
      kind: "path-presence",
      signals: [
        {
          pathPattern: "missing/tauri/root/",
          matchKind: "contains",
          label: "missing-root",
        },
      ],
      severity: "blocking",
      summary: "Missing Tauri root evidence",
    });

    const result = runSpecializedPackDeterministicChecks({
      projectPaths: ["apps/desktop/src/App.tsx"],
      definitions: [definition],
      activePackIds: ["pack-tauri-desktop"],
    });

    expect(result.schemaVersion).toBe(
      QUALITY_SPECIALIZED_PACK_CHECK_RESULT_SCHEMA_URN,
    );
    expect(result.findings).toEqual([
      expect.objectContaining({
        ruleId: "DESK-001-ipc-capability-review",
        state: "failed",
        severity: "blocking",
      }),
    ]);
  });

  it("fails path-absence checks when forbidden evidence is present", () => {
    const definition = registerSpecializedPackCheckDefinition({
      packId: "pack-cloud-terraform",
      ruleId: "CLD-001-least-privilege-iam",
      kind: "path-absence",
      signals: [
        {
          pathPattern: "secrets.auto.tfvars",
          matchKind: "suffix",
          label: "committed-secrets-file",
        },
      ],
      severity: "blocking",
      summary: "Committed secrets tfvars must not be present",
    });

    const result = runSpecializedPackDeterministicChecks({
      projectPaths: ["infra/secrets.auto.tfvars"],
      definitions: [definition],
      activePackIds: ["pack-cloud-terraform"],
    });

    expect(result.findings[0]).toMatchObject({
      state: "failed",
      evidencePaths: ["infra/secrets.auto.tfvars"],
    });
  });

  it("keeps first-party catalog entries immutable during check resolution", () => {
    const before = structuredClone(FIRST_PARTY_SPECIALIZED_PACKS);

    resolveFirstPartySpecializedPackChecks({
      projectPaths: projectPathProfiles["desktop-tauri"]!,
      entries: FIRST_PARTY_SPECIALIZED_PACKS,
    });

    expect(FIRST_PARTY_SPECIALIZED_PACKS).toEqual(before);
  });
});
