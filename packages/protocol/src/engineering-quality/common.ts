export const QUALITY_POLICY_SCHEMA_URN =
  "urn:intentloom:schema:engineering-quality-policy:1" as const;

export const QUALITY_FINDING_SCHEMA_URN =
  "urn:intentloom:schema:engineering-quality-finding:1" as const;

export const QUALITY_BASELINE_SCHEMA_URN =
  "urn:intentloom:schema:engineering-quality-baseline:1" as const;

export type QualityRuleSeverity = "error" | "warning" | "info";

export type QualityThresholdLevel =
  "preferred" | "review" | "hard" | "baseline";

export type QualityArtifactClassification =
  | "hand-written-production"
  | "hand-written-test"
  | "generated-source"
  | "vendored-source"
  | "declarative-config"
  | "schema-or-protocol"
  | "fixture-or-data-table"
  | "snapshot"
  | "migration"
  | "public-export-surface"
  | "documentation"
  | "unknown";

export type QualityFindingState =
  | "within-policy"
  | "preferred-exceeded"
  | "review-required"
  | "hard-limit-exceeded"
  | "legacy-baseline"
  | "legacy-growth"
  | "exception-active"
  | "exception-expired"
  | "unsupported-measurement"
  | "classification-required";
