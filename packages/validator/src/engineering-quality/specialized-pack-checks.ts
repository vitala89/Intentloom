import {
  QUALITY_SPECIALIZED_PACK_CHECK_DEFINITION_SCHEMA_URN,
  QUALITY_SPECIALIZED_PACK_CHECK_REPORT_SCHEMA_URN,
  QUALITY_SPECIALIZED_PACK_CHECK_RESULT_SCHEMA_URN,
  type QualityDetectionPathMatchKind,
  type QualitySpecializedPackCheckDefinition,
  type QualitySpecializedPackCheckFinding,
  type QualitySpecializedPackCheckKind,
  type QualitySpecializedPackCheckReport,
  type QualitySpecializedPackCheckResult,
  type QualitySpecializedPackCheckSeverity,
  type QualitySpecializedPackCheckSignal,
  type QualitySpecializedPackCheckState,
} from "@intentloom/protocol";
import { isObject } from "./common.js";
import { stringField } from "./task-validation-common.js";

const CHECK_KINDS: readonly QualitySpecializedPackCheckKind[] = [
  "path-presence",
  "path-absence",
];

const CHECK_SEVERITIES: readonly QualitySpecializedPackCheckSeverity[] = [
  "info",
  "review",
  "blocking",
];

const CHECK_STATES: readonly QualitySpecializedPackCheckState[] = [
  "passed",
  "failed",
  "skipped",
];

const PATH_MATCH_KINDS: readonly QualityDetectionPathMatchKind[] = [
  "suffix",
  "contains",
  "exact",
];

function strings(value: unknown, fieldName: string): readonly string[] {
  if (!Array.isArray(value)) throw new Error(`${fieldName} must be an array`);
  return value.map((item, index) =>
    stringField(item, `${fieldName}[${index}]`),
  );
}

function validateCheckSignal(
  value: unknown,
  index: number,
): QualitySpecializedPackCheckSignal {
  if (!isObject(value)) {
    throw new Error(`checkDefinition.signals[${index}] must be an object`);
  }
  if (
    !PATH_MATCH_KINDS.includes(value.matchKind as QualityDetectionPathMatchKind)
  ) {
    throw new Error(
      `checkDefinition.signals[${index}].matchKind must be valid`,
    );
  }
  return {
    pathPattern: stringField(
      value.pathPattern,
      `checkDefinition.signals[${index}].pathPattern`,
    ),
    matchKind: value.matchKind as QualityDetectionPathMatchKind,
    ...(typeof value.label === "string"
      ? {
          label: stringField(
            value.label,
            `checkDefinition.signals[${index}].label`,
          ),
        }
      : {}),
  };
}

function validateCheckFinding(
  value: unknown,
  index: number,
): QualitySpecializedPackCheckFinding {
  if (!isObject(value)) {
    throw new Error(`checkResult.findings[${index}] must be an object`);
  }
  if (!CHECK_STATES.includes(value.state as QualitySpecializedPackCheckState)) {
    throw new Error(`checkResult.findings[${index}].state must be valid`);
  }
  if (
    !CHECK_SEVERITIES.includes(
      value.severity as QualitySpecializedPackCheckSeverity,
    )
  ) {
    throw new Error(`checkResult.findings[${index}].severity must be valid`);
  }
  return {
    ruleId: stringField(value.ruleId, `checkResult.findings[${index}].ruleId`),
    packId: stringField(value.packId, `checkResult.findings[${index}].packId`),
    state: value.state as QualitySpecializedPackCheckState,
    severity: value.severity as QualitySpecializedPackCheckSeverity,
    summary: stringField(
      value.summary,
      `checkResult.findings[${index}].summary`,
    ),
    evidencePaths: strings(
      value.evidencePaths,
      `checkResult.findings[${index}].evidencePaths`,
    ),
    message: stringField(
      value.message,
      `checkResult.findings[${index}].message`,
    ),
  };
}

