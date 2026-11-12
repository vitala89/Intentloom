import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { measureProductionSource } from "../scripts/production-file-metrics.mjs";
import {
  applicationCycles,
  relativeSpecifiers,
} from "./application-source-cycles.js";
import { readModelPath } from "./workspace-read-model-p1h7-fixtures.ts";

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

describe("P1H.7 interactive workspace read model structure", () => {
  it("keeps the read model outside every cycle and inside the source budgets", () => {
    const source = readFileSync(readModelPath, "utf8");
    const indexSource = readFileSync(
      "packages/application/src/index.ts",
      "utf8",
    );
    expect(existsSync("packages/application/src/workspace/index.ts")).toBe(
      false,
    );
    expect(
      relativeSpecifiers("workspace/interactive-workspace-read-model.ts", true),
    ).toEqual([
      "@intentloom/core",
      "@intentloom/protocol",
      "../agent-session/agent-session.js",
      "../host-file-system.js",
      "../security/security-audit-report-store.js",
    ]);
    expect(source).not.toContain("continuous-security-audit");
    expect(source).not.toContain("index.js");
    expect(source).not.toContain("@intentloom/application");
    expect(indexSource).toContain(
      "return assembleInteractiveWorkspaceState(options, fs, {",
    );
    expect(indexSource).toContain(
      "return assembleLocalWorkspaceSyncState(options, fs, {",
    );
    expect(indexSource).toContain("export type { LocalWorkspaceSyncState }");
    expect(indexSource).not.toContain("interface LocalWorkspaceSyncState");
    expect(indexSource).toContain("export interface InteractiveWorkspaceState");

    const importComponents = applicationCycles(false);
    const reexportComponents = applicationCycles(true);
    expect(importComponents.map((component) => component.length)).toEqual([
      3, 3,
    ]);
    expect(reexportComponents.map((component) => component.length)).toEqual([
      4, 29, 3,
    ]);
    expect(importComponents[0]).toEqual([
      "approved-apply-baseline.ts",
      "generated-file-sync-declared.ts",
      "index.ts",
    ]);
    expect(importComponents[1]).toEqual([
      "neutron/mutation/apply/neutron-mutation-apply-durable-record.ts",
      "neutron/mutation/apply/neutron-mutation-apply-store.ts",
      "neutron/mutation/verification/neutron-mutation-verification-retry-eligibility.ts",
    ]);
    expect(reexportComponents[0]).toEqual([
      "apply-extension-update.ts",
      "discover-and-apply-extension-update.ts",
      "extension-update-files.ts",
      "propose-and-apply-extension-adoption.ts",
    ]);
    expect(reexportComponents[2]).toEqual(importComponents[1]);
    const members = reexportComponents.flat();
    expect(members).not.toContain(
      "workspace/interactive-workspace-read-model.ts",
    );
    expect(importComponents.flat()).not.toContain(
      "workspace/interactive-workspace-read-model.ts",
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
    expect(
      readFileSync("docs/governance/quality-exceptions.json", "utf8"),
    ).not.toContain("interactive-workspace-read-model");

    const moduleMetrics = measureProductionSource(source, readModelPath);
    const indexMetrics = measureProductionSource(
      indexSource,
      "packages/application/src/index.ts",
    );
    expect(moduleMetrics).toMatchObject({
      effectiveCodeLines: 205,
      physicalLines: 219,
    });
    expect(moduleMetrics.effectiveCodeLines).toBeLessThanOrEqual(250);
    expect(indexMetrics).toMatchObject({
      effectiveCodeLines: 1878,
      physicalLines: 2034,
    });
    expect(indexMetrics.effectiveCodeLines).toBeLessThan(4547);
    expect(indexMetrics.physicalLines).toBeLessThan(4769);
    const functions = functionSlices(source).map((slice) => ({
      name: slice.name,
      ...measureProductionSource(slice.source, readModelPath),
    }));
    expect(functions.map((slice) => slice.name)).toEqual([
      "assembleInteractiveWorkspaceState",
      "assembleLocalWorkspaceSyncState",
    ]);
    expect(functions[0]).toMatchObject({
      effectiveCodeLines: 64,
      physicalLines: 65,
    });
    expect(functions[1]).toMatchObject({
      effectiveCodeLines: 41,
      physicalLines: 41,
    });
    for (const slice of functions) {
      expect(slice.effectiveCodeLines).toBeLessThanOrEqual(80);
      expect(slice.physicalLines).toBeLessThanOrEqual(80);
    }
  });
});
