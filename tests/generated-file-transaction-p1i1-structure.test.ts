import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import * as application from "../packages/application/src/index.js";
import { measureProductionSource } from "../scripts/production-file-metrics.mjs";
import { applicationCycles } from "./application-source-cycles.js";

const sourceRoot = "packages/application/src";

const modules = {
  "project-change.ts": { effectiveCodeLines: 18, physicalLines: 20 },
  "generated-file/sync-mode.ts": { effectiveCodeLines: 9, physicalLines: 11 },
  "generated-file/transaction-contracts.ts": {
    effectiveCodeLines: 90,
    physicalLines: 98,
  },
  "generated-file/transaction-metadata.ts": {
    effectiveCodeLines: 116,
    physicalLines: 126,
  },
  "generated-file/transaction-summary.ts": {
    effectiveCodeLines: 52,
    physicalLines: 54,
  },
  "generated-file/transaction-path-safety.ts": {
    effectiveCodeLines: 70,
    physicalLines: 74,
  },
  "generated-file/post-write-metadata-checks.ts": {
    effectiveCodeLines: 189,
    physicalLines: 199,
  },
  "generated-file/post-write-version-checks.ts": {
    effectiveCodeLines: 89,
    physicalLines: 93,
  },
  "generated-file/post-write-consistency.ts": {
    effectiveCodeLines: 188,
    physicalLines: 196,
  },
  "generated-file/post-write-checksum-cascade.ts": {
    effectiveCodeLines: 98,
    physicalLines: 101,
  },
  "generated-file/transaction-rollback.ts": {
    effectiveCodeLines: 34,
    physicalLines: 35,
  },
  "generated-file/generated-file-transaction-plan.ts": {
    effectiveCodeLines: 86,
    physicalLines: 91,
  },
  "generated-file/generated-file-transaction.ts": {
    effectiveCodeLines: 210,
    physicalLines: 219,
  },
} as const;

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

describe("P1I.1 generated-file transaction structure", () => {
  it("keeps the extracted modules outside every cycle and inside the source budgets", () => {
    expect(existsSync(`${sourceRoot}/generated-file/index.ts`)).toBe(false);
    const indexSource = readFileSync(`${sourceRoot}/index.ts`, "utf8");
    const declaredSource = readFileSync(
      `${sourceRoot}/generated-file-sync-declared.ts`,
      "utf8",
    );
    expect(indexSource).toContain("return commitOwnedGeneratedFiles(");
    expect(indexSource).toContain(
      "isDeclaredPathsOnlySyncMode(options.syncMode)",
    );
    expect(indexSource).not.toContain(
      "function validateCommittedOwnershipState",
    );
    expect(indexSource).not.toContain("function buildTransactionMetadata");
    expect(indexSource).not.toContain("function collisionPlan");
    expect(indexSource).not.toContain("manifest-json-malformed");
    expect(indexSource).toContain(
      'export type { Change, ChangeKind, Plan } from "./project-change.js"',
    );
    expect(indexSource).toContain(
      "export type {\n  InvalidPostWriteValidation,\n  PostWriteCorruptionCode,",
    );
    expect("commitOwnedGeneratedFiles" in application).toBe(false);
    expect("TransactionMetadata" in application).toBe(false);
    expect(typeof application.synchronizeGeneratedFiles).toBe("function");
    expect(application.GENERATED_FILE_SYNC_DECLARED_PATHS_ONLY).toBe(
      "declared-paths-only",
    );

    const exceptions = readFileSync(
      "docs/governance/quality-exceptions.json",
      "utf8",
    );
    expect(exceptions).not.toContain("generated-file/");
    expect(exceptions).not.toContain("project-change.ts");
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

    const imports = applicationCycles(false);
    const reexports = applicationCycles(true);
    expect(imports).toEqual(importComponents);
    expect(reexports).toEqual(reexportComponents);
    const members = [...imports.flat(), ...reexports.flat()];
    for (const relativePath of Object.keys(modules)) {
      expect(members).not.toContain(relativePath);
      const source = readFileSync(`${sourceRoot}/${relativePath}`, "utf8");
      expect(source).not.toMatch(/from ["'][^"']*index\.js["']/);
      expect(source).not.toContain("generated-file-sync-declared");
      expect(source).not.toContain("approved-apply");
      expect(measureProductionSource(source, relativePath)).toMatchObject(
        modules[relativePath as keyof typeof modules],
      );
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
      effectiveCodeLines: 2561,
      physicalLines: 2736,
    });
    expect(indexMetrics.effectiveCodeLines).toBeLessThan(4547);
    const declaredMetrics = measureProductionSource(
      declaredSource,
      `${sourceRoot}/generated-file-sync-declared.ts`,
    );
    expect(declaredMetrics).toMatchObject({
      effectiveCodeLines: 302,
      physicalLines: 314,
    });
    expect(declaredMetrics.effectiveCodeLines).toBeLessThanOrEqual(302);
    expect(declaredMetrics.physicalLines).toBeLessThanOrEqual(317);
  });
});
