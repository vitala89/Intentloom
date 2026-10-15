import type {
  HarnessInspectionView,
  HarnessReplayView,
  HarnessScorecard,
} from "@intentloom/protocol";
import { validateHarnessScorecard } from "@intentloom/validator";
import { replayHarnessEvents } from "./harness-state.js";

export type { HarnessInspectionView, HarnessReplayView, HarnessScorecard };

export function inspectHarnessScorecard(
  scorecard: HarnessScorecard,
): HarnessInspectionView {
  const validated = validateHarnessScorecard(scorecard);
  return {
    schemaVersion: 1,
    viewType: "inspect",
    scenarioId: validated.scenarioId,
    requestId: validated.requestId,
    status: validated.status,
    overallScore: validated.overallScore,
    passedAssertions: validated.passedAssertions,
    totalAssertions: validated.totalAssertions,
    durationMs: validated.durationMs,
    diagnosticCount: validated.diagnostics.length,
    eventCount: validated.events.length,
    artifactCount: validated.artifacts.length,
    replayAvailable: validated.events.length > 0,
    readOnly: true,
  };
}

export function replayHarnessScorecard(
  scorecard: HarnessScorecard,
  mode: "simulate" | "strict" = "simulate",
): HarnessReplayView {
  if (mode !== "simulate" && mode !== "strict") {
    throw new Error("invalid harness replay mode");
  }
  const validated = validateHarnessScorecard(scorecard);
  const replay = replayHarnessEvents(validated.events, mode);
  return {
    schemaVersion: 1,
    viewType: "replay",
    scenarioId: validated.scenarioId,
    requestId: validated.requestId,
    mode,
    ...replay,
    readOnly: true,
  };
}
