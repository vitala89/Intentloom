import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { createMemoryFileSystem } from "../packages/application/src/index.js";
import { runCli } from "../packages/cli/src/command.js";
import { runCliEntry } from "../packages/cli/src/cli-entry.js";
import { formatEngineeringConformanceHuman } from "../packages/cli/src/formatters.js";
import { evaluateEngineeringConformance } from "../packages/evidence-analysis/src/index.js";

describe("engineering conformance CLI", () => {
  it("evaluates a timeline against a policy file with human output", async () => {
    const root = await mkdtemp(join(tmpdir(), "intentloom-conformance-cli-"));
    try {
      const policyPath = join(root, "policy.json");
      const timelinePath = join(root, "timeline.json");

      await writeFile(
        policyPath,
        JSON.stringify({
          schemaVersion: "1",
          policyId: "policy:test",
          description: "Test Policy",
          rules: [
            {
              ruleId: "rule:code-review",
              caseType: "pull-request",
              severity: "error",
              title: "Code Review Required",
              condition: {
                type: "required-activity",
                activity: "code-review",
              },
            },
          ],
        }),
      );

      await writeFile(
        timelinePath,
        JSON.stringify({
          caseType: "pull-request",
          caseId: "pr-100",
          events: [
            {
              activity: "code-review",
              source: "github",
              sourceId: "review-1",
              timestamp: "2026-07-24T00:00:00Z",
            },
          ],
        }),
      );

      const output: string[] = [];
      const exitCode = await runCli(
        [
          "conformance",
          "--root",
          root,
          "--policy",
          "policy.json",
          "--timeline",
          "timeline.json",
        ],
        { catalogRoot: resolve("catalog") },
        {
          stdout: (msg) => output.push(msg),
          stderr: (msg) => output.push(msg),
        },
      );

      expect(exitCode).toBe(0);
      const text = output.join("\n");
      expect(text).toContain("Intentloom Engineering Conformance Report");
      expect(text).toContain("policy:test");
      expect(text).toContain("[PASS] Code Review Required");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  }, 15000);

  it("returns exit code 3 and outputs JSON when violations occur", async () => {
    const root = await mkdtemp(join(tmpdir(), "intentloom-conformance-cli-"));
    try {
      const policyPath = join(root, "policy.json");
      const timelinePath = join(root, "timeline.json");

      await writeFile(
        policyPath,
        JSON.stringify({
          schemaVersion: "1",
          policyId: "policy:test-violation",
          description: "Test Policy Violation",
          rules: [
            {
              ruleId: "rule:no-direct-push",
              caseType: "pull-request",
              severity: "error",
              title: "No Direct Push to Main",
              condition: {
                type: "forbidden-activity",
                activity: "direct-push",
              },
            },
          ],
        }),
      );

      await writeFile(
        timelinePath,
        JSON.stringify({
          caseType: "pull-request",
          caseId: "pr-101",
          events: [
            {
              activity: "direct-push",
              source: "git",
              sourceId: "commit-xyz",
            },
          ],
        }),
      );

      const output: string[] = [];
      const exitCode = await runCli(
        [
          "conformance",
          "--root",
          root,
          "--policy",
          "policy.json",
          "--timeline",
          "timeline.json",
          "--json",
        ],
        { catalogRoot: resolve("catalog") },
        {
          stdout: (msg) => output.push(msg),
          stderr: (msg) => output.push(msg),
        },
      );

      expect(exitCode).toBe(3);
      const json = JSON.parse(output.join("\n"));
      expect(json.policyId).toBe("policy:test-violation");
      expect(json.summary.violations).toBe(1);
      expect(json.findings[0].status).toBe("violation");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  }, 15000);

  it("locks human formatter output for a passing report", () => {
    const report = evaluateEngineeringConformance(
      {
        caseType: "pull-request",
        caseId: "pr-100",
        events: [
          {
            activity: "code-review",
            source: "github",
            sourceId: "review-1",
            timestamp: "2026-07-24T00:00:00Z",
          },
        ],
      },
      {
        schemaVersion: "1",
        policyId: "policy:test",
        description: "Test Policy",
        rules: [
          {
            ruleId: "rule:code-review",
            caseType: "pull-request",
            severity: "error",
            title: "Code Review Required",
            condition: {
              type: "required-activity",
              activity: "code-review",
            },
          },
        ],
      },
    );

    expect(formatEngineeringConformanceHuman(report)).toContain(
      "Intentloom Engineering Conformance Report",
    );
    expect(formatEngineeringConformanceHuman(report)).toContain(
      "[PASS] Code Review Required",
    );
    expect(formatEngineeringConformanceHuman(report)).toContain("policy:test");
  });

  it("accepts a positional project path without --root", async () => {
    const root = await mkdtemp(join(tmpdir(), "intentloom-conformance-pos-"));
    try {
      await writeFile(
        join(root, "policy.json"),
        JSON.stringify({
          schemaVersion: "1",
          policyId: "policy:positional",
          description: "Positional Policy",
          rules: [
            {
              ruleId: "rule:code-review",
              caseType: "pull-request",
              severity: "error",
              title: "Code Review Required",
              condition: {
                type: "required-activity",
                activity: "code-review",
              },
            },
          ],
        }),
      );
      await writeFile(
        join(root, "timeline.json"),
        JSON.stringify({
          caseType: "pull-request",
          caseId: "pr-pos",
          events: [
            {
              activity: "code-review",
              source: "github",
              sourceId: "review-1",
              timestamp: "2026-07-24T00:00:00Z",
            },
          ],
        }),
      );
      const output: string[] = [];

      const exitCode = await runCli(
        [
          "conformance",
          root,
          "--policy",
          "policy.json",
          "--timeline",
          "timeline.json",
        ],
        { catalogRoot: resolve("catalog") },
        { stdout: (msg) => output.push(msg), stderr: () => undefined },
      );

      expect(exitCode).toBe(0);
      expect(output.join("\n")).toContain("policy:positional");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  }, 15000);

  it("rejects unknown options with usage exit code", async () => {
    const errors: string[] = [];

    const exitCode = await runCli(
      ["conformance", "--task", "example"],
      { catalogRoot: resolve("catalog") },
      {
        stdout: () => undefined,
        stderr: (message) => errors.push(message),
      },
    );

    expect(exitCode).toBe(2);
    expect(errors.join("\n")).toContain("unknown option: --task");
  });

  it("dispatches conformance through runCliEntry", async () => {
    const fs = createMemoryFileSystem({
      "/project/policy.json": JSON.stringify({
        schemaVersion: "1",
        policyId: "policy:entry",
        description: "Entry Policy",
        rules: [
          {
            ruleId: "rule:code-review",
            caseType: "pull-request",
            severity: "error",
            title: "Code Review Required",
            condition: {
              type: "required-activity",
              activity: "code-review",
            },
          },
        ],
      }),
      "/project/timeline.json": JSON.stringify({
        caseType: "pull-request",
        caseId: "pr-entry",
        events: [
          {
            activity: "code-review",
            source: "github",
            sourceId: "review-1",
            timestamp: "2026-07-24T00:00:00Z",
          },
        ],
      }),
    });
    const output: string[] = [];

    const exitCode = await runCliEntry(
      [
        "conformance",
        "--root",
        "/project",
        "--policy",
        "policy.json",
        "--timeline",
        "timeline.json",
        "--json",
      ],
      { catalogRoot: resolve("catalog"), fileSystem: fs },
      { stdout: (message) => output.push(message), stderr: () => undefined },
    );

    expect(exitCode).toBe(0);
    expect(JSON.parse(output.join("\n"))).toMatchObject({
      policyId: "policy:entry",
    });
  });

  it("remains read-only when evaluating from memory files", async () => {
    const fs = createMemoryFileSystem({
      "/project/policy.json": JSON.stringify({
        schemaVersion: "1",
        policyId: "policy:readonly",
        description: "Readonly Policy",
        rules: [
          {
            ruleId: "rule:code-review",
            caseType: "pull-request",
            severity: "error",
            title: "Code Review Required",
            condition: {
              type: "required-activity",
              activity: "code-review",
            },
          },
        ],
      }),
      "/project/timeline.json": JSON.stringify({
        caseType: "pull-request",
        caseId: "pr-readonly",
        events: [
          {
            activity: "code-review",
            source: "github",
            sourceId: "review-1",
            timestamp: "2026-07-24T00:00:00Z",
          },
        ],
      }),
    });
    const before = [...fs.files.entries()];
    const output: string[] = [];

    const exitCode = await runCli(
      [
        "conformance",
        "--root",
        "/project",
        "--policy",
        "policy.json",
        "--timeline",
        "timeline.json",
        "--json",
      ],
      { catalogRoot: resolve("catalog"), fileSystem: fs },
      { stdout: (message) => output.push(message), stderr: () => undefined },
    );

    expect(exitCode).toBe(0);
    expect([...fs.files.entries()]).toEqual(before);
    expect(JSON.parse(output.join("\n"))).toMatchObject({
      policyId: "policy:readonly",
    });
  });
});
