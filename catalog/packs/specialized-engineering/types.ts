import type {
  QualityDisciplineAlias,
  QualitySpecializedPackDetectionRule,
  QualitySpecializedPackManifest,
} from "@intentloom/protocol";

export interface FirstPartySpecializedPackEntry {
  readonly manifest: QualitySpecializedPackManifest;
  readonly detectionRule: QualitySpecializedPackDetectionRule;
  readonly aliases?: readonly QualityDisciplineAlias[];
  readonly fixtureProfileId: string;
}
