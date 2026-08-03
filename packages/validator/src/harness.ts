import type {
  HarnessCapabilities,
  HarnessComparison,
  HarnessExecutionRequest,
  HarnessScenario,
  HarnessScenarioStep,
  HarnessScorecard,
} from "@intentloom/protocol";

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function validateHarnessCapabilities(
  value: unknown,
): HarnessCapabilities {
  if (!isObject(value))
    throw new Error("harness capabilities must be an object");
  if (typeof value.readonlyFs !== "boolean")
    throw new Error("readonlyFs must be a boolean");
  if (typeof value.writeFs !== "boolean")
    throw new Error("writeFs must be a boolean");
  if (typeof value.processExecution !== "boolean")
    throw new Error("processExecution must be a boolean");
  if (typeof value.networkAccess !== "boolean")
    throw new Error("networkAccess must be a boolean");
  if (
    typeof value.maxDurationMs !== "number" ||
    !Number.isInteger(value.maxDurationMs) ||
    value.maxDurationMs <= 0
  )
    throw new Error("maxDurationMs must be a positive integer");
  if (
    typeof value.maxMemoryMb !== "number" ||
    !Number.isInteger(value.maxMemoryMb) ||
    value.maxMemoryMb <= 0
  )
    throw new Error("maxMemoryMb must be a positive integer");

  return {
    readonlyFs: value.readonlyFs,
    writeFs: value.writeFs,
    processExecution: value.processExecution,
    networkAccess: value.networkAccess,
    maxDurationMs: value.maxDurationMs,
    maxMemoryMb: value.maxMemoryMb,
  };
}

export function validateHarnessScenarioStep(
  value: unknown,
): HarnessScenarioStep {
  if (!isObject(value))
    throw new Error("harness scenario step must be an object");
  if (typeof value.id !== "string" || !value.id)
    throw new Error("step id must be a non-empty string");
  if (typeof value.name !== "string" || !value.name)
    throw new Error("step name must be a non-empty string");
  if (typeof value.action !== "string" || !value.action)
    throw new Error("step action must be a non-empty string");

  return {
    id: value.id,
    name: value.name,
    action: value.action,
    ...(isObject(value.params) ? { params: value.params } : {}),
    ...(typeof value.expectedOutcome === "string"
      ? { expectedOutcome: value.expectedOutcome }
      : {}),
  };
}

export function validateHarnessScenario(value: unknown): HarnessScenario {
  if (!isObject(value)) throw new Error("harness scenario must be an object");
  if (value.schemaVersion !== 1)
    throw new Error("scenario schemaVersion must equal 1");
  if (typeof value.scenarioId !== "string" || !value.scenarioId)
    throw new Error("scenarioId must be a non-empty string");
  if (typeof value.title !== "string" || !value.title)
    throw new Error("scenario title must be a non-empty string");
  if (typeof value.description !== "string")
    throw new Error("scenario description must be a string");
  if (!Array.isArray(value.steps) || value.steps.length === 0)
    throw new Error("steps must be a non-empty array");

  const requiredCapabilities = validateHarnessCapabilities(
    value.requiredCapabilities,
  );
  const steps = value.steps.map(validateHarnessScenarioStep);

  return {
    schemaVersion: 1,
    scenarioId: value.scenarioId,
    title: value.title,
    description: value.description,
    requiredCapabilities,
    steps,
    ...(Array.isArray(value.tags) &&
    value.tags.every((t) => typeof t === "string")
      ? { tags: value.tags }
      : {}),
  };
}

