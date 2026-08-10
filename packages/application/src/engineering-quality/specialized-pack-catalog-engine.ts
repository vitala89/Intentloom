import type {
  QualityDisciplineAlias,
  QualitySpecializedPackDetectionResolution,
  QualitySpecializedPackDetectionRule,
  QualitySpecializedPackManifest,
  QualitySpecializedPackTrustState,
} from "@intentloom/protocol";
import {
  validateQualityDisciplineAlias,
  validateQualitySpecializedPackDetectionRule,
  validateQualitySpecializedPackManifest,
} from "@intentloom/validator";
import { evaluateSpecializedPackTrustState } from "./specialized-pack-manifest-engine.js";
import { resolveSpecializedPackDetection } from "./specialized-pack-detection-engine.js";

export interface FirstPartySpecializedPackCatalogEntry {
  readonly manifest: QualitySpecializedPackManifest;
  readonly detectionRule: QualitySpecializedPackDetectionRule;
  readonly aliases?: readonly QualityDisciplineAlias[];
  readonly fixtureProfileId: string;
}

export interface ValidatedFirstPartySpecializedPackCatalog {
  readonly entries: readonly FirstPartySpecializedPackCatalogEntry[];
  readonly manifests: readonly QualitySpecializedPackManifest[];
  readonly detectionRules: readonly QualitySpecializedPackDetectionRule[];
  readonly aliases: readonly QualityDisciplineAlias[];
  readonly trustStates: readonly QualitySpecializedPackTrustState[];
}

function lexicalSort<T>(values: readonly T[], key: (value: T) => string): T[] {
  return [...values].sort((left, right) => key(left).localeCompare(key(right)));
}

export function validateFirstPartySpecializedPackCatalog(
  entries: readonly FirstPartySpecializedPackCatalogEntry[],
): ValidatedFirstPartySpecializedPackCatalog {
  const validatedEntries = lexicalSort(
    entries.map((entry) => ({
      ...entry,
      manifest: validateQualitySpecializedPackManifest(entry.manifest),
      detectionRule: validateQualitySpecializedPackDetectionRule(
        entry.detectionRule,
      ),
      aliases: (entry.aliases ?? []).map((alias) =>
        validateQualityDisciplineAlias(alias),
      ),
    })),
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
