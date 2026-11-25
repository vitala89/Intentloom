import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, sep } from "node:path";
import { describe, expect, it } from "vitest";
import * as application from "../packages/application/src/index.js";
import { measureProductionSource } from "../scripts/production-file-metrics.mjs";
import { applicationCycles } from "./application-source-cycles.js";

const sourceRoot = "packages/application/src";
const leafPath = `${sourceRoot}/memory/semantic-ranking.ts`;
const indexPath = `${sourceRoot}/index.ts`;
const checkpointLeafPath = `${sourceRoot}/memory/task-checkpoint-store.ts`;

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

const movedFunctions = {
  getSemanticRankingConfig: { effectiveCodeLines: 23, physicalLines: 23 },
  updateSemanticRankingConfig: { effectiveCodeLines: 14, physicalLines: 14 },
  normalizeSemanticQueryTerms: { effectiveCodeLines: 6, physicalLines: 6 },
  scoreSemanticProposalItems: { effectiveCodeLines: 31, physicalLines: 31 },
  scoreSemanticEvaluationItems: { effectiveCodeLines: 31, physicalLines: 31 },
  rankProceduralMemory: { effectiveCodeLines: 33, physicalLines: 37 },
} as const;

const semanticExportNames = [
  "getSemanticRankingConfig",
  "rankProceduralMemory",
  "updateSemanticRankingConfig",
] as const;

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

function typescriptFiles(directory: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...typescriptFiles(path));
    else if (entry.name.endsWith(".ts")) files.push(path);
  }
  return files;
}

describe("P1K.5 semantic ranking structure", () => {
  it("keeps the semantic ranking leaf outside the unchanged application cycles", async () => {
    expect(existsSync(leafPath)).toBe(true);
    expect(existsSync(`${sourceRoot}/memory/index.ts`)).toBe(false);
    const leaf = readFileSync(leafPath, "utf8");
    const indexSource = readFileSync(indexPath, "utf8");
    const leafModule =
      await import("../packages/application/src/memory/semantic-ranking.ts");

    for (const name of semanticExportNames) {
      const pattern = new RegExp(`export async function ${name}\\(`);
      const implementations = typescriptFiles(sourceRoot).filter((file) =>
        pattern.test(readFileSync(file, "utf8")),
      );
      expect(implementations.map((file) => file.split(sep).join("/"))).toEqual([
        leafPath,
      ]);
    }

    expect(Object.keys(leafModule).toSorted()).toEqual([
      ...semanticExportNames,
    ]);
    expect(
      [...leaf.matchAll(/from\s+["']([^"']+)["']/g)].map((match) => match[1]),
    ).toEqual([
      "node:path",
      "@intentloom/protocol",
      "../host-file-system.js",
      "../project-path.js",
      "../skills/skill-evaluation.js",
      "../skills/skill-proposal-store.js",
    ]);
    expect(leaf).not.toMatch(/from ["'][^"']*index\.js["']/);
    expect(leaf).not.toMatch(/import\(["'][^"']*index\.js["']\)/);
    expect(leaf).not.toContain("@intentloom/application");
    expect(leaf).not.toMatch(/from ["'][^"']*\/neutron\//);

    for (const name of semanticExportNames) {
      expect(indexSource).not.toMatch(new RegExp(`function ${name}\\(`));
      expect(typeof application[name]).toBe("function");
      expect(application[name]).toBe(leafModule[name]);
    }

    expect(indexSource).toMatch(
      /import \{\s*getSemanticRankingConfig,\s*rankProceduralMemory,\s*updateSemanticRankingConfig,\s*\} from "\.\/memory\/semantic-ranking\.js";/,
    );
    expect(indexSource).toMatch(
      /export \{[\s\S]*getSemanticRankingConfig,[\s\S]*updateSemanticRankingConfig,[\s\S]*\};/,
    );
    expect(indexSource).not.toContain('from "./memory/index.js"');

    const checkpointLeaf = readFileSync(checkpointLeafPath, "utf8");
    expect(checkpointLeaf).not.toContain("semantic-ranking");

    for (const file of typescriptFiles(`${sourceRoot}/neutron`)) {
      expect(readFileSync(file, "utf8")).not.toContain("semantic-ranking");
    }
    for (const file of ["packages/cli/src/rank-command.ts"]) {
      const source = readFileSync(file, "utf8");
      expect(source).toContain('@intentloom/application"');
      expect(source).not.toContain("semantic-ranking");
    }

    const exceptions = readFileSync(
      "docs/governance/quality-exceptions.json",
      "utf8",
    );
    expect(exceptions).not.toContain("semantic-ranking");
    expect(exceptions).toContain('"effectiveCodeLines": 6764');
    expect(exceptions).toContain('"physicalLines": 7151');
    expect(createHash("sha256").update(exceptions).digest("hex")).toBe(
      "34bd87ec22b79503e4eb1c47e09d661f3c2ef09dfc5109c38819a7388f4b936a",
    );

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
    expect(members).not.toContain("memory/semantic-ranking.ts");
    expect(members).not.toContain("memory/task-checkpoint-store.ts");
    expect(members).not.toContain("memory/task-session-summary-store.ts");
    expect(members).not.toContain("memory/role-delegation.ts");
    expect(members).not.toContain("memory/profile-store.ts");
    expect(
      applicationCycles(false).map((component) => component.length),
    ).toEqual([3]);
    expect(
      applicationCycles(true).map((component) => component.length),
    ).toEqual([4, 27, 3]);

    const leafMetrics = measureProductionSource(leaf, leafPath);
    expect(leafMetrics).toMatchObject({
      effectiveCodeLines: 153,
      physicalLines: 163,
    });
    expect(leafMetrics.effectiveCodeLines).toBeLessThanOrEqual(250);
    const slices = functionSlices(leaf);
    expect(slices.map((slice) => slice.name)).toEqual(
      Object.keys(movedFunctions),
    );
    for (const slice of slices) {
      const name = slice.name as keyof typeof movedFunctions;
      expect(measureProductionSource(slice.source, leafPath)).toMatchObject(
        movedFunctions[name],
      );
      expect(
        measureProductionSource(slice.source, leafPath).effectiveCodeLines,
      ).toBeLessThanOrEqual(40);
    }

    const indexMetrics = measureProductionSource(indexSource, indexPath);
    expect(indexMetrics).toMatchObject({
      effectiveCodeLines: 965,
      physicalLines: 1023,
    });
    expect(indexMetrics.effectiveCodeLines).toBeLessThan(1388);
    expect(indexMetrics.physicalLines).toBeLessThan(1483);
  });
});
