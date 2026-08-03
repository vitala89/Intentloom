import type {
  HarnessScenarioCase,
  HarnessScenarioCategory,
  HarnessScenarioCorpus,
  HarnessScenarioTarget,
  HarnessTerminalStatus,
} from "@intentloom/protocol";
import {
  validateHarnessScenario,
  validateHarnessCapabilities,
} from "./harness.js";

const CATEGORIES: readonly HarnessScenarioCategory[] = [
  "positive",
  "negative",
  "adversarial",
  "regression",
];
const TARGETS: readonly HarnessScenarioTarget[] = [
  "skill-routing",
  "external-mcp",
  "provider-evidence",
  "capability-negotiation",
  "approval",
  "memory-state",
  "path-boundary",
  "voting",
];
const RISK_LEVELS = ["low", "medium", "high", "critical"] as const;
const STATUSES: readonly HarnessTerminalStatus[] = [
  "passed",
  "failed",
  "cancelled",
  "timed-out",
  "budget-exceeded",
  "error",
];

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validateFixtureRef(value: unknown): string {
  if (typeof value !== "string" || !value) {
    throw new Error("fixtureRef must be a non-empty string");
  }
  if (value.includes("\\") || value.startsWith("/") || value.includes("..")) {
    throw new Error("fixtureRef must be a safe relative reference");
  }
  return value;
}

export function validateHarnessScenarioCase(
  value: unknown,
): HarnessScenarioCase {
  if (!isObject(value))
    throw new Error("harness scenario case must be an object");
  if (value.schemaVersion !== 1)
    throw new Error("scenario case schemaVersion must equal 1");
  if (typeof value.caseId !== "string" || !value.caseId)
    throw new Error("caseId must be a non-empty string");
  if (typeof value.title !== "string" || !value.title)
    throw new Error("scenario case title must be a non-empty string");
  if (!CATEGORIES.includes(value.category as HarnessScenarioCategory))
    throw new Error("invalid scenario case category");
  if (!TARGETS.includes(value.target as HarnessScenarioTarget))
    throw new Error("invalid scenario case target");
  if (!RISK_LEVELS.includes(value.riskLevel as (typeof RISK_LEVELS)[number]))
    throw new Error("invalid scenario case risk level");
  if (!STATUSES.includes(value.expectedStatus as HarnessTerminalStatus))
    throw new Error("invalid scenario case expected status");

  const scenario = validateHarnessScenario(value.scenario);
  validateHarnessCapabilities(scenario.requiredCapabilities);
  const expectedDiagnostics = value.expectedDiagnostics;
  if (
    expectedDiagnostics !== undefined &&
    (!Array.isArray(expectedDiagnostics) ||
      !expectedDiagnostics.every((item) => typeof item === "string"))
  ) {
    throw new Error("expectedDiagnostics must be an array of strings");
  }

  return {
    schemaVersion: 1,
    caseId: value.caseId,
    title: value.title,
    category: value.category as HarnessScenarioCategory,
    target: value.target as HarnessScenarioTarget,
    riskLevel: value.riskLevel as HarnessScenarioCase["riskLevel"],
    fixtureRef: validateFixtureRef(value.fixtureRef),
    scenario,
    expectedStatus: value.expectedStatus as HarnessTerminalStatus,
    ...(Array.isArray(expectedDiagnostics) ? { expectedDiagnostics } : {}),
  };
}

export function validateHarnessScenarioCorpus(
  value: unknown,
): HarnessScenarioCorpus {
  if (!isObject(value))
    throw new Error("harness scenario corpus must be an object");
  if (value.schemaVersion !== 1)
    throw new Error("scenario corpus schemaVersion must equal 1");
  if (typeof value.corpusId !== "string" || !value.corpusId)
    throw new Error("corpusId must be a non-empty string");
  if (typeof value.version !== "string" || !value.version)
    throw new Error("corpus version must be a non-empty string");
  if (!Array.isArray(value.cases) || value.cases.length === 0)
    throw new Error("scenario corpus cases must be a non-empty array");

  const seenCaseIds = new Set<string>();
  const cases = value.cases.map((item) => {
    const scenarioCase = validateHarnessScenarioCase(item);
    if (seenCaseIds.has(scenarioCase.caseId))
      throw new Error(`duplicate scenario case id: ${scenarioCase.caseId}`);
    seenCaseIds.add(scenarioCase.caseId);
    return scenarioCase;
  });

  return {
    schemaVersion: 1,
    corpusId: value.corpusId,
    version: value.version,
    cases,
  };
}
