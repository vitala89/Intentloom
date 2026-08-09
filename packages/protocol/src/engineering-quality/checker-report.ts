import type { QualityRuleSeverity } from "./common.js";

export const QUALITY_CHECKER_REPORT_SCHEMA_URN =
  "urn:intentloom:schema:engineering-quality-checker-report:1" as const;

export type QualityCheckerReportSource =
  "eslint" | "typescript" | "sarif" | "clippy";

export type QualityCheckerSeverity = QualityRuleSeverity | "unknown";

export type QualityCheckerIngestionStatus =
  "resolved" | "partial" | "unsupported";

export type QualityCheckerDiagnosticKind =
  | "dropped-record"
  | "unsupported"
  | "duplicate"
  | "conflicting-meaning"
  | "redacted-path";

export interface EngineeringQualityCheckerTool {
  readonly name: string;
  readonly version?: string;
}

export interface EngineeringQualityCheckerLocation {
  readonly path: string;
  readonly startLine?: number;
  readonly startColumn?: number;
  readonly endLine?: number;
  readonly endColumn?: number;
}

export interface EngineeringQualityCheckerFinding {
  readonly findingId: string;
  readonly source: QualityCheckerReportSource;
  readonly tool: EngineeringQualityCheckerTool;
  readonly ruleId: string;
  readonly severity: QualityCheckerSeverity;
  readonly message: string;
  readonly location?: EngineeringQualityCheckerLocation;
  readonly fingerprint?: string;
  readonly helpUri?: string;
}

export interface EngineeringQualityCheckerDiagnostic {
  readonly kind: QualityCheckerDiagnosticKind;
  readonly message: string;
  readonly sourceRecord?: string;
}

export interface EngineeringQualityCheckerReport {
  readonly schemaVersion: typeof QUALITY_CHECKER_REPORT_SCHEMA_URN;
  readonly source: QualityCheckerReportSource;
  readonly tool: EngineeringQualityCheckerTool;
  readonly status: QualityCheckerIngestionStatus;
  readonly findings: readonly EngineeringQualityCheckerFinding[];
  readonly diagnostics: readonly EngineeringQualityCheckerDiagnostic[];
}

export interface IngestEngineeringQualityCheckerReportOptions {
  readonly source: QualityCheckerReportSource;
  readonly input: unknown;
  readonly projectRoot?: string;
}
