import type {
  HarnessExecutionRequest,
  HarnessScenario,
  HarnessScorecard,
} from "@intentloom/protocol";

/**
 * The exact `h9-evidence-drill@1` fixtures exercised by
 * tests/harness-h9-evidence-contract.test.ts, reused here so the benchmark's
 * declared `fixtureVersion` refers to the same fixture the correctness
 * contract test already covers.
 */

export const H9_PASSING_SCORECARD: HarnessScorecard = {
  schemaVersion: 1,
  scorecardId: "scorecard-h9-pass-001",
  scenarioId: "scenario:h9-evidence-drill",
  requestId: "req-h9-pass-101",
  status: "passed",
  overallScore: 100,
  passedAssertions: 5,
  totalAssertions: 5,
  durationMs: 120,
  diagnostics: [],
  events: [
    {
      eventId: "evt-h9-1",
      timestamp: 1_000_000,
      type: "step-start",
      stepId: "step-1",
      message: "Start inspection step",
    },
    {
      eventId: "evt-h9-2",
      timestamp: 1_000_050,
      type: "step-complete",
      stepId: "step-1",
      message: "Completed inspection step",
    },
    {
      eventId: "evt-h9-3",
      timestamp: 1_000_120,
      type: "info",
      message: "Scenario evaluation passed successfully",
    },
  ],
  artifacts: [],
};

export const H9_FAILING_SCORECARD: HarnessScorecard = {
  schemaVersion: 1,
  scorecardId: "scorecard-h9-fail-002",
  scenarioId: "scenario:h9-evidence-drill",
  requestId: "req-h9-fail-102",
  status: "failed",
  overallScore: 0,
  passedAssertions: 1,
  totalAssertions: 5,
  durationMs: 90,
  diagnostics: ["assertion-failed:step-2-verification-failed"],
  events: [
    {
      eventId: "evt-h9-4",
      timestamp: 2_000_000,
      type: "step-start",
      stepId: "step-1",
      message: "Start inspection step",
    },
    {
      eventId: "evt-h9-5",
      timestamp: 2_000_030,
      type: "step-complete",
      stepId: "step-1",
      message: "Completed inspection step",
    },
    {
      eventId: "evt-h9-6",
      timestamp: 2_000_040,
      type: "step-start",
      stepId: "step-2",
      message: "Start verification step",
    },
    {
      eventId: "evt-h9-7",
      timestamp: 2_000_090,
      type: "step-fail",
      stepId: "step-2",
      message: "Verification failed: security assertion error",
    },
  ],
  artifacts: [],
};

export const H9_DRILL_SCENARIO: HarnessScenario = {
  schemaVersion: 1,
  scenarioId: "scenario:h9-evidence-drill",
  title: "Phase H9 Readiness Audit Evidence Drill",
  description:
    "Composes adoption gate, state replay, purge, and rollback recovery terminal states",
  requiredCapabilities: {
    readonlyFs: true,
    writeFs: false,
    processExecution: false,
    networkAccess: false,
    maxDurationMs: 30_000,
    maxMemoryMb: 512,
  },
  steps: [
    { id: "step-1", name: "Inspection Step", action: "inspect" },
    { id: "step-2", name: "Verification Step", action: "validate" },
  ],
};

export const H9_DRILL_REQUEST: HarnessExecutionRequest = {
  schemaVersion: 1,
  requestId: "req-h9-pass-101",
  scenarioId: "scenario:h9-evidence-drill",
  projectRoot: "/workspace/h9-evidence-target",
  executorType: "local-readonly",
  requestedCapabilities: H9_DRILL_SCENARIO.requiredCapabilities,
  createdTimestamp: 1_000_000,
};
