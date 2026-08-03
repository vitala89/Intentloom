import type {
  HarnessAdversarialReview,
  HarnessAdversarialRole,
  HarnessRiskLevel,
  HarnessReviewDecision,
  HarnessReviewUsage,
  HarnessVotingBudget,
  HarnessVotingPolicy,
  HarnessVotingRequest,
} from "@intentloom/protocol";

const ROLES: readonly HarnessAdversarialRole[] = [
  "generator",
  "critic",
  "judge",
];
const RISKS: readonly HarnessRiskLevel[] = [
  "low",
  "medium",
  "high",
  "critical",
];
const DECISIONS: readonly HarnessReviewDecision[] = [
  "pass",
  "fail",
  "abstain",
  "error",
];

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function nonNegativeInteger(value: unknown, name: string): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0) {
    throw new Error(`${name} must be a non-negative integer`);
  }
  return value;
}

function nonNegativeNumber(value: unknown, name: string): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    throw new Error(`${name} must be a non-negative number`);
  }
  return value;
}

function enumValue<T extends string>(
  value: unknown,
  values: readonly T[],
  name: string,
): T {
  if (typeof value !== "string" || !values.includes(value as T)) {
    throw new Error(`${name} is invalid`);
  }
  return value as T;
}

function uniqueRoles(value: unknown, name: string): HarnessAdversarialRole[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error(`${name} must be a non-empty array`);
  }
  const roles = value.map((role) => enumValue(role, ROLES, `${name} role`));
  if (new Set(roles).size !== roles.length) {
    throw new Error(`${name} must not contain duplicates`);
  }
  return roles;
}

function validateUsage(value: unknown): HarnessReviewUsage {
  if (!isObject(value)) throw new Error("review usage must be an object");
  return {
    inputTokens: nonNegativeInteger(value.inputTokens, "inputTokens"),
    outputTokens: nonNegativeInteger(value.outputTokens, "outputTokens"),
    durationMs: nonNegativeInteger(value.durationMs, "durationMs"),
    costUsd: nonNegativeNumber(value.costUsd, "costUsd"),
  };
}

function validateReview(value: unknown): HarnessAdversarialReview {
  if (!isObject(value)) throw new Error("adversarial review must be an object");
  if (value.schemaVersion !== 1) {
    throw new Error("adversarial review schemaVersion must equal 1");
  }
  if (typeof value.reviewId !== "string" || !value.reviewId) {
    throw new Error("reviewId must be a non-empty string");
  }
  if (typeof value.contextId !== "string" || !value.contextId) {
    throw new Error("contextId must be a non-empty string");
  }
  if (typeof value.evidenceDigest !== "string" || !value.evidenceDigest) {
    throw new Error("evidenceDigest must be a non-empty string");
  }
  if (
    !Array.isArray(value.evidenceIds) ||
    !value.evidenceIds.every((id) => typeof id === "string" && id)
  ) {
    throw new Error("evidenceIds must contain non-empty strings");
  }
  return {
    schemaVersion: 1,
    reviewId: value.reviewId,
    role: enumValue(value.role, ROLES, "review role"),
    decision: enumValue(value.decision, DECISIONS, "review decision"),
    contextId: value.contextId,
    evidenceDigest: value.evidenceDigest,
    evidenceIds: value.evidenceIds,
    usage: validateUsage(value.usage),
  };
}

function validateBudget(value: unknown): HarnessVotingBudget {
  if (!isObject(value)) throw new Error("voting budget must be an object");
  return {
    maxInputTokens: nonNegativeInteger(value.maxInputTokens, "maxInputTokens"),
    maxOutputTokens: nonNegativeInteger(
      value.maxOutputTokens,
      "maxOutputTokens",
    ),
    maxDurationMs: nonNegativeInteger(value.maxDurationMs, "maxDurationMs"),
    maxCostUsd: nonNegativeNumber(value.maxCostUsd, "maxCostUsd"),
  };
}

function validatePolicy(value: unknown): HarnessVotingPolicy {
  if (!isObject(value)) throw new Error("voting policy must be an object");
  if (value.schemaVersion !== 1) {
    throw new Error("voting policy schemaVersion must equal 1");
  }
  if (typeof value.enabled !== "boolean") {
    throw new Error("voting policy enabled must be a boolean");
  }
  if (
    typeof value.quorum !== "number" ||
    !Number.isInteger(value.quorum) ||
    value.quorum <= 0
  ) {
    throw new Error("quorum must be a positive integer");
  }
  if (
    typeof value.minCoverage !== "number" ||
    !Number.isFinite(value.minCoverage) ||
    value.minCoverage < 0 ||
    value.minCoverage > 1
  ) {
    throw new Error("minCoverage must be between 0 and 1");
  }
  if (typeof value.requireIndependentContexts !== "boolean") {
    throw new Error("requireIndependentContexts must be a boolean");
  }
  if (typeof value.allowAbstentions !== "boolean") {
    throw new Error("allowAbstentions must be a boolean");
  }
  if (value.tieBreak !== "needs-review" && value.tieBreak !== "failed") {
    throw new Error("tieBreak is invalid");
  }
  if (!isObject(value.roleWeights)) {
    throw new Error("roleWeights must be an object");
  }
  const roleWeightsValue = value.roleWeights;
  const roleWeights = Object.fromEntries(
    ROLES.map((role) => {
      const weight = roleWeightsValue[role];
      if (
        typeof weight !== "number" ||
        !Number.isFinite(weight) ||
        weight <= 0
      ) {
        throw new Error(`roleWeights.${role} must be positive`);
      }
      return [role, weight];
    }),
  ) as HarnessVotingPolicy["roleWeights"];
  return {
    schemaVersion: 1,
    enabled: value.enabled,
    minimumRisk: enumValue(value.minimumRisk, RISKS, "minimumRisk"),
    requiredRoles: uniqueRoles(value.requiredRoles, "requiredRoles"),
    quorum: value.quorum,
    minCoverage: value.minCoverage,
    roleWeights,
    requireIndependentContexts: value.requireIndependentContexts,
    allowAbstentions: value.allowAbstentions,
    tieBreak: value.tieBreak,
    budget: validateBudget(value.budget),
  };
}

export function validateHarnessVotingRequest(
  value: unknown,
): HarnessVotingRequest {
  if (!isObject(value)) throw new Error("voting request must be an object");
  if (value.schemaVersion !== 1) {
    throw new Error("voting request schemaVersion must equal 1");
  }
  if (typeof value.runId !== "string" || !value.runId) {
    throw new Error("runId must be a non-empty string");
  }
  if (!RISKS.includes(value.riskLevel as HarnessRiskLevel)) {
    throw new Error("riskLevel is invalid");
  }
  if (
    value.deterministicGate !== "passed" &&
    value.deterministicGate !== "failed" &&
    value.deterministicGate !== "inconclusive"
  ) {
    throw new Error("deterministicGate is invalid");
  }
  if (!Array.isArray(value.reviews)) {
    throw new Error("reviews must be an array");
  }
  const reviews = value.reviews.map(validateReview);
  if (
    new Set(reviews.map((review) => review.reviewId)).size !== reviews.length
  ) {
    throw new Error("reviewIds must be unique");
  }
  return {
    schemaVersion: 1,
    runId: value.runId,
    riskLevel: value.riskLevel as HarnessRiskLevel,
    deterministicGate: value.deterministicGate,
    policy: validatePolicy(value.policy),
    reviews,
  };
}
