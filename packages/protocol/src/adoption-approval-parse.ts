import { ProtocolValidationError } from "./protocol-validation-error.js";
import { isObject, stringValue } from "./workspace-daemon-request-helpers.js";
import { ADOPTION_PREVIEW_IDENTITY_PATTERN } from "./adoption-plan.js";
import {
  ADOPTION_PREPARED_PLAN_REASONS,
  SHA256_HEX_PATTERN,
  type AdoptionPreparedPlanReason,
} from "./adoption-prepared-plan.js";
import { parseExistingProjectAdoptionPreparedPlan } from "./adoption-prepared-plan-parse.js";
import { MAX_ADOPTION_DECISIONS } from "./adoption-decision.js";
import {
  ADOPTION_APPROVE_STATUSES,
  EXISTING_PROJECT_ADOPTION_APPROVAL_SCHEMA_VERSION,
  EXISTING_PROJECT_ADOPTION_APPROVAL_SOURCE,
  type ExistingProjectAdoptionApproval,
  type ExistingProjectAdoptionApproveViewModel,
} from "./adoption-approval.js";

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

function sha256Hex(value: unknown, field: string): string {
  const digest = stringValue(value, field);
  if (!SHA256_HEX_PATTERN.test(digest)) {
    throw new ProtocolValidationError(
      -32602,
      `${field} must be a sha256 hex digest`,
    );
  }
  return digest;
}

function epochMs(value: unknown, field: string): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0) {
    throw new ProtocolValidationError(
      -32602,
      `${field} must be a non-negative integer timestamp`,
    );
  }
  return value;
}

function parseReasons(value: unknown): readonly AdoptionPreparedPlanReason[] {
  if (!Array.isArray(value) || value.length > MAX_ADOPTION_DECISIONS) {
    throw new ProtocolValidationError(
      -32602,
      "reasons must be a bounded array",
    );
  }
  return value.map((entry, index) =>
    oneOf(
      stringValue(entry, `reasons[${index}]`),
      ADOPTION_PREPARED_PLAN_REASONS,
      `reasons[${index}]`,
    ),
  );
}

export function parseExistingProjectAdoptionApproval(
  value: unknown,
): ExistingProjectAdoptionApproval {
  if (!isObject(value)) {
    throw new ProtocolValidationError(-32602, "approval must be an object");
  }
  if (
    value.schemaVersion !== EXISTING_PROJECT_ADOPTION_APPROVAL_SCHEMA_VERSION
  ) {
    throw new ProtocolValidationError(
      -32602,
      "approval schemaVersion is unsupported",
    );
  }
  if (value.readOnly !== true || value.classification !== "read-only") {
    throw new ProtocolValidationError(
      -32602,
      "approval must be classified read-only",
    );
  }
  if (
    value.approved !== true ||
    value.applied !== false ||
    value.changesApplied !== 0
  ) {
    throw new ProtocolValidationError(
      -32602,
      "approval must be approved without applied changes",
    );
  }
  const approvedAt = epochMs(value.approvedAt, "approvedAt");
  const approvalValidUntil = epochMs(
    value.approvalValidUntil,
    "approvalValidUntil",
  );
  const preparedPlanExpiresAt = epochMs(
    value.preparedPlanExpiresAt,
    "preparedPlanExpiresAt",
  );
  if (approvalValidUntil > preparedPlanExpiresAt) {
    throw new ProtocolValidationError(
      -32602,
      "approvalValidUntil must not outlive preparedPlanExpiresAt",
    );
  }
  if (approvalValidUntil < approvedAt) {
    throw new ProtocolValidationError(
      -32602,
      "approvalValidUntil must not precede approvedAt",
    );
  }
  const approvalToken = stringValue(value.approvalToken, "approvalToken");
  const planDigest = sha256Hex(value.planDigest, "planDigest");
  if (approvalToken !== `approved:${planDigest}`) {
    throw new ProtocolValidationError(
      -32602,
      "approvalToken must bind approved:<planDigest>",
    );
  }
  const previewIdentity = stringValue(value.previewIdentity, "previewIdentity");
  if (!ADOPTION_PREVIEW_IDENTITY_PATTERN.test(previewIdentity)) {
    throw new ProtocolValidationError(
      -32602,
      "previewIdentity must be a sha256 hex digest",
    );
  }
  return {
    schemaVersion: EXISTING_PROJECT_ADOPTION_APPROVAL_SCHEMA_VERSION,
    readOnly: true,
    classification: "read-only",
    approved: true,
    applied: false,
    changesApplied: 0,
    approvalId: stringValue(value.approvalId, "approvalId"),
    approvalDigest: sha256Hex(value.approvalDigest, "approvalDigest"),
    approvalSource: oneOf(
      stringValue(value.approvalSource, "approvalSource"),
      [EXISTING_PROJECT_ADOPTION_APPROVAL_SOURCE] as const,
      "approvalSource",
    ),
    approvalToken,
    root: stringValue(value.root, "root"),
    previewIdentity,
    preparedPlanId: stringValue(value.preparedPlanId, "preparedPlanId"),
    planDigest,
    projectFingerprint: sha256Hex(
      value.projectFingerprint,
      "projectFingerprint",
    ),
    approvedAt,
    approvalValidUntil,
    preparedPlanExpiresAt,
  };
}

export function parseExistingProjectAdoptionApproveViewModel(
  value: unknown,
): ExistingProjectAdoptionApproveViewModel {
  if (!isObject(value)) {
    throw new ProtocolValidationError(-32602, "viewmodel must be an object");
  }
  if (value.readOnly !== true || value.classification !== "read-only") {
    throw new ProtocolValidationError(
      -32602,
      "approve result must be classified read-only",
    );
  }
  if (value.applied !== false || value.changesApplied !== 0) {
    throw new ProtocolValidationError(
      -32602,
      "approve result must not apply changes",
    );
  }
  const status = oneOf(
    stringValue(value.status, "status"),
    ADOPTION_APPROVE_STATUSES,
    "status",
  );
  const approved = value.approved === true;
  if (typeof value.approved !== "boolean") {
    throw new ProtocolValidationError(-32602, "approved must be a boolean");
  }
  const approval =
    value.approval === null
      ? null
      : parseExistingProjectAdoptionApproval(value.approval);
  if (status === "approved" && (approval === null || !approved)) {
    throw new ProtocolValidationError(
      -32602,
      "approved status requires an approval artifact",
    );
  }
  if (status === "denied" && (approval !== null || approved)) {
    throw new ProtocolValidationError(
      -32602,
      "denied approve must not include an approval",
    );
  }
  return {
    readOnly: true,
    classification: "read-only",
    applied: false,
    changesApplied: 0,
    approved,
    status,
    reasons: parseReasons(value.reasons),
    approval,
    plan: parseExistingProjectAdoptionPreparedPlan(value.plan),
  };
}
