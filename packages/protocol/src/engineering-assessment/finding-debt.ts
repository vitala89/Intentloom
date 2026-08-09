import type { AssessmentEvidenceQuality } from "./common.js";

export type AssessmentFindingSeverity = "error" | "warning" | "info";

export type AssessmentFindingConfidence =
  "deterministic" | "high" | "medium" | "low";

export type AssessmentFindingCategory =
  | "architecture"
  | "quality"
  | "conformance"
  | "technical-debt"
  | "security"
  | "accessibility"
  | "performance";

export type AssessmentFindingProvenance =
  "deterministic-rule" | "checker-adapter" | "derived-analysis" | "ai-assisted";

export interface AssessmentFindingProjection {
  readonly id: string;
  readonly sourceFindingRef?: string;
  readonly category: AssessmentFindingCategory;
  readonly scope: string;
  readonly evidenceReferences: readonly string[];
  readonly ruleReference: string;
  readonly severity: AssessmentFindingSeverity;
  readonly confidence: AssessmentFindingConfidence;
  readonly evidenceQuality: AssessmentEvidenceQuality;
  readonly impactSummary: string;
  readonly recommendationReferences: readonly string[];
  readonly provenanceClassification: AssessmentFindingProvenance;
}

export type TechnicalDebtCategory =
  | "architecture"
  | "dependencies"
  | "maintainability"
  | "testing"
  | "performance"
  | "security"
  | "accessibility"
  | "observability"
  | "build-and-ci"
  | "ai-engineering"
  | "documentation"
  | "legacy-constraints"
  | "dependency-health";

export interface TechnicalDebtItem {
  readonly id: string;
  readonly findingProjectionId: string;
  readonly category: TechnicalDebtCategory;
  readonly affectedScopes: readonly string[];
  readonly estimatedRemediationComplexity: "low" | "medium" | "high";
  readonly prerequisites: readonly string[];
  readonly recommendedOrder: number;
}

export interface TechnicalDebtMap {
  readonly items: readonly TechnicalDebtItem[];
}
