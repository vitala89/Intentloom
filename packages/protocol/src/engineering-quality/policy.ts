import type {
  QUALITY_POLICY_SCHEMA_URN,
  QualityArtifactClassification,
  QualityRuleSeverity,
  QualityThresholdLevel,
} from "./common.js";

export interface EngineeringQualityThreshold {
  readonly level: QualityThresholdLevel;
  readonly maxPhysicalLines: number;
  readonly maxFunctionLines?: number;
  readonly maxCyclomaticComplexity?: number;
  readonly maxNestingDepth?: number;
  readonly maxParameters?: number;
}

export interface EngineeringQualityRule {
  readonly id: string;
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
  readonly thresholds: readonly EngineeringQualityThreshold[];
}

export interface EngineeringQualityScope {
  readonly pathPattern: string;
  readonly classification?: QualityArtifactClassification;
  readonly ruleOverrides?: readonly {
    readonly ruleId: string;
    readonly severity?: QualityRuleSeverity;
    readonly disabled?: boolean;
  }[];
}

export interface EngineeringQualityPolicy {
  readonly schemaVersion: typeof QUALITY_POLICY_SCHEMA_URN;
  readonly policyId: string;
  readonly profileName: "balanced" | "strict" | "legacy-ratchet" | "custom";
  readonly defaultRules: readonly EngineeringQualityRule[];
  readonly scopes?: readonly EngineeringQualityScope[];
}
