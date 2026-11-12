import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import * as application from "@intentloom/application";
import {
  checkSecurityPolicyAndBaseline,
  createMemoryFileSystem,
  dismissSecurityFinding,
  getSecurityCoverageReport,
  importSarifSecurityReport,
  listSecurityFindings,
  updateSecurityBaseline,
} from "@intentloom/application";
import { measureProductionSource } from "../scripts/production-file-metrics.mjs";
import { runCli } from "../packages/cli/src/command.js";
import { securityFindingPath } from "../packages/application/src/security/security-finding-store.js";
import {
  applicationCycles,
  relativeSpecifiers,
} from "./application-source-cycles.js";

const root = "/project";
const reportPath = "reports/import.sarif.json";

const applicationExportKeys = [
  ".",
  "./model-adapter",
  "./ollama-model-adapter",
  "./neutron-runtime",
  "./neutron-n2",
  "./neutron-context-assembly",
  "./neutron-n4",
  "./neutron-scheduler",
  "./neutron-graph-mutation",
  "./neutron-session",
  "./engineering-assessment",
  "./engineering-quality",
];

const outsideComponents = [
  "host-file-system.ts",
  "project-path.ts",
  "security/security-finding-store.ts",
  "security/sarif-security-import.ts",
  "security/security-coverage.ts",
  "agent-session/agent-session.ts",
  "memory/persistent-memory-store.ts",
  "memory/persistent-memory-lifecycle.ts",
  "memory/persistent-memory-retrieval.ts",
  "skills/skill-progressive-parse.ts",
  "skills/skill-discovery.ts",
  "skills/skill-proposal-store.ts",
  "skills/skill-evaluation.ts",
  "skills/skill-mutation.ts",
  "skills/skill-procedural-memory.ts",
];

function document(runs: readonly unknown[]): string {
  return JSON.stringify({ runs });
}

function result(
  ruleId: string,
  extra: Record<string, unknown> = {},
): Record<string, unknown> {
  return { ruleId, message: { text: ruleId }, ...extra };
}

async function readStored(
  fs: ReturnType<typeof createMemoryFileSystem>,
  id: string,
): Promise<{ raw: string; finding: Record<string, unknown> }> {
  const raw = await fs.read(securityFindingPath(root, id));
  return { raw, finding: JSON.parse(raw) as Record<string, unknown> };
}

