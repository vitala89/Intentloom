import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type {
  HarnessCapabilities,
  HarnessScenarioCase,
  HarnessScenarioCorpus,
} from "@intentloom/protocol";
import {
  C4_MATURE_PROJECT_CASE,
  C4_MINIMAL_PROJECT_CASE,
  C4_TYPESCRIPT_PROJECT_CASE,
  createC4DogfoodingCorpus,
  evaluateHarnessScenarioCase,
  executeHarnessScenario,
} from "../packages/application/src/index.js";
import { validateHarnessScenarioCorpus } from "@intentloom/validator";

const readonlyCapabilities: HarnessCapabilities = {
  readonlyFs: true,
  writeFs: false,
  processExecution: false,
  networkAccess: false,
  maxDurationMs: 10_000,
  maxMemoryMb: 256,
};

function scenario(
  caseId: string,
  action: string,
  capabilities = readonlyCapabilities,
) {
  return {
    schemaVersion: 1 as const,
    scenarioId: `scenario-${caseId}`,
    title: `H7 ${caseId}`,
    description: `Deterministic H7 fixture for ${caseId}`,
    requiredCapabilities: capabilities,
    steps: [{ id: "step-1", name: action, action }],
  };
}

const corpus: HarnessScenarioCorpus = {
  schemaVersion: 1,
  corpusId: "harness-security-seed",
  version: "0.1.0",
  cases: [
    {
      schemaVersion: 1,
      caseId: "positive-skill-routing",
      title: "Read-only skill routing remains executable",
      category: "positive",
      target: "skill-routing",
      riskLevel: "low",
      fixtureRef: "harness/skill-routing/read-only.json",
      scenario: scenario("positive-skill-routing", "route-skill"),
      expectedStatus: "passed",
    },
    {
      schemaVersion: 1,
      caseId: "positive-external-mcp",
      title: "External MCP evidence stays bounded",
      category: "positive",
      target: "external-mcp",
      riskLevel: "medium",
      fixtureRef: "harness/mcp/external-evidence.json",
      scenario: scenario("positive-external-mcp", "inspect-mcp-evidence"),
      expectedStatus: "passed",
    },
    {
      schemaVersion: 1,
      caseId: "positive-provider-evidence",
      title: "Provider evidence is recorded without execution",
      category: "positive",
      target: "provider-evidence",
      riskLevel: "medium",
      fixtureRef: "harness/provider/evidence-boundary.json",
      scenario: scenario(
        "positive-provider-evidence",
        "record-provider-evidence",
      ),
      expectedStatus: "passed",
    },
    {
      schemaVersion: 1,
      caseId: "negative-capability-negotiation",
      title: "Network capability confusion is rejected",
      category: "negative",
      target: "capability-negotiation",
      riskLevel: "high",
      fixtureRef: "harness/capabilities/network-denied.json",
      scenario: scenario("negative-capability-negotiation", "request-network", {
        ...readonlyCapabilities,
        networkAccess: true,
      }),
      expectedStatus: "budget-exceeded",
      expectedDiagnostics: ["capability-mismatch"],
    },
    {
      schemaVersion: 1,
      caseId: "adversarial-approval",
      title: "Approval failure cannot be hidden by a passing wrapper",
      category: "adversarial",
      target: "approval",
      riskLevel: "high",
      fixtureRef: "harness/approval/denied-action.json",
      scenario: scenario("adversarial-approval", "apply-change"),
      expectedStatus: "failed",
    },
    {
      schemaVersion: 1,
      caseId: "regression-memory-state",
      title: "Memory state inspection remains read-only",
      category: "regression",
      target: "memory-state",
      riskLevel: "medium",
      fixtureRef: "harness/memory/read-only-state.json",
      scenario: scenario("regression-memory-state", "inspect-memory"),
      expectedStatus: "passed",
    },
    {
      schemaVersion: 1,
      caseId: "regression-path-boundary",
      title: "Path boundary fixture remains local",
      category: "regression",
      target: "path-boundary",
      riskLevel: "high",
      fixtureRef: "harness/paths/local-root.json",
      scenario: scenario("regression-path-boundary", "check-path-boundary"),
      expectedStatus: "passed",
    },
    {
      schemaVersion: 1,
      caseId: "adversarial-voting-cancel",
      title: "Voting review cancellation is explicit",
      category: "adversarial",
      target: "voting",
      riskLevel: "critical",
      fixtureRef: "harness/voting/cancelled-review.json",
      scenario: scenario("adversarial-voting-cancel", "run-review-vote"),
      expectedStatus: "cancelled",
      expectedDiagnostics: ["evaluation-cancelled"],
    },
  ],
};

function requestFor(scenarioCase: HarnessScenarioCase) {
  return {
    schemaVersion: 1 as const,
    requestId: `request-${scenarioCase.caseId}`,
    scenarioId: scenarioCase.scenario.scenarioId,
    projectRoot: `/harness-fixtures/${scenarioCase.caseId}`,
    executorType: "fake" as const,
    requestedCapabilities:
      scenarioCase.caseId === "negative-capability-negotiation"
        ? readonlyCapabilities
        : scenarioCase.scenario.requiredCapabilities,
    createdTimestamp: 1,
  };
}

