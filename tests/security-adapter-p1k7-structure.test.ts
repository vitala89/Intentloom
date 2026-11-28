import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, sep } from "node:path";
import { describe, expect, it } from "vitest";
import * as application from "../packages/application/src/index.js";
import * as correlationLeaf from "../packages/application/src/security/security-adapter-correlation.js";
import * as runLeaf from "../packages/application/src/security/security-adapter-run.js";
import { measureProductionSource } from "../scripts/production-file-metrics.mjs";
import { applicationCycles } from "./application-source-cycles.js";

const sourceRoot = "packages/application/src";
const indexPath = `${sourceRoot}/index.ts`;
const securityModules = [
  `${sourceRoot}/security/security-adapter-correlation.ts`,
  `${sourceRoot}/security/security-adapter-dependency.ts`,
  `${sourceRoot}/security/security-adapter-secret.ts`,
  `${sourceRoot}/security/security-adapter-config.ts`,
  `${sourceRoot}/security/security-adapter-mcp.ts`,
  `${sourceRoot}/security/security-adapter-run.ts`,
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

const functionsByModule: Record<(typeof securityModules)[number], string[]> = {
  [securityModules[0]]: ["correlateSecurityFindings"],
  [securityModules[1]]: ["scanDependencyCategory"],
  [securityModules[2]]: ["scanSecretCategory"],
  [securityModules[3]]: ["scanConfigCategory"],
  [securityModules[4]]: ["scanMcpCategory"],
  [securityModules[5]]: [
    "createFindingIdAllocator",
    "collectCategoryFindings",
    "persistCorrelatedFindings",
    "buildAdapterResult",
    "runLocalSecurityAdapters",
  ],
};

const movedFunctions = {
  correlateSecurityFindings: { effectiveCodeLines: 25, physicalLines: 25 },
  scanDependencyCategory: { effectiveCodeLines: 45, physicalLines: 45 },
  scanSecretCategory: { effectiveCodeLines: 40, physicalLines: 41 },
  scanConfigCategory: { effectiveCodeLines: 32, physicalLines: 32 },
  scanMcpCategory: { effectiveCodeLines: 43, physicalLines: 43 },
  createFindingIdAllocator: { effectiveCodeLines: 3, physicalLines: 3 },
  collectCategoryFindings: { effectiveCodeLines: 31, physicalLines: 31 },
  persistCorrelatedFindings: { effectiveCodeLines: 13, physicalLines: 13 },
  buildAdapterResult: { effectiveCodeLines: 21, physicalLines: 22 },
  runLocalSecurityAdapters: { effectiveCodeLines: 28, physicalLines: 31 },
} as const;

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

describe("P1K.7 security adapter structure", () => {
  it("extracts adapter execution into dedicated security leaves", async () => {
    for (const modulePath of securityModules) {
      expect(existsSync(modulePath)).toBe(true);
    }
    expect(existsSync(`${sourceRoot}/security/index.ts`)).toBe(false);

    const indexSource = readFileSync(indexPath, "utf8");
    expect(indexSource).not.toMatch(/function correlateSecurityFindings\(/);
    expect(indexSource).not.toMatch(/function runLocalSecurityAdapters\(/);
    expect(indexSource).toMatch(
      /export \{ correlateSecurityFindings \} from "\.\/security\/security-adapter-correlation\.js";/,
    );
    expect(indexSource).toMatch(
      /export \{ runLocalSecurityAdapters \} from "\.\/security\/security-adapter-run\.js";/,
    );

    const correlateImplementations = typescriptFiles(sourceRoot).filter(
      (file) =>
        /export function correlateSecurityFindings\(/.test(
          readFileSync(file, "utf8"),
        ),
    );
    const runImplementations = typescriptFiles(sourceRoot).filter((file) =>
      /export async function runLocalSecurityAdapters\(/.test(
        readFileSync(file, "utf8"),
      ),
    );
    expect(correlateImplementations.map((f) => f.split(sep).join("/"))).toEqual(
      [securityModules[0]],
    );
    expect(runImplementations.map((f) => f.split(sep).join("/"))).toEqual([
      securityModules[5],
    ]);

    expect(Object.keys(correlationLeaf)).toEqual(["correlateSecurityFindings"]);
    expect(Object.keys(runLeaf)).toEqual(["runLocalSecurityAdapters"]);
    expect(typeof application.correlateSecurityFindings).toBe("function");
    expect(typeof application.runLocalSecurityAdapters).toBe("function");
    expect(application.correlateSecurityFindings).toBe(
      correlationLeaf.correlateSecurityFindings,
    );
    expect(application.runLocalSecurityAdapters).toBe(
      runLeaf.runLocalSecurityAdapters,
    );
    expect("scanDependencyCategory" in application).toBe(false);
    expect("scanSecretCategory" in application).toBe(false);
    expect("scanConfigCategory" in application).toBe(false);
    expect("scanMcpCategory" in application).toBe(false);

    for (const modulePath of securityModules) {
      const leaf = readFileSync(modulePath, "utf8");
      expect(leaf).not.toMatch(/from ["'][^"']*index\.js["']/);
      expect(leaf).not.toMatch(/import\(["'][^"']*index\.js["']\)/);
      expect(leaf).not.toContain("@intentloom/application");
      expect(leaf).not.toMatch(/from ["'][^"']*\/neutron\//);
    }

    const securityCommand = readFileSync(
      "packages/cli/src/security-operations-command.ts",
      "utf8",
    );
    expect(securityCommand).toContain('from "@intentloom/application"');
    expect(securityCommand).toContain("runLocalSecurityAdapters");
    expect(securityCommand).not.toContain("security-adapter-run");

    for (const file of typescriptFiles(`${sourceRoot}/neutron`)) {
      expect(readFileSync(file, "utf8")).not.toContain("security-adapter");
    }

    const exceptions = readFileSync(
      "docs/governance/quality-exceptions.json",
      "utf8",
    );
    expect(exceptions).not.toContain("security-adapter-correlation");
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
    for (const modulePath of securityModules) {
      expect(members).not.toContain(modulePath.replace(`${sourceRoot}/`, ""));
    }
    expect(
      applicationCycles(false).map((component) => component.length),
    ).toEqual([3]);
    expect(
      applicationCycles(true).map((component) => component.length),
    ).toEqual([4, 27, 3]);

    const metricsByFile: Record<
      string,
      ReturnType<typeof measureProductionSource>
    > = {};
    for (const modulePath of securityModules) {
      const leaf = readFileSync(modulePath, "utf8");
      metricsByFile[modulePath] = measureProductionSource(leaf, modulePath);
      expect(metricsByFile[modulePath]?.effectiveCodeLines).toBeLessThanOrEqual(
        250,
      );
      const slices = functionSlices(leaf);
      expect(slices.map((slice) => slice.name)).toEqual(
        functionsByModule[modulePath],
      );
      for (const slice of slices) {
        const name = slice.name as keyof typeof movedFunctions;
        expect(measureProductionSource(slice.source, modulePath)).toMatchObject(
          movedFunctions[name],
        );
        expect(
          measureProductionSource(slice.source, modulePath).effectiveCodeLines,
        ).toBeLessThanOrEqual(80);
      }
    }

    const indexMetrics = measureProductionSource(indexSource, indexPath);
    expect(indexMetrics).toMatchObject({
      effectiveCodeLines: 742,
      physicalLines: 777,
    });

    expect(metricsByFile[securityModules[0]]).toMatchObject({
      effectiveCodeLines: 29,
      physicalLines: 30,
    });
    expect(metricsByFile[securityModules[1]]).toMatchObject({
      effectiveCodeLines: 51,
      physicalLines: 52,
    });
    expect(metricsByFile[securityModules[2]]).toMatchObject({
      effectiveCodeLines: 47,
      physicalLines: 49,
    });
    expect(metricsByFile[securityModules[3]]).toMatchObject({
      effectiveCodeLines: 37,
      physicalLines: 38,
    });
    expect(metricsByFile[securityModules[4]]).toMatchObject({
      effectiveCodeLines: 49,
      physicalLines: 50,
    });
    expect(metricsByFile[securityModules[5]]).toMatchObject({
      effectiveCodeLines: 122,
      physicalLines: 132,
    });
  });
});
