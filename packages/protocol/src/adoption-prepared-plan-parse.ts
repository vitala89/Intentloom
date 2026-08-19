import { ProtocolValidationError } from "./protocol-validation-error.js";
import { isObject, stringValue } from "./workspace-daemon-request-helpers.js";
import {
  boundedStringArray,
  MAX_ADOPTION_PLAN_ENTRIES,
} from "./adoption-plan.js";
import { parseSelectedAdoptionDecisions } from "./adoption-decision-parse.js";
import { MAX_ADOPTION_DECISIONS } from "./adoption-decision.js";
import {
  ADOPTION_PREPARED_PLAN_REASONS,
  ADOPTION_PREPARED_PLAN_STATUSES,
  EXISTING_PROJECT_ADOPTION_PREPARED_PLAN_SCHEMA_VERSION,
  SHA256_HEX_PATTERN,
  type AdoptionPreparedPlanAction,
  type AdoptionPreparedPlanReason,
  type AdoptionPreparedPlanStatus,
  type ExistingProjectAdoptionPreparedPlan,
  type ExistingProjectAdoptionPrepareViewModel,
  type ExistingProjectAdoptionRevalidateViewModel,
} from "./adoption-prepared-plan.js";

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

function parsePlannedAction(
  value: unknown,
  index: number,
): AdoptionPreparedPlanAction {
  if (!isObject(value)) {
    throw new ProtocolValidationError(
      -32602,
      `plannedActions[${index}] must be an object`,
    );
  }
  if (typeof value.manualDecisionRequired !== "boolean") {
    throw new ProtocolValidationError(
      -32602,
      `plannedActions[${index}].manualDecisionRequired must be a boolean`,
    );
  }
  return {
    path: stringValue(value.path, `plannedActions[${index}].path`),
    action: stringValue(value.action, `plannedActions[${index}].action`),
    currentClassification: stringValue(
      value.currentClassification,
      `plannedActions[${index}].currentClassification`,
    ),
    proposedClassification: stringValue(
      value.proposedClassification,
      `plannedActions[${index}].proposedClassification`,
    ),
    manualDecisionRequired: value.manualDecisionRequired,
  };
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

export function parseExistingProjectAdoptionPreparedPlan(
  value: unknown,
): ExistingProjectAdoptionPreparedPlan {
  if (!isObject(value)) {
    throw new ProtocolValidationError(
      -32602,
      "prepared plan must be an object",
    );
  }
  if (
    value.schemaVersion !==
    EXISTING_PROJECT_ADOPTION_PREPARED_PLAN_SCHEMA_VERSION
  ) {
    throw new ProtocolValidationError(
      -32602,
      "prepared plan schemaVersion is unsupported",
    );
  }
  if (value.readOnly !== true || value.classification !== "read-only") {
    throw new ProtocolValidationError(
      -32602,
      "prepared plan must be classified read-only",
    );
  }
  if (
    value.applied !== false ||
    value.changesApplied !== 0 ||
    value.approved !== false
  ) {
    throw new ProtocolValidationError(
      -32602,
      "prepared plan must not be approved or applied",
    );
  }
  if (
    !Array.isArray(value.plannedActions) ||
    value.plannedActions.length > MAX_ADOPTION_PLAN_ENTRIES
  ) {
    throw new ProtocolValidationError(
      -32602,
      "plannedActions must be a bounded array",
    );
  }
  const createdAt = epochMs(value.createdAt, "createdAt");
  const expiresAt = epochMs(value.expiresAt, "expiresAt");
  if (expiresAt <= createdAt) {
    throw new ProtocolValidationError(
      -32602,
      "expiresAt must be after createdAt",
    );
  }
  return {
    schemaVersion: EXISTING_PROJECT_ADOPTION_PREPARED_PLAN_SCHEMA_VERSION,
    readOnly: true,
    classification: "read-only",
    applied: false,
    changesApplied: 0,
    approved: false,
    root: stringValue(value.root, "root"),
    projectId: stringValue(value.projectId, "projectId"),
    profile: stringValue(value.profile, "profile"),
    workspaceTopology: stringValue(
      value.workspaceTopology,
      "workspaceTopology",
    ),
    detectedAdapters: boundedStringArray(
      value.detectedAdapters,
      "detectedAdapters",
    ),
    previewIdentity: sha256Hex(value.previewIdentity, "previewIdentity"),
    preparedPlanId: stringValue(value.preparedPlanId, "preparedPlanId"),
    planDigest: sha256Hex(value.planDigest, "planDigest"),
    projectFingerprint: sha256Hex(
      value.projectFingerprint,
      "projectFingerprint",
    ),
    createdAt,
    expiresAt,
    decisions: parseSelectedAdoptionDecisions(value.decisions),
    affectedPaths: boundedStringArray(value.affectedPaths, "affectedPaths"),
    plannedActions: value.plannedActions.map(parsePlannedAction),
    diagnostics: boundedStringArray(value.diagnostics, "diagnostics"),
    remainingManualDecisionPaths: boundedStringArray(
      value.remainingManualDecisionPaths,
      "remainingManualDecisionPaths",
    ),
  };
}

function parseEnvelopeFlags(
  value: Record<string, unknown>,
  label: string,
): void {
  if (value.readOnly !== true || value.classification !== "read-only") {
    throw new ProtocolValidationError(
      -32602,
      `${label} must be classified read-only`,
    );
  }
  if (
    value.applied !== false ||
    value.changesApplied !== 0 ||
    value.approved !== false
  ) {
    throw new ProtocolValidationError(
      -32602,
      `${label} must not be approved or applied`,
    );
  }
}

export function parseExistingProjectAdoptionPrepareViewModel(
  value: unknown,
): ExistingProjectAdoptionPrepareViewModel {
  if (!isObject(value)) {
    throw new ProtocolValidationError(-32602, "viewmodel must be an object");
  }
  parseEnvelopeFlags(value, "prepare result");
  const status = oneOf(
    stringValue(value.status, "status"),
    ["prepared", "invalid"] as const,
    "status",
  );
  const plan =
    value.plan === null
      ? null
      : parseExistingProjectAdoptionPreparedPlan(value.plan);
  if (status === "prepared" && plan === null) {
    throw new ProtocolValidationError(
      -32602,
      "prepared status requires a plan",
    );
  }
  if (status === "invalid" && plan !== null) {
    throw new ProtocolValidationError(
      -32602,
      "invalid prepare must not include a plan",
    );
  }
  return {
    readOnly: true,
    classification: "read-only",
    applied: false,
    changesApplied: 0,
    approved: false,
    status,
    reasons: parseReasons(value.reasons),
    plan,
  };
}

export function parseExistingProjectAdoptionRevalidateViewModel(
  value: unknown,
): ExistingProjectAdoptionRevalidateViewModel {
  if (!isObject(value)) {
    throw new ProtocolValidationError(-32602, "viewmodel must be an object");
  }
  parseEnvelopeFlags(value, "revalidate result");
  return {
    readOnly: true,
    classification: "read-only",
    applied: false,
    changesApplied: 0,
    approved: false,
    status: oneOf(
      stringValue(value.status, "status"),
      ADOPTION_PREPARED_PLAN_STATUSES,
      "status",
    ) as AdoptionPreparedPlanStatus,
    reasons: parseReasons(value.reasons),
    plan: parseExistingProjectAdoptionPreparedPlan(value.plan),
  };
}
