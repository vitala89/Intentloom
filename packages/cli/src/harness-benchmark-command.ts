import { resolveWithin } from "@intentloom/core";
import { runHarnessBenchmark, type FileSystem } from "@intentloom/application";
import type {
  HarnessBenchmarkExecutionProfile,
  HarnessBenchmarkResult,
} from "@intentloom/protocol";
import type { HarnessCliExitCode, HarnessCliIo } from "./harness-command.js";

export interface HarnessBenchmarkCliOptions {
  readonly fileSystem: FileSystem;
}

export interface HarnessBenchmarkCliArguments {
  readonly root: string;
  readonly json: boolean;
  readonly profile: HarnessBenchmarkExecutionProfile;
  readonly warmupSampleCount: number;
  readonly measuredSampleCount: number;
  readonly output?: string;
}

export function parseNonNegativeInteger(value: string, flag: string): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0)
    throw new Error(`${flag} must be a non-negative integer`);
  return parsed;
}

export function parseBenchmarkProfile(
  value: string,
): HarnessBenchmarkExecutionProfile {
  if (
    value !== "calibration" &&
    value !== "local-repeat" &&
    value !== "matrix-observation"
  )
    throw new Error(
      "harness benchmark --profile must be calibration, local-repeat, or matrix-observation",
    );
  return value;
}

function formatBenchmark(result: HarnessBenchmarkResult): string {
  const stageLines = result.stageSummaries.map(
    (summary) =>
      `  ${summary.stage}: median=${summary.medianMs.toFixed(2)}ms p90=${summary.p90Ms.toFixed(2)}ms min=${summary.minMs.toFixed(2)}ms max=${summary.maxMs.toFixed(2)}ms`,
  );
  return [
    "Intentloom harness benchmark",
    `Status: ${result.status}`,
    `Profile: ${result.executionProfile}`,
    `Fixture: ${result.fixtureVersion}`,
    `Warmup samples: ${result.warmupSampleCount}`,
    `Measured samples: ${result.measuredSampleCount}`,
    "Stages:",
    ...(stageLines.length > 0 ? stageLines : ["  (none)"]),
    `Total duration median: ${result.totalDurationSummary.medianMs.toFixed(2)}ms`,
    `Diagnostics: ${result.diagnostics.join("; ") || "none"}`,
  ].join("\n");
}

export async function runHarnessBenchmarkCommand(
  parsed: HarnessBenchmarkCliArguments,
  options: HarnessBenchmarkCliOptions,
  io: HarnessCliIo,
): Promise<HarnessCliExitCode> {
  const result = await runHarnessBenchmark({
    schemaVersion: 1,
    executionProfile: parsed.profile,
    warmupSampleCount: parsed.warmupSampleCount,
    measuredSampleCount: parsed.measuredSampleCount,
  });

  if (parsed.output !== undefined) {
    const outputPath = resolveWithin(parsed.root, parsed.output);
    await options.fileSystem.write(outputPath, JSON.stringify(result, null, 2));
  }

  io.stdout(
    parsed.json ? JSON.stringify(result, null, 2) : formatBenchmark(result),
  );
  return result.status === "invalid" ? 2 : 0;
}
