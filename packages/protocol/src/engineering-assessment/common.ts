export const ASSESSMENT_ENVELOPE_SCHEMA_URN =
  "urn:intentloom:schema:assessment-envelope:1" as const;

export const ASSESSMENT_REPORT_SCHEMA_URN =
  "urn:intentloom:schema:assessment-report:1" as const;

export type AssessmentStatus =
  "completed" | "partial" | "insufficient-evidence" | "failed";

export type AssessmentModule =
  "architecture" | "quality" | "conformance" | "technical-debt";

export type AssessmentEvidenceKind =
  | "deterministic-tool"
  | "derived"
  | "ai-assisted"
  | "review-required"
  | "insufficient";

export type AssessmentEvidenceStatus =
  | "valid"
  | "stale"
  | "partial"
  | "conflicting"
  | "malformed"
  | "unsupported"
  | "denied";

export type AssessmentEvidenceQuality = "complete" | "bounded" | "unavailable";

export interface AssessmentEvidenceReference {
  readonly id: string;
  readonly kind: AssessmentEvidenceKind;
  readonly status: AssessmentEvidenceStatus;
  readonly quality: AssessmentEvidenceQuality;
  readonly sourceId: string;
  readonly toolName: string;
  readonly toolVersion: string;
  readonly configDigest?: string;
  readonly description: string;
  readonly path?: string;
  readonly lineRange?: {
    readonly start: number;
    readonly end: number;
  };
}
