import { describe, expect, it } from "vitest";
import type { HarnessScorecard } from "@intentloom/protocol";
import {
  inspectHarnessScorecard,
  replayHarnessScorecard,
} from "../packages/application/src/index.js";

const scorecard: HarnessScorecard = {
  schemaVersion: 1,
  scorecardId: "scorecard-h8",
  scenarioId: "scenario-h8",
  requestId: "request-h8",
  status: "failed",
  overallScore: 50,
  passedAssertions: 1,
  totalAssertions: 2,
  durationMs: 12,
  diagnostics: ["step-execution-error"],
  events: [
    {
      eventId: "event-1",
      timestamp: 1,
      type: "step-start",
      stepId: "step-1",
      message: "Start step",
      payload: { secret: "must-not-leak" },
    },
    {
      eventId: "event-2",
      timestamp: 2,
      type: "error",
      stepId: "step-1",
      message: "Step failed",
    },
  ],
  artifacts: [
    {
      artifactId: "artifact-1",
      path: "evidence.json",
      sizeBytes: 10,
      sha256: "digest",
      mimeType: "application/json",
    },
  ],
};

describe("H8 read-only harness surfaces", () => {
  it("inspects a scorecard without exposing event or artifact contents", () => {
    const view = inspectHarnessScorecard(scorecard);

    expect(view).toEqual({
      schemaVersion: 1,
      viewType: "inspect",
      scenarioId: "scenario-h8",
      requestId: "request-h8",
      status: "failed",
      overallScore: 50,
      passedAssertions: 1,
      totalAssertions: 2,
      durationMs: 12,
      diagnosticCount: 1,
      eventCount: 2,
      artifactCount: 1,
      replayAvailable: true,
      readOnly: true,
    });
    expect(view).not.toHaveProperty("events");
    expect(view).not.toHaveProperty("secret");
  });

  it("replays through the existing deterministic state operation", () => {
    expect(replayHarnessScorecard(scorecard)).toEqual({
      schemaVersion: 1,
      viewType: "replay",
      scenarioId: "scenario-h8",
      requestId: "request-h8",
      mode: "simulate",
      totalEvents: 2,
      stepCount: 1,
      failedSteps: [],
      isDeterministic: true,
      readOnly: true,
    });
    expect(replayHarnessScorecard(scorecard, "strict").failedSteps).toEqual([
      "step-1",
    ]);
  });

  it("rejects malformed scorecards at the application boundary", () => {
    expect(() =>
      inspectHarnessScorecard({ ...scorecard, overallScore: 101 }),
    ).toThrow("overallScore must be a number between 0 and 100");
    expect(() =>
      replayHarnessScorecard({ ...scorecard, status: "unsupported" as never }),
    ).toThrow("invalid scorecard status");
    expect(() => replayHarnessScorecard(scorecard, "unsafe" as never)).toThrow(
      "invalid harness replay mode",
    );
  });
});
