import type {
  QUALITY_SPECIALIZED_PACK_CHECK_DEFINITION_SCHEMA_URN,
  QUALITY_SPECIALIZED_PACK_CHECK_REPORT_SCHEMA_URN,
  QUALITY_SPECIALIZED_PACK_CHECK_RESULT_SCHEMA_URN,
  QualityDetectionPathMatchKind,
} from "./common.js";

export {
  QUALITY_SPECIALIZED_PACK_CHECK_DEFINITION_SCHEMA_URN,
  QUALITY_SPECIALIZED_PACK_CHECK_REPORT_SCHEMA_URN,
  QUALITY_SPECIALIZED_PACK_CHECK_RESULT_SCHEMA_URN,
} from "./common.js";

export type QualitySpecializedPackCheckKind = "path-presence" | "path-absence";

export type QualitySpecializedPackCheckSeverity =
  "info" | "review" | "blocking";

export type QualitySpecializedPackCheckState = "passed" | "failed" | "skipped";

export interface QualitySpecializedPackCheckSignal {
  readonly pathPattern: string;
  readonly matchKind: QualityDetectionPathMatchKind;
  readonly label?: string;
}

export interface QualitySpecializedPackCheckDefinition {
  readonly schemaVersion: typeof QUALITY_SPECIALIZED_PACK_CHECK_DEFINITION_SCHEMA_URN;
  readonly packId: string;
  readonly ruleId: string;
  readonly kind: QualitySpecializedPackCheckKind;
  readonly signals: readonly QualitySpecializedPackCheckSignal[];
  readonly minimumSignalMatches?: number;
  readonly severity: QualitySpecializedPackCheckSeverity;
  readonly summary: string;
}

export interface QualitySpecializedPackCheckFinding {
  readonly ruleId: string;
  readonly packId: string;
  readonly state: QualitySpecializedPackCheckState;
  readonly severity: QualitySpecializedPackCheckSeverity;
  readonly summary: string;
  readonly evidencePaths: readonly string[];
  readonly message: string;
}

export interface QualitySpecializedPackCheckResult {
  readonly schemaVersion: typeof QUALITY_SPECIALIZED_PACK_CHECK_RESULT_SCHEMA_URN;
  readonly scannedPathCount: number;
  readonly excludedPathCount: number;
  readonly scanLimitReached: boolean;
  readonly findings: readonly QualitySpecializedPackCheckFinding[];
}

export interface QualitySpecializedPackCheckReport {
  readonly schemaVersion: typeof QUALITY_SPECIALIZED_PACK_CHECK_REPORT_SCHEMA_URN;
  readonly activePackIds: readonly string[];
  readonly result: QualitySpecializedPackCheckResult;
}