export function validateHarnessExecutionRequest(
  value: unknown,
): HarnessExecutionRequest {
  if (!isObject(value))
    throw new Error("harness execution request must be an object");
  if (value.schemaVersion !== 1)
    throw new Error("request schemaVersion must equal 1");
  if (typeof value.requestId !== "string" || !value.requestId)
    throw new Error("requestId must be a non-empty string");
  if (typeof value.scenarioId !== "string" || !value.scenarioId)
    throw new Error("scenarioId must be a non-empty string");
  if (typeof value.projectRoot !== "string" || !value.projectRoot)
    throw new Error("projectRoot must be a non-empty string");
  if (
    typeof value.executorType !== "string" ||
    !["local-readonly", "container", "fake"].includes(value.executorType)
  )
    throw new Error("invalid executorType");
  if (typeof value.createdTimestamp !== "number" || value.createdTimestamp <= 0)
    throw new Error("createdTimestamp must be a positive number");

  const requestedCapabilities = validateHarnessCapabilities(
    value.requestedCapabilities,
  );

  return {
    schemaVersion: 1,
    requestId: value.requestId,
    scenarioId: value.scenarioId,
    projectRoot: value.projectRoot,
    executorType: value.executorType as any,
    requestedCapabilities,
    createdTimestamp: value.createdTimestamp,
  };
}

export function validateHarnessScorecard(value: unknown): HarnessScorecard {
  if (!isObject(value)) throw new Error("harness scorecard must be an object");
  if (value.schemaVersion !== 1)
    throw new Error("scorecard schemaVersion must equal 1");
  if (typeof value.scorecardId !== "string" || !value.scorecardId)
    throw new Error("scorecardId must be a non-empty string");
  if (typeof value.scenarioId !== "string" || !value.scenarioId)
    throw new Error("scenarioId must be a non-empty string");
  if (typeof value.requestId !== "string" || !value.requestId)
    throw new Error("requestId must be a non-empty string");
  if (
    typeof value.status !== "string" ||
    ![
      "passed",
      "failed",
      "cancelled",
      "timed-out",
      "budget-exceeded",
      "error",
    ].includes(value.status)
  )
    throw new Error("invalid scorecard status");
  if (
    typeof value.overallScore !== "number" ||
    value.overallScore < 0 ||
    value.overallScore > 100
  )
    throw new Error("overallScore must be a number between 0 and 100");
  if (!Array.isArray(value.diagnostics))
    throw new Error("diagnostics must be an array");

  return {
    schemaVersion: 1,
    scorecardId: value.scorecardId,
    scenarioId: value.scenarioId,
    requestId: value.requestId,
    status: value.status as any,
    overallScore: value.overallScore,
    passedAssertions: Number(value.passedAssertions ?? 0),
    totalAssertions: Number(value.totalAssertions ?? 0),
    durationMs: Number(value.durationMs ?? 0),
    diagnostics: value.diagnostics.map(String),
    events: Array.isArray(value.events) ? (value.events as any) : [],
    artifacts: Array.isArray(value.artifacts) ? (value.artifacts as any) : [],
  };
}

export function validateHarnessComparison(value: unknown): HarnessComparison {
  if (!isObject(value)) throw new Error("harness comparison must be an object");
  if (value.schemaVersion !== 1)
    throw new Error("comparison schemaVersion must equal 1");
  if (typeof value.comparisonId !== "string" || !value.comparisonId)
    throw new Error("comparisonId must be a non-empty string");
  if (typeof value.scenarioId !== "string" || !value.scenarioId)
    throw new Error("scenarioId must be a non-empty string");
  if (
    typeof value.baselineScorecardId !== "string" ||
    !value.baselineScorecardId
  )
    throw new Error("baselineScorecardId must be a non-empty string");
  if (
    typeof value.protectedScorecardId !== "string" ||
    !value.protectedScorecardId
  )
    throw new Error("protectedScorecardId must be a non-empty string");
  if (typeof value.scoreDelta !== "number")
    throw new Error("scoreDelta must be a number");
  if (typeof value.regressionDetected !== "boolean")
    throw new Error("regressionDetected must be a boolean");

  return {
    schemaVersion: 1,
    comparisonId: value.comparisonId,
    scenarioId: value.scenarioId,
    baselineScorecardId: value.baselineScorecardId,
    protectedScorecardId: value.protectedScorecardId,
    scoreDelta: value.scoreDelta,
    regressionDetected: value.regressionDetected,
    ...(typeof value.notes === "string" ? { notes: value.notes } : {}),
  };
}

export * from "./harness-agent.js";
