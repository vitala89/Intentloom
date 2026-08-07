import type {
  HarnessBenchmarkEnvironment,
  HarnessBenchmarkRequest,
  HarnessBenchmarkResult,
  HarnessBenchmarkStageId,
  HarnessBenchmarkStageRecord,
  HarnessBenchmarkStageSummary,
  HarnessBenchmarkStatus,
} from "@intentloom/protocol";
import { measureH9EvidenceStages } from "./harness-benchmark-sample.js";

export * from "./harness-benchmark-sample.js";

const BENCHMARK_VERSION = "1";
const SCENARIO_ID = "scenario:h9-evidence-drill";
const FIXTURE_VERSION = "h9-evidence-drill@1";
const POLICY_VERSION = "1";
const SCORER_VERSION = "1";
const CLOCK_SOURCE = "process.hrtime.bigint (monotonic, sub-millisecond)";

const STAGE_IDS: readonly HarnessBenchmarkStageId[] = [
  "adoption-gate-pass",
  "adoption-gate-fail",
  "replay",
  "resume-cross-project-reject",
  "purge",
  "rollback",
];

// Portable, monotonic, sub-millisecond clock available on Linux/macOS/Windows
// under Node 22/24. Callers may inject a deterministic clock for tests.
const defaultClock = (): number => Number(process.hrtime.bigint()) / 1_000_000;

export interface HarnessBenchmarkDeps {
  readonly clock?: () => number;
  readonly now?: () => Date;
}

function percentile(sortedValues: readonly number[], p: number): number {
  if (sortedValues.length === 0) return 0;
  if (sortedValues.length === 1) return sortedValues[0] ?? 0;
  const rank = (p / 100) * (sortedValues.length - 1);
  const lowerIndex = Math.floor(rank);
  const upperIndex = Math.ceil(rank);
  const lowerValue = sortedValues[lowerIndex] ?? 0;
  const upperValue = sortedValues[upperIndex] ?? lowerValue;
  if (lowerIndex === upperIndex) return lowerValue;
  return lowerValue + (upperValue - lowerValue) * (rank - lowerIndex);
}

function medianAbsoluteDeviation(
  sortedValues: readonly number[],
  center: number,
): number {
  if (sortedValues.length === 0) return 0;
  // toSorted() is unavailable under this package's ES2022 target; .sort()
  // here operates on the array just produced by .map(), which is not shared
  // with any caller, so the in-place mutation is safe.
  const deviations = sortedValues
    .map((value) => Math.abs(value - center))
    .sort((a, b) => a - b);
  return percentile(deviations, 50);
}

function summarizeSamples(
  samples: readonly number[],
): Omit<HarnessBenchmarkStageSummary, "stage"> {
  // samples is caller-owned; copy before sorting so this function never
  // mutates data the caller still holds a reference to.
  const sorted = [...samples].sort((a, b) => a - b);
  const medianMs = percentile(sorted, 50);
  return {
    sampleCount: samples.length,
    discardedSampleCount: 0,
    medianMs,
    p90Ms: percentile(sorted, 90),
    p95Ms: percentile(sorted, 95),
    minMs: sorted[0] ?? 0,
    maxMs: sorted[sorted.length - 1] ?? 0,
    spreadMs: medianAbsoluteDeviation(sorted, medianMs),
    samples,
  };
}

function stageElapsed(
  sample: readonly HarnessBenchmarkStageRecord[],
  stage: HarnessBenchmarkStageId,
): number {
  const record = sample.find((item) => item.stage === stage);
  if (!record) throw new Error(`missing stage record for ${stage}`);
  return record.elapsedMs;
}

function buildEnvironment(): HarnessBenchmarkEnvironment {
  return {
    runtimeVersion: process.version,
    os: process.platform,
    arch: process.arch,
    // Known simplification: this first implementation always reports a cold
    // process. It does not yet track warm-process reuse across runs.
    cold: true,
  };
}

function baseResult(
  request: HarnessBenchmarkRequest,
  environment: HarnessBenchmarkEnvironment,
): Omit<
  HarnessBenchmarkResult,
  "status" | "stageSummaries" | "totalDurationSummary" | "diagnostics"
> {
  return {
    schemaVersion: 1,
    benchmarkVersion: BENCHMARK_VERSION,
    scenarioId: SCENARIO_ID,
    fixtureVersion: FIXTURE_VERSION,
    policyVersion: POLICY_VERSION,
    scorerVersion: SCORER_VERSION,
    executionProfile: request.executionProfile,
    environment,
    clockSource: CLOCK_SOURCE,
    warmupSampleCount: request.warmupSampleCount,
    measuredSampleCount: request.measuredSampleCount,
  };
}

/**
 * Runs the bounded local H9 performance benchmark. `matrix-observation`
 * returns `unsupported` immediately without executing any sample, per the
 * spec's CI boundary: it requires a separately reviewed CI workflow that does
 * not exist yet.
 */
export async function runHarnessBenchmark(
  request: HarnessBenchmarkRequest,
  deps: HarnessBenchmarkDeps = {},
): Promise<HarnessBenchmarkResult> {
  const clock = deps.clock ?? defaultClock;
  const environment = buildEnvironment();

  if (request.executionProfile === "matrix-observation") {
    return {
      ...baseResult(request, environment),
      status: "unsupported",
      stageSummaries: [],
      totalDurationSummary: summarizeSamples([]),
      diagnostics: [
        "matrix-observation requires a separately reviewed CI workflow that does not exist yet; see AGENTIC_HARNESS_PERFORMANCE_BENCHMARK_SPEC.md",
      ],
    };
  }

  for (let index = 0; index < request.warmupSampleCount; index += 1) {
    await measureH9EvidenceStages(clock);
  }

  const keptSamples: HarnessBenchmarkStageRecord[][] = [];
  for (let index = 0; index < request.measuredSampleCount; index += 1) {
    keptSamples.push(await measureH9EvidenceStages(clock));
  }

  const diagnostics: string[] = [];
  const failedStages = new Set<HarnessBenchmarkStageId>();
  for (const [sampleIndex, sample] of keptSamples.entries()) {
    for (const record of sample) {
      if (record.status === "failed") {
        failedStages.add(record.stage);
        diagnostics.push(`stage-failed:${record.stage}:sample-${sampleIndex}`);
      }
    }
  }

  const stageSummaries = STAGE_IDS.filter(
    (stage) => !failedStages.has(stage),
  ).map((stage) => ({
    stage,
    ...summarizeSamples(
      keptSamples.map((sample) => stageElapsed(sample, stage)),
    ),
  }));

  const totalDurationSummary = summarizeSamples(
    keptSamples.map((sample) =>
      sample.reduce((sum, record) => sum + record.elapsedMs, 0),
    ),
  );

  let status: HarnessBenchmarkStatus;
  if (request.measuredSampleCount === 0) {
    status = "inconclusive";
    diagnostics.push(
      "zero measured samples were requested; no observation was collected",
    );
  } else if (failedStages.size > 0) {
    status = "invalid";
  } else {
    status = "observed";
  }

  return {
    ...baseResult(request, environment),
    status,
    stageSummaries,
    totalDurationSummary,
    diagnostics,
  };
}
