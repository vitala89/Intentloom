import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  createMemoryFileSystem,
  importSarifSecurityReport,
  listSecurityFindings,
  dismissSecurityFinding,
  acceptSecurityRisk,
  getSecurityCoverageReport,
} from "@intentloom/application";
import { runCli } from "../packages/cli/src/command.js";
import {
  validateSecurityFinding,
  validateSecurityCoverageReport,
  validateSarifImportResult,
} from "@intentloom/protocol";

describe("Memory & Security Candidate S1", () => {
  const sampleSarif = JSON.stringify({
    $schema: "https://json.schemastore.org/sarif-2.1.0.json",
    version: "2.1.0",
    runs: [
      {
        tool: {
          driver: {
            name: "CodeQL",
            version: "2.15.0",
          },
        },
        results: [
          {
            ruleId: "js/sql-injection",
            level: "error",
            message: {
              text: "Database query built from user-controlled input",
            },
            locations: [
              {
                physicalLocation: {
                  artifactLocation: { uri: "src/db/query.js" },
                  region: {
                    startLine: 42,
                    endLine: 45,
                    snippet: { text: "db.query(input)" },
                  },
                },
              },
            ],
          },
          {
            ruleId: "js/secret-exposure",
            level: "warning",
            message: { text: "Hardcoded secret key in config file" },
            locations: [
              {
                physicalLocation: {
                  artifactLocation: { uri: ".env.production" },
                  region: {
                    startLine: 1,
                    endLine: 1,
                    snippet: { text: "API_KEY=secret123" },
                  },
                },
              },
            ],
          },
        ],
      },
    ],
  });

  it("validates protocol schemas for security findings and reports", () => {
    const finding = validateSecurityFinding({
      schemaVersion: "1",
      id: "f-1",
      ruleId: "js/xss",
      title: "Cross-site scripting",
      severity: "high",
      state: "open",
      category: "vulnerability",
      description: "Reflected XSS",
      scanner: "EslintSecurity",
      evidence: [{ path: "src/render.js", startLine: 12 }],
      trustClass: "verified-evidence",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    expect(finding.id).toBe("f-1");
    expect(finding.severity).toBe("high");
    expect(finding.evidence[0]?.path).toBe("src/render.js");

    const report = validateSecurityCoverageReport({
      schemaVersion: "1",
      projectId: "proj-1",
      totalFindings: 1,
      findingsBySeverity: { critical: 0, high: 1, medium: 0, low: 0, info: 0 },
      findingsByState: {
        open: 1,
        verified: 0,
        dismissed: 0,
        "accepted-risk": 0,
        remediated: 0,
      },
      scanners: ["EslintSecurity"],
      reportedAt: new Date().toISOString(),
    });

    expect(report.totalFindings).toBe(1);
    expect(report.scanners).toEqual(["EslintSecurity"]);

    const importResult = validateSarifImportResult({
      schemaVersion: "1",
      reportPath: "sarif.json",
      importedCount: 1,
      findings: [finding],
      importedAt: new Date().toISOString(),
    });

    expect(importResult.importedCount).toBe(1);
  });

  it("imports SARIF reports, redacting secret paths and parsing findings", async () => {
    const fs = createMemoryFileSystem();
    const root = "/project";

    const importResult = await importSarifSecurityReport(
      sampleSarif,
      "reports/codeql.sarif.json",
      { root },
      fs,
    );

    expect(importResult.importedCount).toBe(2);
    expect(importResult.findings).toHaveLength(2);

    const findings = await listSecurityFindings({ root }, fs);
    expect(findings).toHaveLength(2);

    const secretFinding = findings.find(
      (f) => f.ruleId === "js/secret-exposure",
    );
    expect(secretFinding).not.toBeUndefined();
    expect(secretFinding?.evidence[0]?.path).toBe("[REDACTED]");
  });

  it("handles finding dismissal and risk acceptance lifecycles", async () => {
    const fs = createMemoryFileSystem();
    const root = "/project";

    await importSarifSecurityReport(
      sampleSarif,
      "reports/codeql.sarif.json",
      { root },
      fs,
    );

    const dismissed = await dismissSecurityFinding(
      "sarif-finding-1",
      { root, reason: "False positive in internal test tool" },
      fs,
    );

    expect(dismissed.state).toBe("dismissed");
    expect(dismissed.dismissalReason).toBe(
      "False positive in internal test tool",
    );

    const accepted = await acceptSecurityRisk(
      "sarif-finding-2",
      {
        root,
        approvedBy: "SecurityLead",
        reason: "Compensating controls present",
      },
      fs,
    );

    expect(accepted.state).toBe("accepted-risk");
    expect(accepted.acceptedRisk?.approvedBy).toBe("SecurityLead");

    const coverage = await getSecurityCoverageReport(
      { root, projectId: "p-sec" },
      fs,
    );
    expect(coverage.totalFindings).toBe(2);
    expect(coverage.findingsByState.dismissed).toBe(1);
    expect(coverage.findingsByState["accepted-risk"]).toBe(1);
  });

  it("rejects malformed SARIF documents cleanly", async () => {
    const fs = createMemoryFileSystem();
    const root = "/project";

    await expect(
      importSarifSecurityReport(
        "{ malformed json }",
        "bad.sarif",
        { root },
        fs,
      ),
    ).rejects.toThrow("malformed SARIF JSON document");

    await expect(
      importSarifSecurityReport(
        JSON.stringify({ notSarif: true }),
        "bad.sarif",
        { root },
        fs,
      ),
    ).rejects.toThrow("invalid SARIF structure: missing runs array");
  });

  it("routes security subcommands through CLI", async () => {
    const fs = createMemoryFileSystem();
    const root = "/project";
    const dependencies = { catalogRoot: resolve("catalog"), fileSystem: fs };

    await fs.mkdir("/project/reports");
    await fs.write("/project/reports/codeql.sarif.json", sampleSarif);

    let output = "";
    const stdout = (msg: string) => {
      output += `${msg}\n`;
    };

    const importExit = await runCli(
      [
        "security",
        "import",
        "--file",
        "reports/codeql.sarif.json",
        "--root",
        root,
      ],
      dependencies,
      { stdout, stderr: () => undefined },
    );
    expect(importExit).toBe(0);
    expect(output).toContain("Imported 2 security findings");

    output = "";
    const coverageExit = await runCli(
      ["security", "coverage", "--root", root, "--json"],
      dependencies,
      { stdout, stderr: () => undefined },
    );
    expect(coverageExit).toBe(0);
    const parsedCoverage = JSON.parse(output);
    expect(parsedCoverage.totalFindings).toBe(2);

    output = "";
    const dismissExit = await runCli(
      [
        "security",
        "dismiss",
        "--id",
        "sarif-finding-1",
        "--reason",
        "Reviewed OK",
        "--root",
        root,
      ],
      dependencies,
      { stdout, stderr: () => undefined },
    );
    expect(dismissExit).toBe(0);
    expect(output).toContain("Dismissed security finding sarif-finding-1");

    output = "";
    const listExit = await runCli(
      ["security", "list", "--root", root, "--json"],
      dependencies,
      { stdout, stderr: () => undefined },
    );
    expect(listExit).toBe(0);
    expect(JSON.parse(output)).toHaveLength(2);
  });
});
