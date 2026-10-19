import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type {
  FoundationScaffoldFileRow,
  FoundationScaffoldWorkspaceFileGroup,
  FoundationScaffoldWorkspaceSection,
  FoundationUnderstanding,
} from "@intentloom/application";
import * as application from "@intentloom/application";
import {
  applicationCycles,
  relativeSpecifiers,
} from "./application-source-cycles.js";

const fileRowModule = "foundation/foundation-scaffold-file-row-types.ts";
const clientViewModel = "foundation-scaffold-client-viewmodel.ts";
const workspaceViewModel = "foundation-scaffold-workspace-viewmodel.ts";

const approvedApplyComponent = [
  "approved-apply-baseline.ts",
  "generated-file-sync-declared.ts",
  "index.ts",
];

const neutronMutationComponent = [
  "neutron/mutation/apply/neutron-mutation-apply-durable-record.ts",
  "neutron/mutation/apply/neutron-mutation-apply-store.ts",
  "neutron/mutation/verification/neutron-mutation-verification-retry-eligibility.ts",
];

const importComponents = [approvedApplyComponent, neutronMutationComponent];

const workshopCycle = [
  "foundation-discovery.ts",
  "foundation-viewmodel.ts",
  "foundation-workshop.ts",
];

const understandingTypes = "foundation/foundation-understanding-types.ts";
const workshopLookup = "foundation/foundation-workshop-lookup.ts";

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
  neutronMutationComponent,
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

  it("drops the workshop trio and leaves the other cycles unchanged", () => {
    const importCycles = applicationCycles(false);
    const reexportCycles = applicationCycles(true);
    expect(importCycles).toEqual(importComponents);
    expect(reexportCycles).toEqual(reexportComponents);
    expect(importCycles.map((component) => component.length)).toEqual([3, 3]);
    expect(reexportCycles.map((component) => component.length)).toEqual([
      4, 29, 3,
    ]);
    expect(
      importCycles.some((component) => component.includes(clientViewModel)),
    ).toBe(false);
    for (const file of workshopCycle) {
      expect(importCycles.some((component) => component.includes(file))).toBe(
        false,
      );
      expect(reexportCycles.some((component) => component.includes(file))).toBe(
        false,
      );
    }
    expect(reexportCycles[1]).toContain("inception-flow.ts");
    expect(reexportCycles[1]).toContain("index.ts");
    expect(reexportCycles[1]).toHaveLength(29);
  });

  it("keeps the workshop type and validated lookup off the old cycle", () => {
    expect(relativeSpecifiers(understandingTypes, true)).toEqual([]);
    const lookupSpecifiers = relativeSpecifiers(workshopLookup, true);
    expect(lookupSpecifiers).toContain("./foundation-workshop-store.js");
    for (const file of workshopCycle) {
      expect(lookupSpecifiers.join("\n")).not.toContain(
        file.replace(/\.ts$/, ".js"),
      );
    }
    const lookupSource = readFileSync(
      `packages/application/src/${workshopLookup}`,
      "utf8",
    );
    expect(lookupSource).toContain("getFoundationWorkshopStoreEntry");
    expect(lookupSource).toContain("validateFoundationWorkshopState");
    expect(lookupSource).toContain("unknown foundation workshop");
    const discoverySpecifiers = relativeSpecifiers(
      "foundation-discovery.ts",
      false,
    );
    expect(discoverySpecifiers).toContain(
      "./foundation/foundation-workshop-lookup.js",
    );
    expect(discoverySpecifiers).not.toContain("./foundation-workshop.js");
    expect(relativeSpecifiers("foundation-viewmodel.ts", false)).not.toContain(
      "./foundation-workshop.js",
    );
    expect(relativeSpecifiers("foundation-viewmodel.ts", false)).toContain(
      "./foundation/foundation-understanding-types.js",
    );
    const workshopSpecifiers = relativeSpecifiers(
      "foundation-workshop.ts",
      false,
    );
    expect(workshopSpecifiers).toContain("./foundation-discovery.js");
    expect(workshopSpecifiers).toContain("./foundation-viewmodel.js");
    expect(workshopSpecifiers).toContain(
      "./foundation/foundation-workshop-lookup.js",
    );
    expect(workshopSpecifiers).toContain(
      "./foundation/foundation-understanding-types.js",
    );
    expect(workshopSpecifiers).toContain(
      "./foundation/foundation-workshop-store.js",
    );
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

  it("keeps the workshop session surface on the package", () => {
    const understanding = {
      workshopId: "fnd_type_surface",
      root: "/tmp/foundation",
      idea: "type surface",
      status: "discovering",
      problemStatement: "",
      smallestOutcome: "",
      nonGoalsCount: 0,
      totalQuestions: 1,
      answeredQuestions: 0,
      pendingQuestions: 1,
      actorsCount: 0,
      workflowsCount: 0,
      domainConceptsCount: 0,
      qualityScenariosCount: 0,
      changeScenariosCount: 0,
      constraintsCount: 0,
      risksCount: 0,
      alternativesCount: 0,
    } satisfies FoundationUnderstanding;
    expect(understanding.pendingQuestions).toBe(1);
    expect(application).not.toHaveProperty("FoundationUnderstanding");
    expect(typeof application.getFoundationWorkshop).toBe("function");
    expect(typeof application.createFoundationWorkshop).toBe("function");
    expect(typeof application.recordFoundationAnswer).toBe("function");
    expect(typeof application.summarizeFoundationUnderstandingState).toBe(
      "function",
    );
    expect(typeof application.summarizeFoundationUnderstandingViewmodel).toBe(
      "function",
    );
    expect(typeof application.discoverFoundationAdaptiveQuestions).toBe(
      "function",
    );
    expect(
      typeof application.evaluateFoundationDiscoveryCompletenessForWorkshop,
    ).toBe("function");
    expect(typeof application.identifyFoundationConflicts).toBe("function");
    expect(typeof application.buildFoundationUnderstandingSummary).toBe(
      "function",
    );
    expect(typeof application.buildFoundationWorkshopViewmodel).toBe(
      "function",
    );
    expect(typeof application.evaluateFoundationWorkshopReadiness).toBe(
      "function",
    );
  });
});
