import type {
  HarnessCapabilities,
  HarnessExecutionRequest,
  HarnessScenario,
} from "@intentloom/protocol";
import { describe, expect, it, vi } from "vitest";
import {
  compareHarnessScorecards,
  executeHarnessScenario,
} from "../packages/application/src/index.js";

describe("Harness Runner & Comparison Engine (ADR-0052 Phase H2)", () => {
  const defaultCapabilities: HarnessCapabilities = {
    readonlyFs: true,
    writeFs: false,
    processExecution: false,
    networkAccess: false,
    maxDurationMs: 10_000,
    maxMemoryMb: 512,
  };

  const sampleScenario: HarnessScenario = {
    schemaVersion: 1,
    scenarioId: "scen-c4-01",
    title: "Read-only evidence inspection",
    description:
      "Evaluates read-only evidence parsing and boundary enforcement",
    requiredCapabilities: defaultCapabilities,
    steps: [
      {
        id: "step-1",
        name: "Inspect project",
        action: "inspect",
      },
      {
        id: "step-2",
        name: "Fetch evidence",
        action: "fetch-evidence",
      },
    ],
  };

  const sampleRequest: HarnessExecutionRequest = {
    schemaVersion: 1,
    requestId: "req-2026-01",
    scenarioId: "scen-c4-01",
    projectRoot: "/mock/project",
    executorType: "local-readonly",
    requestedCapabilities: defaultCapabilities,
    createdTimestamp: 1_000,
  };

  it("executes scenario deterministically with default step executor", async () => {
    let clock = 1_000;
    const scorecard = await executeHarnessScenario({
      scenario: sampleScenario,
      request: sampleRequest,
      now: () => clock,
      generateId: (prefix) => `${prefix}-fixed`,
    });

    expect(scorecard.status).toBe("passed");
    expect(scorecard.overallScore).toBe(100);
    expect(scorecard.passedAssertions).toBe(2);
    expect(scorecard.totalAssertions).toBe(2);
    expect(scorecard.events.length).toBe(5);
  });

  it("evaluates custom step executor results and failed assertions", async () => {
    const customExecutor = vi
      .fn()
      .mockResolvedValueOnce({ success: true, message: "Step 1 passed" })
      .mockResolvedValueOnce({
        success: false,
        message: "Step 2 assertion failed",
      });

    const scorecard = await executeHarnessScenario({
      scenario: sampleScenario,
      request: sampleRequest,
      stepExecutor: customExecutor,
      generateId: (prefix) => `${prefix}-custom`,
    });

    expect(scorecard.status).toBe("failed");
    expect(scorecard.overallScore).toBe(50);
    expect(scorecard.passedAssertions).toBe(1);
    expect(scorecard.totalAssertions).toBe(2);
    expect(customExecutor).toHaveBeenCalledTimes(2);
  });

  it("rejects evaluation when requested capabilities do not satisfy scenario requirements", async () => {
    const insufficientRequest: HarnessExecutionRequest = {
      ...sampleRequest,
      requestedCapabilities: {
        ...defaultCapabilities,
        maxDurationMs: 1_000,
      },
    };

    const scorecard = await executeHarnessScenario({
      scenario: sampleScenario,
      request: insufficientRequest,
    });

    expect(scorecard.status).toBe("budget-exceeded");
    expect(scorecard.overallScore).toBe(0);
    expect(scorecard.diagnostics).toContain("capability-mismatch");
  });

  it("handles cancellation via AbortSignal", async () => {
    const controller = new AbortController();
    controller.abort();

    const scorecard = await executeHarnessScenario({
      scenario: sampleScenario,
      request: sampleRequest,
      signal: controller.signal,
    });

    expect(scorecard.status).toBe("cancelled");
    expect(scorecard.diagnostics).toContain("evaluation-cancelled");
  });

  it("compares baseline vs protected scorecards and detects regressions", () => {
    const baseline = {
      schemaVersion: 1 as const,
      scorecardId: "sc-base",
      scenarioId: "scen-c4-01",
      requestId: "req-base",
      status: "passed" as const,
      overallScore: 80,
      passedAssertions: 4,
      totalAssertions: 5,
      durationMs: 500,
      diagnostics: [],
      events: [],
      artifacts: [],
    };

    const protectedImproved = {
      ...baseline,
      scorecardId: "sc-prot-1",
      overallScore: 100,
      passedAssertions: 5,
    };

    const comparisonImproved = compareHarnessScorecards({
      baseline,
      protected: protectedImproved,
    });

    expect(comparisonImproved.scoreDelta).toBe(20);
    expect(comparisonImproved.regressionDetected).toBe(false);

    const protectedRegressed = {
      ...baseline,
      scorecardId: "sc-prot-2",
      overallScore: 60,
      passedAssertions: 3,
    };

    const comparisonRegressed = compareHarnessScorecards({
      baseline,
      protected: protectedRegressed,
    });

    expect(comparisonRegressed.scoreDelta).toBe(-20);
    expect(comparisonRegressed.regressionDetected).toBe(true);
  });

  it("throws error when comparing scorecards for different scenarios", () => {
    const baseline = {
      schemaVersion: 1 as const,
      scorecardId: "sc-base",
      scenarioId: "scen-A",
      requestId: "req-1",
      status: "passed" as const,
      overallScore: 100,
      passedAssertions: 1,
      totalAssertions: 1,
      durationMs: 100,
      diagnostics: [],
      events: [],
      artifacts: [],
    };

    const mismatch = {
      ...baseline,
      scenarioId: "scen-B",
    };

    expect(() =>
      compareHarnessScorecards({ baseline, protected: mismatch }),
    ).toThrow("Scenario mismatch");
  });
});
