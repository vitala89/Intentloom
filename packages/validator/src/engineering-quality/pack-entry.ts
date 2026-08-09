import type {
  EngineeringQualityPackEntry,
  EngineeringQualityPackGuidance,
  EngineeringQualityPackRule,
  EngineeringQualityPackSourceReference,
  QualityArtifactClassification,
  QualityPackEnforcement,
  QualityPackEntryKind,
  QualityPackMetric,
  QualityRuleSeverity,
} from "@intentloom/protocol";
import {
  isObject,
  QUALITY_ARTIFACT_CLASSIFICATIONS,
  QUALITY_RULE_SEVERITIES,
} from "./common.js";
import { validateEngineeringQualityThreshold } from "./policy.js";

const MAX_ITEMS = 256;
const MAX_TEXT = 4_000;

function text(value: unknown, field: string, maximum = MAX_TEXT): string {
  if (typeof value !== "string" || !value.trim() || value.length > maximum) {
    throw new Error(
      `${field} must be a non-empty string of at most ${maximum} characters`,
    );
  }
  return value;
}

function items(value: unknown, field: string): readonly unknown[] {
  if (!Array.isArray(value) || value.length > MAX_ITEMS) {
    throw new Error(`${field} must be an array of at most ${MAX_ITEMS} items`);
  }
  return value;
}

function strings(value: unknown, field: string): readonly string[] {
  return items(value, field).map((item, index) =>
    text(item, `${field}[${index}]`, 512),
  );
}

export function validateEngineeringQualityPackSourceReference(
  value: unknown,
): EngineeringQualityPackSourceReference {
  if (!isObject(value))
    throw new Error("pack source reference must be an object");
  const uri = text(value.uri, "sourceReference.uri", 2_000);
  if (!/^(?:https:\/\/|docs\/|catalog\/)/u.test(uri)) {
    throw new Error(
      "sourceReference.uri must be an HTTPS or repository-relative URI",
    );
  }
  if (
    !["official-documentation", "repository-documentation"].includes(
      value.kind as string,
    )
  ) {
    throw new Error(
      "sourceReference.kind must identify documentation provenance",
    );
  }
  return {
    id: text(value.id, "sourceReference.id", 128),
    title: text(value.title, "sourceReference.title"),
    uri,
    kind: value.kind as EngineeringQualityPackSourceReference["kind"],
  };
}

export function validateEngineeringQualityPackEntry(
  value: unknown,
): EngineeringQualityPackEntry {
  if (!isObject(value)) throw new Error("quality pack entry must be an object");
  const kind = value.kind as QualityPackEntryKind;
  const enforcement = value.enforcement as QualityPackEnforcement;
  if (!["rule", "guidance"].includes(kind)) {
    throw new Error("pack entry.kind must be rule or guidance");
  }
  if (
    ![
      "deterministic",
      "checker-backed",
      "review-checklist",
      "guidance",
    ].includes(enforcement)
  ) {
    throw new Error("pack entry.enforcement is invalid");
  }
  if (
    ![
      "code-quality",
      "architecture",
      "maintainability",
      "security",
      "performance",
    ].includes(value.category as string)
  ) {
    throw new Error("pack entry.category is invalid");
  }
  if (
    !QUALITY_RULE_SEVERITIES.includes(value.severity as QualityRuleSeverity)
  ) {
    throw new Error("pack entry.severity is invalid");
  }
  const classifications = strings(
    value.applicableClassifications,
    "pack entry.applicableClassifications",
  );
  for (const classification of classifications) {
    if (
      !QUALITY_ARTIFACT_CLASSIFICATIONS.includes(
        classification as QualityArtifactClassification,
      )
    ) {
      throw new Error(
        `pack entry classification is invalid: ${classification}`,
      );
    }
  }
  const base = {
    id: text(value.id, "pack entry.id", 128),
    meaningId: text(value.meaningId, "pack entry.meaningId", 256),
    kind,
    name: text(value.name, "pack entry.name"),
    description: text(value.description, "pack entry.description"),
    category: value.category as EngineeringQualityPackEntry["category"],
    severity: value.severity as QualityRuleSeverity,
    applicableClassifications:
      classifications as readonly QualityArtifactClassification[],
    enforcement,
    sourceReferenceIds: strings(
      value.sourceReferenceIds,
      "pack entry.sourceReferenceIds",
    ),
  };
  if (kind === "rule") {
    if (
      ![
        "physical-lines",
        "function-lines",
        "cyclomatic-complexity",
        "nesting-depth",
        "parameter-count",
      ].includes(value.metric as string)
    ) {
      throw new Error("pack rule.metric is invalid");
    }
    const thresholds = items(value.thresholds, "pack rule.thresholds").map(
      validateEngineeringQualityThreshold,
    );
    if (thresholds.length === 0)
      throw new Error("pack rule.thresholds must not be empty");
    if (
      new Set(thresholds.map((threshold) => threshold.level)).size !==
      thresholds.length
    ) {
      throw new Error("pack rule.thresholds must have unique levels");
    }
    return {
      ...base,
      kind: "rule",
      metric: value.metric as QualityPackMetric,
      thresholds,
    } as EngineeringQualityPackRule;
  }
  return {
    ...base,
    kind: "guidance",
    reviewQuestion: text(value.reviewQuestion, "pack guidance.reviewQuestion"),
  } as EngineeringQualityPackGuidance;
}
