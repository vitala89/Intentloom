import type {
  HarnessAdversarialRole,
  HarnessReviewUsage,
  HarnessVotingRequest,
} from "@intentloom/protocol";

export interface HarnessVotingMetrics {
  readonly substantiveCount: number;
  readonly passWeight: number;
  readonly failWeight: number;
  readonly abstentionCount: number;
  readonly errorCount: number;
  readonly disagreement: boolean;
  readonly independentContextCount: number;
  readonly coverageRatio: number;
  readonly quorumOrRoleCoverageInsufficient: boolean;
  readonly insufficientCoverage: boolean;
  readonly falseConsensus: boolean;
  readonly budgetExceeded: boolean;
}

function roundRatio(value: number): number {
  return Number(value.toFixed(4));
}

function roundWeight(value: number): number {
  return Number(value.toFixed(8));
}

export function calculateHarnessVotingMetrics(
  request: HarnessVotingRequest,
  coveredRoles: readonly HarnessAdversarialRole[],
  usage: HarnessReviewUsage,
): HarnessVotingMetrics {
  const { policy, reviews } = request;
  const substantive = reviews.filter(
    (review) => review.decision === "pass" || review.decision === "fail",
  );
  const passWeight = roundWeight(
    reviews
      .filter((review) => review.decision === "pass")
      .reduce((total, review) => total + policy.roleWeights[review.role], 0),
  );
  const failWeight = roundWeight(
    reviews
      .filter((review) => review.decision === "fail")
      .reduce((total, review) => total + policy.roleWeights[review.role], 0),
  );
  const abstentionCount = reviews.filter(
    (review) => review.decision === "abstain",
  ).length;
  const errorCount = reviews.filter(
    (review) => review.decision === "error",
  ).length;
  const disagreement = passWeight > 0 && failWeight > 0;
  const independentContextCount = new Set(
    substantive.map((review) => review.contextId),
  ).size;
  const evidenceDigestCount = new Set(
    substantive.map((review) => review.evidenceDigest),
  ).size;
  const coverageRatio = roundRatio(
    coveredRoles.length / policy.requiredRoles.length,
  );
  const quorumOrRoleCoverageInsufficient =
    substantive.length < policy.quorum || coverageRatio < policy.minCoverage;
  const independentCoverageInsufficient =
    policy.requireIndependentContexts && independentContextCount < 2;
  const insufficientCoverage =
    quorumOrRoleCoverageInsufficient || independentCoverageInsufficient;
  const falseConsensus =
    substantive.length >= 2 &&
    !disagreement &&
    evidenceDigestCount < Math.min(2, substantive.length);
  const budgetExceeded =
    usage.inputTokens > policy.budget.maxInputTokens ||
    usage.outputTokens > policy.budget.maxOutputTokens ||
    usage.durationMs > policy.budget.maxDurationMs ||
    usage.costUsd > policy.budget.maxCostUsd;

  return {
    substantiveCount: substantive.length,
    passWeight,
    failWeight,
    abstentionCount,
    errorCount,
    disagreement,
    independentContextCount,
    coverageRatio,
    quorumOrRoleCoverageInsufficient,
    insufficientCoverage,
    falseConsensus,
    budgetExceeded,
  };
}
