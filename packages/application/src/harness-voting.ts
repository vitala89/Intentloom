import type {
  HarnessAdversarialRole,
  HarnessRiskLevel,
  HarnessReviewUsage,
  HarnessVotingRequest,
  HarnessVotingResult,
} from "@intentloom/protocol";
import { validateHarnessVotingRequest } from "@intentloom/validator";
import {
  calculateHarnessVotingMetrics,
  type HarnessVotingMetrics,
} from "./harness-voting-metrics.js";

const ROLES: readonly HarnessAdversarialRole[] = [
  "generator",
  "critic",
  "judge",
];
const RISK_ORDER: readonly HarnessRiskLevel[] = [
  "low",
  "medium",
  "high",
  "critical",
];

export interface HarnessAdversarialTrigger {
  readonly enabled: boolean;
  readonly riskLevel: HarnessRiskLevel;
  readonly minimumRisk: HarnessRiskLevel;
}

export function shouldRunHarnessAdversarialValidation(
  trigger: HarnessAdversarialTrigger,
): boolean {
  return (
    trigger.enabled &&
    RISK_ORDER.indexOf(trigger.riskLevel) >=
      RISK_ORDER.indexOf(trigger.minimumRisk)
  );
}

function sumUsage(usage: readonly HarnessReviewUsage[]): HarnessReviewUsage {
  const total = usage.reduce(
    (result, current) => ({
      inputTokens: result.inputTokens + current.inputTokens,
      outputTokens: result.outputTokens + current.outputTokens,
      durationMs: result.durationMs + current.durationMs,
      costMicros: result.costMicros + Math.round(current.costUsd * 1_000_000),
    }),
    { inputTokens: 0, outputTokens: 0, durationMs: 0, costMicros: 0 },
  );
  return {
    inputTokens: total.inputTokens,
    outputTokens: total.outputTokens,
    durationMs: total.durationMs,
    costUsd: total.costMicros / 1_000_000,
  };
}

function roleCoverage(
  request: HarnessVotingRequest,
): readonly HarnessAdversarialRole[] {
  const roles = new Set(
    request.reviews
      .filter((review) => review.decision !== "error")
      .map((review) => review.role),
  );
  const requiredRoles = new Set(request.policy.requiredRoles);
  return ROLES.filter((role) => requiredRoles.has(role) && roles.has(role));
}

function unsupportedResult(request: HarnessVotingRequest): HarnessVotingResult {
  return {
    schemaVersion: 1,
    runId: request.runId,
    verdict: "unsupported",
    triggered: false,
    coveredRoles: [],
    coverageRatio: 0,
    independentContextCount: 0,
    passWeight: 0,
    failWeight: 0,
    abstentionCount: 0,
    errorCount: 0,
    disagreement: false,
    falseConsensus: false,
    insufficientCoverage: true,
    budgetExceeded: false,
    totalUsage: sumUsage([]),
    diagnostics: ["adversarial-validation-disabled"],
  };
}

function buildDiagnostics(
  request: HarnessVotingRequest,
  metrics: HarnessVotingMetrics,
): string[] {
  const diagnostics: string[] = [];

  if (request.deterministicGate === "failed") {
    diagnostics.push("deterministic-gate-failed");
  } else if (request.deterministicGate === "inconclusive") {
    diagnostics.push("deterministic-gate-inconclusive");
  }
  if (metrics.insufficientCoverage) diagnostics.push("insufficient-coverage");
  if (
    request.policy.requireIndependentContexts &&
    metrics.independentContextCount < 2
  ) {
    diagnostics.push("independent-contexts-insufficient");
  }
  if (metrics.falseConsensus) diagnostics.push("false-consensus-risk");
  if (metrics.disagreement) diagnostics.push("review-disagreement");
  if (metrics.errorCount > 0) diagnostics.push("review-error");
  if (metrics.abstentionCount > 0) diagnostics.push("review-abstention");
  if (!request.policy.allowAbstentions && metrics.abstentionCount > 0) {
    diagnostics.push("abstention-not-allowed");
  }
  if (metrics.budgetExceeded) diagnostics.push("voting-budget-exceeded");
  return diagnostics;
}

function resolveVerdict(
  request: HarnessVotingRequest,
  metrics: HarnessVotingMetrics,
): HarnessVotingResult["verdict"] {
  if (request.deterministicGate === "failed") {
    return "failed";
  }
  if (request.deterministicGate === "inconclusive") {
    return "inconclusive";
  }
  if (
    metrics.substantiveCount === 0 ||
    metrics.quorumOrRoleCoverageInsufficient
  ) {
    return "inconclusive";
  }
  if (
    metrics.falseConsensus ||
    metrics.disagreement ||
    metrics.errorCount > 0 ||
    metrics.budgetExceeded ||
    (!request.policy.allowAbstentions && metrics.abstentionCount > 0)
  ) {
    return "needs-review";
  }
  if (metrics.passWeight === metrics.failWeight) {
    return request.policy.tieBreak;
  }
  return metrics.passWeight > metrics.failWeight ? "passed" : "failed";
}

function verdictForReviews(
  request: HarnessVotingRequest,
  coveredRoles: readonly HarnessAdversarialRole[],
  usage: HarnessReviewUsage,
): HarnessVotingResult {
  const metrics = calculateHarnessVotingMetrics(request, coveredRoles, usage);
  return {
    schemaVersion: 1,
    runId: request.runId,
    verdict: resolveVerdict(request, metrics),
    triggered: true,
    coveredRoles,
    coverageRatio: metrics.coverageRatio,
    independentContextCount: metrics.independentContextCount,
    passWeight: metrics.passWeight,
    failWeight: metrics.failWeight,
    abstentionCount: metrics.abstentionCount,
    errorCount: metrics.errorCount,
    disagreement: metrics.disagreement,
    falseConsensus: metrics.falseConsensus,
    insufficientCoverage: metrics.insufficientCoverage,
    budgetExceeded: metrics.budgetExceeded,
    totalUsage: usage,
    diagnostics: buildDiagnostics(request, metrics),
  };
}

export function aggregateHarnessReviews(value: unknown): HarnessVotingResult {
  const request = validateHarnessVotingRequest(value);
  if (
    !shouldRunHarnessAdversarialValidation({
      enabled: request.policy.enabled,
      riskLevel: request.riskLevel,
      minimumRisk: request.policy.minimumRisk,
    })
  ) {
    return unsupportedResult(request);
  }
  const coveredRoles = roleCoverage(request);
  const usage = sumUsage(request.reviews.map((review) => review.usage));
  return verdictForReviews(request, coveredRoles, usage);
}
