import type {
  NeutronTurnContextSourceRow,
  NeutronTurnContextSummary,
  NeutronTurnToolActivity,
} from "@intentloom/protocol";
import {
  NEUTRON_ERROR_CODES,
  NEUTRON_READ_ONLY_TOOLS,
  NEUTRON_TOOL_ACTIVITY_STATUSES,
  NEUTRON_TURN_ACTIVITY_SUMMARY_MAX_CHARS,
} from "@intentloom/protocol";
import { DesktopBridgeError } from "../desktop-client.js";

const SKILL_LOADING_LEVELS = ["catalog", "contract", "procedure"] as const;
type SkillLoadingLevel = (typeof SKILL_LOADING_LEVELS)[number];

function fail(message: string): never {
  throw new DesktopBridgeError(message, "bounded_validation_failed");
}

function requiredString(value: unknown, field: string): string {
  if (typeof value !== "string" || value.length === 0) {
    fail(`${field} is missing from the Neutron activity payload`);
  }
  return value;
}

function requiredInt(value: unknown, field: string): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0) {
    fail(`${field} must be a non-negative integer`);
  }
  return value;
}

function requiredBoolean(value: unknown, field: string): boolean {
  if (typeof value !== "boolean") fail(`${field} must be a boolean`);
  return value;
}

function boundedSummary(value: unknown, field: string): string {
  const text = requiredString(value, field);
  if (text.length > NEUTRON_TURN_ACTIVITY_SUMMARY_MAX_CHARS) {
    fail(`${field} exceeds the activity summary bound`);
  }
  return text;
}

function isSkillLoadingLevel(value: string): value is SkillLoadingLevel {
  return (SKILL_LOADING_LEVELS as readonly string[]).includes(value);
}

export function parseNeutronContextSummary(
  value: unknown,
): NeutronTurnContextSummary | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== "object" || Array.isArray(value)) {
    fail("contextSummary must be an object");
  }
  const record = value as Record<string, unknown>;
  if (!Array.isArray(record.sources))
    fail("contextSummary.sources must be an array");
  if (!Array.isArray(record.excludedSecretLikePaths)) {
    fail("contextSummary.excludedSecretLikePaths must be an array");
  }
  return {
    sessionId: requiredString(record.sessionId, "contextSummary.sessionId"),
    root: requiredString(record.root, "contextSummary.root"),
    itemCount: requiredInt(record.itemCount, "contextSummary.itemCount"),
    includedCount: requiredInt(
      record.includedCount,
      "contextSummary.includedCount",
    ),
    excludedCount: requiredInt(
      record.excludedCount,
      "contextSummary.excludedCount",
    ),
    estimatedTokens: requiredInt(
      record.estimatedTokens,
      "contextSummary.estimatedTokens",
    ),
    tokenBudget: requiredInt(record.tokenBudget, "contextSummary.tokenBudget"),
    contextTokens: requiredInt(
      record.contextTokens,
      "contextSummary.contextTokens",
    ),
    limitExceeded: requiredBoolean(
      record.limitExceeded,
      "contextSummary.limitExceeded",
    ),
    excludedSecretLikePaths: record.excludedSecretLikePaths.map((path, index) =>
      requiredString(path, `contextSummary.excludedSecretLikePaths[${index}]`),
    ),
    sources: record.sources.map((source, index) =>
      parseSourceRow(source, index),
    ),
  };
}

export function parseNeutronToolActivity(
  value: unknown,
): readonly NeutronTurnToolActivity[] {
  if (value === undefined) return [];
  if (!Array.isArray(value)) fail("toolActivity must be an array");
  return value.map((item, index) => parseToolRow(item, index));
}

export function authoritativeToolActivity(viewmodel: {
  readonly responseText: string | null;
  readonly toolActivity: readonly NeutronTurnToolActivity[];
}): readonly NeutronTurnToolActivity[] {
  void viewmodel.responseText;
  return viewmodel.toolActivity;
}

function parseSourceRow(
  value: unknown,
  index: number,
): NeutronTurnContextSourceRow {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    fail(`contextSummary.sources[${index}] must be an object`);
  }
  const record = value as Record<string, unknown>;
  const field = (name: string) => `contextSummary.sources[${index}].${name}`;
  const kind = requiredString(record.kind, field("kind"));
  const trustClass = requiredString(record.trustClass, field("trustClass"));
  if (
    kind !== "inspect" &&
    kind !== "memory" &&
    kind !== "skill" &&
    kind !== "policy" &&
    kind !== "evidence" &&
    kind !== "task"
  ) {
    fail(field("kind") + " is invalid");
  }
  if (
    trustClass !== "project" &&
    trustClass !== "catalog" &&
    trustClass !== "user" &&
    trustClass !== "derived"
  ) {
    fail(field("trustClass") + " is invalid");
  }
  const loadingLevel = record.loadingLevel;
  if (
    loadingLevel !== undefined &&
    (typeof loadingLevel !== "string" || !isSkillLoadingLevel(loadingLevel))
  ) {
    fail(field("loadingLevel") + " is invalid");
  }
  return {
    sourceId: requiredString(record.sourceId, field("sourceId")),
    kind,
    trustClass,
    provenance: requiredString(record.provenance, field("provenance")),
    included: requiredBoolean(record.included, field("included")),
    ...(typeof record.exclusionReason === "string"
      ? { exclusionReason: record.exclusionReason }
      : {}),
    ...(typeof record.path === "string" ? { path: record.path } : {}),
    ...(typeof loadingLevel === "string" && isSkillLoadingLevel(loadingLevel)
      ? { loadingLevel }
      : {}),
  };
}

function parseToolRow(value: unknown, index: number): NeutronTurnToolActivity {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    fail(`toolActivity[${index}] must be an object`);
  }
  const record = value as Record<string, unknown>;
  const field = (name: string) => `toolActivity[${index}].${name}`;
  const toolName = requiredString(record.toolName, field("toolName"));
  const status = requiredString(record.status, field("status"));
  if (!(NEUTRON_READ_ONLY_TOOLS as readonly string[]).includes(toolName)) {
    fail(field("toolName") + " is invalid");
  }
  if (!(NEUTRON_TOOL_ACTIVITY_STATUSES as readonly string[]).includes(status)) {
    fail(field("status") + " is invalid");
  }
  const errorCode = record.errorCode;
  if (
    errorCode !== null &&
    (typeof errorCode !== "string" ||
      !(NEUTRON_ERROR_CODES as readonly string[]).includes(errorCode))
  ) {
    fail(field("errorCode") + " is invalid");
  }
  return {
    invocationId: requiredString(record.invocationId, field("invocationId")),
    toolName: toolName as NeutronTurnToolActivity["toolName"],
    status: status as NeutronTurnToolActivity["status"],
    allowed: requiredBoolean(record.allowed, field("allowed")),
    ok: requiredBoolean(record.ok, field("ok")),
    errorCode:
      typeof errorCode === "string"
        ? (errorCode as NeutronTurnToolActivity["errorCode"])
        : null,
    capability: requiredString(record.capability, field("capability")),
    inputSummary: boundedSummary(record.inputSummary, field("inputSummary")),
    resultSummary: boundedSummary(record.resultSummary, field("resultSummary")),
  };
}
