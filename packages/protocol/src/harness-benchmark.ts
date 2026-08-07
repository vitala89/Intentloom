/**
 * Types for the bounded H9 performance benchmark runner. See
 * docs/specs/AGENTIC_HARNESS_PERFORMANCE_BENCHMARK_SPEC.md for the normative
 * contract these types encode. This file defines types only; no logic.
 */

export type HarnessBenchmarkExecutionProfile =
  "calibration" | "local-repeat" | "matrix-observation";

export type HarnessBenchmarkStatus =
  "observed" | "inconclusive" | "invalid" | "unsupported";

export type HarnessBenchmarkStageId =
  | "adoption-gate-pass"
  | "adoption-gate-fail"
  | "replay"
  | "resume-cross-project-reject"
  | "purge"
  | "rollback";

export interface HarnessBenchmarkStageRecord {
  readonly stage: HarnessBenchmarkStageId;
  readonly status: "completed" | "failed";
  readonly elapsedMs: number;
  readonly evidenceDigest: string;
}

export interface HarnessBenchmarkEnvironment {
  readonly runtimeVersion: string;
  readonly os: string;
  readonly arch: string;
  readonly repositoryCommit?: string;
  readonly cold: boolean;
}

export interface HarnessBenchmarkStageSummary {
  readonly stage: HarnessBenchmarkStageId;
  readonly sampleCount: number;
  readonly discardedSampleCount: number;
  readonly medianMs: number;
  readonly p90Ms: number;
  readonly p95Ms: number;
  readonly minMs: number;
  readonly maxMs: number;
  // The spec allows a robust spread measure such as MAD or IQR and leaves the
  // choice open. This implementation picks median absolute deviation (MAD) as
  // the initial default because it is simpler to compute and explain than an
  // interpolated IQR, pending a real variance report.
  readonly spreadMs: number;
  readonly samples: readonly number[];
}

export interface HarnessBenchmarkRequest {
  readonly schemaVersion: 1;
  readonly executionProfile: HarnessBenchmarkExecutionProfile;
  readonly warmupSampleCount: number;
  readonly measuredSampleCount: number;
}

export interface HarnessBenchmarkResult {
  readonly schemaVersion: 1;
  readonly benchmarkVersion: string;
  readonly scenarioId: string;
  readonly fixtureVersion: string;
  readonly policyVersion: string;
  readonly scorerVersion: string;
  readonly executionProfile: HarnessBenchmarkExecutionProfile;
  readonly status: HarnessBenchmarkStatus;
  readonly environment: HarnessBenchmarkEnvironment;
  readonly clockSource: string;
  readonly warmupSampleCount: number;
  readonly measuredSampleCount: number;
  readonly stageSummaries: readonly HarnessBenchmarkStageSummary[];
  readonly totalDurationSummary: Omit<HarnessBenchmarkStageSummary, "stage">;
  readonly comparableBaselineId?: string;
  readonly nonComparableReason?: string;
  readonly diagnostics: readonly string[];
}
