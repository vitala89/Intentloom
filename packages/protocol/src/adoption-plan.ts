import { ProtocolValidationError } from "./protocol-validation-error.js";
import { isObject, stringValue } from "./workspace-daemon-request-helpers.js";

const ADOPTION_ACTIONS = [
  "create",
  "map-existing-project-owned",
  "map-existing-aif-compatible-document",
  "generated-candidate",
  "conflict",
  "unsupported",
  "skip",
  "manual-decision-required",
] as const;

const CURRENT_CLASSIFICATIONS = [
  "absent",
  "project-owned",
  "aif-owned",
  "aif-metadata",
] as const;

const PROPOSED_CLASSIFICATIONS = [
  "aif-generated",
  "aif-metadata",
  "project-owned",
  "project-owned-documentation",
  "unsupported",
] as const;

export const MAX_ADOPTION_PLAN_ENTRIES = 10_000;

export type AdoptionPreviewAction = (typeof ADOPTION_ACTIONS)[number];

export interface AdoptionPreviewItem {
  readonly path: string;
  readonly action: AdoptionPreviewAction;
  readonly currentClassification: (typeof CURRENT_CLASSIFICATIONS)[number];
  readonly proposedClassification: (typeof PROPOSED_CLASSIFICATIONS)[number];
  readonly reason: string;
  readonly canonicalSource: string | null;
  readonly adapter: string | null;
  readonly profile: string | null;
  readonly conflictDetails: readonly string[];
  readonly writeEligible: boolean;
  readonly manualDecisionRequired: boolean;
  readonly safeNextAction: string;
}

export interface ExistingProjectAdoptionPlanViewModel {
  readonly readOnly: true;
  readonly classification: "read-only";
  readonly root: string;
  readonly projectId: string;
  readonly profile: string;
  readonly workspaceTopology: string;
  readonly detectedAdapters: readonly string[];
  readonly readiness: string;
  readonly instructionPaths: readonly string[];
  readonly diagnostics: readonly string[];
  readonly nextActions: readonly string[];
  readonly applied: false;
  readonly items: readonly AdoptionPreviewItem[];
}

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

export function boundedStringArray(
  value: unknown,
  field: string,
): readonly string[] {
  if (!Array.isArray(value)) {
    throw new ProtocolValidationError(-32602, `${field} must be an array`);
  }
  if (value.length > MAX_ADOPTION_PLAN_ENTRIES) {
    throw new ProtocolValidationError(-32602, `${field} exceeds bounded size`);
  }
  return value.map((entry, index) => stringValue(entry, `${field}[${index}]`));
}

function nullableString(value: unknown, field: string): string | null {
  if (value === null) return null;
  return stringValue(value, field);
}

function parseItem(value: unknown, index: number): AdoptionPreviewItem {
  if (!isObject(value)) {
    throw new ProtocolValidationError(
      -32602,
      `items[${index}] must be an object`,
    );
  }
  if (typeof value.writeEligible !== "boolean") {
    throw new ProtocolValidationError(
      -32602,
      `items[${index}].writeEligible must be a boolean`,
    );
  }
  if (typeof value.manualDecisionRequired !== "boolean") {
    throw new ProtocolValidationError(
      -32602,
      `items[${index}].manualDecisionRequired must be a boolean`,
    );
  }
  return {
    path: stringValue(value.path, `items[${index}].path`),
    action: oneOf(
      stringValue(value.action, `items[${index}].action`),
      ADOPTION_ACTIONS,
      `items[${index}].action`,
    ),
    currentClassification: oneOf(
      stringValue(
        value.currentClassification,
        `items[${index}].currentClassification`,
      ),
      CURRENT_CLASSIFICATIONS,
      `items[${index}].currentClassification`,
    ),
    proposedClassification: oneOf(
      stringValue(
        value.proposedClassification,
        `items[${index}].proposedClassification`,
      ),
      PROPOSED_CLASSIFICATIONS,
      `items[${index}].proposedClassification`,
    ),
    reason: stringValue(value.reason, `items[${index}].reason`),
    canonicalSource: nullableString(
      value.canonicalSource,
      `items[${index}].canonicalSource`,
    ),
    adapter: nullableString(value.adapter, `items[${index}].adapter`),
    profile: nullableString(value.profile, `items[${index}].profile`),
    conflictDetails: boundedStringArray(
      value.conflictDetails,
      `items[${index}].conflictDetails`,
    ),
    writeEligible: value.writeEligible,
    manualDecisionRequired: value.manualDecisionRequired,
    safeNextAction: stringValue(
      value.safeNextAction,
      `items[${index}].safeNextAction`,
    ),
  };
}

export function parseExistingProjectAdoptionPlanViewModel(
  value: unknown,
): ExistingProjectAdoptionPlanViewModel {
  if (!isObject(value)) {
    throw new ProtocolValidationError(-32602, "viewmodel must be an object");
  }
  if (value.readOnly !== true || value.classification !== "read-only") {
    throw new ProtocolValidationError(
      -32602,
      "adoption plan must be classified read-only",
    );
  }
  if (value.applied !== false) {
    throw new ProtocolValidationError(
      -32602,
      "adoption plan applied must be false",
    );
  }
  if (
    !Array.isArray(value.items) ||
    value.items.length > MAX_ADOPTION_PLAN_ENTRIES
  ) {
    throw new ProtocolValidationError(-32602, "items must be a bounded array");
  }
  return {
    readOnly: true,
    classification: "read-only",
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
    readiness: stringValue(value.readiness, "readiness"),
    instructionPaths: boundedStringArray(
      value.instructionPaths,
      "instructionPaths",
    ),
    diagnostics: boundedStringArray(value.diagnostics, "diagnostics"),
    nextActions: boundedStringArray(value.nextActions, "nextActions"),
    applied: false,
    items: value.items.map(parseItem),
  };
}
