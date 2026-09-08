import {
  NEUTRON_ERROR_CODES,
  NEUTRON_READ_ONLY_TOOLS,
  NEUTRON_SKILL_LOADING_LEVELS,
  type NeutronErrorCode,
  type NeutronReadOnlyTool,
  type NeutronSkillLoadingLevel,
} from "../../protocol/src/neutron-runtime.js";
import {
  NEUTRON_TOOL_ACTIVITY_STATUSES,
  NEUTRON_TURN_ACTIVITY_SUMMARY_MAX_CHARS,
  NEUTRON_TURN_SECRET_PATH_LIMIT,
  type NeutronTurnContextSourceRow,
  type NeutronTurnContextSummary,
  type NeutronTurnToolActivity,
} from "../../protocol/src/neutron-session-activity.js";
import {
  finiteInt,
  isObject,
  nonEmpty,
  oneOf,
  projectRelativePath,
} from "./neutron-runtime-helpers.js";

function requireBoolean(value: unknown, field: string): boolean {
  if (typeof value !== "boolean") {
    throw new Error(`${field} must be a boolean`);
  }
  return value;
}

const SOURCE_KINDS = [
  "inspect",
  "memory",
  "skill",
  "policy",
  "evidence",
  "task",
] as const;
const TRUST_CLASSES = ["project", "catalog", "user", "derived"] as const;

function optionalString(value: unknown, field: string): string | undefined {
  if (value === undefined) return undefined;
  return nonEmpty(value, field);
}

function boundedSummary(value: unknown, field: string): string {
  const text = nonEmpty(value, field);
  if (text.length > NEUTRON_TURN_ACTIVITY_SUMMARY_MAX_CHARS) {
    throw new Error(
      `${field} exceeds ${NEUTRON_TURN_ACTIVITY_SUMMARY_MAX_CHARS} characters`,
    );
  }
  return text;
}

function validateSourceRow(
  value: unknown,
  index: number,
): NeutronTurnContextSourceRow {
  if (!isObject(value)) {
    throw new Error(`contextSummary.sources[${index}] must be an object`);
  }
  const field = (name: string) => `contextSummary.sources[${index}].${name}`;
  const exclusionReason = optionalString(
    value.exclusionReason,
    field("exclusionReason"),
  );
  const path =
    value.path === undefined
      ? undefined
      : projectRelativePath(value.path, field("path"));
  const loadingLevel =
    value.loadingLevel === undefined
      ? undefined
      : oneOf(
          value.loadingLevel,
          NEUTRON_SKILL_LOADING_LEVELS,
          field("loadingLevel"),
        );
  return {
    sourceId: nonEmpty(value.sourceId, field("sourceId")),
    kind: oneOf(value.kind, SOURCE_KINDS, field("kind")),
    trustClass: oneOf(value.trustClass, TRUST_CLASSES, field("trustClass")),
    provenance: nonEmpty(value.provenance, field("provenance")),
    included: requireBoolean(value.included, field("included")),
    ...(exclusionReason !== undefined ? { exclusionReason } : {}),
    ...(path !== undefined ? { path } : {}),
    ...(loadingLevel !== undefined
      ? { loadingLevel: loadingLevel as NeutronSkillLoadingLevel }
      : {}),
  };
}

export function validateNeutronTurnContextSummary(
  value: unknown,
): NeutronTurnContextSummary {
  if (!isObject(value)) {
    throw new Error("contextSummary must be an object");
  }
  if (!Array.isArray(value.sources)) {
    throw new Error("contextSummary.sources must be an array");
  }
  if (!Array.isArray(value.excludedSecretLikePaths)) {
    throw new Error("contextSummary.excludedSecretLikePaths must be an array");
  }
  if (value.excludedSecretLikePaths.length > NEUTRON_TURN_SECRET_PATH_LIMIT) {
    throw new Error("contextSummary.excludedSecretLikePaths exceeds limit");
  }
  return {
    sessionId: nonEmpty(value.sessionId, "contextSummary.sessionId"),
    root: nonEmpty(value.root, "contextSummary.root"),
    itemCount: finiteInt(value.itemCount, "contextSummary.itemCount"),
    includedCount: finiteInt(
      value.includedCount,
      "contextSummary.includedCount",
    ),
    excludedCount: finiteInt(
      value.excludedCount,
      "contextSummary.excludedCount",
    ),
    estimatedTokens: finiteInt(
      value.estimatedTokens,
      "contextSummary.estimatedTokens",
    ),
    tokenBudget: finiteInt(value.tokenBudget, "contextSummary.tokenBudget"),
    contextTokens: finiteInt(
      value.contextTokens,
      "contextSummary.contextTokens",
    ),
    limitExceeded: requireBoolean(
      value.limitExceeded,
      "contextSummary.limitExceeded",
    ),
    excludedSecretLikePaths: value.excludedSecretLikePaths.map((path, index) =>
      projectRelativePath(
        path,
        `contextSummary.excludedSecretLikePaths[${index}]`,
      ),
    ),
    sources: value.sources.map((source, index) =>
      validateSourceRow(source, index),
    ),
  };
}

export function validateNeutronTurnToolActivity(
  value: unknown,
  index: number,
): NeutronTurnToolActivity {
  if (!isObject(value)) {
    throw new Error(`toolActivity[${index}] must be an object`);
  }
  const field = (name: string) => `toolActivity[${index}].${name}`;
  const errorCode: NeutronErrorCode | null =
    value.errorCode === null
      ? null
      : oneOf(value.errorCode, NEUTRON_ERROR_CODES, field("errorCode"));
  return {
    invocationId: nonEmpty(value.invocationId, field("invocationId")),
    toolName: oneOf(
      value.toolName,
      NEUTRON_READ_ONLY_TOOLS,
      field("toolName"),
    ) as NeutronReadOnlyTool,
    status: oneOf(
      value.status,
      NEUTRON_TOOL_ACTIVITY_STATUSES,
      field("status"),
    ),
    allowed: requireBoolean(value.allowed, field("allowed")),
    ok: requireBoolean(value.ok, field("ok")),
    errorCode,
    capability: nonEmpty(value.capability, field("capability")),
    inputSummary: boundedSummary(value.inputSummary, field("inputSummary")),
    resultSummary: boundedSummary(value.resultSummary, field("resultSummary")),
  };
}

export function optionalContextSummary(
  value: unknown,
): NeutronTurnContextSummary | null {
  if (value === null || value === undefined) return null;
  return validateNeutronTurnContextSummary(value);
}

export function optionalToolActivity(
  value: unknown,
): readonly NeutronTurnToolActivity[] {
  if (value === undefined) return [];
  if (!Array.isArray(value)) {
    throw new Error("toolActivity must be an array");
  }
  return value.map((item, index) =>
    validateNeutronTurnToolActivity(item, index),
  );
}