describe("H7 deterministic harness scenario corpus", () => {
  it("validates and executes the bounded security seed", async () => {
    const validated = validateHarnessScenarioCorpus(corpus);
    const evaluations = [];

    for (const scenarioCase of validated.cases) {
      const controller = new AbortController();
      if (scenarioCase.caseId === "adversarial-voting-cancel") {
        controller.abort();
      }
      const scorecard = await executeHarnessScenario({
        scenario: scenarioCase.scenario,
        request: requestFor(scenarioCase),
        signal: controller.signal,
        now: () => 1,
        generateId: (prefix) => `${prefix}-deterministic`,
        ...(scenarioCase.caseId === "adversarial-approval"
          ? {
              stepExecutor: async () => ({
                success: false,
                message: "approval-denied",
              }),
            }
          : {}),
      });
      evaluations.push(
        evaluateHarnessScenarioCase({ scenarioCase, scorecard }),
      );
    }

    expect(evaluations).toHaveLength(8);
    expect(evaluations.every((evaluation) => evaluation.passed)).toBe(true);
    expect(new Set(validated.cases.map((item) => item.category))).toEqual(
      new Set(["positive", "negative", "adversarial", "regression"]),
    );
    expect(new Set(validated.cases.map((item) => item.target))).toEqual(
      new Set([
        "skill-routing",
        "external-mcp",
        "provider-evidence",
        "capability-negotiation",
        "approval",
        "memory-state",
        "path-boundary",
        "voting",
      ]),
    );
  });

  it("validates and evaluates the C4 curated skill dogfooding scenario corpus", async () => {
    const c4Corpus = createC4DogfoodingCorpus();
    expect(c4Corpus.cases).toHaveLength(3);

    expect(C4_MINIMAL_PROJECT_CASE.caseId).toBe("case:c4-minimal-project");
    expect(C4_TYPESCRIPT_PROJECT_CASE.caseId).toBe(
      "case:c4-typescript-project",
    );
    expect(C4_MATURE_PROJECT_CASE.caseId).toBe("case:c4-mature-project");

    const fixturePath = join(
      process.cwd(),
      "tests",
      "fixtures",
      "harness",
      "c4-dogfooding.json",
    );
    const fixtureContent = await readFile(fixturePath, "utf8");
    const parsedFixture = JSON.parse(fixtureContent);

    const validatedFixture = validateHarnessScenarioCorpus(parsedFixture);
    expect(validatedFixture).toEqual(c4Corpus);

    for (const c4Case of c4Corpus.cases) {
      const scorecard = await executeHarnessScenario({
        scenario: c4Case.scenario,
        request: {
          schemaVersion: 1,
          requestId: `req-${c4Case.caseId}`,
          scenarioId: c4Case.scenario.scenarioId,
          projectRoot: `/projects/${c4Case.caseId}`,
          executorType: "fake",
          requestedCapabilities: c4Case.scenario.requiredCapabilities,
          createdTimestamp: 1000,
        },
        now: () => 1000,
        generateId: (prefix) => `${prefix}-c4`,
      });

      const evaluation = evaluateHarnessScenarioCase({
        scenarioCase: c4Case,
        scorecard,
      });

      expect(evaluation.passed).toBe(true);
      expect(evaluation.actualStatus).toBe("passed");
    }
  });

  it("rejects duplicate cases and unsafe fixture references", () => {
    expect(() =>
      validateHarnessScenarioCorpus({
        ...corpus,
        cases: [corpus.cases[0], corpus.cases[0]],
      }),
    ).toThrow("duplicate scenario case id");
    expect(() =>
      validateHarnessScenarioCorpus({
        ...corpus,
        cases: [{ ...corpus.cases[0], fixtureRef: "../outside.json" }],
      }),
    ).toThrow("safe relative reference");
  });

  it("marks a mismatched scorecard without exposing execution events", () => {
    const evaluation = evaluateHarnessScenarioCase({
      scenarioCase: corpus.cases[0],
      scorecard: {
        schemaVersion: 1,
        scorecardId: "scorecard-1",
        scenarioId: "wrong-scenario",
        requestId: "request-1",
        status: "failed",
        overallScore: 0,
        passedAssertions: 0,
        totalAssertions: 1,
        durationMs: 0,
        diagnostics: [],
        events: [
          {
            eventId: "event-1",
            timestamp: 1,
            type: "error",
            message: "secret fixture detail",
          },
        ],
        artifacts: [],
      },
    });

    expect(evaluation.passed).toBe(false);
    expect(evaluation.diagnostics).toEqual([
      "scenario-id-mismatch",
      "unexpected-status",
    ]);
    expect(evaluation).not.toHaveProperty("events");
  });
});
