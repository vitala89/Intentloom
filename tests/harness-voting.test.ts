import type {
  HarnessAdversarialReview,
  HarnessVotingRequest,
} from "@intentloom/protocol";
import {
  aggregateHarnessReviews,
  shouldRunHarnessAdversarialValidation,
} from "../packages/application/src/index.js";
import { validateHarnessVotingRequest } from "@intentloom/validator";
import { describe, expect, it } from "vitest";

const basePolicy = {
  schemaVersion: 1 as const,
  enabled: true,
  minimumRisk: "high" as const,
  requiredRoles: ["generator", "critic", "judge"] as const,
  quorum: 3,
  minCoverage: 1,
  roleWeights: { generator: 1, critic: 1, judge: 1 },
  requireIndependentContexts: true,
  allowAbstentions: true,
  tieBreak: "needs-review" as const,
  budget: {
    maxInputTokens: 1_000,
    maxOutputTokens: 500,
    maxDurationMs: 10_000,
    maxCostUsd: 2,
  },
};

function review(
  role: HarnessAdversarialReview["role"],
  decision: HarnessAdversarialReview["decision"],
  evidenceDigest = `${role}-digest`,
  usage: Partial<HarnessAdversarialReview["usage"]> = {},
): HarnessAdversarialReview {
  return {
    schemaVersion: 1,
    reviewId: `${role}-${evidenceDigest}`,
    role,
    decision,
    contextId: `${role}-context`,
    evidenceDigest,
    evidenceIds: ["evidence-safe-fixture"],
    usage: {
      inputTokens: 10,
      outputTokens: 5,
      durationMs: 100,
      costUsd: 0.01,
      ...usage,
    },
  };
}

function request(
  reviews: readonly HarnessAdversarialReview[],
  overrides: Partial<HarnessVotingRequest> = {},
): HarnessVotingRequest {
  return {
    schemaVersion: 1,
    runId: "run-vote-1",
    riskLevel: "high",
    deterministicGate: "passed",
    policy: basePolicy,
    reviews,
    ...overrides,
  };
}

describe("harness adversarial validation and deterministic voting (Phase H6)", () => {
  it("validates versioned voting requests and rejects duplicate review IDs", () => {
    const valid = request([
      review("generator", "pass"),
      review("critic", "pass"),
      review("judge", "pass"),
    ]);
    expect(validateHarnessVotingRequest(valid).runId).toBe("run-vote-1");
    expect(() =>
      validateHarnessVotingRequest({
        ...valid,
        reviews: [review("generator", "pass"), review("generator", "pass")],
      }),
    ).toThrow("reviewIds must be unique");
    expect(() =>
      validateHarnessVotingRequest({
        ...valid,
        policy: { ...basePolicy, minCoverage: 2 },
      }),
    ).toThrow("minCoverage must be between 0 and 1");
  });

  it("triggers only at or above the configured risk threshold", () => {
    expect(
      shouldRunHarnessAdversarialValidation({
        enabled: true,
        riskLevel: "medium",
        minimumRisk: "high",
      }),
    ).toBe(false);
    expect(
      shouldRunHarnessAdversarialValidation({
        enabled: true,
        riskLevel: "critical",
        minimumRisk: "high",
      }),
    ).toBe(true);
  });

  it("returns unsupported when adversarial validation is disabled", () => {
    const result = aggregateHarnessReviews(
      request([review("generator", "pass"), review("critic", "pass")], {
        policy: { ...basePolicy, enabled: false },
      }),
    );

    expect(result.verdict).toBe("unsupported");
    expect(result.triggered).toBe(false);
    expect(result.diagnostics).toEqual(["adversarial-validation-disabled"]);
  });

  it("keeps a failed deterministic gate authoritative over advisory passes", () => {
    const result = aggregateHarnessReviews(
      request(
        [
          review("generator", "pass", "digest-a"),
          review("critic", "pass", "digest-b"),
          review("judge", "pass", "digest-c"),
        ],
        { deterministicGate: "failed" },
      ),
    );

    expect(result.verdict).toBe("failed");
    expect(result.diagnostics).toContain("deterministic-gate-failed");
  });

  it("passes independent unanimous reviews with complete role coverage", () => {
    const result = aggregateHarnessReviews(
      request([
        review("generator", "pass", "digest-a"),
        review("critic", "pass", "digest-b"),
        review("judge", "pass", "digest-c"),
      ]),
    );

    expect(result.verdict).toBe("passed");
    expect(result.coveredRoles).toEqual(["generator", "critic", "judge"]);
    expect(result.independentContextCount).toBe(3);
    expect(result.coverageRatio).toBe(1);
  });

  it("exposes disagreement instead of converting weighted conflict into a pass", () => {
    const result = aggregateHarnessReviews(
      request([
        review("generator", "pass", "digest-a"),
        review("critic", "fail", "digest-b"),
        review("judge", "pass", "digest-c"),
      ]),
    );

    expect(result.verdict).toBe("needs-review");
    expect(result.disagreement).toBe(true);
    expect(result.diagnostics).toContain("review-disagreement");
  });

  it("marks identical evidence as false-consensus risk", () => {
    const result = aggregateHarnessReviews(
      request([
        review("generator", "pass", "same-digest"),
        review("critic", "pass", "same-digest"),
        review("judge", "pass", "same-digest"),
      ]),
    );

    expect(result.verdict).toBe("needs-review");
    expect(result.falseConsensus).toBe(true);
    expect(result.independentContextCount).toBe(3);
    expect(JSON.stringify(result)).not.toContain("evidence-safe-fixture");
  });

  it("returns inconclusive when quorum or role coverage is insufficient", () => {
    const result = aggregateHarnessReviews(
      request([review("generator", "pass", "digest-a")]),
    );

    expect(result.verdict).toBe("inconclusive");
    expect(result.insufficientCoverage).toBe(true);
    expect(result.diagnostics).toContain("insufficient-coverage");
  });

  it("preserves abstention and budget failures as needs-review", () => {
    const result = aggregateHarnessReviews(
      request(
        [
          review("generator", "pass", "digest-a", { inputTokens: 900 }),
          review("critic", "abstain", "digest-b"),
          review("judge", "pass", "digest-c"),
        ],
        {
          policy: {
            ...basePolicy,
            allowAbstentions: false,
            quorum: 2,
            budget: { ...basePolicy.budget, maxInputTokens: 100 },
          },
        },
      ),
    );

    expect(result.verdict).toBe("needs-review");
    expect(result.abstentionCount).toBe(1);
    expect(result.budgetExceeded).toBe(true);
    expect(result.diagnostics).toContain("abstention-not-allowed");
    expect(result.diagnostics).toContain("voting-budget-exceeded");
  });

  it("is deterministic when reviews arrive in a different order", () => {
    const reviews = [
      review("generator", "fail", "digest-a"),
      review("critic", "fail", "digest-b"),
      review("judge", "pass", "digest-c"),
    ];
    const first = aggregateHarnessReviews(request(reviews));
    const second = aggregateHarnessReviews(request([...reviews].reverse()));

    expect(second).toEqual(first);
  });
});
