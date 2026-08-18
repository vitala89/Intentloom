import { ProtocolValidationError } from "./protocol-validation-error.js";
import {
  ADOPTION_PREVIEW_IDENTITY_PATTERN,
  MAX_ADOPTION_PLAN_ENTRIES,
  parseAdoptionPreviewItem,
} from "./adoption-plan.js";
import { isObject, stringValue } from "./workspace-daemon-request-helpers.js";
import {
  ADOPTION_DECISION_INVALID_REASONS,
  ADOPTION_DECISION_KINDS,
  MAX_ADOPTION_DECISION_PATH_LENGTH,
  MAX_ADOPTION_DECISIONS,
  type AdoptionDecisionEvaluation,
  type ExistingProjectAdoptionDecisionViewModel,
  type SelectedAdoptionDecision,
} from "./adoption-decision.js";

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

export function parseSelectedAdoptionDecision(
  value: unknown,
  index: number,
): SelectedAdoptionDecision {
  if (!isObject(value)) {
    throw new ProtocolValidationError(
      -32602,
      `decisions[${index}] must be an object`,
    );
  }
  const path = stringValue(value.path, `decisions[${index}].path`);
  if (path.length > MAX_ADOPTION_DECISION_PATH_LENGTH) {
    throw new ProtocolValidationError(
      -32602,
      `decisions[${index}].path exceeds bounded size`,
    );
  }
  return {
    path,
    kind: oneOf(
      stringValue(value.kind, `decisions[${index}].kind`),
      ADOPTION_DECISION_KINDS,
      `decisions[${index}].kind`,
    ),
  };
}

export function parseSelectedAdoptionDecisions(
  value: unknown,
): readonly SelectedAdoptionDecision[] {
  if (!Array.isArray(value)) {
    throw new ProtocolValidationError(-32602, "decisions must be an array");
  }
  if (value.length > MAX_ADOPTION_DECISIONS) {
    throw new ProtocolValidationError(-32602, "decisions exceed bounded size");
  }
  return value.map(parseSelectedAdoptionDecision);
}

function parseEvaluation(
  value: unknown,
  index: number,
): AdoptionDecisionEvaluation {
  if (!isObject(value)) {
    throw new ProtocolValidationError(
      -32602,
      `evaluations[${index}] must be an object`,
    );
  }
  if (value.status !== "valid" && value.status !== "invalid") {
    throw new ProtocolValidationError(
      -32602,
      `evaluations[${index}].status is unsupported`,
    );
  }
  if (value.reason !== null && typeof value.reason !== "string") {
    throw new ProtocolValidationError(
      -32602,
      `evaluations[${index}].reason must be a string or null`,
    );
  }
  const reason =
    value.reason === null
      ? null
      : oneOf(
          value.reason,
          ADOPTION_DECISION_INVALID_REASONS,
          `evaluations[${index}].reason`,
        );
  if (!Array.isArray(value.supportedChoices)) {
    throw new ProtocolValidationError(
      -32602,
      `evaluations[${index}].supportedChoices must be an array`,
    );
  }
  const parsedItem =
    value.resolvedItem === null
      ? null
      : parseAdoptionPreviewItem(value.resolvedItem, index);
  return {
    path: stringValue(value.path, `evaluations[${index}].path`),
    kind: oneOf(
      stringValue(value.kind, `evaluations[${index}].kind`),
      ADOPTION_DECISION_KINDS,
      `evaluations[${index}].kind`,
    ),
    status: value.status,
    reason,
    supportedChoices: value.supportedChoices.map((choice, choiceIndex) =>
      oneOf(
        stringValue(
          choice,
          `evaluations[${index}].supportedChoices[${choiceIndex}]`,
        ),
        ADOPTION_DECISION_KINDS,
        `evaluations[${index}].supportedChoices[${choiceIndex}]`,
      ),
    ),
    resolvedItem: parsedItem,
  };
}

export function parseExistingProjectAdoptionDecisionViewModel(
  value: unknown,
): ExistingProjectAdoptionDecisionViewModel {
  if (!isObject(value)) {
    throw new ProtocolValidationError(-32602, "viewmodel must be an object");
  }
  if (value.readOnly !== true || value.classification !== "read-only") {
    throw new ProtocolValidationError(
      -32602,
      "adoption decisions must be classified read-only",
    );
  }
  if (value.applied !== false || value.changesApplied !== 0) {
    throw new ProtocolValidationError(
      -32602,
      "adoption decisions must not report applied changes",
    );
  }
  if (typeof value.stalePreview !== "boolean") {
    throw new ProtocolValidationError(-32602, "stalePreview must be a boolean");
  }
  if (
    typeof value.decisionsPrepared !== "number" ||
    !Number.isInteger(value.decisionsPrepared) ||
    value.decisionsPrepared < 0
  ) {
    throw new ProtocolValidationError(
      -32602,
      "decisionsPrepared must be a non-negative integer",
    );
  }
  const previewIdentity = stringValue(value.previewIdentity, "previewIdentity");
  if (!ADOPTION_PREVIEW_IDENTITY_PATTERN.test(previewIdentity)) {
    throw new ProtocolValidationError(
      -32602,
      "previewIdentity must be a sha256 hex digest",
    );
  }
  if (
    !Array.isArray(value.evaluations) ||
    value.evaluations.length > MAX_ADOPTION_PLAN_ENTRIES
  ) {
    throw new ProtocolValidationError(
      -32602,
      "evaluations must be a bounded array",
    );
  }
  if (
    !Array.isArray(value.remainingManualDecisionPaths) ||
    value.remainingManualDecisionPaths.length > MAX_ADOPTION_PLAN_ENTRIES
  ) {
    throw new ProtocolValidationError(
      -32602,
      "remainingManualDecisionPaths must be a bounded array",
    );
  }
  return {
    readOnly: true,
    classification: "read-only",
    applied: false,
    changesApplied: 0,
    root: stringValue(value.root, "root"),
    projectId: stringValue(value.projectId, "projectId"),
    previewIdentity,
    stalePreview: value.stalePreview,
    decisionsPrepared: value.decisionsPrepared,
    evaluations: value.evaluations.map(parseEvaluation),
    remainingManualDecisionPaths: value.remainingManualDecisionPaths.map(
      (path, index) =>
        stringValue(path, `remainingManualDecisionPaths[${index}]`),
    ),
  };
}
