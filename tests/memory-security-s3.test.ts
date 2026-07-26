import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  createMemoryFileSystem,
  getSecurityPolicy,
  writeSecurityPolicy,
  getSecurityBaseline,
  updateSecurityBaseline,
  checkSecurityPolicyAndBaseline,
  importSarifSecurityReport,
} from "@intentloom/application";
import { runCli } from "../packages/cli/src/command.js";
import {
  validateSecurityPolicy,
  validateSecurityBaseline,
  validateSecurityBaselineCheckResult,
} from "@intentloom/protocol";

describe("Memory & Security Candidate S3", () => {
  const sampleSarif = JSON.stringify({
    $schema: "https://json.schemastore.org/sarif-2.1.0.json",
    version: "2.1.0",
    runs: [
      {
        tool: { driver: { name: "CodeQL" } },
        results: [
          {
            ruleId: "js/critical-injection",
            level: "error",
            message: { text: "Critical vulnerability" },
            locations: [
              { physicalLocation: { artifactLocation: { uri: "src/app.js" } } },
            ],
          },
        ],
      },
    ],
  });

  it("validates protocol schemas for security policies and baselines", () => {
    const policy = validateSecurityPolicy({
      schemaVersion: "1",
      projectId: "proj-1",
      defaultEnforcement: "warn",
      rules: [{ target: "critical", enforcement: "fail" }],
      updatedAt: new Date().toISOString(),
    });

    expect(policy.projectId).toBe("proj-1");
    expect(policy.rules[0]?.enforcement).toBe("fail");

    const baseline = validateSecurityBaseline({
      schemaVersion: "1",
      projectId: "proj-1",
      acceptedFindings: [],
      baselineHash:
        "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    expect(baseline.baselineHash).toHaveLength(64);

    const checkResult = validateSecurityBaselineCheckResult({
      schemaVersion: "1",
      projectId: "proj-1",
      newFindings: [],
      resolvedFindings: [],
      policyViolations: [],
      exitCode: 0,
      checkedAt: new Date().toISOString(),
    });

    expect(checkResult.exitCode).toBe(0);
  });

  it("manages security policy reading and custom writing", async () => {
    const fs = createMemoryFileSystem();
    const root = "/project";

    const defaultPolicy = await getSecurityPolicy({ root }, fs);
    expect(defaultPolicy.defaultEnforcement).toBe("warn");

    const customPolicy = validateSecurityPolicy({
      schemaVersion: "1",
      projectId: "proj-sec",
      defaultEnforcement: "fail",
      rules: [{ target: "low", enforcement: "ignore" }],
      updatedAt: new Date().toISOString(),
    });

    await writeSecurityPolicy(customPolicy, { root }, fs);

    const reloaded = await getSecurityPolicy({ root }, fs);
    expect(reloaded.defaultEnforcement).toBe("fail");
    expect(reloaded.rules[0]?.target).toBe("low");
  });

  it("updates security baseline and detects new/resolved findings and drift", async () => {
    const fs = createMemoryFileSystem();
    const root = "/project";

    await importSarifSecurityReport(sampleSarif, "report.sarif", { root }, fs);

    const baseline1 = await updateSecurityBaseline(
      { root, projectId: "p1" },
      fs,
    );
    expect(baseline1.acceptedFindings).toHaveLength(1);
    expect(baseline1.baselineHash).toBeTruthy();

    const check1 = await checkSecurityPolicyAndBaseline(
      { root, projectId: "p1" },
      fs,
    );
    expect(check1.newFindings).toHaveLength(0);
    expect(check1.resolvedFindings).toHaveLength(0);

    const readBaseline = await getSecurityBaseline({ root }, fs);
    expect(readBaseline?.baselineHash).toBe(baseline1.baselineHash);
  });

  it("enforces non-zero exit code on fail policy violations", async () => {
    const fs = createMemoryFileSystem();
    const root = "/project";

    await importSarifSecurityReport(sampleSarif, "report.sarif", { root }, fs);

    const policy = validateSecurityPolicy({
      schemaVersion: "1",
      projectId: "p1",
      defaultEnforcement: "warn",
      rules: [{ target: "high", enforcement: "fail" }],
      updatedAt: new Date().toISOString(),
    });
    await writeSecurityPolicy(policy, { root }, fs);

    const check = await checkSecurityPolicyAndBaseline(
      { root, projectId: "p1" },
      fs,
    );
    expect(check.policyViolations).toHaveLength(1);
    expect(check.exitCode).toBe(3);
  });

  it("routes policy and baseline subcommands through CLI", async () => {
    const fs = createMemoryFileSystem();
    const root = "/project";
    const dependencies = { catalogRoot: resolve("catalog"), fileSystem: fs };

    let output = "";
    const stdout = (msg: string) => {
      output += `${msg}\n`;
    };

    const policyExit = await runCli(
      ["security", "policy", "--root", root, "--json"],
      dependencies,
      { stdout, stderr: () => undefined },
    );
    expect(policyExit).toBe(0);
    const parsedPolicy = JSON.parse(output);
    expect(parsedPolicy.defaultEnforcement).toBe("warn");

    output = "";
    const updateExit = await runCli(
      ["security", "baseline", "update", "--root", root, "--json"],
      dependencies,
      { stdout, stderr: () => undefined },
    );
    expect(updateExit).toBe(0);
    const parsedBaseline = JSON.parse(output);
    expect(parsedBaseline.baselineHash).toBeTruthy();

    output = "";
    const checkExit = await runCli(
      ["security", "baseline", "check", "--root", root, "--json"],
      dependencies,
      { stdout, stderr: () => undefined },
    );
    expect(checkExit).toBe(0);
    const parsedCheck = JSON.parse(output);
    expect(parsedCheck.exitCode).toBe(0);
  });
});
