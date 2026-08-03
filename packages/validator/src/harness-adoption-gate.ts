import type {
  HarnessAdoptionGateActionKind,
  HarnessAdoptionGateRequest,
  HarnessAdoptionGateResult,
} from "@intentloom/protocol";
import { validateHarnessScorecard } from "./harness.js";

const ACTION_KINDS: readonly HarnessAdoptionGateActionKind[] = [
  "activate-external-skill",
  "mutate-agent-capability",
  "execute-external-mcp",
];

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringArray(value: unknown, field: string): readonly string[] {
  if (
    !Array.isArray(value) ||
    !value.every((item) => typeof item === "string")
  ) {
    throw new Error(`${field} must be an array of strings`);
  }
  return value;
}

export function validateHarnessAdoptionGateRequest(
  value: unknown,
): HarnessAdoptionGateRequest {
  if (!isObject(value)) {
    throw new Error("harness adoption gate request must be an object");
  }
  if (value.schemaVersion !== 1) {
    throw new Error("adoption gate request schemaVersion must equal 1");
  }
  if (
    typeof value.targetResourceId !== "string" ||
    !value.targetResourceId.trim()
  ) {
    throw new Error("targetResourceId must be a non-empty string");
  }
  if (
    !ACTION_KINDS.includes(value.actionKind as HarnessAdoptionGateActionKind)
  ) {
    throw new Error("invalid adoption gate action kind");
  }
  if (!Array.isArray(value.scorecards)) {
    throw new Error("scorecards must be an array");
  }
  const scorecards = value.scorecards.map(validateHarnessScorecard);
  const grantedApprovals = stringArray(
    value.grantedApprovals,
    "grantedApprovals",
  );

  let maxScorecardAgeMs: number | undefined;
  if (value.maxScorecardAgeMs !== undefined) {
    if (
      typeof value.maxScorecardAgeMs !== "number" ||
      !Number.isInteger(value.maxScorecardAgeMs) ||
      value.maxScorecardAgeMs <= 0
    ) {
      throw new Error(
        "maxScorecardAgeMs must be a positive integer if provided",
      );
    }
    maxScorecardAgeMs = value.maxScorecardAgeMs;
  }

  return {
    schemaVersion: 1,
    targetResourceId: value.targetResourceId,
    actionKind: value.actionKind as HarnessAdoptionGateActionKind,
    scorecards,
    grantedApprovals,
    ...(maxScorecardAgeMs !== undefined ? { maxScorecardAgeMs } : {}),
  };
}

export function validateHarnessAdoptionGateResult(
  value: unknown,
): HarnessAdoptionGateResult {
  if (!isObject(value)) {
    throw new Error("harness adoption gate result must be an object");
  }
  if (value.schemaVersion !== 1) {
    throw new Error("adoption gate result schemaVersion must equal 1");
  }
  if (
    typeof value.targetResourceId !== "string" ||
    !value.targetResourceId.trim()
  ) {
    throw new Error("targetResourceId must be a non-empty string");
  }
  if (
    !ACTION_KINDS.includes(value.actionKind as HarnessAdoptionGateActionKind)
  ) {
    throw new Error("invalid adoption gate action kind");
  }
  if (typeof value.passed !== "boolean") {
    throw new Error("passed must be a boolean");
  }
  if (
    typeof value.checkedScorecardsCount !== "number" ||
    !Number.isInteger(value.checkedScorecardsCount) ||
    value.checkedScorecardsCount < 0
  ) {
    throw new Error("checkedScorecardsCount must be a non-negative integer");
  }
  const diagnostics = stringArray(value.diagnostics, "diagnostics");
  if (
    typeof value.safeNextAction !== "string" ||
    !value.safeNextAction.trim()
  ) {
    throw new Error("safeNextAction must be a non-empty string");
  }

  return {
    schemaVersion: 1,
    targetResourceId: value.targetResourceId,
    actionKind: value.actionKind as HarnessAdoptionGateActionKind,
    passed: value.passed,
    checkedScorecardsCount: value.checkedScorecardsCount,
    diagnostics,
    safeNextAction: value.safeNextAction,
  };
}
