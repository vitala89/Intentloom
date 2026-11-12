import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import * as application from "../packages/application/src/index.js";
import { ArtifactValidationFailure } from "../packages/application/src/artifact-validation-failure.js";
import { measureProductionSource } from "../scripts/production-file-metrics.mjs";
import { applicationCycles } from "./application-source-cycles.js";

const sourceRoot = "packages/application/src";

const modules = [
  "artifact-validation-failure.ts",
  "project-lifecycle/project-lifecycle-contracts.ts",
  "project-lifecycle/desired-generated-state.ts",
  "project-lifecycle/ownership-state.ts",
  "project-lifecycle/project-plan.ts",
  "project-lifecycle/project-init.ts",
  "project-lifecycle/project-sync.ts",
  "project-lifecycle/project-inspection.ts",
  "project-lifecycle/doctor-metadata.ts",
  "project-lifecycle/doctor-drift.ts",
  "project-lifecycle/doctor-ownership.ts",
  "project-lifecycle/doctor-generated-headers.ts",
  "project-lifecycle/doctor-adapter-output.ts",
  "project-lifecycle/doctor-profile.ts",
  "project-lifecycle/doctor-project.ts",
] as const;

const importComponents = [
  ["approved-apply-baseline.ts", "generated-file-sync-declared.ts", "index.ts"],
  [
    "neutron/mutation/apply/neutron-mutation-apply-durable-record.ts",
    "neutron/mutation/apply/neutron-mutation-apply-store.ts",
    "neutron/mutation/verification/neutron-mutation-verification-retry-eligibility.ts",
  ],
];

const reexportComponents = [
  [
    "apply-extension-update.ts",
    "discover-and-apply-extension-update.ts",
    "extension-update-files.ts",
    "propose-and-apply-extension-adoption.ts",
  ],
  [
    "approved-apply-baseline.ts",
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
    "generated-file-sync-declared.ts",
    "harness/harness-benchmark-sample.ts",
    "harness/harness-benchmark.ts",
    "harness/harness.ts",
    "inception-flow.ts",
    "index.ts",
  ],
  importComponents[1],
];

function functionSlices(source: string): { name: string; source: string }[] {
  const slices: { name: string; source: string }[] = [];
  const declaration =
    /(?:^|\n)(?:export\s+)?(?:async\s+)?function\s+([A-Za-z0-9_]+)/g;
  let match: RegExpExecArray | null;
  while ((match = declaration.exec(source)) !== null) {
    const start = match.index + (match[0].startsWith("\n") ? 1 : 0);
    let index = declaration.lastIndex;
    let angle = 0;
    let parentheses = 0;
    let quote: '"' | "'" | "`" | null = null;
    let bodyStart = -1;
    for (; index < source.length; index += 1) {
      const character = source[index] ?? "";
      const previous = source[index - 1];
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
      if (character === "<" && parentheses === 0) angle += 1;
      else if (character === ">" && angle > 0 && previous !== "=") angle -= 1;
      else if (character === "(" && angle === 0) parentheses += 1;
      else if (character === ")" && angle === 0 && parentheses > 0)
        parentheses -= 1;
      else if (character === "{" && angle === 0 && parentheses === 0) {
        bodyStart = index;
        break;
      }
    }
    if (bodyStart < 0) continue;
    let depth = 0;
    quote = null;
    let end = bodyStart;
    for (index = bodyStart; index < source.length; index += 1) {
      const character = source[index] ?? "";
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

describe("P1I.2 project lifecycle structure", () => {
  it("keeps the extracted lifecycle outside the locked cycles", () => {
    expect(existsSync(`${sourceRoot}/project-lifecycle/index.ts`)).toBe(false);
    for (const relativePath of modules)
      expect(existsSync(`${sourceRoot}/${relativePath}`)).toBe(true);

    const indexSource = readFileSync(`${sourceRoot}/index.ts`, "utf8");
    const syncSource = readFileSync(
      `${sourceRoot}/project-lifecycle/project-sync.ts`,
      "utf8",
    );
    expect(indexSource).toMatch(
      /export async function syncProject\(\s*options: SyncOptions,\s*fs: FileSystem,\s*transactionOptions: TransactionOptions = \{\},/,
    );
    expect(indexSource).toMatch(
      /return executeProjectSync\(\s*options,\s*fs,\s*transactionOptions,\s*synchronizeGeneratedFiles,/,
    );
    expect(syncSource).not.toContain("approved-apply");
    expect(syncSource).not.toContain("synchronizeDeclaredProjectPaths");
    expect(syncSource).not.toContain("executeApprovedApplyPlan");

    expect(application.ArtifactValidationFailure).toBe(
      ArtifactValidationFailure,
    );
    expect(typeof application.doctorExitCode).toBe("function");
    expect(typeof application.initProject).toBe("function");
    expect(typeof application.syncProject).toBe("function");
    expect(typeof application.diffProject).toBe("function");
    expect(typeof application.doctorProject).toBe("function");
    expect(typeof application.inspectProject).toBe("function");
    expect("executeProjectSync" in application).toBe(false);
    expect("desired" in application).toBe(false);
    expect("ownership" in application).toBe(false);
    for (const name of [
      "DoctorPlan",
      "DoctorSeverity",
      "DoctorCategory",
      "DoctorFinding",
      "DoctorError",
      "InitOptions",
      "SyncOptions",
      "SyncDryRunResult",
      "ProjectMapping",
      "ProjectInspectionCapability",
      "InspectionReadiness",
      "InspectionFindingSeverity",
      "ProjectInspectionFinding",
      "ProjectInspection",
    ])
      expect(indexSource).toContain(name);

    const exceptions = readFileSync(
      "docs/governance/quality-exceptions.json",
      "utf8",
    );
    expect(exceptions).not.toContain("project-lifecycle");
    expect(exceptions).not.toContain("artifact-validation-failure");
    expect(exceptions).toContain('"effectiveCodeLines": 6764');
    expect(exceptions).toContain('"physicalLines": 7151');

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

    expect(applicationCycles(false)).toEqual(importComponents);
    expect(applicationCycles(true)).toEqual(reexportComponents);
    const members = [
      ...applicationCycles(false).flat(),
      ...applicationCycles(true).flat(),
    ];
    for (const relativePath of modules) {
      expect(members).not.toContain(relativePath);
      const source = readFileSync(`${sourceRoot}/${relativePath}`, "utf8");
      expect(source).not.toMatch(/from ["'][^"']*index\.js["']/);
      expect(source).not.toContain("generated-file-sync-declared");
      expect(source).not.toContain("approved-apply");
      const metrics = measureProductionSource(source, relativePath);
      expect(metrics.effectiveCodeLines).toBeLessThanOrEqual(250);
      expect(metrics.physicalLines).toBeLessThanOrEqual(700);
      for (const slice of functionSlices(source)) {
        const sized = measureProductionSource(slice.source, relativePath);
        expect(sized.effectiveCodeLines).toBeLessThanOrEqual(80);
        expect(sized.physicalLines).toBeLessThanOrEqual(80);
      }
    }

    const indexMetrics = measureProductionSource(
      indexSource,
      `${sourceRoot}/index.ts`,
    );
    expect(indexMetrics).toMatchObject({
      effectiveCodeLines: 1878,
      physicalLines: 2034,
    });
    expect(indexMetrics.effectiveCodeLines).toBeLessThan(3760);
    expect(indexMetrics.physicalLines).toBeLessThan(3956);
  });
});
