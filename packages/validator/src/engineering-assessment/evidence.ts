import type {
  AssessmentEvidenceKind,
  AssessmentEvidenceQuality,
  AssessmentEvidenceReference,
  AssessmentEvidenceStatus,
} from "@intentloom/protocol";
import {
  EVIDENCE_KINDS,
  EVIDENCE_QUALITIES,
  EVIDENCE_STATUSES,
  isObject,
} from "./common.js";

export function validateAssessmentEvidenceReference(
  value: unknown,
): AssessmentEvidenceReference {
  if (!isObject(value)) {
    throw new Error("evidence reference must be an object");
  }
  if (typeof value.id !== "string" || !value.id.trim()) {
    throw new Error("evidenceReference.id must be a non-empty string");
  }
  if (!EVIDENCE_KINDS.includes(value.kind as AssessmentEvidenceKind)) {
    throw new Error(
      "evidenceReference.kind must be a valid AssessmentEvidenceKind",
    );
  }
  if (!EVIDENCE_STATUSES.includes(value.status as AssessmentEvidenceStatus)) {
    throw new Error(
      "evidenceReference.status must be a valid AssessmentEvidenceStatus",
    );
  }
  if (
    !EVIDENCE_QUALITIES.includes(value.quality as AssessmentEvidenceQuality)
  ) {
    throw new Error(
      "evidenceReference.quality must be a valid AssessmentEvidenceQuality",
    );
  }
  if (typeof value.sourceId !== "string" || !value.sourceId.trim()) {
    throw new Error("evidenceReference.sourceId must be a non-empty string");
  }
  if (typeof value.toolName !== "string" || !value.toolName.trim()) {
    throw new Error("evidenceReference.toolName must be a non-empty string");
  }
  if (typeof value.toolVersion !== "string" || !value.toolVersion.trim()) {
    throw new Error("evidenceReference.toolVersion must be a non-empty string");
  }
  if (
    value.configDigest !== undefined &&
    (typeof value.configDigest !== "string" || !value.configDigest.trim())
  ) {
    throw new Error(
      "evidenceReference.configDigest must be a non-empty string when provided",
    );
  }
  if (typeof value.description !== "string" || !value.description.trim()) {
    throw new Error("evidenceReference.description must be a non-empty string");
  }
  if (
    value.path !== undefined &&
    (typeof value.path !== "string" || !value.path.trim())
  ) {
    throw new Error(
      "evidenceReference.path must be a non-empty string when provided",
    );
  }
  let lineRange: { start: number; end: number } | undefined = undefined;
  if (value.lineRange !== undefined) {
    if (!isObject(value.lineRange)) {
      throw new Error(
        "evidenceReference.lineRange must be an object when provided",
      );
    }
    const start = value.lineRange.start;
    const end = value.lineRange.end;
    if (
      typeof start !== "number" ||
      !Number.isInteger(start) ||
      start < 1 ||
      typeof end !== "number" ||
      !Number.isInteger(end) ||
      end < start
    ) {
      throw new Error(
        "evidenceReference.lineRange must contain positive integer line numbers with start <= end",
      );
    }
    lineRange = { start, end };
  }

  return {
    id: value.id,
    kind: value.kind as AssessmentEvidenceKind,
    status: value.status as AssessmentEvidenceStatus,
    quality: value.quality as AssessmentEvidenceQuality,
    sourceId: value.sourceId,
    toolName: value.toolName,
    toolVersion: value.toolVersion,
    ...(value.configDigest !== undefined
      ? { configDigest: value.configDigest as string }
      : {}),
    description: value.description,
    ...(value.path !== undefined ? { path: value.path as string } : {}),
    ...(lineRange !== undefined ? { lineRange } : {}),
  };
}
