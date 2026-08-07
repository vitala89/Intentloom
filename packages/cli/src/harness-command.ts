import { cwd } from "node:process";
import { resolveWithin } from "@intentloom/core";
import {
  inspectHarnessScorecard,
  replayHarnessScorecard,
  type FileSystem,
} from "@intentloom/application";
import type {
  HarnessBenchmarkExecutionProfile,
  HarnessInspectionView,
  HarnessReplayView,
  HarnessScorecard,
} from "@intentloom/protocol";
import {
  parseBenchmarkProfile,
  parseNonNegativeInteger,
  runHarnessBenchmarkCommand,
} from "./harness-benchmark-command.js";

export type HarnessCliExitCode = 0 | 2 | 3;

export interface HarnessCliIo {
  readonly stdout: (message: string) => void;
  readonly stderr: (message: string) => void;
}

export interface HarnessCliOptions {
  readonly fileSystem: FileSystem;
}

interface HarnessArguments {
  readonly subcommand: "inspect" | "replay" | "benchmark";
  readonly root: string;
  readonly file: string;
  readonly mode: "simulate" | "strict";
  readonly json: boolean;
  readonly profile: HarnessBenchmarkExecutionProfile;
  readonly warmupSampleCount: number;
  readonly measuredSampleCount: number;
  readonly output?: string;
}

const usage =
  "Usage: intentloom harness <inspect|replay> --file SCORECARD.json [--root PATH] [--mode simulate|strict] [--json]\n" +
  "       intentloom harness benchmark --profile calibration|local-repeat [--warmup N] [--samples N] [--output PATH] [--root PATH] [--json]";

function parseHarnessArguments(args: readonly string[]): HarnessArguments {
  const subcommand = args[1];
  if (
    subcommand !== "inspect" &&
    subcommand !== "replay" &&
    subcommand !== "benchmark"
  )
    throw new Error(usage);

  let root = cwd();
  let file: string | undefined;
  let mode: "simulate" | "strict" = "simulate";
  let json = false;
  let profile: HarnessBenchmarkExecutionProfile | undefined;
  let warmupSampleCount = 3;
  let measuredSampleCount = 10;
  let output: string | undefined;
  let rootProvided = false;
  let modeProvided = false;
  let profileProvided = false;
  let warmupProvided = false;
  let samplesProvided = false;
  for (let index = 2; index < args.length; index += 1) {
    const token = args[index];
    if (token === "--json") {
      if (json) throw new Error("harness --json specified more than once");
      json = true;
      continue;
    }
    if (
      token !== "--root" &&
      token !== "--file" &&
      token !== "--mode" &&
      token !== "--profile" &&
      token !== "--warmup" &&
      token !== "--samples" &&
      token !== "--output"
    )
      throw new Error(`unknown harness option: ${token}`);
    const value = args[index + 1];
    if (value === undefined || value.startsWith("--"))
      throw new Error(`missing value for ${token}`);
    if (token === "--root") {
      if (rootProvided)
        throw new Error("harness --root specified more than once");
      rootProvided = true;
      root = value;
    } else if (token === "--file") {
      if (subcommand === "benchmark")
        throw new Error("harness benchmark does not support --file");
      if (file !== undefined)
        throw new Error("harness --file specified more than once");
      file = value;
    } else if (token === "--mode") {
      if (subcommand !== "replay")
        throw new Error("harness --mode is only supported by replay");
      if (modeProvided)
        throw new Error("harness --mode specified more than once");
      if (value !== "simulate" && value !== "strict")
        throw new Error("harness replay --mode must be simulate or strict");
      modeProvided = true;
      mode = value;
    } else if (token === "--profile") {
      if (subcommand !== "benchmark")
        throw new Error("harness --profile is only supported by benchmark");
      if (profileProvided)
        throw new Error("harness --profile specified more than once");
      profileProvided = true;
      profile = parseBenchmarkProfile(value);
    } else if (token === "--warmup") {
      if (subcommand !== "benchmark")
        throw new Error("harness --warmup is only supported by benchmark");
      if (warmupProvided)
        throw new Error("harness --warmup specified more than once");
      warmupProvided = true;
      warmupSampleCount = parseNonNegativeInteger(value, "harness --warmup");
    } else if (token === "--samples") {
      if (subcommand !== "benchmark")
        throw new Error("harness --samples is only supported by benchmark");
      if (samplesProvided)
        throw new Error("harness --samples specified more than once");
      samplesProvided = true;
      measuredSampleCount = parseNonNegativeInteger(value, "harness --samples");
    } else {
      if (subcommand !== "benchmark")
        throw new Error("harness --output is only supported by benchmark");
      if (output !== undefined)
        throw new Error("harness --output specified more than once");
      output = value;
    }
    index += 1;
  }
  if (subcommand === "benchmark") {
    if (!profile)
      throw new Error(
        "harness benchmark requires --profile calibration|local-repeat",
      );
    return {
      subcommand,
      root,
      file: "",
      mode,
      json,
      profile,
      warmupSampleCount,
      measuredSampleCount,
      ...(output !== undefined ? { output } : {}),
    };
  }
  if (!file) throw new Error(`${subcommand} requires --file SCORECARD.json`);
  return {
    subcommand,
    root,
    file,
    mode,
    json,
    profile: "local-repeat",
    warmupSampleCount,
    measuredSampleCount,
  };
}

