import { describe, expect, it } from "vitest";
import { resolve } from "node:path";
import type { HarnessBenchmarkResult } from "@intentloom/protocol";
import { validateHarnessBenchmarkResult } from "@intentloom/validator";
import {
  measureH9EvidenceStages,
  runHarnessBenchmark,
} from "../packages/application/src/index.js";
import { runCli } from "../packages/cli/src/command.js";

const dependencies = { catalogRoot: resolve("catalog") };

const STAGE_IDS = [
  "adoption-gate-pass",
  "adoption-gate-fail",
  "replay",
  "resume-cross-project-reject",
  "purge",
  "rollback",
] as const;

describe("H9 performance benchmark runner", () => {
  it("produces an observed local-repeat result with six stage summaries", async () => {
    const result = await runHarnessBenchmark({
      schemaVersion: 1,
      executionProfile: "local-repeat",
      warmupSampleCount: 1,
      measuredSampleCount: 2,
    });

    expect(result.status).toBe("observed");
    expect(result.fixtureVersion).toBe("h9-evidence-drill@1");
    expect(result.scenarioId).toBe("scenario:h9-evidence-drill");
    expect(result.stageSummaries).toHaveLength(6);
    for (const summary of result.stageSummaries) {
      expect(STAGE_IDS).toContain(summary.stage);
      expect(summary.sampleCount).toBe(2);
      expect(summary.samples).toHaveLength(2);
      for (const sample of summary.samples) {
        expect(sample).toBeGreaterThanOrEqual(0);
      }
      expect(summary.medianMs).toBeGreaterThanOrEqual(0);
      expect(summary.minMs).toBeLessThanOrEqual(summary.maxMs);
    }
    expect(result.totalDurationSummary.sampleCount).toBe(2);
    expect(result.totalDurationSummary.medianMs).toBeGreaterThanOrEqual(0);
  });

  it("reaches observed status for the calibration profile as well", async () => {
    const result = await runHarnessBenchmark({
      schemaVersion: 1,
      executionProfile: "calibration",
      warmupSampleCount: 1,
      measuredSampleCount: 2,
    });

    expect(result.status).toBe("observed");
    expect(result.executionProfile).toBe("calibration");
    expect(result.stageSummaries).toHaveLength(6);
  });

  it("produces an observed matrix-observation result with six stage summaries", async () => {
    const result = await runHarnessBenchmark({
      schemaVersion: 1,
      executionProfile: "matrix-observation",
      warmupSampleCount: 1,
      measuredSampleCount: 2,
    });

    expect(result.status).toBe("observed");
    expect(result.executionProfile).toBe("matrix-observation");
    expect(result.stageSummaries).toHaveLength(6);
  });

  it("produces an identical evidenceDigest for a stage across two independent runs", async () => {
    const clock = (() => {
      let value = 0;
      return () => {
        value += 1;
        return value;
      };
    })();

    const first = await measureH9EvidenceStages(clock);
    const second = await measureH9EvidenceStages(clock);

    for (const stage of STAGE_IDS) {
      const firstRecord = first.find((record) => record.stage === stage);
      const secondRecord = second.find((record) => record.stage === stage);
      expect(firstRecord).toBeDefined();
      expect(secondRecord).toBeDefined();
      expect(firstRecord?.status).toBe("completed");
      expect(secondRecord?.status).toBe("completed");
      expect(firstRecord?.evidenceDigest).toBe(secondRecord?.evidenceDigest);
    }
  });

  it("returns inconclusive when zero measured samples are requested", async () => {
    const result = await runHarnessBenchmark({
      schemaVersion: 1,
      executionProfile: "local-repeat",
      warmupSampleCount: 0,
      measuredSampleCount: 0,
    });

    expect(result.status).toBe("inconclusive");
    expect(result.diagnostics.length).toBeGreaterThan(0);
    for (const summary of result.stageSummaries) {
      expect(summary.sampleCount).toBe(0);
    }
  });

  describe("CLI: intentloom harness benchmark", () => {
    it("returns exit code 0 with JSON matching the benchmark result shape", async () => {
      const output: string[] = [];

      const exitCode = await runCli(
        [
          "harness",
          "benchmark",
          "--profile",
          "local-repeat",
          "--warmup",
          "1",
          "--samples",
          "2",
          "--json",
        ],
        dependencies,
        { stdout: (message) => output.push(message), stderr: () => undefined },
      );

      expect(exitCode).toBe(0);
      const parsed = JSON.parse(output.join("\n")) as HarnessBenchmarkResult;
      expect(parsed.status).toBe("observed");
      expect(parsed.stageSummaries).toHaveLength(6);
      expect(() => validateHarnessBenchmarkResult(parsed)).not.toThrow();
    });

    it("runs --profile matrix-observation via CLI successfully", async () => {
      const output: string[] = [];

      const exitCode = await runCli(
        [
          "harness",
          "benchmark",
          "--profile",
          "matrix-observation",
          "--warmup",
          "1",
          "--samples",
          "2",
          "--json",
        ],
        dependencies,
        { stdout: (message) => output.push(message), stderr: () => undefined },
      );

      expect(exitCode).toBe(0);
      const parsed = JSON.parse(output.join("\n")) as HarnessBenchmarkResult;
      expect(parsed.status).toBe("observed");
      expect(parsed.executionProfile).toBe("matrix-observation");
      expect(parsed.stageSummaries).toHaveLength(6);
    });
  });
});

function validBenchmarkResult(): HarnessBenchmarkResult {
  const stageSummary = {
    sampleCount: 1,
    discardedSampleCount: 0,
    medianMs: 1,
    p90Ms: 1,
    p95Ms: 1,
    minMs: 1,
    maxMs: 1,
    spreadMs: 0,
    samples: [1],
  };
  return {
    schemaVersion: 1,
    benchmarkVersion: "1",
    scenarioId: "scenario:h9-evidence-drill",
    fixtureVersion: "h9-evidence-drill@1",
    policyVersion: "1",
    scorerVersion: "1",
    executionProfile: "local-repeat",
    status: "observed",
    environment: {
      runtimeVersion: "v22.0.0",
      os: "linux",
      arch: "x64",
      cold: true,
    },
    clockSource: "process.hrtime.bigint",
    warmupSampleCount: 1,
    measuredSampleCount: 1,
    stageSummaries: [{ stage: "replay", ...stageSummary }],
    totalDurationSummary: stageSummary,
    diagnostics: [],
  };
}

describe("validateHarnessBenchmarkResult", () => {
  it("round-trips a valid result", () => {
    const result = validBenchmarkResult();
    expect(validateHarnessBenchmarkResult(result)).toEqual(result);
  });

  it("throws on missing schemaVersion", () => {
    const result = validBenchmarkResult() as unknown as Record<string, unknown>;
    delete result.schemaVersion;
    expect(() => validateHarnessBenchmarkResult(result)).toThrow(
      "schemaVersion",
    );
  });

  it("throws on invalid status", () => {
    const result = { ...validBenchmarkResult(), status: "bogus" };
    expect(() => validateHarnessBenchmarkResult(result)).toThrow(
      "invalid benchmark status",
    );
  });

  it("throws on malformed environment", () => {
    const result = { ...validBenchmarkResult(), environment: { os: "linux" } };
    expect(() => validateHarnessBenchmarkResult(result)).toThrow(
      "runtimeVersion must be a non-empty string",
    );
  });

  it("throws on non-array stageSummaries", () => {
    const result = { ...validBenchmarkResult(), stageSummaries: "nope" };
    expect(() => validateHarnessBenchmarkResult(result)).toThrow(
      "stageSummaries must be an array",
    );
  });
});
