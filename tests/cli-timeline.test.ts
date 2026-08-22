import { mkdir, mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { runCli } from "../packages/cli/src/command.js";
import { runCliEntry } from "../packages/cli/src/cli-entry.js";
import { formatTimeline } from "../packages/cli/src/formatters.js";
import { createReleaseTimeline } from "../packages/evidence-git/src/index.js";

describe("timeline CLI", () => {
  it("renders a deterministic local release timeline as JSON", async () => {
    const output: string[] = [];
    const exitCode = await runCli(
      [
        "timeline",
        "--root",
        resolve("."),
        "--case-id",
        "intentloom-main",
        "--json",
      ],
      { catalogRoot: resolve("catalog") },
      { stdout: (message) => output.push(message), stderr: () => undefined },
    );

    expect(exitCode).toBe(0);
    expect(JSON.parse(output.join("\n"))).toMatchObject({
      operationVersion: 1,
      caseType: "release",
      caseId: "intentloom-main",
      quality: expect.stringMatching(/^(?:complete|bounded)$/u),
    });
  });

  it("renders human output through the shared formatter", async () => {
    const output: string[] = [];
    const exitCode = await runCli(
      ["timeline", "--root", resolve("."), "--case-id", "human-case"],
      { catalogRoot: resolve("catalog") },
      { stdout: (message) => output.push(message), stderr: () => undefined },
    );

    expect(exitCode).toBeGreaterThanOrEqual(0);
    expect(exitCode).toBeLessThanOrEqual(3);
    expect(output.join("\n")).toContain("Case: human-case");
    expect(output.join("\n")).toContain("Quality:");
    expect(output.join("\n")).toContain("Events:");
  });

  it("locks human formatter output for a bounded timeline", () => {
    const timeline = createReleaseTimeline("release:test", {
      operationVersion: 1,
      source: "git-local",
      trust: "local-unverified",
      status: "limit-reached",
      commits: [
        {
          id: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
          timestamp: 1_700_000_000,
          parents: [],
          changedPaths: ["README.md"],
        },
      ],
      diagnostics: [],
    });

    expect(formatTimeline(timeline)).toBe(
      [
        "Case: release:test",
        "Quality: bounded",
        "Events: 1",
        "2023-11-14T22:13:20.000Z aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa README.md",
        "Findings: evidence-bounded",
      ].join("\n"),
    );
  });

  it("accepts a positional project path without --root", async () => {
    const output: string[] = [];
    const exitCode = await runCli(
      ["timeline", resolve("."), "--case-id", "positional-case", "--json"],
      { catalogRoot: resolve("catalog") },
      { stdout: (message) => output.push(message), stderr: () => undefined },
    );

    expect(exitCode).toBeGreaterThanOrEqual(0);
    expect(exitCode).toBeLessThanOrEqual(3);
    expect(JSON.parse(output.join("\n"))).toMatchObject({
      caseId: "positional-case",
      caseType: "release",
    });
  });

  it("defaults case id to release when --case-id is omitted", async () => {
    const output: string[] = [];
    const exitCode = await runCli(
      ["timeline", "--root", resolve("."), "--json"],
      { catalogRoot: resolve("catalog") },
      { stdout: (message) => output.push(message), stderr: () => undefined },
    );

    expect(exitCode).toBeGreaterThanOrEqual(0);
    expect(exitCode).toBeLessThanOrEqual(3);
    expect(JSON.parse(output.join("\n"))).toMatchObject({
      caseId: "release",
    });
  });

  it("returns exit code 3 when git evidence is unavailable", async () => {
    const root = await mkdtemp(join(tmpdir(), "intentloom-timeline-empty-"));
    await mkdir(root, { recursive: true });
    const output: string[] = [];

    const exitCode = await runCli(
      ["timeline", "--root", root, "--json"],
      { catalogRoot: resolve("catalog") },
      { stdout: (message) => output.push(message), stderr: () => undefined },
    );

    expect(exitCode).toBe(3);
    expect(JSON.parse(output.join("\n"))).toMatchObject({
      quality: "unavailable",
      findings: ["evidence-unavailable"],
    });
  });

  it("rejects unknown options with usage exit code", async () => {
    const errors: string[] = [];

    const exitCode = await runCli(
      ["timeline", "--task", "example"],
      { catalogRoot: resolve("catalog") },
      {
        stdout: () => undefined,
        stderr: (message) => errors.push(message),
      },
    );

    expect(exitCode).toBe(2);
    expect(errors.join("\n")).toContain("unknown option: --task");
  });

  it("dispatches timeline through runCliEntry", async () => {
    const output: string[] = [];
    const exitCode = await runCliEntry(
      ["timeline", "--root", resolve("."), "--case-id", "entry-case", "--json"],
      { catalogRoot: resolve("catalog") },
      { stdout: (message) => output.push(message), stderr: () => undefined },
    );

    expect(exitCode).toBeGreaterThanOrEqual(0);
    expect(exitCode).toBeLessThanOrEqual(3);
    expect(JSON.parse(output.join("\n"))).toMatchObject({
      caseId: "entry-case",
      caseType: "release",
    });
  });

  it("remains read-only for a non-git project root", async () => {
    const root = await mkdtemp(join(tmpdir(), "intentloom-timeline-readonly-"));
    await mkdir(root, { recursive: true });
    const output: string[] = [];

    const exitCode = await runCli(
      ["timeline", "--root", root, "--json"],
      { catalogRoot: resolve("catalog") },
      { stdout: (message) => output.push(message), stderr: () => undefined },
    );

    expect(exitCode).toBe(3);
    expect(JSON.parse(output.join("\n"))).toMatchObject({
      events: [],
      quality: "unavailable",
    });
  });
});
