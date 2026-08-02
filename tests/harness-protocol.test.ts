import { describe, expect, it } from "vitest";
import {
  validateHarnessCapabilities,
  validateHarnessComparison,
  validateHarnessExecutionRequest,
  validateHarnessScenario,
  validateHarnessScorecard,
} from "../packages/validator/src/index.js";

describe("Harness Protocol & Validator (ADR-0052 Phase H1)", () => {
  const validCapabilities = {
    readonlyFs: true,
    writeFs: false,
    processExecution: false,
    networkAccess: false,
    maxDurationMs: 10_000,
    maxMemoryMb: 512,
  };

  const validScenario = {
    schemaVersion: 1,
    scenarioId: "scen-01",
    title: "Read-only evidence verification",
    description: "Evaluates agent behavior against local evidence boundaries",
    requiredCapabilities: validCapabilities,
    steps: [
      {
        id: "step-1",
        name: "Analyze repository",
        action: "inspect",
      },
    ],
    tags: ["read-only", "evidence"],
  };

  it("validates a compliant harness capabilities object", () => {
    const validated = validateHarnessCapabilities(validCapabilities);
    expect(validated).toEqual(validCapabilities);
  });

  it("rejects invalid harness capabilities", () => {
    expect(() =>
      validateHarnessCapabilities({ ...validCapabilities, maxDurationMs: -1 }),
    ).toThrow("maxDurationMs must be a positive integer");
    expect(() =>
      validateHarnessCapabilities({ ...validCapabilities, readonlyFs: "yes" }),
    ).toThrow("readonlyFs must be a boolean");
  });

  it("validates a compliant harness scenario", () => {
    const validated = validateHarnessScenario(validScenario);
    expect(validated.scenarioId).toBe("scen-01");
    expect(validated.steps.length).toBe(1);
  });

  it("rejects scenario with missing or empty steps", () => {
    expect(() =>
      validateHarnessScenario({ ...validScenario, steps: [] }),
    ).toThrow("steps must be a non-empty array");
    expect(() =>
      validateHarnessScenario({ ...validScenario, schemaVersion: 2 }),
    ).toThrow("scenario schemaVersion must equal 1");
  });

  it("validates a compliant execution request", () => {
    const request = {
      schemaVersion: 1,
      requestId: "req-101",
      scenarioId: "scen-01",
      projectRoot: "/project",
      executorType: "local-readonly",
      requestedCapabilities: validCapabilities,
      createdTimestamp: Date.now(),
    };
    const validated = validateHarnessExecutionRequest(request);
    expect(validated.requestId).toBe("req-101");
    expect(validated.executorType).toBe("local-readonly");
  });

  it("rejects execution request with invalid executor type", () => {
    const request = {
      schemaVersion: 1,
      requestId: "req-101",
      scenarioId: "scen-01",
      projectRoot: "/project",
      executorType: "invalid-executor",
      requestedCapabilities: validCapabilities,
      createdTimestamp: Date.now(),
    };
    expect(() => validateHarnessExecutionRequest(request)).toThrow(
      "invalid executorType",
    );
  });

  it("validates a compliant scorecard", () => {
    const scorecard = {
      schemaVersion: 1,
      scorecardId: "sc-99",
      scenarioId: "scen-01",
      requestId: "req-101",
      status: "passed",
      overallScore: 95.5,
      passedAssertions: 5,
      totalAssertions: 5,
      durationMs: 1200,
      diagnostics: [],
      events: [],
      artifacts: [],
    };
    const validated = validateHarnessScorecard(scorecard);
    expect(validated.status).toBe("passed");
    expect(validated.overallScore).toBe(95.5);
  });

  it("rejects scorecard with out-of-bounds overallScore", () => {
    const scorecard = {
      schemaVersion: 1,
      scorecardId: "sc-99",
      scenarioId: "scen-01",
      requestId: "req-101",
      status: "passed",
      overallScore: 105,
      diagnostics: [],
    };
    expect(() => validateHarnessScorecard(scorecard)).toThrow(
      "overallScore must be a number between 0 and 100",
    );
  });

  it("validates a baseline vs protected harness comparison", () => {
    const comparison = {
      schemaVersion: 1,
      comparisonId: "comp-01",
      scenarioId: "scen-01",
      baselineScorecardId: "sc-base",
      protectedScorecardId: "sc-prot",
      scoreDelta: 5.0,
      regressionDetected: false,
      notes: "Protected run improved score without regression",
    };
    const validated = validateHarnessComparison(comparison);
    expect(validated.regressionDetected).toBe(false);
    expect(validated.scoreDelta).toBe(5.0);
  });
});
