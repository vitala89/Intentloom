import type {
  QUALITY_BASELINE_SCHEMA_URN,
  QUALITY_FINDING_SCHEMA_URN,
  QualityArtifactClassification,
  QualityFindingState,
  QualityRuleSeverity,
  QualityThresholdLevel,
} from "./common.js";

export interface EngineeringQualityEvidence {
  readonly artifactPath: string;
  readonly classification: QualityArtifactClassification;
  readonly measuredValue: number;
  readonly unit: "physical-lines" | "function-lines" | "cyclomatic-complexity";
  readonly contentDigest: string;
  readonly lineEnding: "lf" | "crlf" | "mixed";
}

export interface EngineeringQualityFinding {
  readonly schemaVersion: typeof QUALITY_FINDING_SCHEMA_URN;
  readonly findingId: string;
  readonly ruleId: string;
  readonly artifactPath: string;
  readonly classification: QualityArtifactClassification;
  readonly state: QualityFindingState;
  readonly severity: QualityRuleSeverity;
  readonly exceededThresholdLevel?: QualityThresholdLevel;
  readonly measuredValue: number;
  readonly thresholdValue: number;
  readonly message: string;
  readonly evidence: EngineeringQualityEvidence;
}

export interface EngineeringQualityBaselineItem {
  readonly id: string;
  readonly ruleId: string;
  readonly artifactPath: string;
  readonly baselineMeasuredValue: number;
  readonly contentDigest: string;
  readonly reason: string;
  readonly owner: string;
  readonly createdAt: number;
  readonly allowedGrowth: number;
}

export interface EngineeringQualityBaseline {
  readonly schemaVersion: typeof QUALITY_BASELINE_SCHEMA_URN;
  readonly projectId: string;
  readonly items: readonly EngineeringQualityBaselineItem[];
}

export interface EngineeringQualityException {
  readonly exceptionId: string;
  readonly ruleId: string;
  readonly pathPattern: string;
  readonly reason: string;
  readonly owner: string;
  readonly approvedAt: number;
  readonly expiresAt?: number;
}
