import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { runCli } from "../packages/cli/src/command.js";

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
});
