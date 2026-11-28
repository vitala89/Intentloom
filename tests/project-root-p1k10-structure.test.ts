import { readFileSync } from "node:fs";
import { join, sep } from "node:path";
import { readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import * as application from "@intentloom/application";
import * as leaf from "../packages/application/src/project-lifecycle/project-root.ts";
import { measureProductionSource } from "../scripts/production-file-metrics.mjs";
import { applicationCycles } from "./application-source-cycles.js";

const sourceRoot = "packages/application/src";
const leafPath = `${sourceRoot}/project-lifecycle/project-root.ts`;
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

const packageExports = [
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

function typescriptFiles(dir: string): string[] {
  return readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".ts"))
    .map((entry) => join(entry.parentPath ?? entry.path, entry.name));
}

describe("P1K.10 project root and timeline structure", () => {
  it("re-exports one leaf implementation and stays outside the existing cycles", () => {
    const indexSource = readFileSync(indexPath, "utf8");
    const leafSource = readFileSync(leafPath, "utf8");
    const moved = [
      "export class ProjectRootError",
      "export async function assertCanonicalProjectRoot",
      "export async function timelineProject",
      "export interface ProjectTimelineOptions",
      "export interface ProjectTimeline ",
    ];
    for (const declaration of moved) {
      const owners = typescriptFiles(sourceRoot).filter((file) =>
        readFileSync(file, "utf8").includes(declaration),
      );
      expect(owners.map((file) => file.split(sep).join("/"))).toEqual([
        leafPath,
      ]);
    }

    expect(indexSource).not.toMatch(/function assertCanonicalProjectRoot\(/);
    expect(indexSource).not.toMatch(/function timelineProject\(/);
    expect(indexSource).not.toMatch(/class ProjectRootError/);
    expect(indexSource).toMatch(
      /from "\.\/project-lifecycle\/project-root\.js";/,
    );
    expect(indexSource).toMatch(
      /export \{ assertCanonicalProjectRoot, ProjectRootError, timelineProject \};/,
    );
    expect(indexSource).toMatch(/timelineProject,/);
    expect(leafSource).toMatch(/from "\.\.\/host-file-system\.js";/);
    expect(leafSource).toMatch(/type ReleaseTimeline/);
    expect(leafSource).not.toMatch(/from ["'][^"']*index\.js["']/);
    expect(leafSource).not.toMatch(/import\(["'][^"']*index\.js["']\)/);

    expect(application.ProjectRootError).toBe(leaf.ProjectRootError);
    expect(application.assertCanonicalProjectRoot).toBe(
      leaf.assertCanonicalProjectRoot,
    );
    expect(application.timelineProject).toBe(leaf.timelineProject);
    expect(indexSource).toMatch(
      /export type \{ ProjectTimeline, ProjectTimelineOptions \};/,
    );

    const applicationPackage = JSON.parse(
      readFileSync("packages/application/package.json", "utf8"),
    ) as { exports: Record<string, string> };
    expect(Object.keys(applicationPackage.exports)).toEqual(packageExports);
    expect(
      readFileSync("docs/governance/quality-exceptions.json", "utf8"),
    ).not.toContain("project-lifecycle/project-root.ts");
    expect(
      readFileSync("packages/daemon/src/daemon-canonical-root.ts", "utf8"),
    ).toContain("DaemonRootError");
    expect(
      readFileSync("packages/daemon/src/daemon-canonical-root.ts", "utf8"),
    ).not.toContain("project-root.js");

    expect(applicationCycles(false)).toEqual(importComponents);
    expect(applicationCycles(true)).toEqual(reexportComponents);
    const members = [
      ...applicationCycles(false).flat(),
      ...applicationCycles(true).flat(),
    ];
    expect(members).not.toContain("project-lifecycle/project-root.ts");

    const indexMetrics = measureProductionSource(indexSource, indexPath);
    const leafMetrics = measureProductionSource(leafSource, leafPath);
    expect(indexMetrics).toMatchObject({
      effectiveCodeLines: 742,
      physicalLines: 777,
    });
    expect(leafMetrics).toMatchObject({
      effectiveCodeLines: 64,
      physicalLines: 69,
    });
    expect(leafMetrics.effectiveCodeLines).toBeLessThanOrEqual(250);
    expect(leafMetrics.physicalLines).toBeLessThanOrEqual(400);
  });
});
