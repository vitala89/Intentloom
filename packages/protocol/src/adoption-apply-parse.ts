import { ProtocolValidationError } from "./protocol-validation-error.js";
import { isObject, stringValue } from "./workspace-daemon-request-helpers.js";
import { boundedStringArray } from "./adoption-plan.js";
import { parseExistingProjectAdoptionPreparedPlan } from "./adoption-prepared-plan-parse.js";
import { parseExistingProjectAdoptionApproval } from "./adoption-approval-parse.js";
import {
  ADOPTION_APPLY_REASONS,
  ADOPTION_APPLY_STATUSES,
  EXISTING_PROJECT_ADOPTION_APPLY_SCHEMA_VERSION,
  type AdoptionApplyReason,
  type AdoptionApplyStatus,
  type ExistingProjectAdoptionApplyDiffSummary,
  type ExistingProjectAdoptionApplyDoctorSummary,
  type ExistingProjectAdoptionApplyViewModel,
} from "./adoption-apply.js";

function oneOf<T extends string>(
  value: string,
  allowed: readonly T[],
  field: string,
): T {
  const match = allowed.find((entry) => entry === value);
  if (match === undefined) {
    throw new ProtocolValidationError(-32602, `${field} is unsupported`);
  }
  return match;
}

function parseReasons(value: unknown): readonly AdoptionApplyReason[] {
  if (!Array.isArray(value) || value.length > 64) {
    throw new ProtocolValidationError(
      -32602,
      "reasons must be a bounded array",
    );
  }
  return value.map((entry, index) =>
    oneOf(
      stringValue(entry, `reasons[${index}]`),
      ADOPTION_APPLY_REASONS,
      `reasons[${index}]`,
    ),
  );
}

function parseDoctor(
  value: unknown,
): ExistingProjectAdoptionApplyDoctorSummary | null {
  if (value === null) return null;
  if (!isObject(value)) {
    throw new ProtocolValidationError(-32602, "doctor must be an object");
  }
  if (
    typeof value.errorCount !== "number" ||
    typeof value.warningCount !== "number"
  ) {
    throw new ProtocolValidationError(-32602, "doctor counts must be numbers");
  }
  return {
    errorCount: value.errorCount,
    warningCount: value.warningCount,
    codes: boundedStringArray(value.codes, "doctor.codes"),
  };
}

function parseDiff(
  value: unknown,
): ExistingProjectAdoptionApplyDiffSummary | null {
  if (value === null) return null;
  if (!isObject(value)) {
    throw new ProtocolValidationError(-32602, "diff must be an object");
  }
  return {
    unmanagedDriftPaths: boundedStringArray(
      value.unmanagedDriftPaths,
      "diff.unmanagedDriftPaths",
    ),
  };
}

export function parseExistingProjectAdoptionApplyViewModel(
  value: unknown,
): ExistingProjectAdoptionApplyViewModel {
  if (!isObject(value)) {
    throw new ProtocolValidationError(-32602, "viewmodel must be an object");
  }
  if (value.schemaVersion !== EXISTING_PROJECT_ADOPTION_APPLY_SCHEMA_VERSION) {
    throw new ProtocolValidationError(
      -32602,
      "apply schemaVersion is unsupported",
    );
  }
  if (value.readOnly !== false || value.classification !== "mutating") {
    throw new ProtocolValidationError(
      -32602,
      "apply result must be classified mutating",
    );
  }
  if ("previousContent" in value || "rollbackFiles" in value) {
    throw new ProtocolValidationError(
      -32602,
      "apply result must not include previous file contents",
    );
  }
  const status = oneOf(
    stringValue(value.status, "status"),
    ADOPTION_APPLY_STATUSES,
    "status",
  ) as AdoptionApplyStatus;
  if (typeof value.applied !== "boolean") {
    throw new ProtocolValidationError(-32602, "applied must be a boolean");
  }
  if (typeof value.alreadyApplied !== "boolean") {
    throw new ProtocolValidationError(
      -32602,
      "alreadyApplied must be a boolean",
    );
  }
  if (typeof value.ready !== "boolean") {
    throw new ProtocolValidationError(-32602, "ready must be a boolean");
  }
  if (typeof value.changesApplied !== "number" || value.changesApplied < 0) {
    throw new ProtocolValidationError(
      -32602,
      "changesApplied must be a non-negative number",
    );
  }
  if (typeof value.rollbackAttempted !== "boolean") {
    throw new ProtocolValidationError(
      -32602,
      "rollbackAttempted must be a boolean",
    );
  }
  if (typeof value.rollbackCompleted !== "boolean") {
    throw new ProtocolValidationError(
      -32602,
      "rollbackCompleted must be a boolean",
    );
  }
  if (typeof value.cancelledAfterCommit !== "boolean") {
    throw new ProtocolValidationError(
      -32602,
      "cancelledAfterCommit must be a boolean",
    );
  }
  const ready = value.ready === true;
  if (ready && status !== "applied" && status !== "already-applied") {
    throw new ProtocolValidationError(
      -32602,
      "ready requires applied or already-applied status",
    );
  }
  if (
    (status === "denied" ||
      status === "rolled-back" ||
      status === "failed-incomplete") &&
    value.applied === true
  ) {
    throw new ProtocolValidationError(
      -32602,
      "failed apply must not report applied",
    );
  }
  return {
    schemaVersion: EXISTING_PROJECT_ADOPTION_APPLY_SCHEMA_VERSION,
    readOnly: false,
    classification: "mutating",
    status,
    reasons: parseReasons(value.reasons),
    applied: value.applied,
    alreadyApplied: value.alreadyApplied,
    ready,
    changesApplied: value.changesApplied,
    canonicalRoot: stringValue(value.canonicalRoot, "canonicalRoot"),
    preparedPlanId: stringValue(value.preparedPlanId, "preparedPlanId"),
    planDigest: stringValue(value.planDigest, "planDigest"),
    approvalId: stringValue(value.approvalId, "approvalId"),
    appliedPaths: boundedStringArray(value.appliedPaths, "appliedPaths"),
    unchangedPaths: boundedStringArray(value.unchangedPaths, "unchangedPaths"),
    rollbackAttempted: value.rollbackAttempted,
    rollbackCompleted: value.rollbackCompleted,
    rollbackFailures: boundedStringArray(
      value.rollbackFailures,
      "rollbackFailures",
    ),
    doctor: parseDoctor(value.doctor),
    diff: parseDiff(value.diff),
    inspectionReadiness:
      value.inspectionReadiness === null
        ? null
        : stringValue(value.inspectionReadiness, "inspectionReadiness"),
    recoveryGuidance:
      value.recoveryGuidance === null
        ? null
        : stringValue(value.recoveryGuidance, "recoveryGuidance"),
    diagnostics: boundedStringArray(value.diagnostics, "diagnostics"),
    cancelledAfterCommit: value.cancelledAfterCommit,
    approval: parseExistingProjectAdoptionApproval(value.approval),
    plan: parseExistingProjectAdoptionPreparedPlan(value.plan),
  };
}
