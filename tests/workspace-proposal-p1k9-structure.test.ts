import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, sep } from "node:path";
import { describe, expect, it } from "vitest";
import * as application from "../packages/application/src/index.js";
import * as proposalLeaf from "../packages/application/src/workspace/workspace-proposal-lifecycle.ts";
import { measureProductionSource } from "../scripts/production-file-metrics.mjs";
import { applicationCycles } from "./application-source-cycles.js";

const sourceRoot = "packages/application/src";
const leafPath = `${sourceRoot}/workspace/workspace-proposal-lifecycle.ts`;
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

const publicProposalExports = [
  "promoteWorkspaceConversationToProposal",
  "reviewWorkspaceProposal",
  "applyWorkspaceProposal",
] as const;

const movedOperationNames = [
  "workspaceProposalPath",
  "promoteWorkspaceConversationToProposalOperation",
  "reviewWorkspaceProposalOperation",
  "applyWorkspaceProposalOperation",
] as const;

function typescriptFiles(dir: string): string[] {
  return readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".ts"))
    .map((entry) => join(entry.parentPath ?? entry.path, entry.name));
}

function functionSlices(source: string): { name: string; source: string }[] {
  const slices: { name: string; source: string }[] = [];
  const declaration =
    /(?:^|\n)(?:export\s+)?(?:async\s+)?function\s+([A-Za-z0-9_]+)/g;
  let match: RegExpExecArray | null;
  while ((match = declaration.exec(source)) !== null) {
    const name = match[1];
    const start = match.index + (match[0].startsWith("\n") ? 1 : 0);
    const next = declaration.exec(source);
    const end = next ? next.index : source.length;
    declaration.lastIndex = next ? next.index : source.length;
    slices.push({ name, source: source.slice(start, end) });
    if (!next) break;
  }
  return slices;
}

describe("P1K.9 workspace proposal lifecycle structure", () => {
  it("keeps one implementation per moved operation and leaves the barrel as wrappers", () => {
    expect(existsSync(`${sourceRoot}/workspace/index.ts`)).toBe(false);

    const indexSource = readFileSync(indexPath, "utf8");
    const leaf = readFileSync(leafPath, "utf8");

    expect(indexSource).not.toMatch(/function workspaceProposalPath\(/);
    expect(indexSource).toMatch(
      /from "\.\/workspace\/workspace-proposal-lifecycle\.js";/,
    );
    expect(indexSource).toMatch(
      /export async function promoteWorkspaceConversationToProposal\(/,
    );
    expect(indexSource).toMatch(/export type \{ WorkspaceProposalReviewResult \}/);

    for (const name of publicProposalExports) {
      const implementations = typescriptFiles(sourceRoot).filter((file) =>
        new RegExp(`export async function ${name}\\(`).test(
          readFileSync(file, "utf8"),
        ),
      );
      expect(implementations.map((f) => f.split(sep).join("/"))).toEqual([
        indexPath,
      ]);
      expect(typeof application[name]).toBe("function");
      expect(application[name]).not.toBe(
        proposalLeaf[`${name}Operation` as keyof typeof proposalLeaf],
      );
    }

    const operationNames = [
      "promoteWorkspaceConversationToProposalOperation",
      "reviewWorkspaceProposalOperation",
      "applyWorkspaceProposalOperation",
    ] as const;
    for (const name of operationNames) {
      const implementations = typescriptFiles(sourceRoot).filter((file) =>
        readFileSync(file, "utf8").includes(`function ${name}(`),
      );
      expect(implementations.map((f) => f.split(sep).join("/"))).toEqual([
        leafPath,
      ]);
    }

    expect(leaf).not.toMatch(/from ["'][^"']*index\.js["']/);
    expect(leaf).not.toMatch(/import\(["'][^"']*index\.js["']\)/);
    expect(leaf).not.toContain("@intentloom/application");
    expect(leaf).not.toMatch(/from ["'][^"']*\/neutron\//);
    expect(leaf).not.toMatch(/approved-apply/);
    expect(leaf).not.toMatch(/export async function promoteWorkspaceConversationToProposal\(/);

    expect(applicationCycles(false)).toEqual(importComponents);
    expect(applicationCycles(true)).toEqual(reexportComponents);
    const members = [
      ...applicationCycles(false).flat(),
      ...applicationCycles(true).flat(),
    ];
    expect(members).not.toContain("workspace/workspace-proposal-lifecycle.ts");
    expect(
      applicationCycles(false).map((component) => component.length),
    ).toEqual([3]);
    expect(
      applicationCycles(true).map((component) => component.length),
    ).toEqual([4, 27, 3]);

    const leafMetrics = measureProductionSource(leaf, leafPath);
    expect(leafMetrics.effectiveCodeLines).toBeLessThanOrEqual(250);
    expect(leafMetrics.effectiveCodeLines).toBe(123);
    expect(leafMetrics.physicalLines).toBe(135);

    const slices = functionSlices(leaf);
    const sliceNames = slices.map((slice) => slice.name);
    expect(sliceNames).toEqual(expect.arrayContaining(movedOperationNames));
    for (const slice of slices) {
      if (!movedOperationNames.includes(slice.name as (typeof movedOperationNames)[number])) {
        continue;
      }
      expect(
        measureProductionSource(slice.source, leafPath).effectiveCodeLines,
      ).toBeLessThanOrEqual(80);
    }

    const indexMetrics = measureProductionSource(indexSource, indexPath);
    expect(indexMetrics).toMatchObject({
      effectiveCodeLines: 795,
      physicalLines: 834,
    });
    expect(indexMetrics.effectiveCodeLines).toBeLessThan(857);

    const pkg = readFileSync("packages/application/package.json", "utf8");
    expect(pkg).not.toContain("workspace-proposal-lifecycle");
    expect(createHash("sha256").update(indexSource).digest("hex")).toHaveLength(
      64,
    );
  });
});