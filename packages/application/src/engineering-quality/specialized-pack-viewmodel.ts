import type { QualitySpecializedPackDetectionResolution } from "@intentloom/protocol";
import type { FirstPartySpecializedPackCatalogEntry } from "./specialized-pack-catalog-engine.js";

export interface SpecializedPackCatalogEntryViewModel {
  readonly id: string;
  readonly name: string;
  readonly version: string;
  readonly publisher: string;
  readonly targetDisciplineIds: readonly string[];
  readonly fixtureProfileId: string;
}

export interface SpecializedPackCatalogViewModel {
  readonly entries: readonly SpecializedPackCatalogEntryViewModel[];
  readonly totalEntries: number;
}

export interface SpecializedPackDetectionCandidateViewModel {
  readonly packId: string;
  readonly confidence: string;
  readonly evidencePathCount: number;
  readonly requiresConfirmation: true;
}

export interface SpecializedPackDetectionViewModel {
  readonly scannedPathCount: number;
  readonly excludedPathCount: number;
  readonly scanLimitReached: boolean;
  readonly compatiblePackIds: readonly string[];
  readonly candidates: readonly SpecializedPackDetectionCandidateViewModel[];
  readonly rejectedPackCount: number;
}

export interface SpecializedPackExplainViewModel {
  readonly packId: string;
  readonly name: string;
  readonly version: string;
  readonly publisher: string;
  readonly targetDisciplineIds: readonly string[];
  readonly providedArchitectureStrategies: readonly string[];
  readonly providedRuleIds: readonly string[];
  readonly requiredTooling: readonly string[];
  readonly permissionsRequired: readonly string[];
  readonly conflicts: readonly string[];
  readonly dependencies: readonly string[];
}

export function buildSpecializedPackCatalogViewModel(
  entries: readonly FirstPartySpecializedPackCatalogEntry[],
): SpecializedPackCatalogViewModel {
  const mapped = entries.map((entry) => ({
    id: entry.manifest.id,
    name: entry.manifest.name,
    version: entry.manifest.version,
    publisher: entry.manifest.publisher,
    targetDisciplineIds: entry.manifest.targetDisciplineIds,
    fixtureProfileId: entry.fixtureProfileId,
  }));
  return { entries: mapped, totalEntries: mapped.length };
}

export function buildSpecializedPackDetectionViewModel(
  resolution: QualitySpecializedPackDetectionResolution,
): SpecializedPackDetectionViewModel {
  return {
    scannedPathCount: resolution.detection.scannedPathCount,
    excludedPathCount: resolution.detection.excludedPathCount,
    scanLimitReached: resolution.detection.scanLimitReached,
    compatiblePackIds: resolution.compatiblePackIds,
    candidates: resolution.detection.candidates.map((candidate) => ({
      packId: candidate.packId,
      confidence: candidate.confidence,
      evidencePathCount: candidate.evidencePaths.length,
      requiresConfirmation: true,
    })),
    rejectedPackCount: resolution.rejectedPacks.length,
  };
}

export function buildSpecializedPackExplainViewModel(
  entry: FirstPartySpecializedPackCatalogEntry,
): SpecializedPackExplainViewModel {
  return {
    packId: entry.manifest.id,
    name: entry.manifest.name,
    version: entry.manifest.version,
    publisher: entry.manifest.publisher,
    targetDisciplineIds: entry.manifest.targetDisciplineIds,
    providedArchitectureStrategies:
      entry.manifest.providedArchitectureStrategies,
    providedRuleIds: entry.manifest.providedRuleIds,
    requiredTooling: entry.manifest.requiredTooling,
    permissionsRequired: entry.manifest.permissionsRequired,
    conflicts: entry.manifest.conflicts,
    dependencies: entry.manifest.dependencies,
  };
}
