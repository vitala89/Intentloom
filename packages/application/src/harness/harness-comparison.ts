import type { HarnessComparison, HarnessScorecard } from "@intentloom/protocol";
import { validateHarnessScorecard } from "@intentloom/validator";

export interface HarnessComparisonOptions {
  readonly baseline: HarnessScorecard;
  readonly protected: HarnessScorecard;
  readonly comparisonId?: string;
  readonly notes?: string;
}

export function compareHarnessScorecards(
  options: HarnessComparisonOptions,
): HarnessComparison {
  const baseline = validateHarnessScorecard(options.baseline);
  const protectedRun = validateHarnessScorecard(options.protected);

  if (baseline.scenarioId !== protectedRun.scenarioId) {
    throw new Error(
      `Scenario mismatch: baseline scenario (${baseline.scenarioId}) does not match protected scenario (${protectedRun.scenarioId})`,
    );
  }

  const scoreDelta = Number(
    (protectedRun.overallScore - baseline.overallScore).toFixed(2),
  );
  const regressionDetected =
    protectedRun.overallScore < baseline.overallScore ||
    protectedRun.status !== "passed";

  const comparisonId =
    options.comparisonId ?? `comp-${baseline.scenarioId}-${Date.now()}`;

  return {
    schemaVersion: 1,
    comparisonId,
    scenarioId: baseline.scenarioId,
    baselineScorecardId: baseline.scorecardId,
    protectedScorecardId: protectedRun.scorecardId,
    scoreDelta,
    regressionDetected,
    ...(options.notes !== undefined ? { notes: options.notes } : {}),
  };
}
