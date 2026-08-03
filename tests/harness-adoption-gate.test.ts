import { describe, expect, it } from "vitest";
import type { HarnessScorecard } from "@intentloom/protocol";
import { evaluateHarnessAdoptionGate } from "../packages/application/src/index.js";
import {
  validateHarnessAdoptionGateRequest,
  validateHarnessAdoptionGateResult,
} from "@intentloom/validator";

const mockPassingScorecard: HarnessScorecard = {
  schemaVersion: 1,
  scorecardId: "scorecard-pass-1",
  scenarioId: "scenario:c4-minimal",
  requestId: "req-1",
  status: "passed",
  overallScore: 100,
  passedAssertions: 5,
  totalAssertions: 5,
  durationMs: 100,
  diagnostics: [],
  events: [
    {
      eventId: "evt-1",
      timestamp: 1_000_000,
      type: "info",
      message: "pass",
    },
  ],
  artifacts: [],
};

const mockFailingScorecard: HarnessScorecard = {
  schemaVersion: 1,
  scorecardId: "scorecard-fail-1",
  scenarioId: "scenario:c4-typescript",
  requestId: "req-2",
  status: "failed",
  overallScore: 0,
  passedAssertions: 0,
  totalAssertions: 5,
  durationMs: 100,
  diagnostics: ["test-failed"],
  events: [
    {
      eventId: "evt-2",
      timestamp: 1_000_000,
      type: "error",
      message: "fail",
    },
  ],
  artifacts: [],
};

describe("Phase H9 Agentic Harness Adoption Gate & Fail-Closed Enforcement", () => {
  it("validates request and result schemas correctly", () => {
    const req = validateHarnessAdoptionGateRequest({
      schemaVersion: 1,
      targetResourceId: "skill:external-analyzer",
      actionKind: "activate-external-skill",
      scorecards: [mockPassingScorecard],
      grantedApprovals: ["managed-extension-activation-approval"],
    });

    expect(req.schemaVersion).toBe(1);
    expect(req.targetResourceId).toBe("skill:external-analyzer");

    const res = validateHarnessAdoptionGateResult({
      schemaVersion: 1,
      targetResourceId: "skill:external-analyzer",
      actionKind: "activate-external-skill",
      passed: true,
      checkedScorecardsCount: 1,
      diagnostics: [],
      safeNextAction: "grant requested action",
    });

    expect(res.passed).toBe(true);
  });

  it("passes adoption gate when valid scorecards and approvals are provided", () => {
    const result = evaluateHarnessAdoptionGate(
      {
        schemaVersion: 1,
        targetResourceId: "skill:external-analyzer",
        actionKind: "activate-external-skill",
        scorecards: [mockPassingScorecard],
        grantedApprovals: ["managed-extension-activation-approval"],
        maxScorecardAgeMs: 10_000_000,
      },
      { now: () => 1_000_000 },
    );

    expect(result.passed).toBe(true);
    expect(result.diagnostics).toHaveLength(0);
    expect(result.safeNextAction).toContain("grant requested action");
  });

  it("fails closed on missing harness scorecards", () => {
    const result = evaluateHarnessAdoptionGate({
      schemaVersion: 1,
      targetResourceId: "skill:external-analyzer",
      actionKind: "activate-external-skill",
      scorecards: [],
      grantedApprovals: ["managed-extension-activation-approval"],
    });

    expect(result.passed).toBe(false);
    expect(result.diagnostics).toContain("missing-harness-scorecard");
    expect(result.safeNextAction).toContain("fail closed");
  });

  it("fails closed on failing harness scorecards", () => {
    const result = evaluateHarnessAdoptionGate({
      schemaVersion: 1,
      targetResourceId: "agent:code-mutator",
      actionKind: "mutate-agent-capability",
      scorecards: [mockFailingScorecard],
      grantedApprovals: ["atomic-commit-approval"],
    });

    expect(result.passed).toBe(false);
    expect(result.diagnostics).toContain(
      "harness-scorecard-failed:scorecard-fail-1:failed",
    );
  });

  it("fails closed on stale harness scorecards", () => {
    const result = evaluateHarnessAdoptionGate(
      {
        schemaVersion: 1,
        targetResourceId: "mcp:external-tool",
        actionKind: "execute-external-mcp",
        scorecards: [mockPassingScorecard],
        grantedApprovals: ["mcp-capability-approval"],
        maxScorecardAgeMs: 100, // 100ms max age
      },
      { now: () => 10_000_000 }, // currentTime is 9,000,000ms after scorecard
    );

    expect(result.passed).toBe(false);
    expect(result.diagnostics).toContain(
      "stale-harness-scorecard:scorecard-pass-1",
    );
  });

  it("fails closed on missing required approvals", () => {
    const result = evaluateHarnessAdoptionGate(
      {
        schemaVersion: 1,
        targetResourceId: "skill:external-analyzer",
        actionKind: "activate-external-skill",
        scorecards: [mockPassingScorecard],
        grantedApprovals: [], // missing managed-extension-activation-approval
      },
      { now: () => 1_000_000 },
    );

    expect(result.passed).toBe(false);
    expect(result.diagnostics).toContain(
      "missing-required-approval:managed-extension-activation-approval",
    );
  });
});
