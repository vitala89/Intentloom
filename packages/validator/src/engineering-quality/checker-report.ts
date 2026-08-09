import {
  QUALITY_CHECKER_REPORT_SCHEMA_URN,
  type EngineeringQualityCheckerDiagnostic,
  type EngineeringQualityCheckerFinding,
  type EngineeringQualityCheckerLocation,
  type EngineeringQualityCheckerReport,
  type EngineeringQualityCheckerTool,
  type QualityCheckerReportSource,
  type QualityCheckerSeverity,
} from "@intentloom/protocol";
import { isObject } from "./common.js";

export const QUALITY_CHECKER_LIMITS = {
  maxRecords: 5_000,
  maxDiagnostics: 5_000,
  maxStringLength: 4_096,
  maxPathLength: 1_024,
  maxUriLength: 2_048,
  maxInputCharacters: 5_000_000,
} as const;

const SOURCES: readonly QualityCheckerReportSource[] = [
  "eslint",
  "typescript",
  "sarif",
  "clippy",
];

const SEVERITIES: readonly QualityCheckerSeverity[] = [
  "error",
  "warning",
  "info",
  "unknown",
];

function boundedString(value: unknown, field: string, limit: number): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${field} must be a non-empty string`);
  }
  if (value.length > limit) {
    throw new Error(`${field} exceeds the ${limit}-character limit`);
  }
  if (value.includes("\u0000")) {
    throw new Error(`${field} must not contain a NUL character`);
  }
  return value;
}

function boundedArray(value: unknown, field: string): readonly unknown[] {
  if (!Array.isArray(value)) throw new Error(`${field} must be an array`);
  if (value.length > QUALITY_CHECKER_LIMITS.maxRecords) {
    throw new Error(
      `${field} exceeds the ${QUALITY_CHECKER_LIMITS.maxRecords}-record limit`,
    );
  }
  return value;
}

function validateTool(value: unknown): EngineeringQualityCheckerTool {
  if (!isObject(value)) throw new Error("checker tool must be an object");
  const name = boundedString(value.name, "tool.name", 256);
  const version =
    value.version === undefined
      ? undefined
      : boundedString(value.version, "tool.version", 128);
  return version === undefined ? { name } : { name, version };
}

function validNumber(value: unknown, field: string): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 1) {
    throw new Error(`${field} must be a positive integer`);
  }
  return value;
}

function validateLocation(value: unknown): EngineeringQualityCheckerLocation {
  if (!isObject(value)) throw new Error("finding.location must be an object");
  const path = boundedString(
    value.path,
    "finding.location.path",
    QUALITY_CHECKER_LIMITS.maxPathLength,
  );
  const location: {
    path: string;
    startLine?: number;
    startColumn?: number;
    endLine?: number;
    endColumn?: number;
  } = { path };
  for (const field of [
    "startLine",
    "startColumn",
    "endLine",
    "endColumn",
  ] as const) {
    if (value[field] !== undefined) {
      location[field] = validNumber(value[field], `finding.location.${field}`);
    }
  }
  return location satisfies EngineeringQualityCheckerLocation;
}

export function validateEngineeringQualityCheckerFinding(
  value: unknown,
): EngineeringQualityCheckerFinding {
  if (!isObject(value)) throw new Error("checker finding must be an object");
  const findingId = boundedString(value.findingId, "finding.findingId", 256);
  const source = value.source as QualityCheckerReportSource;
  if (!SOURCES.includes(source))
    throw new Error("finding.source is unsupported");
  const ruleId = boundedString(value.ruleId, "finding.ruleId", 256);
  const severity = value.severity as QualityCheckerSeverity;
  if (!SEVERITIES.includes(severity))
    throw new Error("finding.severity is invalid");
  const message = boundedString(
    value.message,
    "finding.message",
    QUALITY_CHECKER_LIMITS.maxStringLength,
  );
  const tool = validateTool(value.tool);
  const location =
    value.location === undefined ? undefined : validateLocation(value.location);
  const fingerprint =
    value.fingerprint === undefined
      ? undefined
      : boundedString(value.fingerprint, "finding.fingerprint", 512);
  const helpUri =
    value.helpUri === undefined
      ? undefined
      : boundedString(
          value.helpUri,
          "finding.helpUri",
          QUALITY_CHECKER_LIMITS.maxUriLength,
        );
  if (helpUri !== undefined && !/^https?:\/\//iu.test(helpUri)) {
    throw new Error("finding.helpUri must use http or https");
  }
  return {
    findingId,
    source,
    tool,
    ruleId,
    severity,
    message,
    ...(location === undefined ? {} : { location }),
    ...(fingerprint === undefined ? {} : { fingerprint }),
    ...(helpUri === undefined ? {} : { helpUri }),
  };
}

function validateDiagnostic(
  value: unknown,
): EngineeringQualityCheckerDiagnostic {
  if (!isObject(value)) throw new Error("checker diagnostic must be an object");
  const kind = value.kind;
  if (
    kind !== "dropped-record" &&
    kind !== "unsupported" &&
    kind !== "duplicate" &&
    kind !== "conflicting-meaning" &&
    kind !== "redacted-path"
  ) {
    throw new Error("checker diagnostic.kind is invalid");
  }
  const message = boundedString(
    value.message,
    "diagnostic.message",
    QUALITY_CHECKER_LIMITS.maxStringLength,
  );
  const sourceRecord =
    value.sourceRecord === undefined
      ? undefined
      : boundedString(value.sourceRecord, "diagnostic.sourceRecord", 256);
  return sourceRecord === undefined
    ? { kind, message }
    : { kind, message, sourceRecord };
}

export function validateEngineeringQualityCheckerReport(
  value: unknown,
): EngineeringQualityCheckerReport {
  if (!isObject(value)) throw new Error("checker report must be an object");
  if (value.schemaVersion !== QUALITY_CHECKER_REPORT_SCHEMA_URN) {
    throw new Error(
      `checker report schemaVersion must equal ${QUALITY_CHECKER_REPORT_SCHEMA_URN}`,
    );
  }
  const source = value.source as QualityCheckerReportSource;
  if (!SOURCES.includes(source))
    throw new Error("checker report source is unsupported");
  const status = value.status;
  if (
    status !== "resolved" &&
    status !== "partial" &&
    status !== "unsupported"
  ) {
    throw new Error("checker report status is invalid");
  }
  const findings = boundedArray(value.findings, "checker report findings").map(
    validateEngineeringQualityCheckerFinding,
  );
  const diagnostics = boundedArray(
    value.diagnostics,
    "checker report diagnostics",
  );
  if (diagnostics.length > QUALITY_CHECKER_LIMITS.maxDiagnostics) {
    throw new Error("checker report diagnostics exceed the record limit");
  }
  return {
    schemaVersion: QUALITY_CHECKER_REPORT_SCHEMA_URN,
    source,
    tool: validateTool(value.tool),
    status,
    findings,
    diagnostics: diagnostics.map(validateDiagnostic),
  };
}