describe("P1H.4b SARIF security import extraction", () => {
  it("keeps the public importer on the package root and leaves the export map unchanged", () => {
    expect(typeof application.importSarifSecurityReport).toBe("function");
    expect(application).not.toHaveProperty("isObjectRecord");
    expect(application).not.toHaveProperty("securityFindingPath");
    expect(existsSync("packages/application/src/security/index.ts")).toBe(
      false,
    );
    const source = readFileSync(
      "packages/application/src/security/sarif-security-import.ts",
      "utf8",
    );
    expect(source).toContain("function isObjectRecord");
    expect(source).not.toContain("export function isObjectRecord");
    expect(source).not.toContain("../index.js");
    const packageJson = JSON.parse(
      readFileSync("packages/application/package.json", "utf8"),
    ) as { exports: Record<string, string> };
    expect(Object.keys(packageJson.exports)).toEqual(applicationExportKeys);
    expect(packageJson.exports).not.toHaveProperty("./security");
    const exceptions = readFileSync(
      "docs/governance/quality-exceptions.json",
      "utf8",
    );
    expect(exceptions).not.toContain("sarif-security-import");
    const barrel = readFileSync("packages/application/src/index.ts", "utf8");
    expect(barrel).toContain(
      'export { importSarifSecurityReport } from "./security/sarif-security-import.js";',
    );
    expect(barrel).not.toContain("function isObjectRecord");
    expect(barrel).not.toContain("function importSarifSecurityReport");
  });

  it("rejects malformed JSON and a missing runs array with the existing errors", async () => {
    const fs = createMemoryFileSystem();
    const cases = ["{", "not-json", ""] as const;
    for (const content of cases) {
      await expect(
        importSarifSecurityReport(content, reportPath, { root }, fs),
      ).rejects.toThrow("malformed SARIF JSON document");
    }
    for (const content of ["[]", "null", "42", '{"runs":{}}', "{}"]) {
      await expect(
        importSarifSecurityReport(content, reportPath, { root }, fs),
      ).rejects.toThrow("invalid SARIF structure: missing runs array");
    }
    expect(await fs.list(root)).toEqual([]);
  });

  it("skips non-object runs and results and keeps the existing fallbacks", async () => {
    const fs = createMemoryFileSystem();
    const imported = await importSarifSecurityReport(
      document([
        "skip-run",
        null,
        { results: "missing" },
        {
          tool: { driver: { name: 4 } },
          results: [1, null, { message: { text: 3 } }],
        },
        {
          tool: { driver: {} },
          results: [{ ruleId: 9, message: {} }],
        },
        { results: [result("kept/rule")] },
      ]),
      reportPath,
      { root },
      fs,
    );

    expect(imported.importedCount).toBe(3);
    expect(imported.findings.map((finding) => finding.id)).toEqual([
      "sarif-finding-1",
      "sarif-finding-2",
      "sarif-finding-3",
    ]);
    expect(imported.findings.map((finding) => finding.ruleId)).toEqual([
      "SARIF-RULE",
      "SARIF-RULE",
      "kept/rule",
    ]);
    expect(imported.findings.map((finding) => finding.title)).toEqual([
      "SARIF Finding",
      "SARIF Finding",
      "kept/rule",
    ]);
    expect(imported.findings.map((finding) => finding.scanner)).toEqual([
      "sarif-scanner",
      "sarif-scanner",
      "sarif-scanner",
    ]);
    expect(imported.findings.map((finding) => finding.description)).toEqual([
      "Imported from sarif-scanner",
      "Imported from sarif-scanner",
      "Imported from sarif-scanner",
    ]);
  });

  it("preserves every severity mapping branch, including lowercasing", async () => {
    const fs = createMemoryFileSystem();
    const levels: readonly (readonly [string, unknown, string])[] = [
      ["error", "error", "high"],
      ["ERROR", "ERROR", "high"],
      ["warning", "warning", "medium"],
      ["Warning", "Warning", "medium"],
      ["note", "note", "low"],
      ["NOTE", "NOTE", "low"],
      ["critical", "critical", "info"],
      ["high", "high", "info"],
      ["none", "none", "info"],
      ["other", "other", "info"],
      ["number", 7, "medium"],
      ["null", null, "medium"],
      ["missing", undefined, "medium"],
    ];
    const imported = await importSarifSecurityReport(
      document([
        {
          tool: { driver: { name: "LevelScanner" } },
          results: levels.map(([ruleId, level]) =>
            result(ruleId, level === undefined ? {} : { level }),
          ),
        },
      ]),
      reportPath,
      { root },
      fs,
    );

    expect(
      imported.findings.map((finding) => [finding.ruleId, finding.severity]),
    ).toEqual(levels.map(([ruleId, , severity]) => [ruleId, severity]));
  });

  it("preserves evidence fallbacks and the existing redaction boundary", async () => {
    const fs = createMemoryFileSystem();
    const imported = await importSarifSecurityReport(
      document([
        {
          tool: { driver: { name: "certs/app.pem" } },
          results: [
            {
              ruleId: "rule/locations",
              level: "note",
              message: { text: "config/.env.production" },
              locations: [
                null,
                "bad-location",
                {
                  physicalLocation: {
                    artifactLocation: { uri: "certs/app.pem" },
                    region: {
                      startLine: "4",
                      endLine: 8,
                      snippet: { text: "API_KEY=secret123" },
                    },
                  },
                },
                {
                  physicalLocation: {
                    artifactLocation: {},
                    region: {
                      startLine: 2,
                      snippet: { text: "keys/server.key" },
                    },
                  },
                },
                {
                  physicalLocation: {
                    artifactLocation: { uri: "src/app.ts" },
                    region: {
                      startLine: 10,
                      endLine: 12,
                      snippet: { text: "const value = 1;" },
                    },
                  },
                },
              ],
            },
            result("rule/plain", {
              level: "warning",
              message: { text: "API_KEY=secret123" },
              locations: [
                {
                  physicalLocation: {
                    artifactLocation: { uri: "src/plain.ts" },
                  },
                },
              ],
            }),
          ],
        },
      ]),
      reportPath,
      { root },
      fs,
    );

    const secretLike = imported.findings[0];
    const plain = imported.findings[1];
    expect(secretLike?.title).toBe("[REDACTED]");
    expect(secretLike?.scanner).toBe("certs/app.pem");
    expect(secretLike?.description).toBe("Imported from certs/app.pem");
    expect(secretLike?.evidence).toEqual([
      { path: "unknown" },
      { path: "unknown" },
      { path: "[REDACTED]", endLine: 8, snippet: "API_KEY=secret123" },
      { path: "unknown", startLine: 2, snippet: "[REDACTED]" },
      {
        path: "src/app.ts",
        startLine: 10,
        endLine: 12,
        snippet: "const value = 1;",
      },
    ]);
    expect(plain?.title).toBe("API_KEY=secret123");
    expect(plain?.evidence).toEqual([{ path: "src/plain.ts" }]);
    expect(secretLike?.trustClass).toBe("verified-evidence");
    expect(plain?.category).toBe("vulnerability");
    expect(plain?.state).toBe("open");
  });

  it("restarts finding ids, overwrites prior files, and keeps pretty JSON", async () => {
    const fs = createMemoryFileSystem();
    const first = await importSarifSecurityReport(
      document([
        {
          tool: { driver: { name: "FirstScanner" } },
          results: [result("rule/one"), result("rule/two")],
        },
      ]),
      reportPath,
      { root },
      fs,
    );
    expect(first.findings.map((finding) => finding.id)).toEqual([
      "sarif-finding-1",
      "sarif-finding-2",
    ]);
    await dismissSecurityFinding(
      "sarif-finding-1",
      { root, reason: "temporary dismissal" },
      fs,
    );

    const second = await importSarifSecurityReport(
      document([
        {
          tool: { driver: { name: "SecondScanner" } },
          results: [result("rule/replacement", { level: "error" })],
        },
      ]),
      "caller/supplied.sarif",
      { root },
      fs,
    );

    expect(second.schemaVersion).toBe("1");
    expect(second.reportPath).toBe("caller/supplied.sarif");
    expect(second.importedCount).toBe(1);
    expect(second.findings.map((finding) => finding.id)).toEqual([
      "sarif-finding-1",
    ]);
    expect(second.findings[0]?.state).toBe("open");
    expect(second.findings[0]?.dismissalReason).toBeUndefined();
    expect(second.findings[0]?.severity).toBe("high");
    expect(second.findings[0]?.trustClass).toBe("verified-evidence");
    expect(second.importedAt).toBe(second.findings[0]?.createdAt);
    expect(second.importedAt).toBe(second.findings[0]?.updatedAt);

    const stored = await readStored(fs, "sarif-finding-1");
    expect(stored.raw.endsWith("\n")).toBe(true);
    expect(stored.raw).toBe(
      `${JSON.stringify(JSON.parse(stored.raw), null, 2)}\n`,
    );
    expect(stored.raw).toContain('\n  "schemaVersion": "1"');
    expect(stored.finding.state).toBe("open");
    expect(stored.finding.trustClass).toBe("verified-evidence");
    expect(stored.finding.ruleId).toBe("rule/replacement");
    expect(await fs.exists(securityFindingPath(root, "sarif-finding-2"))).toBe(
      true,
    );
  });

  it("leaves earlier files in place when a later result fails validation", async () => {
    const fs = createMemoryFileSystem();
    await expect(
      importSarifSecurityReport(
        document([
          {
            results: [
              result("rule/kept", { level: "note" }),
              result("", { level: "error", message: { text: "Rejected" } }),
            ],
          },
        ]),
        reportPath,
        { root },
        fs,
      ),
    ).rejects.toThrow("ruleId must be a non-empty string");

    const stored = await readStored(fs, "sarif-finding-1");
    expect(stored.finding.ruleId).toBe("rule/kept");
    expect(stored.finding.severity).toBe("low");
    expect(await fs.exists(securityFindingPath(root, "sarif-finding-2"))).toBe(
      false,
    );
  });

  it("leaves earlier files in place when a later write fails", async () => {
    const fs = createMemoryFileSystem({}, 1);
    await expect(
      importSarifSecurityReport(
        document([
          {
            results: [result("rule/first"), result("rule/second")],
          },
        ]),
        reportPath,
        { root },
        fs,
      ),
    ).rejects.toThrow("injected write failure");

    const stored = await readStored(fs, "sarif-finding-1");
    expect(stored.finding.ruleId).toBe("rule/first");
    expect(await fs.exists(securityFindingPath(root, "sarif-finding-2"))).toBe(
      false,
    );
  });

  it("returns an empty valid result and writes nothing for an empty import", async () => {
    const fs = createMemoryFileSystem();
    const imported = await importSarifSecurityReport(
      document([null, { results: [] }, { results: [1, "skip"] }]),
      reportPath,
      { root },
      fs,
    );
    expect(imported).toMatchObject({
      schemaVersion: "1",
      reportPath,
      importedCount: 0,
      findings: [],
    });
    expect(Number.isNaN(Date.parse(imported.importedAt))).toBe(false);
    expect(await fs.list(root)).toEqual([]);
  });

  it("keeps coverage, policy, baseline, and CLI consumers on imported findings", async () => {
    const fs = createMemoryFileSystem();
    const content = document([
      {
        tool: { driver: { name: "CliScanner" } },
        results: [result("rule/cli", { level: "error" })],
      },
    ]);
    await fs.write(resolve(root, "reports/cli.sarif.json"), content);

    let output = "";
    const exitCode = await runCli(
      [
        "security",
        "import",
        "--file",
        "reports/cli.sarif.json",
        "--root",
        root,
      ],
      { catalogRoot: resolve("catalog"), fileSystem: fs },
      {
        stdout: (message: string) => {
          output += message;
        },
        stderr: () => undefined,
      },
    );
    expect(exitCode).toBe(0);
    expect(output).toContain(
      "Imported 1 security findings from reports/cli.sarif.json",
    );

    const listed = await listSecurityFindings({ root }, fs);
    expect(listed.map((finding) => finding.id)).toEqual(["sarif-finding-1"]);
    const coverage = await getSecurityCoverageReport(
      { root, projectId: "project-sarif" },
      fs,
    );
    expect(coverage.totalFindings).toBe(1);
    expect(coverage.findingsBySeverity.high).toBe(1);
    const check = await checkSecurityPolicyAndBaseline(
      { root, projectId: "project-sarif" },
      fs,
    );
    expect(check.newFindings.map((finding) => finding.id)).toEqual([
      "sarif-finding-1",
    ]);
    const baseline = await updateSecurityBaseline(
      { root, projectId: "project-sarif" },
      fs,
    );
    expect(baseline.acceptedFindings.map((finding) => finding.id)).toEqual([
      "sarif-finding-1",
    ]);
  });

  it("keeps the SARIF module outside every source cycle and within the file budget", () => {
    const importComponents = applicationCycles(false);
    const reexportComponents = applicationCycles(true);
    expect(importComponents.map((component) => component.length)).toEqual([3]);
    expect(reexportComponents.map((component) => component.length)).toEqual([
      4, 27, 3,
    ]);
    expect(importComponents).toEqual([
      [
        "neutron/mutation/apply/neutron-mutation-apply-durable-record.ts",
        "neutron/mutation/apply/neutron-mutation-apply-store.ts",
        "neutron/mutation/verification/neutron-mutation-verification-retry-eligibility.ts",
      ],
    ]);
    expect(reexportComponents[0]).toEqual([
      "apply-extension-update.ts",
      "discover-and-apply-extension-update.ts",
      "extension-update-files.ts",
      "propose-and-apply-extension-adoption.ts",
    ]);
    expect(reexportComponents[1]).toEqual([
      "approved-apply-engine.ts",
      "bounded-execution-apply.ts",
      "bounded-execution-w11.ts",
      "bounded-execution-workspace-cli.ts",
      "bounded-execution-workspace.ts",
      "engineering-quality-entry.ts",
      "engineering-quality/cli-specialized-packs-external.ts",
      "engineering-quality/index.ts",
      "engineering-quality/specialized-pack-external-apply.ts",
      "engineering-quality/specialized-pack-external-viewmodel.ts",
      "existing-project-adoption-apply-gates.ts",
      "existing-project-adoption-apply-health.ts",
      "existing-project-adoption-apply.ts",
      "existing-project-adoption-approval.ts",
      "existing-project-adoption-decisions.ts",
      "existing-project-adoption-plan.ts",
      "existing-project-adoption-prepared-plan-revalidate.ts",
      "existing-project-adoption-prepared-plan.ts",
      "existing-project-w9.ts",
      "existing-project-workspace-cli.ts",
      "existing-project-workspace.ts",
      "foundation-flow.ts",
      "harness/harness-benchmark-sample.ts",
      "harness/harness-benchmark.ts",
      "harness/harness.ts",
      "inception-flow.ts",
      "index.ts",
    ]);

    expect(reexportComponents[1]).toContain("index.ts");
    expect(reexportComponents[2]).toEqual(importComponents[0]);
    const members = new Set(
      [...importComponents, ...reexportComponents].flat(),
    );
    for (const file of outsideComponents) {
      expect(members.has(file)).toBe(false);
    }

    for (const file of [
      "security/security-finding-store.ts",
      "security/sarif-security-import.ts",
      "security/security-coverage.ts",
    ]) {
      expect(relativeSpecifiers(file, true)).not.toContain("../index.js");
    }
    const sarifImports = relativeSpecifiers(
      "security/sarif-security-import.ts",
      false,
    );
    expect(sarifImports).toContain("../host-file-system.js");
    expect(sarifImports).toContain("../project-path.js");
    expect(sarifImports).toContain("./security-finding-store.js");
    expect(
      relativeSpecifiers("security/security-finding-store.ts", true),
    ).not.toContain("./sarif-security-import.js");
    expect(relativeSpecifiers("security/security-coverage.ts", true)).toContain(
      "./security-finding-store.js",
    );
    expect(
      relativeSpecifiers("security/security-coverage.ts", true),
    ).not.toContain("./sarif-security-import.js");
    expect(relativeSpecifiers("index.ts", false)).toContain(
      "./security/security-finding-store.js",
    );
    expect(relativeSpecifiers("index.ts", false)).not.toContain(
      "./security/sarif-security-import.js",
    );
    expect(relativeSpecifiers("index.ts", true)).toContain(
      "./security/sarif-security-import.js",
    );

    const indexMetrics = measureProductionSource(
      readFileSync("packages/application/src/index.ts", "utf8"),
      "packages/application/src/index.ts",
    );
    const sarifMetrics = measureProductionSource(
      readFileSync(
        "packages/application/src/security/sarif-security-import.ts",
        "utf8",
      ),
      "packages/application/src/security/sarif-security-import.ts",
    );
    expect(indexMetrics.effectiveCodeLines).toBeLessThan(5211);
    expect(indexMetrics.physicalLines).toBeLessThan(5484);
    expect(sarifMetrics.effectiveCodeLines).toBeLessThanOrEqual(250);
    expect(sarifMetrics.physicalLines).toBeLessThanOrEqual(700);
  });
});
