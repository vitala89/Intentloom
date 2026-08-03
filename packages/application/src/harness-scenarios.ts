import type {
  HarnessScenarioCase,
  HarnessScorecard,
  HarnessTerminalStatus,
} from "@intentloom/protocol";
import {
  validateHarnessScenarioCase,
  validateHarnessScorecard,
} from "@intentloom/validator";

export interface HarnessScenarioCaseEvaluation {
  readonly schemaVersion: 1;
  readonly caseId: string;
  readonly expectedStatus: HarnessTerminalStatus;
  readonly actualStatus: HarnessTerminalStatus;
  readonly passed: boolean;
  readonly diagnostics: readonly string[];
}

export function evaluateHarnessScenarioCase(options: {
  readonly scenarioCase: HarnessScenarioCase;
  readonly scorecard: HarnessScorecard;
}): HarnessScenarioCaseEvaluation {
  const scenarioCase = validateHarnessScenarioCase(options.scenarioCase);
  const scorecard = validateHarnessScorecard(options.scorecard);
  const diagnostics = [...scorecard.diagnostics];

  if (scorecard.scenarioId !== scenarioCase.scenario.scenarioId) {
    diagnostics.push("scenario-id-mismatch");
  }
  if (scorecard.status !== scenarioCase.expectedStatus) {
    diagnostics.push("unexpected-status");
  }
  for (const expectedDiagnostic of scenarioCase.expectedDiagnostics ?? []) {
    if (!scorecard.diagnostics.includes(expectedDiagnostic)) {
      diagnostics.push(`missing-diagnostic:${expectedDiagnostic}`);
    }
  }

  const mismatchCount = diagnostics.filter(
    (diagnostic) =>
      ["scenario-id-mismatch", "unexpected-status"].includes(diagnostic) ||
      diagnostic.startsWith("missing-diagnostic:"),
  ).length;

  return {
    schemaVersion: 1,
    caseId: scenarioCase.caseId,
    expectedStatus: scenarioCase.expectedStatus,
    actualStatus: scorecard.status,
    passed: mismatchCount === 0,
    diagnostics,
  };
}
