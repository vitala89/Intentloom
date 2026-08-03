export type HarnessAdversarialRole = "generator" | "critic" | "judge";

export type HarnessReviewDecision = "pass" | "fail" | "abstain" | "error";

export type HarnessRiskLevel = "low" | "medium" | "high" | "critical";

export type HarnessVotingVerdict =
  "passed" | "failed" | "needs-review" | "inconclusive" | "unsupported";

export interface HarnessReviewUsage {
  readonly inputTokens: number;
  readonly outputTokens: number;
  readonly durationMs: number;
  readonly costUsd: number;
}

export interface HarnessAdversarialReview {
  readonly schemaVersion: 1;
  readonly reviewId: string;
  readonly role: HarnessAdversarialRole;
  readonly decision: HarnessReviewDecision;
  readonly contextId: string;
  readonly evidenceDigest: string;
  readonly evidenceIds: readonly string[];
  readonly usage: HarnessReviewUsage;
}

export interface HarnessVotingBudget {
  readonly maxInputTokens: number;
  readonly maxOutputTokens: number;
  readonly maxDurationMs: number;
  readonly maxCostUsd: number;
}

export interface HarnessVotingPolicy {
  readonly schemaVersion: 1;
  readonly enabled: boolean;
  readonly minimumRisk: HarnessRiskLevel;
  readonly requiredRoles: readonly HarnessAdversarialRole[];
  readonly quorum: number;
  readonly minCoverage: number;
  readonly roleWeights: Readonly<Record<HarnessAdversarialRole, number>>;
  readonly requireIndependentContexts: boolean;
  readonly allowAbstentions: boolean;
  readonly tieBreak: "needs-review" | "failed";
  readonly budget: HarnessVotingBudget;
}

export interface HarnessVotingRequest {
  readonly schemaVersion: 1;
  readonly runId: string;
  readonly riskLevel: HarnessRiskLevel;
  readonly deterministicGate: "passed" | "failed" | "inconclusive";
  readonly policy: HarnessVotingPolicy;
  readonly reviews: readonly HarnessAdversarialReview[];
}

export interface HarnessVotingResult {
  readonly schemaVersion: 1;
  readonly runId: string;
  readonly verdict: HarnessVotingVerdict;
  readonly triggered: boolean;
  readonly coveredRoles: readonly HarnessAdversarialRole[];
  readonly coverageRatio: number;
  readonly independentContextCount: number;
  readonly passWeight: number;
  readonly failWeight: number;
  readonly abstentionCount: number;
  readonly errorCount: number;
  readonly disagreement: boolean;
  readonly falseConsensus: boolean;
  readonly insufficientCoverage: boolean;
  readonly budgetExceeded: boolean;
  readonly totalUsage: HarnessReviewUsage;
  readonly diagnostics: readonly string[];
}
