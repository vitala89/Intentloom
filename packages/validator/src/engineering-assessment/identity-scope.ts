import {
  ASSESSMENT_ENVELOPE_SCHEMA_URN,
  type AssessmentIdentity,
  type AssessmentProvenanceSummary,
  type AssessmentScope,
} from "@intentloom/protocol";
import { isObject } from "./common.js";

export function validateAssessmentIdentity(value: unknown): AssessmentIdentity {
  if (!isObject(value)) {
    throw new Error("identity must be an object");
  }
  if (typeof value.id !== "string" || !value.id.trim()) {
    throw new Error("identity.id must be a non-empty string");
  }
  if (value.schemaVersion !== ASSESSMENT_ENVELOPE_SCHEMA_URN) {
    throw new Error(
      `identity.schemaVersion must equal ${ASSESSMENT_ENVELOPE_SCHEMA_URN}`,
    );
  }
  return {
    id: value.id,
    schemaVersion: ASSESSMENT_ENVELOPE_SCHEMA_URN,
  };
}

export function validateAssessmentScope(value: unknown): AssessmentScope {
  if (!isObject(value)) {
    throw new Error("scope must be an object");
  }
  if (typeof value.root !== "string" || !value.root.trim()) {
    throw new Error("scope.root must be a non-empty string");
  }
  if (typeof value.projectId !== "string" || !value.projectId.trim()) {
    throw new Error("scope.projectId must be a non-empty string");
  }
  if (
    value.projectDigest !== undefined &&
    (typeof value.projectDigest !== "string" || !value.projectDigest.trim())
  ) {
    throw new Error(
      "scope.projectDigest must be a non-empty string when provided",
    );
  }
  return {
    root: value.root,
    projectId: value.projectId,
    ...(value.projectDigest !== undefined
      ? { projectDigest: value.projectDigest as string }
      : {}),
  };
}

export function validateAssessmentProvenance(
  value: unknown,
): AssessmentProvenanceSummary {
  if (!isObject(value)) {
    throw new Error("provenance must be an object");
  }
  if (typeof value.toolName !== "string" || !value.toolName.trim()) {
    throw new Error("provenance.toolName must be a non-empty string");
  }
  if (typeof value.toolVersion !== "string" || !value.toolVersion.trim()) {
    throw new Error("provenance.toolVersion must be a non-empty string");
  }
  if (
    typeof value.executionTimeMs !== "number" ||
    !Number.isFinite(value.executionTimeMs) ||
    value.executionTimeMs < 0
  ) {
    throw new Error("provenance.executionTimeMs must be a non-negative number");
  }
  return {
    toolName: value.toolName,
    toolVersion: value.toolVersion,
    executionTimeMs: value.executionTimeMs,
  };
}
