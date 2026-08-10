import {
  QUALITY_SPECIALIZED_PACK_DETECTION_RESOLUTION_SCHEMA_URN,
  QUALITY_SPECIALIZED_PACK_DETECTION_RESULT_SCHEMA_URN,
  QUALITY_SPECIALIZED_PACK_DETECTION_RULE_SCHEMA_URN,
  type QualityDetectionConfidence,
  type QualityDetectionPathMatchKind,
  type QualityDetectionSecurityImpact,
  type QualitySpecializedPackDetectionCandidate,
  type QualitySpecializedPackDetectionResolution,
  type QualitySpecializedPackDetectionResult,
  type QualitySpecializedPackDetectionRule,
  type QualitySpecializedPackDetectionSignal,
} from "@intentloom/protocol";
import { isObject } from "./common.js";
import { stringField } from "./task-validation-common.js";

const PATH_MATCH_KINDS: readonly QualityDetectionPathMatchKind[] = [
  "suffix",
  "contains",
  "exact",
];

const CONFIDENCE_LEVELS: readonly QualityDetectionConfidence[] = [
  "low",
  "medium",
  "high",
];

const SECURITY_IMPACTS: readonly QualityDetectionSecurityImpact[] = [
  "none",
  "review-required",
  "elevated",
];

function strings(value: unknown, fieldName: string): readonly string[] {
  if (!Array.isArray(value)) throw new Error(`${fieldName} must be an array`);
  return value.map((item, index) =>
    stringField(item, `${fieldName}[${index}]`),
  );
}

function validateDetectionSignal(
  value: unknown,
  index: number,
): QualitySpecializedPackDetectionSignal {
  if (!isObject(value)) {
    throw new Error(`detectionRule.signals[${index}] must be an object`);
  }
  if (
    !PATH_MATCH_KINDS.includes(value.matchKind as QualityDetectionPathMatchKind)
  ) {
    throw new Error(`detectionRule.signals[${index}].matchKind must be valid`);
  }
  return {
    pathPattern: stringField(
      value.pathPattern,
      `detectionRule.signals[${index}].pathPattern`,
    ),
    matchKind: value.matchKind as QualityDetectionPathMatchKind,
    ...(typeof value.label === "string"
      ? {
          label: stringField(
            value.label,
            `detectionRule.signals[${index}].label`,
          ),
        }
      : {}),
  };
}

function validateDetectionCandidate(
  value: unknown,
  index: number,
): QualitySpecializedPackDetectionCandidate {
  if (!isObject(value)) {
    throw new Error(`detectionResult.candidates[${index}] must be an object`);
  }
  if (
    !CONFIDENCE_LEVELS.includes(value.confidence as QualityDetectionConfidence)
  ) {
    throw new Error(
      `detectionResult.candidates[${index}].confidence must be valid`,
    );
  }
  if (
    !SECURITY_IMPACTS.includes(
      value.securityImpact as QualityDetectionSecurityImpact,
    )
  ) {
    throw new Error(
      `detectionResult.candidates[${index}].securityImpact must be valid`,
    );
  }
  if (value.requiresConfirmation !== true) {
    throw new Error(
      `detectionResult.candidates[${index}].requiresConfirmation must be true`,
    );
  }
  return {
    packId: stringField(
      value.packId,
      `detectionResult.candidates[${index}].packId`,
    ),
    evidencePaths: strings(
      value.evidencePaths,
      `detectionResult.candidates[${index}].evidencePaths`,
    ),
    matchedSignalLabels: strings(
      value.matchedSignalLabels,
      `detectionResult.candidates[${index}].matchedSignalLabels`,
    ),
    confidence: value.confidence as QualityDetectionConfidence,
    ambiguity: value.ambiguity === true,
    securityImpact: value.securityImpact as QualityDetectionSecurityImpact,
    requiresConfirmation: true,
  };
}

