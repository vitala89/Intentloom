import type {
  QualityDisciplineAlias,
  QualitySpecializedPackCheckDefinition,
  QualitySpecializedPackCheckReport,
  QualitySpecializedPackDetectionResolution,
  QualitySpecializedPackDetectionRule,
  QualitySpecializedPackManifest,
  QualitySpecializedPackTrustState,
} from "@intentloom/protocol";
import {
  validateQualityDisciplineAlias,
  validateQualitySpecializedPackCheckDefinition,
  validateQualitySpecializedPackDetectionRule,
  validateQualitySpecializedPackManifest,
} from "@intentloom/validator";
import { evaluateSpecializedPackTrustState } from "./specialized-pack-manifest-engine.js";
import { resolveSpecializedPackDetection } from "./specialized-pack-detection-engine.js";
import { resolveSpecializedPackDeterministicChecks } from "./specialized-pack-check-engine.js";

export interface FirstPartySpecializedPackCatalogEntry {
  readonly manifest: QualitySpecializedPackManifest;
  readonly detectionRule: QualitySpecializedPackDetectionRule;
  readonly checkDefinitions: readonly QualitySpecializedPackCheckDefinition[];
  readonly aliases?: readonly QualityDisciplineAlias[];
  readonly fixtureProfileId: string;
}

export interface ValidatedFirstPartySpecializedPackCatalog {
  readonly entries: readonly FirstPartySpecializedPackCatalogEntry[];
  readonly manifests: readonly QualitySpecializedPackManifest[];
  readonly detectionRules: readonly QualitySpecializedPackDetectionRule[];
  readonly checkDefinitions: readonly QualitySpecializedPackCheckDefinition[];
  readonly aliases: readonly QualityDisciplineAlias[];
  readonly trustStates: readonly QualitySpecializedPackTrustState[];
}

function lexicalSort<T>(values: readonly T[], key: (value: T) => string): T[] {
  return [...values].sort((left, right) => key(left).localeCompare(key(right)));
}

function assertCheckDefinitionsMatchManifest(
  manifest: QualitySpecializedPackManifest,
  checkDefinitions: readonly QualitySpecializedPackCheckDefinition[],
): void {
  for (const definition of checkDefinitions) {
    if (definition.packId !== manifest.id) {
      throw new Error(
        `check definition ${definition.ruleId} packId must match manifest id ${manifest.id}`,
      );
    }
    if (!manifest.providedRuleIds.includes(definition.ruleId)) {
      throw new Error(
        `check definition ${definition.ruleId} must reference a manifest providedRuleId`,
      );
    }
  }
}

export function validateFirstPartySpecializedPackCatalog(
  entries: readonly FirstPartySpecializedPackCatalogEntry[],
): ValidatedFirstPartySpecializedPackCatalog {
  const validatedEntries = lexicalSort(
    entries.map((entry) => {
      const manifest = validateQualitySpecializedPackManifest(entry.manifest);
      const detectionRule = validateQualitySpecializedPackDetectionRule(
        entry.detectionRule,
      );
      const checkDefinitions = entry.checkDefinitions.map((definition) =>
        validateQualitySpecializedPackCheckDefinition(definition),
      );
      assertCheckDefinitionsMatchManifest(manifest, checkDefinitions);

      return {
        ...entry,
        manifest,
        detectionRule,
        checkDefinitions,
        aliases: (entry.aliases ?? []).map((alias) =>
          validateQualityDisciplineAlias(alias),
        ),
      };
    }),
    (entry) => entry.manifest.id,
  );

  const manifests = lexicalSort(
    validatedEntries.map((entry) => entry.manifest),
    (manifest) => manifest.id,
  );
  const detectionRules = lexicalSort(
    validatedEntries.map((entry) => entry.detectionRule),
    (rule) => rule.packId,
  );
  const checkDefinitions = lexicalSort(
    validatedEntries.flatMap((entry) => entry.checkDefinitions),
    (definition) => `${definition.packId}:${definition.ruleId}`,
  );
  const aliases = lexicalSort(
    validatedEntries.flatMap((entry) => entry.aliases ?? []),
    (alias) => alias.aliasId,
  );
  const trustStates = manifests.map((manifest) =>
    evaluateSpecializedPackTrustState({
      packId: manifest.id,
      trustLevel: "verified-first-party",
      verifiedBy: "intentloom-maintainers",
      verifiedAt: "2026-08-10T12:00:00.000Z",
    }),
  );

  return {
    entries: validatedEntries,
    manifests,
    detectionRules,
    checkDefinitions,
    aliases,
    trustStates,
  };
}

export function resolveFirstPartySpecializedPackDetection(input: {
  readonly projectPaths: readonly string[];
  readonly entries: readonly FirstPartySpecializedPackCatalogEntry[];
  readonly maxPaths?: number;
}): QualitySpecializedPackDetectionResolution {
  const catalog = validateFirstPartySpecializedPackCatalog(input.entries);

  return resolveSpecializedPackDetection({
    projectPaths: input.projectPaths,
    rules: catalog.detectionRules,
    manifests: catalog.manifests,
    trustStates: catalog.trustStates,
    ...(input.maxPaths !== undefined ? { maxPaths: input.maxPaths } : {}),
  });
}

export function resolveFirstPartySpecializedPackChecks(input: {
  readonly projectPaths: readonly string[];
  readonly entries: readonly FirstPartySpecializedPackCatalogEntry[];
  readonly maxPaths?: number;
}): QualitySpecializedPackCheckReport {
  const catalog = validateFirstPartySpecializedPackCatalog(input.entries);

  return resolveSpecializedPackDeterministicChecks({
    projectPaths: input.projectPaths,
    definitions: catalog.checkDefinitions,
    rules: catalog.detectionRules,
    manifests: catalog.manifests,
    trustStates: catalog.trustStates,
    ...(input.maxPaths !== undefined ? { maxPaths: input.maxPaths } : {}),
  });
}
