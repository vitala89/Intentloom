import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type {
  FoundationScaffoldFileRow,
  FoundationScaffoldWorkspaceFileGroup,
  FoundationScaffoldWorkspaceSection,
} from "@intentloom/application";
import * as application from "@intentloom/application";
import {
  applicationCycles,
  relativeSpecifiers,
} from "./application-source-cycles.js";

const fileRowModule = "foundation/foundation-scaffold-file-row-types.ts";
const clientViewModel = "foundation-scaffold-client-viewmodel.ts";
const workspaceViewModel = "foundation-scaffold-workspace-viewmodel.ts";

const importComponents = [
  ["approved-apply-baseline.ts", "generated-file-sync-declared.ts", "index.ts"],
  [
    "foundation-discovery.ts",
    "foundation-viewmodel.ts",
    "foundation-workshop.ts",
  ],
  [
    "neutron/mutation/apply/neutron-mutation-apply-durable-record.ts",
    "neutron/mutation/apply/neutron-mutation-apply-store.ts",
    "neutron/mutation/verification/neutron-mutation-verification-retry-eligibility.ts",
  ],
];

const indexReexportComponent = [
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
];

const reexportComponents = [
  [
    "apply-extension-update.ts",
    "discover-and-apply-extension-update.ts",
    "extension-update-files.ts",
    "propose-and-apply-extension-adoption.ts",
  ],
  indexReexportComponent,
  ...importComponents.slice(1),
];

const fileRow = {
  path: "README.md",
  action: "create",
  ownership: "managed",
} satisfies FoundationScaffoldFileRow;

const workspaceGroup = {
  label: "Root",
  files: [fileRow],
} satisfies FoundationScaffoldWorkspaceFileGroup;

const workspaceSection = {
  topology: "pnpm-workspace",
  hasNx: false,
  groups: [workspaceGroup],
} satisfies FoundationScaffoldWorkspaceSection;

describe("application foundation scaffold viewmodel cycle", () => {
  it("keeps FoundationScaffoldFileRow on the public type surface", () => {
    expect(fileRow.ownership).toBe("managed");
    expect(workspaceSection.topology).toBe("pnpm-workspace");
    expect(application).not.toHaveProperty("FoundationScaffoldFileRow");
    expect(application).not.toHaveProperty(
      "FoundationScaffoldWorkspaceFileGroup",
    );
    expect(application).not.toHaveProperty(
      "FoundationScaffoldWorkspaceSection",
    );
    const clientSource = readFileSync(
      `packages/application/src/${clientViewModel}`,
      "utf8",
    );
    expect(clientSource).toContain("export type { FoundationScaffoldFileRow }");
    expect(clientSource).toContain(
      "export type { FoundationScaffoldWorkspaceFileGroup }",
    );
  });

  it("keeps the shared file row off both viewmodels", () => {
    expect(relativeSpecifiers(fileRowModule, true)).toEqual([]);
    expect(relativeSpecifiers(workspaceViewModel, true)).not.toContain(
      "./foundation-scaffold-client-viewmodel.js",
    );
    expect(relativeSpecifiers(clientViewModel, false)).toContain(
      "./foundation-scaffold-workspace-viewmodel.js",
    );
    expect(relativeSpecifiers(clientViewModel, false)).toContain(
      "./foundation/foundation-scaffold-file-row-types.js",
    );
    expect(relativeSpecifiers(workspaceViewModel, false)).toContain(
      "./foundation/foundation-scaffold-file-row-types.js",
    );
  });

  it("drops the scaffold pair and leaves the other cycles unchanged", () => {
    const importCycles = applicationCycles(false);
    const reexportCycles = applicationCycles(true);
    expect(importCycles).toEqual(importComponents);
    expect(reexportCycles).toEqual(reexportComponents);
    expect(importCycles.map((component) => component.length)).toEqual([
      3, 3, 3,
    ]);
    expect(reexportCycles.map((component) => component.length)).toEqual([
      4, 29, 3, 3,
    ]);
    expect(
      importCycles.some((component) => component.includes(clientViewModel)),
    ).toBe(false);
    expect(reexportCycles[1]).toContain("inception-flow.ts");
    expect(reexportCycles[1]).toContain("index.ts");
  });

  it("keeps the scaffold viewmodel functions on the package runtime", () => {
    expect(typeof application.buildFoundationScaffoldPrepareViewModel).toBe(
      "function",
    );
    expect(typeof application.buildFoundationScaffoldCompareViewModel).toBe(
      "function",
    );
    expect(typeof application.buildFoundationScaffoldValidateViewModel).toBe(
      "function",
    );
    expect(typeof application.buildFoundationScaffoldApplyViewModel).toBe(
      "function",
    );
    expect(typeof application.buildFoundationScaffoldRollbackViewModel).toBe(
      "function",
    );
    expect(typeof application.buildFoundationScaffoldWorkspaceSection).toBe(
      "function",
    );
    expect(typeof application.isWorkspaceScaffoldTemplate).toBe("function");
  });
});
