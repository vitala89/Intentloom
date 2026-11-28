import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, sep } from "node:path";
import { describe, expect, it } from "vitest";
import * as application from "../packages/application/src/index.js";
import * as conversationLeaf from "../packages/application/src/workspace/workspace-conversation-store.js";
import { measureProductionSource } from "../scripts/production-file-metrics.mjs";
import { applicationCycles } from "./application-source-cycles.js";

const sourceRoot = "packages/application/src";
const leafPath = `${sourceRoot}/workspace/workspace-conversation-store.ts`;
const indexPath = `${sourceRoot}/index.ts`;

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

const publicConversationExports = [
  "appendWorkspaceMessage",
  "getWorkspaceConversation",
  "listWorkspaceConversations",
  "startWorkspaceConversation",
] as const;

const movedFunctions = {
  workspaceConversationPath: { effectiveCodeLines: 6, physicalLines: 6 },
  startWorkspaceConversation: { effectiveCodeLines: 26, physicalLines: 28 },
  getWorkspaceConversation: { effectiveCodeLines: 13, physicalLines: 13 },
  redactWorkspaceSecrets: { effectiveCodeLines: 15, physicalLines: 15 },
  appendWorkspaceMessage: { effectiveCodeLines: 31, physicalLines: 35 },
  listWorkspaceConversations: { effectiveCodeLines: 29, physicalLines: 30 },
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

describe("P1K.8 workspace conversation store structure", () => {
  it("extracts conversation persistence into a dedicated workspace leaf", () => {
    expect(existsSync(leafPath)).toBe(true);
    expect(existsSync(`${sourceRoot}/workspace/index.ts`)).toBe(false);

    const indexSource = readFileSync(indexPath, "utf8");
    const leaf = readFileSync(leafPath, "utf8");

    for (const name of [
      "workspaceConversationPath",
      "startWorkspaceConversation",
      "getWorkspaceConversation",
      "redactWorkspaceSecrets",
      "appendWorkspaceMessage",
      "listWorkspaceConversations",
    ] as const) {
      expect(indexSource).not.toMatch(new RegExp(`function ${name}\\(`));
    }

    expect(indexSource).toMatch(
      /from "\.\/workspace\/workspace-conversation-store\.js";/,
    );
    expect(indexSource).toMatch(
      /export \{[\s\S]*startWorkspaceConversation,[\s\S]*appendWorkspaceMessage,[\s\S]*\};/,
    );

    for (const name of publicConversationExports) {
      const implementations = typescriptFiles(sourceRoot).filter((file) =>
        new RegExp(`export async function ${name}\\(`).test(
          readFileSync(file, "utf8"),
        ),
      );
      expect(implementations.map((f) => f.split(sep).join("/"))).toEqual([
        leafPath,
      ]);
      expect(typeof application[name]).toBe("function");
      expect(application[name]).toBe(conversationLeaf[name]);
    }

    expect(Object.keys(conversationLeaf).toSorted()).toEqual(
      [...publicConversationExports].toSorted(),
    );
    expect("redactWorkspaceSecrets" in conversationLeaf).toBe(false);
    expect("workspaceConversationPath" in conversationLeaf).toBe(false);

    expect(leaf).not.toMatch(/from ["'][^"']*index\.js["']/);
    expect(leaf).not.toMatch(/import\(["'][^"']*index\.js["']\)/);
    expect(leaf).not.toContain("@intentloom/application");
    expect(leaf).not.toMatch(/from ["'][^"']*\/neutron\//);
    expect(leaf).not.toMatch(/workspace-proposal/);
    expect(leaf).not.toMatch(/approved-apply/);

    const readModel = readFileSync(
      `${sourceRoot}/workspace/interactive-workspace-read-model.ts`,
      "utf8",
    );
    expect(readModel).not.toContain("workspace-conversation-store");

    for (const file of typescriptFiles(`${sourceRoot}/neutron`)) {
      expect(readFileSync(file, "utf8")).not.toContain(
        "workspace-conversation-store",
      );
    }

    for (const file of [
      "packages/cli/src/workspace-command.ts",
      "packages/cli/src/ui-command.ts",
      "packages/cli/src/neutron-command.ts",
    ]) {
      const source = readFileSync(file, "utf8");
      expect(source).toContain('from "@intentloom/application"');
      expect(source).not.toContain("workspace-conversation-store");
    }

    const exceptions = readFileSync(
      "docs/governance/quality-exceptions.json",
      "utf8",
    );
    expect(exceptions).not.toContain("workspace-conversation-store");
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
    expect(members).not.toContain("workspace/workspace-conversation-store.ts");
    expect(
      applicationCycles(false).map((component) => component.length),
    ).toEqual([3]);
    expect(
      applicationCycles(true).map((component) => component.length),
    ).toEqual([4, 27, 3]);

    const leafMetrics = measureProductionSource(leaf, leafPath);
    expect(leafMetrics).toMatchObject({
      effectiveCodeLines: 129,
      physicalLines: 142,
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
      ).toBeLessThanOrEqual(80);
    }

    const indexMetrics = measureProductionSource(indexSource, indexPath);
    expect(indexMetrics).toMatchObject({
      effectiveCodeLines: 742,
      physicalLines: 777,
    });
    expect(indexMetrics.effectiveCodeLines).toBeLessThan(965);
    expect(indexMetrics.physicalLines).toBeLessThan(1023);

    expect(indexSource).toMatch(
      /export async function syncLocalWorkspaceState\(/,
    );
    expect(indexSource).toContain("listWorkspaceConversations");
    expect(indexSource).toMatch(
      /export async function promoteWorkspaceConversationToProposal\(/,
    );
  });
});
