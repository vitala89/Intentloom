import type {
  QualityArtifactClassification,
  QualityFindingState,
  QualityRuleSeverity,
  QualityThresholdLevel,
} from "@intentloom/protocol";
import { isObject, stringArray } from "../engineering-assessment/common.js";

export { isObject, stringArray };

export const QUALITY_RULE_SEVERITIES: readonly QualityRuleSeverity[] = [
  "error",
  "warning",
  "info",
];

export const QUALITY_THRESHOLD_LEVELS: readonly QualityThresholdLevel[] = [
  "preferred",
  "review",
  "hard",
  "baseline",
];

export const QUALITY_ARTIFACT_CLASSIFICATIONS: readonly QualityArtifactClassification[] =
  [
    "hand-written-production",
    "hand-written-test",
    "generated-source",
    "vendored-source",
    "declarative-config",
    "schema-or-protocol",
    "fixture-or-data-table",
    "snapshot",
    "migration",
    "public-export-surface",
    "documentation",
    "unknown",
  ];

export const QUALITY_FINDING_STATES: readonly QualityFindingState[] = [
  "within-policy",
  "preferred-exceeded",
  "review-required",
  "hard-limit-exceeded",
  "legacy-baseline",
  "legacy-growth",
  "exception-active",
  "exception-expired",
  "unsupported-measurement",
  "classification-required",
];
