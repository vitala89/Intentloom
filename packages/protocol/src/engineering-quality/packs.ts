import type {
  QUALITY_PACK_RESOLUTION_SCHEMA_URN,
  QUALITY_PACK_SCHEMA_URN,
  QualityArtifactClassification,
  QualityPackConflictKind,
  QualityPackEnforcement,
  QualityPackEntryKind,
  QualityPackMetric,
  QualityPackResolutionStatus,
  QualityRuleSeverity,
} from "./common.js";
import type { EngineeringQualityThreshold } from "./policy.js";

export interface EngineeringQualityPackSourceReference {
  readonly id: string;
  readonly title: string;
  readonly uri: string;
  readonly kind: "official-documentation" | "repository-documentation";
}

export interface EngineeringQualityPackProvenance {
  readonly sourceKind: "first-party";
  readonly publisher: "intentloom";
  readonly license: "Apache-2.0";
  readonly references: readonly EngineeringQualityPackSourceReference[];
}

export interface EngineeringQualityPackTechnologyCompatibility {
  readonly technologyId: string;
  readonly versionRange: string;
}

export interface EngineeringQualityPackCompatibility {
  readonly intentloomVersionRange: string;
  readonly technologies?: readonly EngineeringQualityPackTechnologyCompatibility[];
}

export interface EngineeringQualityPackEntryBase {
  readonly id: string;
  readonly meaningId: string;
  readonly kind: QualityPackEntryKind;
  readonly name: string;
  readonly description: string;
  readonly category:
    | "code-quality"
    | "architecture"
    | "maintainability"
    | "security"
    | "performance";
  readonly severity: QualityRuleSeverity;
  readonly applicableClassifications: readonly QualityArtifactClassification[];
  readonly enforcement: QualityPackEnforcement;
  readonly sourceReferenceIds: readonly string[];
}

export interface EngineeringQualityPackRule extends EngineeringQualityPackEntryBase {
  readonly kind: "rule";
  readonly metric: QualityPackMetric;
  readonly thresholds: readonly EngineeringQualityThreshold[];
}

export interface EngineeringQualityPackGuidance extends EngineeringQualityPackEntryBase {
  readonly kind: "guidance";
  readonly reviewQuestion: string;
}

export type EngineeringQualityPackEntry =
  EngineeringQualityPackRule | EngineeringQualityPackGuidance;

export interface EngineeringQualityPack {
  readonly schemaVersion: typeof QUALITY_PACK_SCHEMA_URN;
  readonly id: string;
  readonly version: string;
  readonly name: string;
  readonly description: string;
  readonly dependencies: readonly string[];
  readonly compatibility: EngineeringQualityPackCompatibility;
  readonly provenance: EngineeringQualityPackProvenance;
  readonly entries: readonly EngineeringQualityPackEntry[];
}

export interface EngineeringQualityPackResolutionContext {
  readonly intentloomVersion: string;
  readonly technologies?: readonly {
    readonly technologyId: string;
    readonly version: string;
  }[];
}

export interface EngineeringQualityPackResolutionConflict {
  readonly kind: QualityPackConflictKind;
  readonly message: string;
  readonly packIds?: readonly string[];
  readonly meaningId?: string;
}

export interface EngineeringQualityPackResolution {
  readonly schemaVersion: typeof QUALITY_PACK_RESOLUTION_SCHEMA_URN;
  readonly status: QualityPackResolutionStatus;
  readonly requestedPackIds: readonly string[];
  readonly resolvedPacks: readonly {
    readonly id: string;
    readonly version: string;
  }[];
  readonly entries: readonly EngineeringQualityPackEntry[];
  readonly conflicts: readonly EngineeringQualityPackResolutionConflict[];
}

export interface ResolveEngineeringQualityPacksOptions {
  readonly packs: readonly EngineeringQualityPack[];
  readonly requestedPackIds: readonly string[];
  readonly context: EngineeringQualityPackResolutionContext;
}