export function validateQualitySpecializedPackDetectionRule(
  value: unknown,
): QualitySpecializedPackDetectionRule {
  if (!isObject(value)) {
    throw new Error("specialized pack detection rule must be an object");
  }
  if (
    value.schemaVersion !== QUALITY_SPECIALIZED_PACK_DETECTION_RULE_SCHEMA_URN
  ) {
    throw new Error(
      `detectionRule.schemaVersion must equal ${QUALITY_SPECIALIZED_PACK_DETECTION_RULE_SCHEMA_URN}`,
    );
  }
  if (!Array.isArray(value.signals) || value.signals.length === 0) {
    throw new Error("detectionRule.signals must be a non-empty array");
  }
  const minimumSignalMatches =
    value.minimumSignalMatches === undefined
      ? undefined
      : Number(value.minimumSignalMatches);
  if (
    minimumSignalMatches !== undefined &&
    (!Number.isInteger(minimumSignalMatches) || minimumSignalMatches < 1)
  ) {
    throw new Error(
      "detectionRule.minimumSignalMatches must be a positive integer",
    );
  }
  if (
    value.securityImpact !== undefined &&
    !SECURITY_IMPACTS.includes(
      value.securityImpact as QualityDetectionSecurityImpact,
    )
  ) {
    throw new Error("detectionRule.securityImpact must be valid");
  }
  return {
    schemaVersion: QUALITY_SPECIALIZED_PACK_DETECTION_RULE_SCHEMA_URN,
    packId: stringField(value.packId, "detectionRule.packId"),
    signals: value.signals.map((signal, index) =>
      validateDetectionSignal(signal, index),
    ),
    ...(minimumSignalMatches !== undefined ? { minimumSignalMatches } : {}),
    ...(value.securityImpact !== undefined
      ? {
          securityImpact:
            value.securityImpact as QualityDetectionSecurityImpact,
        }
      : {}),
  };
}

export function validateQualitySpecializedPackDetectionResult(
  value: unknown,
): QualitySpecializedPackDetectionResult {
  if (!isObject(value)) {
    throw new Error("specialized pack detection result must be an object");
  }
  if (
    value.schemaVersion !== QUALITY_SPECIALIZED_PACK_DETECTION_RESULT_SCHEMA_URN
  ) {
    throw new Error(
      `detectionResult.schemaVersion must equal ${QUALITY_SPECIALIZED_PACK_DETECTION_RESULT_SCHEMA_URN}`,
    );
  }
  const scannedPathCount = Number(value.scannedPathCount);
  const excludedPathCount = Number(value.excludedPathCount);
  if (!Number.isInteger(scannedPathCount) || scannedPathCount < 0) {
    throw new Error(
      "detectionResult.scannedPathCount must be a non-negative integer",
    );
  }
  if (!Number.isInteger(excludedPathCount) || excludedPathCount < 0) {
    throw new Error(
      "detectionResult.excludedPathCount must be a non-negative integer",
    );
  }
  if (!Array.isArray(value.candidates)) {
    throw new Error("detectionResult.candidates must be an array");
  }
  return {
    schemaVersion: QUALITY_SPECIALIZED_PACK_DETECTION_RESULT_SCHEMA_URN,
    scannedPathCount,
    excludedPathCount,
    scanLimitReached: value.scanLimitReached === true,
    candidates: value.candidates.map((candidate, index) =>
      validateDetectionCandidate(candidate, index),
    ),
  };
}

export function validateQualitySpecializedPackDetectionResolution(
  value: unknown,
): QualitySpecializedPackDetectionResolution {
  if (!isObject(value)) {
    throw new Error("specialized pack detection resolution must be an object");
  }
  if (
    value.schemaVersion !==
    QUALITY_SPECIALIZED_PACK_DETECTION_RESOLUTION_SCHEMA_URN
  ) {
    throw new Error(
      `detectionResolution.schemaVersion must equal ${QUALITY_SPECIALIZED_PACK_DETECTION_RESOLUTION_SCHEMA_URN}`,
    );
  }
  if (!Array.isArray(value.rejectedPacks)) {
    throw new Error("detectionResolution.rejectedPacks must be an array");
  }
  return {
    schemaVersion: QUALITY_SPECIALIZED_PACK_DETECTION_RESOLUTION_SCHEMA_URN,
    detection: validateQualitySpecializedPackDetectionResult(value.detection),
    compatiblePackIds: strings(
      value.compatiblePackIds,
      "detectionResolution.compatiblePackIds",
    ),
    rejectedPacks: value.rejectedPacks.map((item, index) => {
      if (!isObject(item)) {
        throw new Error(
          `detectionResolution.rejectedPacks[${index}] must be an object`,
        );
      }
      return {
        packId: stringField(
          item.packId,
          `detectionResolution.rejectedPacks[${index}].packId`,
        ),
        reason: stringField(
          item.reason,
          `detectionResolution.rejectedPacks[${index}].reason`,
        ),
      };
    }),
  };
}
