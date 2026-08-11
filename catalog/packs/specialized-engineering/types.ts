import type {
  QualityDisciplineAlias,
  QualitySpecializedPackCheckDefinition,
  QualitySpecializedPackDetectionRule,
  QualitySpecializedPackManifest,
} from "@intentloom/protocol";

export interface FirstPartySpecializedPackEntry {
  readonly manifest: QualitySpecializedPackManifest;
  readonly detectionRule: QualitySpecializedPackDetectionRule;
  readonly checkDefinitions: readonly QualitySpecializedPackCheckDefinition[];
  readonly aliases?: readonly QualityDisciplineAlias[];
  readonly fixtureProfileId: string;
}
