import type {
  AssessmentEvidenceKind,
  AssessmentEvidenceQuality,
  AssessmentEvidenceStatus,
  AssessmentFindingCategory,
  AssessmentFindingConfidence,
  AssessmentFindingProvenance,
  AssessmentFindingSeverity,
  AssessmentModule,
  AssessmentStatus,
  TechnicalDebtCategory,
} from "@intentloom/protocol";

export function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function stringArray(value: unknown, field: string): readonly string[] {
  if (
    !Array.isArray(value) ||
    !value.every((item) => typeof item === "string")
  ) {
    throw new Error(`${field} must be an array of strings`);
  }
  return value;
}

export const ASSESSMENT_STATUSES: readonly AssessmentStatus[] = [
  "completed",
  "partial",
  "insufficient-evidence",
  "failed",
];

export const ASSESSMENT_MODULES: readonly AssessmentModule[] = [
  "architecture",
  "quality",
  "conformance",
  "technical-debt",
];

export const EVIDENCE_KINDS: readonly AssessmentEvidenceKind[] = [
  "deterministic-tool",
  "derived",
  "ai-assisted",
  "review-required",
  "insufficient",
];

export const EVIDENCE_STATUSES: readonly AssessmentEvidenceStatus[] = [
  "valid",
  "stale",
  "partial",
  "conflicting",
  "malformed",
  "unsupported",
  "denied",
];

export const EVIDENCE_QUALITIES: readonly AssessmentEvidenceQuality[] = [
  "complete",
  "bounded",
  "unavailable",
];

export const FINDING_SEVERITIES: readonly AssessmentFindingSeverity[] = [
  "error",
  "warning",
  "info",
];

export const FINDING_CONFIDENCES: readonly AssessmentFindingConfidence[] = [
  "deterministic",
  "high",
  "medium",
  "low",
];

export const FINDING_CATEGORIES: readonly AssessmentFindingCategory[] = [
  "architecture",
  "quality",
  "conformance",
  "technical-debt",
  "security",
  "accessibility",
  "performance",
];

export const FINDING_PROVENANCES: readonly AssessmentFindingProvenance[] = [
  "deterministic-rule",
  "checker-adapter",
  "derived-analysis",
  "ai-assisted",
];

export const TECHNICAL_DEBT_CATEGORIES: readonly TechnicalDebtCategory[] = [
  "architecture",
  "dependencies",
  "maintainability",
  "testing",
  "performance",
  "security",
  "accessibility",
  "observability",
  "build-and-ci",
  "ai-engineering",
  "documentation",
  "legacy-constraints",
  "dependency-health",
];
