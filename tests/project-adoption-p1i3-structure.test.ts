import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import * as application from "../packages/application/src/index.js";
import { measureProductionSource } from "../scripts/production-file-metrics.mjs";
import { applicationCycles } from "./application-source-cycles.js";

const sourceRoot = "packages/application/src";

const modules = [
  "project-adoption/generated-file-adoption-contracts.ts",
  "project-adoption/generated-file-adoption-mappings.ts",
  "project-adoption/generated-file-adoption-classification.ts",
  "project-adoption/generated-file-adoption-outcome.ts",
  "project-adoption/generated-file-adoption.ts",
  "project-adoption/governance-adoption-contracts.ts",
  "project-adoption/governance-adoption-artifacts.ts",
  "project-adoption/governance-adoption-plan.ts",
  "project-adoption/governance-adoption-apply.ts",
] as const;

const importComponents = [
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
  ],
  importComponents[0],
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

describe("P1I.3 existing project adoption structure", () => {
  it("keeps adoption leaves outside the retargeted Approved Apply cycles", () => {
    expect(existsSync(`${sourceRoot}/project-adoption/index.ts`)).toBe(false);
    expect(
      existsSync(
        `${sourceRoot}/project-adoption/governance-adoption-journal.ts`,
      ),
    ).toBe(false);
    for (const relativePath of modules)
      expect(existsSync(`${sourceRoot}/${relativePath}`)).toBe(true);

    const indexSource = readFileSync(`${sourceRoot}/index.ts`, "utf8");
    expect(indexSource).toMatch(
      /export async function adoptProject\(\s*options: InitOptions,\s*fs: FileSystem,\s*transactionOptions: TransactionOptions = \{\},/,
    );
    expect(indexSource).toMatch(
      /return adoptGeneratedFiles\(\s*options,\s*fs,\s*transactionOptions,\s*syncProject\s*[,)]/,
    );
    expect(indexSource).toMatch(/export async function planPackUpdate\(/);
    expect(indexSource).toMatch(/planProjectAdoption\(/);
    expect(indexSource).toMatch(
      /export \{ applyProjectAdoption \} from "\.\/project-adoption\/governance-adoption-apply\.js"/,
    );

    expect(typeof application.adoptProject).toBe("function");
    expect(typeof application.planProjectAdoption).toBe("function");
    expect(typeof application.applyProjectAdoption).toBe("function");
    expect(typeof application.planPackUpdate).toBe("function");
    expect("adoptGeneratedFiles" in application).toBe(false);
    for (const name of [
      "AdoptionAction",
      "AdoptionProposalItem",
      "AdoptionProposal",
      "AdoptionTransactionOutcome",
      "PlanProjectAdoptionOptions",
      "ApplyProjectAdoptionOptions",
      "AdoptionApplyResult",
    ])
      expect(indexSource).toContain(name);

    const exceptions = readFileSync(
      "docs/governance/quality-exceptions.json",
      "utf8",
    );
    expect(exceptions).not.toContain("project-adoption");
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
    expect(applicationCycles(false).flat()).not.toContain("index.ts");
    expect(members).not.toContain("approved-apply-baseline.ts");
    expect(members).not.toContain("generated-file-sync-declared.ts");
    expect(members).toContain("index.ts");
    expect(members).toContain("approved-apply-engine.ts");
    expect(applicationCycles(true)[1]).toHaveLength(27);
    const baseline = readFileSync(
      `${sourceRoot}/approved-apply-baseline.ts`,
      "utf8",
    );
    const declared = readFileSync(
      `${sourceRoot}/generated-file-sync-declared.ts`,
      "utf8",
    );
    const engine = readFileSync(
      `${sourceRoot}/approved-apply-engine.ts`,
      "utf8",
    );
    expect(baseline).not.toMatch(/from ["']\.\/index\.js["']/);
    expect(baseline).toContain(
      'import type { FileSystem } from "./host-file-system.js"',
    );
    expect(declared).not.toMatch(/from ["']\.\/index\.js["']/);
    expect(declared).toContain(
      'import type { FileSystem } from "./host-file-system.js"',
    );
    expect(declared).toContain(
      'import type { Plan } from "./project-change.js"',
    );
    expect(declared).toContain(
      'from "./generated-file/transaction-contracts.js"',
    );
    expect(declared).toContain("PostWriteValidationResult");
    expect(declared).toContain("TransactionOptions");
    expect(declared).toContain("TransactionResult");
    expect(declared).toContain("TransactionStage");
    expect(declared).toContain(
      'import { ApplyBlockedBeforeWrite } from "./approved-apply-baseline.js"',
    );
    expect(engine).toMatch(/from ["']\.\/index\.js["']/);
    expect(engine).toContain("synchronizeGeneratedFiles");

    for (const relativePath of modules) {
      expect(members).not.toContain(relativePath);
      const source = readFileSync(`${sourceRoot}/${relativePath}`, "utf8");
      expect(source).not.toMatch(/from ["'][^"']*index\.js["']/);
      const metrics = measureProductionSource(source, relativePath);
      expect(metrics.effectiveCodeLines).toBeLessThanOrEqual(250);
      expect(metrics.physicalLines).toBeLessThanOrEqual(700);
      for (const slice of functionSlices(source)) {
        const sized = measureProductionSource(slice.source, relativePath);
        expect(sized.effectiveCodeLines).toBeLessThanOrEqual(80);
      }
    }

    const indexMetrics = measureProductionSource(
      indexSource,
      `${sourceRoot}/index.ts`,
    );
    expect(indexMetrics).toMatchObject({
      effectiveCodeLines: 1804,
      physicalLines: 1953,
    });
    expect(indexMetrics.effectiveCodeLines).toBeLessThan(2561);
    expect(indexMetrics.physicalLines).toBeLessThan(2736);
  });
});
