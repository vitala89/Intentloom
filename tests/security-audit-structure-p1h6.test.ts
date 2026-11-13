import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  createMemoryFileSystem,
  importSarifSecurityReport,
  runContinuousSecurityAudit,
  writeSecurityPolicy,
} from "@intentloom/application";
import { validateSecurityPolicy } from "@intentloom/protocol";
import { runCli } from "../packages/cli/src/command.js";
import { measureProductionSource } from "../scripts/production-file-metrics.mjs";
import {
  applicationCycles,
  relativeSpecifiers,
} from "./application-source-cycles.js";

const root = "/project";
const catalogRoot = resolve("catalog");
const auditModules = [
  "security/security-audit-report-store.ts",
  "security/security-audit-invariants.ts",
  "security/continuous-security-audit.ts",
] as const;
const earlierSecurityModules = [
  "security/security-policy.ts",
  "security/security-baseline.ts",
  "security/security-policy-evaluation.ts",
  "security/sandbox-capability-policy.ts",
  "security/sandbox-proposal-evaluation.ts",
  "security/security-finding-store.ts",
  "security/sarif-security-import.ts",
  "security/security-coverage.ts",
] as const;

function functionSlices(source: string): { name: string; source: string }[] {
  const slices: { name: string; source: string }[] = [];
  const declaration =
    /(?:^|\n)(?:export\s+)?(?:async\s+)?function\s+([A-Za-z0-9_]+)\s*\(/g;
  let match: RegExpExecArray | null;
  while ((match = declaration.exec(source)) !== null) {
    const start = match.index + (match[0].startsWith("\n") ? 1 : 0);
    let index = declaration.lastIndex - 1;
    let parentheses = 0;
    let quote: '"' | "'" | "`" | null = null;
    for (; index < source.length; index += 1) {
      const character = source[index];
      if (quote) {
        if (character === "\\") {
          index += 1;
          continue;
        }
        if (character === quote) quote = null;
        continue;
      }
      if (character === '"' || character === "'" || character === "`") {
        quote = character;
        continue;
      }
      if (character === "(") parentheses += 1;
      if (character === ")") {
        parentheses -= 1;
        if (parentheses === 0) {
          index += 1;
          break;
        }
      }
    }
    while (index < source.length && source[index] !== "{") index += 1;
    let depth = 0;
    quote = null;
    let end = index;
    for (; index < source.length; index += 1) {
      const character = source[index];
      if (quote) {
        if (character === "\\") {
          index += 1;
          continue;
        }
        if (character === quote) quote = null;
        continue;
      }
      if (character === '"' || character === "'" || character === "`") {
        quote = character;
        continue;
      }
      if (character === "{") depth += 1;
      if (character === "}") {
        depth -= 1;
        if (depth === 0) {
          end = index + 1;
          break;
        }
      }
    }
    slices.push({ name: match[1] ?? "", source: source.slice(start, end) });
    declaration.lastIndex = end;
  }
  return slices;
}

describe("P1H.6 continuous security audit structure", () => {
  it("keeps the audit modules outside every cycle and away from index.ts", () => {
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
    expect(reexportComponents[1]).toContain("inception-flow.ts");
    expect(reexportComponents[2]).toEqual(importComponents[0]);

    const members = new Set(reexportComponents.flat());
    for (const file of [
      ...auditModules,
      ...earlierSecurityModules,
      "host-file-system.ts",
      "project-path.ts",
      "agent-session/agent-session.ts",
    ]) {
      expect(members.has(file)).toBe(false);
    }
    for (const file of auditModules) {
      const specs = relativeSpecifiers(file, true);
      expect(specs).not.toContain("../index.js");
      expect(specs.join("\n")).not.toMatch(
        /@intentloom\/(cli|daemon|mcp)|apps\/desktop/,
      );
    }
    expect(
      relativeSpecifiers("security/security-audit-report-store.ts", true),
    ).toEqual([
      "node:path",
      "@intentloom/protocol",
      "../host-file-system.js",
      "../project-path.js",
    ]);
    expect(
      relativeSpecifiers("security/security-audit-invariants.ts", true),
    ).toEqual(["@intentloom/protocol"]);
    expect(
      relativeSpecifiers("security/continuous-security-audit.ts", true),
    ).toEqual([
      "node:crypto",
      "@intentloom/protocol",
      "../host-file-system.js",
      "./sandbox-capability-policy.js",
      "./security-audit-invariants.js",
      "./security-audit-report-store.js",
      "./security-baseline.js",
      "./security-policy-evaluation.js",
      "./security-policy.js",
    ]);
    for (const file of earlierSecurityModules) {
      expect(relativeSpecifiers(file, true).join("\n")).not.toMatch(
        /security-audit-report-store|security-audit-invariants|continuous-security-audit/,
      );
    }
    const indexSource = readFileSync(
      "packages/application/src/index.ts",
      "utf8",
    );
    expect(indexSource).not.toContain(
      'import { getSecurityAuditReport } from "./security/security-audit-report-store.js"',
    );
    expect(indexSource).toContain(
      'export { getSecurityAuditReport } from "./security/security-audit-report-store.js"',
    );
    expect(
      readFileSync(
        "packages/application/src/workspace/interactive-workspace-read-model.ts",
        "utf8",
      ),
    ).toContain(
      'import { getSecurityAuditReport } from "../security/security-audit-report-store.js"',
    );
    expect(indexSource).toContain(
      'export { runContinuousSecurityAudit } from "./security/continuous-security-audit.js"',
    );
    expect(indexSource).not.toContain("function runContinuousSecurityAudit");
    expect(indexSource).not.toContain("function getSecurityAuditReport");
    expect(indexSource).not.toContain("function securityAuditReportPath");
    expect(indexSource).not.toContain("security/index.ts");
    const packageJson = JSON.parse(
      readFileSync("packages/application/package.json", "utf8"),
    ) as { exports: Record<string, string> };
    expect(Object.keys(packageJson.exports)).toEqual([
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
    ]);
    expect(
      readFileSync("docs/governance/quality-exceptions.json", "utf8"),
    ).not.toContain("continuous-security-audit");
  });

  it("keeps the new files and functions inside the size budgets", () => {
    const indexMetrics = measureProductionSource(
      readFileSync("packages/application/src/index.ts", "utf8"),
      "packages/application/src/index.ts",
    );
    expect(indexMetrics).toMatchObject({
      effectiveCodeLines: 1878,
      physicalLines: 2034,
    });
    const landed = {
      "security/security-audit-report-store.ts": {
        effectiveCodeLines: 34,
        physicalLines: 37,
      },
      "security/security-audit-invariants.ts": {
        effectiveCodeLines: 221,
        physicalLines: 227,
      },
      "security/continuous-security-audit.ts": {
        effectiveCodeLines: 47,
        physicalLines: 48,
      },
    } as const;
    for (const file of auditModules) {
      const source = readFileSync(`packages/application/src/${file}`, "utf8");
      const metrics = measureProductionSource(
        source,
        `packages/application/src/${file}`,
      );
      expect(metrics.effectiveCodeLines).toBe(landed[file].effectiveCodeLines);
      expect(metrics.physicalLines).toBe(landed[file].physicalLines);
      const functions = functionSlices(source);
      expect(functions.length).toBeGreaterThan(0);
      for (const slice of functions) {
        expect(
          measureProductionSource(
            slice.source,
            `packages/application/src/${file}`,
          ).effectiveCodeLines,
        ).toBeLessThanOrEqual(40);
      }
    }
    const runnerSource = readFileSync(
      "packages/application/src/security/continuous-security-audit.ts",
      "utf8",
    );
    const runner = functionSlices(runnerSource).find(
      (slice) => slice.name === "runContinuousSecurityAudit",
    );
    expect(runner?.name).toBe("runContinuousSecurityAudit");
    expect(
      measureProductionSource(
        runner?.source ?? "",
        "packages/application/src/security/continuous-security-audit.ts",
      ).effectiveCodeLines,
    ).toBe(35);
  });

  it("preserves security audit and verify exit codes", async () => {
    const fs = createMemoryFileSystem();
    const dependencies = { catalogRoot, fileSystem: fs };
    const success: string[] = [];
    const auditExit = await runCli(
      ["security", "audit", "--root", root, "--json"],
      dependencies,
      {
        stdout: (message) => success.push(message),
        stderr: () => undefined,
      },
    );
    expect(auditExit).toBe(0);
    const verifyExit = await runCli(
      ["security", "verify", "--root", root, "--json"],
      dependencies,
      { stdout: () => undefined, stderr: () => undefined },
    );
    expect(verifyExit).toBe(0);
    expect(JSON.parse(success.join("\n")).healthScore).toBeGreaterThanOrEqual(
      80,
    );

    await importSarifSecurityReport(
      JSON.stringify({
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
                  {
                    physicalLocation: {
                      artifactLocation: { uri: "src/app.js" },
                    },
                  },
                ],
              },
            ],
          },
        ],
      }),
      "report.sarif",
      { root },
      fs,
    );
    await writeSecurityPolicy(
      validateSecurityPolicy({
        schemaVersion: "1",
        projectId: "p1",
        defaultEnforcement: "warn",
        rules: [{ target: "high", enforcement: "fail" }],
        updatedAt: "2026-02-02T00:00:00.000Z",
      }),
      { root },
      fs,
    );
    const failedAudit = await runCli(
      ["security", "audit", "--root", root, "--json"],
      dependencies,
      { stdout: () => undefined, stderr: () => undefined },
    );
    const failedVerify = await runCli(
      ["security", "verify", "--root", root, "--json"],
      dependencies,
      { stdout: () => undefined, stderr: () => undefined },
    );
    expect(failedAudit).toBe(3);
    expect(failedVerify).toBe(3);
    const report = await runContinuousSecurityAudit(
      { root, projectId: "local-project" },
      fs,
    );
    expect(
      report.invariantChecks.some((check) => check.status === "failed"),
    ).toBe(true);
  });
});