function invalidScorecard(
  error: unknown,
  json: boolean,
  io: HarnessCliIo,
): HarnessCliExitCode {
  const message = error instanceof Error ? error.message : "invalid scorecard";
  if (json) {
    io.stdout(
      JSON.stringify(
        { status: "invalid", errorCode: "harness-scorecard-invalid", message },
        null,
        2,
      ),
    );
  } else {
    io.stderr(`Intentloom harness scorecard validation failed: ${message}`);
  }
  return 3;
}

function formatInspection(view: HarnessInspectionView): string {
  return [
    "Intentloom harness inspection",
    `Scenario: ${view.scenarioId}`,
    `Request: ${view.requestId}`,
    `Status: ${view.status}`,
    `Score: ${view.overallScore}/100`,
    `Assertions: ${view.passedAssertions}/${view.totalAssertions}`,
    `Duration: ${view.durationMs}ms`,
    `Diagnostics: ${view.diagnosticCount}`,
    `Events: ${view.eventCount}`,
    `Artifacts: ${view.artifactCount}`,
    `Replay: ${view.replayAvailable ? "available" : "unavailable"}`,
    "Read-only: true",
  ].join("\n");
}

function formatReplay(view: HarnessReplayView): string {
  return [
    `Intentloom harness replay (${view.mode})`,
    `Scenario: ${view.scenarioId}`,
    `Request: ${view.requestId}`,
    `Events: ${view.totalEvents}`,
    `Steps: ${view.stepCount}`,
    `Failed steps: ${view.failedSteps.join(", ") || "none"}`,
    `Deterministic: ${view.isDeterministic ? "true" : "false"}`,
    "Read-only: true",
  ].join("\n");
}

export async function runHarnessCommand(
  args: readonly string[],
  options: HarnessCliOptions,
  io: HarnessCliIo,
): Promise<HarnessCliExitCode> {
  const parsed = parseHarnessArguments(args);
  if (parsed.subcommand === "benchmark")
    return runHarnessBenchmarkCommand(
      {
        root: parsed.root,
        json: parsed.json,
        profile: parsed.profile,
        warmupSampleCount: parsed.warmupSampleCount,
        measuredSampleCount: parsed.measuredSampleCount,
        ...(parsed.output !== undefined ? { output: parsed.output } : {}),
      },
      options,
      io,
    );

  const scorecardPath = resolveWithin(parsed.root, parsed.file);
  let scorecard: HarnessScorecard;
  try {
    scorecard = JSON.parse(
      await options.fileSystem.read(scorecardPath),
    ) as HarnessScorecard;
  } catch (error) {
    return invalidScorecard(error, parsed.json, io);
  }

  try {
    if (parsed.subcommand === "inspect") {
      const view = inspectHarnessScorecard(scorecard);
      io.stdout(
        parsed.json ? JSON.stringify(view, null, 2) : formatInspection(view),
      );
    } else {
      const view = replayHarnessScorecard(scorecard, parsed.mode);
      io.stdout(
        parsed.json ? JSON.stringify(view, null, 2) : formatReplay(view),
      );
    }
    return 0;
  } catch (error) {
    return invalidScorecard(error, parsed.json, io);
  }
}
