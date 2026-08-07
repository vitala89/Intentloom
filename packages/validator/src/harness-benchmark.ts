import type {
  HarnessBenchmarkEnvironment,
  HarnessBenchmarkExecutionProfile,
  HarnessBenchmarkResult,
  HarnessBenchmarkStageId,
  HarnessBenchmarkStageSummary,
  HarnessBenchmarkStatus,
} from "@intentloom/protocol";

const EXECUTION_PROFILES: readonly HarnessBenchmarkExecutionProfile[] = [
  "calibration",
  "local-repeat",
  "matrix-observation",
];

const STATUSES: readonly HarnessBenchmarkStatus[] = [
  "observed",
  "inconclusive",
  "invalid",
  "unsupported",
];

const STAGE_IDS: readonly HarnessBenchmarkStageId[] = [
  "adoption-gate-pass",
  "adoption-gate-fail",
  "replay",
  "resume-cross-project-reject",
  "purge",
  "rollback",
];

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function nonNegativeNumber(value: unknown, field: string): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    throw new Error(`${field} must be a non-negative number`);
  }
  return value;
}

function nonNegativeInteger(value: unknown, field: string): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0) {
    throw new Error(`${field} must be a non-negative integer`);
  }
  return value;
}

function numberArray(value: unknown, field: string): readonly number[] {
  if (
    !Array.isArray(value) ||
    !value.every((item) => typeof item === "number")
  ) {
    throw new Error(`${field} must be an array of numbers`);
  }
  return value;
}

function stringArray(value: unknown, field: string): readonly string[] {
  if (
    !Array.isArray(value) ||
    !value.every((item) => typeof item === "string")
  ) {
    throw new Error(`${field} must be an array of strings`);
  }
  return value;
}

function validateHarnessBenchmarkEnvironment(
  value: unknown,
): HarnessBenchmarkEnvironment {
  if (!isObject(value))
    throw new Error("benchmark environment must be an object");
  if (typeof value.runtimeVersion !== "string" || !value.runtimeVersion)
    throw new Error("environment runtimeVersion must be a non-empty string");
  if (typeof value.os !== "string" || !value.os)
    throw new Error("environment os must be a non-empty string");
  if (typeof value.arch !== "string" || !value.arch)
    throw new Error("environment arch must be a non-empty string");
  if (typeof value.cold !== "boolean")
    throw new Error("environment cold must be a boolean");
  if (
    value.repositoryCommit !== undefined &&
    typeof value.repositoryCommit !== "string"
  )
    throw new Error("environment repositoryCommit must be a string");

  return {
    runtimeVersion: value.runtimeVersion,
    os: value.os,
    arch: value.arch,
    cold: value.cold,
    ...(typeof value.repositoryCommit === "string"
      ? { repositoryCommit: value.repositoryCommit }
      : {}),
  };
}

function validateStageSummaryFields(
  value: Record<string, unknown>,
): Omit<HarnessBenchmarkStageSummary, "stage"> {
  return {
    sampleCount: nonNegativeInteger(value.sampleCount, "sampleCount"),
    discardedSampleCount: nonNegativeInteger(
      value.discardedSampleCount,
      "discardedSampleCount",
    ),
    medianMs: nonNegativeNumber(value.medianMs, "medianMs"),
    p90Ms: nonNegativeNumber(value.p90Ms, "p90Ms"),
    p95Ms: nonNegativeNumber(value.p95Ms, "p95Ms"),
    minMs: nonNegativeNumber(value.minMs, "minMs"),
    maxMs: nonNegativeNumber(value.maxMs, "maxMs"),
    spreadMs: nonNegativeNumber(value.spreadMs, "spreadMs"),
    samples: numberArray(value.samples, "samples"),
  };
}

function validateHarnessBenchmarkStageSummary(
  value: unknown,
): HarnessBenchmarkStageSummary {
  if (!isObject(value))
    throw new Error("benchmark stage summary must be an object");
  if (!STAGE_IDS.includes(value.stage as HarnessBenchmarkStageId))
    throw new Error("invalid benchmark stage id");

  return {
    stage: value.stage as HarnessBenchmarkStageId,
    ...validateStageSummaryFields(value),
  };
}

export function validateHarnessBenchmarkResult(
  value: unknown,
): HarnessBenchmarkResult {
  if (!isObject(value))
    throw new Error("harness benchmark result must be an object");
  if (value.schemaVersion !== 1)
    throw new Error("benchmark result schemaVersion must equal 1");
  if (typeof value.benchmarkVersion !== "string" || !value.benchmarkVersion)
    throw new Error("benchmarkVersion must be a non-empty string");
  if (typeof value.scenarioId !== "string" || !value.scenarioId)
    throw new Error("scenarioId must be a non-empty string");
  if (typeof value.fixtureVersion !== "string" || !value.fixtureVersion)
    throw new Error("fixtureVersion must be a non-empty string");
  if (typeof value.policyVersion !== "string" || !value.policyVersion)
    throw new Error("policyVersion must be a non-empty string");
  if (typeof value.scorerVersion !== "string" || !value.scorerVersion)
    throw new Error("scorerVersion must be a non-empty string");
  if (
    !EXECUTION_PROFILES.includes(
      value.executionProfile as HarnessBenchmarkExecutionProfile,
    )
  )
    throw new Error("invalid benchmark executionProfile");
  if (!STATUSES.includes(value.status as HarnessBenchmarkStatus))
    throw new Error("invalid benchmark status");
  if (typeof value.clockSource !== "string" || !value.clockSource)
    throw new Error("clockSource must be a non-empty string");

  const environment = validateHarnessBenchmarkEnvironment(value.environment);
  const warmupSampleCount = nonNegativeInteger(
    value.warmupSampleCount,
    "warmupSampleCount",
  );
  const measuredSampleCount = nonNegativeInteger(
    value.measuredSampleCount,
    "measuredSampleCount",
  );

  if (!Array.isArray(value.stageSummaries))
    throw new Error("stageSummaries must be an array");
  const stageSummaries = value.stageSummaries.map(
    validateHarnessBenchmarkStageSummary,
  );

  if (!isObject(value.totalDurationSummary))
    throw new Error("totalDurationSummary must be an object");
  const totalDurationSummary = validateStageSummaryFields(
    value.totalDurationSummary,
  );

  const diagnostics = stringArray(value.diagnostics, "diagnostics");

  if (
    value.comparableBaselineId !== undefined &&
    typeof value.comparableBaselineId !== "string"
  )
    throw new Error("comparableBaselineId must be a string");
  if (
    value.nonComparableReason !== undefined &&
    typeof value.nonComparableReason !== "string"
  )
    throw new Error("nonComparableReason must be a string");

  return {
    schemaVersion: 1,
    benchmarkVersion: value.benchmarkVersion,
    scenarioId: value.scenarioId,
    fixtureVersion: value.fixtureVersion,
    policyVersion: value.policyVersion,
    scorerVersion: value.scorerVersion,
    executionProfile:
      value.executionProfile as HarnessBenchmarkExecutionProfile,
    status: value.status as HarnessBenchmarkStatus,
    environment,
    clockSource: value.clockSource,
    warmupSampleCount,
    measuredSampleCount,
    stageSummaries,
    totalDurationSummary,
    ...(typeof value.comparableBaselineId === "string"
      ? { comparableBaselineId: value.comparableBaselineId }
      : {}),
    ...(typeof value.nonComparableReason === "string"
      ? { nonComparableReason: value.nonComparableReason }
      : {}),
    diagnostics,
  };
}
