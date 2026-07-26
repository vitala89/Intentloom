import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  createMemoryFileSystem,
  runContinuousSecurityAudit,
  getSecurityAuditReport,
} from "@intentloom/application";
import { runCli } from "../packages/cli/src/command.js";
import { validateContinuousSecurityAuditReport } from "@intentloom/protocol";

describe("Memory & Security Candidate S5", () => {
  it("validates protocol schemas for continuous security audit reports", () => {
    const report = validateContinuousSecurityAuditReport({
      schemaVersion: "1",
      projectId: "proj-audit",
      healthScore: 100,
      invariantChecks: [
        {
          invariantId: 1,
          title: "No implicit network request or telemetry",
          status: "passed",
          details: "Network access disabled by default",
        },
      ],
      auditHash:
        "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
      auditedAt: new Date().toISOString(),
    });

    expect(report.projectId).toBe("proj-audit");
    expect(report.healthScore).toBe(100);
    expect(report.invariantChecks[0]?.status).toBe("passed");
  });

  it("runs continuous security audit verifying invariants 1-28 and computes health score", async () => {
    const fs = createMemoryFileSystem();
    const root = "/project";

    const report = await runContinuousSecurityAudit(
      { root, projectId: "p1" },
      fs,
    );
    expect(report.invariantChecks.length).toBe(28);
    expect(report.healthScore).toBeGreaterThanOrEqual(90);
    expect(report.auditHash).toHaveLength(64);

    const reloaded = await getSecurityAuditReport({ root }, fs);
    expect(reloaded?.auditHash).toBe(report.auditHash);
    expect(reloaded?.healthScore).toBe(report.healthScore);
  });

  it("routes audit and verify subcommands through CLI", async () => {
    const fs = createMemoryFileSystem();
    const root = "/project";
    const dependencies = { catalogRoot: resolve("catalog"), fileSystem: fs };

    let output = "";
    const stdout = (msg: string) => {
      output += `${msg}\n`;
    };

    const auditExit = await runCli(
      ["security", "audit", "--root", root, "--json"],
      dependencies,
      { stdout, stderr: () => undefined },
    );
    expect(auditExit).toBe(0);
    const parsedAudit = JSON.parse(output);
    expect(parsedAudit.healthScore).toBeGreaterThanOrEqual(90);

    output = "";
    const verifyExit = await runCli(
      ["security", "verify", "--root", root, "--json"],
      dependencies,
      { stdout, stderr: () => undefined },
    );
    expect(verifyExit).toBe(0);
    const parsedVerify = JSON.parse(output);
    expect(parsedVerify.auditHash).toBeTruthy();
  });
});
