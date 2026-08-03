import { describe, expect, it } from "vitest";
import { resolve } from "node:path";
import type { HarnessScorecard } from "@intentloom/protocol";
import {
  createMemoryFileSystem,
  type FileSystem,
} from "../packages/application/src/index.js";
import { runCli } from "../packages/cli/src/command.js";

const scorecard: HarnessScorecard = {
  schemaVersion: 1,
  scorecardId: "scorecard-cli",
  scenarioId: "scenario-cli",
  requestId: "request-cli",
  status: "failed",
  overallScore: 50,
  passedAssertions: 1,
  totalAssertions: 2,
  durationMs: 12,
  diagnostics: ["step-execution-error"],
  events: [
    {
      eventId: "event-1",
      timestamp: 1,
      type: "step-start",
      stepId: "step-1",
      message: "Start step",
      payload: { secret: "must-not-leak" },
    },
  ],
  artifacts: [],
};

function cliFileSystem(): FileSystem {
  return createMemoryFileSystem({
    "/project/scorecard.json": JSON.stringify(scorecard),
  });
}

describe("harness CLI", () => {
  it("inspects a scorecard through the canonical read-only view", async () => {
    const fileSystem = cliFileSystem();
    const before = [...fileSystem.files.entries()];
    const output: string[] = [];

    const exitCode = await runCli(
      [
        "harness",
        "inspect",
        "--root",
        "/project",
        "--file",
        "scorecard.json",
        "--json",
      ],
      { catalogRoot: resolve("catalog"), fileSystem },
      { stdout: (message) => output.push(message), stderr: () => undefined },
    );

    expect(exitCode).toBe(0);
    expect(JSON.parse(output.join("\n"))).toEqual({
      schemaVersion: 1,
      viewType: "inspect",
      scenarioId: "scenario-cli",
      requestId: "request-cli",
      status: "failed",
      overallScore: 50,
      passedAssertions: 1,
      totalAssertions: 2,
      durationMs: 12,
      diagnosticCount: 1,
      eventCount: 1,
      artifactCount: 0,
      replayAvailable: true,
      readOnly: true,
    });
    expect(output.join("\n")).not.toContain("must-not-leak");
    expect([...fileSystem.files.entries()]).toEqual(before);
  });

  it("replays a scorecard in strict mode without repeating effects", async () => {
    const fileSystem = cliFileSystem();
    const output: string[] = [];

    const exitCode = await runCli(
      [
        "harness",
        "replay",
        "--root",
        "/project",
        "--file",
        "scorecard.json",
        "--mode",
        "strict",
        "--json",
      ],
      { catalogRoot: resolve("catalog"), fileSystem },
      { stdout: (message) => output.push(message), stderr: () => undefined },
    );

    expect(exitCode).toBe(0);
    expect(JSON.parse(output.join("\n"))).toEqual({
      schemaVersion: 1,
      viewType: "replay",
      scenarioId: "scenario-cli",
      requestId: "request-cli",
      mode: "strict",
      totalEvents: 1,
      stepCount: 1,
      failedSteps: [],
      isDeterministic: true,
      readOnly: true,
    });
  });

  it("renders the same inspect view in human output", async () => {
    const output: string[] = [];

    const exitCode = await runCli(
      ["harness", "inspect", "--root", "/project", "--file", "scorecard.json"],
      { catalogRoot: resolve("catalog"), fileSystem: cliFileSystem() },
      { stdout: (message) => output.push(message), stderr: () => undefined },
    );

    expect(exitCode).toBe(0);
    expect(output.join("\n")).toContain("Intentloom harness inspection");
    expect(output.join("\n")).toContain("Score: 50/100");
    expect(output.join("\n")).toContain("Read-only: true");
    expect(output.join("\n")).not.toContain("must-not-leak");
  });

  it("returns a structured validation error for malformed scorecards", async () => {
    const fileSystem = createMemoryFileSystem({
      "/project/scorecard.json": JSON.stringify({
        ...scorecard,
        overallScore: 101,
      }),
    });
    const output: string[] = [];
    const errors: string[] = [];

    const exitCode = await runCli(
      [
        "harness",
        "inspect",
        "--root",
        "/project",
        "--file",
        "scorecard.json",
        "--json",
      ],
      { catalogRoot: resolve("catalog"), fileSystem },
      {
        stdout: (message) => output.push(message),
        stderr: (message) => errors.push(message),
      },
    );

    expect(exitCode).toBe(3);
    expect(JSON.parse(output.join("\n"))).toMatchObject({
      status: "invalid",
      errorCode: "harness-scorecard-invalid",
    });
    expect(errors).toEqual([]);
  });

  it("rejects scorecard paths outside the supplied root", async () => {
    const errors: string[] = [];

    const exitCode = await runCli(
      [
        "harness",
        "inspect",
        "--root",
        "/project",
        "--file",
        "../scorecard.json",
      ],
      { catalogRoot: resolve("catalog"), fileSystem: cliFileSystem() },
      { stdout: () => undefined, stderr: (message) => errors.push(message) },
    );

    expect(exitCode).toBe(2);
    expect(errors.join("\n")).toContain("path escapes the supplied root");
  });
});
