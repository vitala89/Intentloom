import {
  QUALITY_FINDING_SCHEMA_URN,
  type EngineeringQualityFinding,
  type EngineeringQualityPolicy,
  type QualityFindingState,
  type QualityThresholdLevel,
} from "@intentloom/protocol";
import {
  validateEngineeringQualityFinding,
  validateEngineeringQualityPolicy,
} from "@intentloom/validator";
import {
  measureEngineeringArtifact,
  type MeasureArtifactOptions,
} from "./metrics.js";

export interface CheckQualityOptions extends MeasureArtifactOptions {
  readonly policy: EngineeringQualityPolicy;
}

export function checkEngineeringQuality(
  options: CheckQualityOptions,
): readonly EngineeringQualityFinding[] {
  const policy = validateEngineeringQualityPolicy(options.policy);
  const evidence = measureEngineeringArtifact(options);

  const findings: EngineeringQualityFinding[] = [];

  for (const rule of policy.defaultRules) {
    if (!rule.applicableClassifications.includes(evidence.classification)) {
      continue;
    }

    const sortedThresholds = [...rule.thresholds].sort(
      (a, b) => b.maxPhysicalLines - a.maxPhysicalLines,
    );

    let state: QualityFindingState = "within-policy";
    let exceededLevel: QualityThresholdLevel | undefined = undefined;
    let thresholdValue = 0;

    for (const threshold of sortedThresholds) {
      if (evidence.measuredValue > threshold.maxPhysicalLines) {
        exceededLevel = threshold.level;
        thresholdValue = threshold.maxPhysicalLines;
        if (threshold.level === "hard") {
          state = "hard-limit-exceeded";
        } else if (threshold.level === "review") {
          state = "review-required";
        } else if (threshold.level === "preferred") {
          state = "preferred-exceeded";
        } else {
          state = "legacy-growth";
        }
        break;
      }
    }

    if (state !== "within-policy") {
      const findingInput: EngineeringQualityFinding = {
        schemaVersion: QUALITY_FINDING_SCHEMA_URN,
        findingId: `fnd-${rule.id}-${evidence.contentDigest.slice(0, 8)}`,
        ruleId: rule.id,
        artifactPath: evidence.artifactPath,
        classification: evidence.classification,
        state,
        severity: rule.severity,
        ...(exceededLevel !== undefined
          ? { exceededThresholdLevel: exceededLevel }
          : {}),
        measuredValue: evidence.measuredValue,
        thresholdValue,
        message: `Artifact ${evidence.artifactPath} (${evidence.classification}) measured ${evidence.measuredValue} physical lines exceeding ${exceededLevel} threshold of ${thresholdValue} lines under rule ${rule.id}.`,
        evidence,
      };
      findings.push(validateEngineeringQualityFinding(findingInput));
    }
  }

  return findings;
}
