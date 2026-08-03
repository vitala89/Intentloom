import type {
  HarnessCapabilities,
  HarnessScenarioCase,
  HarnessScenarioCorpus,
  HarnessScorecard,
  HarnessTerminalStatus,
} from "@intentloom/protocol";
import {
  validateHarnessScenarioCase,
  validateHarnessScenarioCorpus,
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

const defaultReadonlyCapabilities: HarnessCapabilities = {
  readonlyFs: true,
  writeFs: false,
  processExecution: false,
  networkAccess: false,
  maxDurationMs: 10_000,
  maxMemoryMb: 256,
};

export const C4_MINIMAL_PROJECT_CASE: HarnessScenarioCase = {
  schemaVersion: 1,
  caseId: "case:c4-minimal-project",
  title: "Curated skill routing for minimal single-file project",
  category: "positive",
  target: "skill-routing",
  riskLevel: "low",
  fixtureRef: "fixtures/harness/c4-dogfooding.json#minimal",
  expectedStatus: "passed",
  scenario: {
    schemaVersion: 1,
    scenarioId: "scenario:c4-minimal",
    title: "Minimal Project Skill Routing",
    description:
      "Evaluates task router classification and discovery on a minimal project without false triggers.",
    steps: [{ id: "step-1", name: "route-minimal", action: "route-skill" }],
    requiredCapabilities: defaultReadonlyCapabilities,
  },
};

export const C4_TYPESCRIPT_PROJECT_CASE: HarnessScenarioCase = {
  schemaVersion: 1,
  caseId: "case:c4-typescript-project",
  title: "Curated skill routing for multi-file TypeScript project",
  category: "positive",
  target: "skill-routing",
  riskLevel: "medium",
  fixtureRef: "fixtures/harness/c4-dogfooding.json#typescript",
  expectedStatus: "passed",
  scenario: {
    schemaVersion: 1,
    scenarioId: "scenario:c4-typescript",
    title: "TypeScript Project Skill Routing",
    description:
      "Evaluates task router classification and adapter generation across TypeScript project boundaries.",
    steps: [{ id: "step-1", name: "route-typescript", action: "route-skill" }],
    requiredCapabilities: defaultReadonlyCapabilities,
  },
};

export const C4_MATURE_PROJECT_CASE: HarnessScenarioCase = {
  schemaVersion: 1,
  caseId: "case:c4-mature-project",
  title: "Project-owned policy precedence in mature multi-package project",
  category: "positive",
  target: "skill-routing",
  riskLevel: "high",
  fixtureRef: "fixtures/harness/c4-dogfooding.json#mature",
  expectedStatus: "passed",
  scenario: {
    schemaVersion: 1,
    scenarioId: "scenario:c4-mature",
    title: "Mature Workspace Policy Precedence",
    description:
      "Evaluates project-owned governance policy precedence over generic catalog skill defaults in mature workspaces.",
    steps: [{ id: "step-1", name: "route-mature", action: "route-skill" }],
    requiredCapabilities: defaultReadonlyCapabilities,
  },
};

export function createC4DogfoodingCorpus(): HarnessScenarioCorpus {
  return validateHarnessScenarioCorpus({
    schemaVersion: 1,
    corpusId: "corpus:c4-dogfooding-seed",
    version: "1.0.0",
    cases: [
      C4_MINIMAL_PROJECT_CASE,
      C4_TYPESCRIPT_PROJECT_CASE,
      C4_MATURE_PROJECT_CASE,
    ],
  });
}