export function validateQualitySpecializedPackCheckDefinition(
  value: unknown,
): QualitySpecializedPackCheckDefinition {
  if (!isObject(value)) {
    throw new Error("specialized pack check definition must be an object");
  }
  if (
    value.schemaVersion !== QUALITY_SPECIALIZED_PACK_CHECK_DEFINITION_SCHEMA_URN
  ) {
    throw new Error(
      `checkDefinition.schemaVersion must equal ${QUALITY_SPECIALIZED_PACK_CHECK_DEFINITION_SCHEMA_URN}`,
    );
  }
  if (!CHECK_KINDS.includes(value.kind as QualitySpecializedPackCheckKind)) {
    throw new Error("checkDefinition.kind must be valid");
  }
  if (
    !CHECK_SEVERITIES.includes(
      value.severity as QualitySpecializedPackCheckSeverity,
    )
  ) {
    throw new Error("checkDefinition.severity must be valid");
  }
  if (!Array.isArray(value.signals) || value.signals.length === 0) {
    throw new Error("checkDefinition.signals must be a non-empty array");
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
      "checkDefinition.minimumSignalMatches must be a positive integer",
    );
  }
  return {
    schemaVersion: QUALITY_SPECIALIZED_PACK_CHECK_DEFINITION_SCHEMA_URN,
    packId: stringField(value.packId, "checkDefinition.packId"),
    ruleId: stringField(value.ruleId, "checkDefinition.ruleId"),
    kind: value.kind as QualitySpecializedPackCheckKind,
    signals: value.signals.map((signal, index) =>
      validateCheckSignal(signal, index),
    ),
    ...(minimumSignalMatches !== undefined ? { minimumSignalMatches } : {}),
    severity: value.severity as QualitySpecializedPackCheckSeverity,
    summary: stringField(value.summary, "checkDefinition.summary"),
  };
}

export function validateQualitySpecializedPackCheckResult(
  value: unknown,
): QualitySpecializedPackCheckResult {
  if (!isObject(value)) {
    throw new Error("specialized pack check result must be an object");
  }
  if (
    value.schemaVersion !== QUALITY_SPECIALIZED_PACK_CHECK_RESULT_SCHEMA_URN
  ) {
    throw new Error(
      `checkResult.schemaVersion must equal ${QUALITY_SPECIALIZED_PACK_CHECK_RESULT_SCHEMA_URN}`,
    );
  }
  const scannedPathCount = Number(value.scannedPathCount);
  const excludedPathCount = Number(value.excludedPathCount);
  if (!Number.isInteger(scannedPathCount) || scannedPathCount < 0) {
    throw new Error(
      "checkResult.scannedPathCount must be a non-negative integer",
    );
  }
  if (!Number.isInteger(excludedPathCount) || excludedPathCount < 0) {
    throw new Error(
      "checkResult.excludedPathCount must be a non-negative integer",
    );
  }
  if (!Array.isArray(value.findings)) {
    throw new Error("checkResult.findings must be an array");
  }
  return {
    schemaVersion: QUALITY_SPECIALIZED_PACK_CHECK_RESULT_SCHEMA_URN,
    scannedPathCount,
    excludedPathCount,
    scanLimitReached: value.scanLimitReached === true,
    findings: value.findings.map((finding, index) =>
      validateCheckFinding(finding, index),
    ),
  };
}

export function validateQualitySpecializedPackCheckReport(
  value: unknown,
): QualitySpecializedPackCheckReport {
  if (!isObject(value)) {
    throw new Error("specialized pack check report must be an object");
  }
  if (
    value.schemaVersion !== QUALITY_SPECIALIZED_PACK_CHECK_REPORT_SCHEMA_URN
  ) {
    throw new Error(
      `checkReport.schemaVersion must equal ${QUALITY_SPECIALIZED_PACK_CHECK_REPORT_SCHEMA_URN}`,
    );
  }
  return {
    schemaVersion: QUALITY_SPECIALIZED_PACK_CHECK_REPORT_SCHEMA_URN,
    activePackIds: strings(value.activePackIds, "checkReport.activePackIds"),
    result: validateQualitySpecializedPackCheckResult(value.result),
  };
}
