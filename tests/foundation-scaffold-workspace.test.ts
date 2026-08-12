import { afterEach, describe, expect, it } from "vitest";
import {
  approveFoundationBlueprint,
  clearFoundationBlueprintStore,
  clearFoundationScaffoldStore,
  clearFoundationWorkshopStore,
  createFoundationWorkshop,
  prepareProjectScaffold,
  proposeFoundationBlueprints,
  recordFoundationWorkshopAnswer,
  validateWorkspaceScaffoldPlan,
} from "@intentloom/application";

afterEach(() => {
  clearFoundationWorkshopStore();
  clearFoundationBlueprintStore();
  clearFoundationScaffoldStore();
});

function seedWorkspaceWorkshop(workshopId: string) {
  createFoundationWorkshop({
    root: "/tmp/foundation-workspace-scaffold",
    idea: "Modular monorepo framework library",
    workshopId,
  });
  recordFoundationWorkshopAnswer(workshopId, {
    questionId: "fq5_workflow",
    value: "Multi-package workspace consumers import scoped packages",
    confidence: "confirmed",
    timestamp: Date.now(),
  });
  approveFoundationBlueprint(workshopId, "extensible", "reviewer");
}

describe("Engineering Workspace W8: foundation pnpm workspace starter", () => {
  it("prepares extensible workspace scaffold with core/react/testing/examples", () => {
    seedWorkspaceWorkshop("fnd_fixture_workspace_scaffold_prepare");
    const proposal = proposeFoundationBlueprints(
      "fnd_fixture_workspace_scaffold_prepare",
    );
    const extensible = proposal.alternatives.find(
      (entry) => entry.tier === "extensible",
    );
    expect(extensible?.blueprint.topology).toBe("pnpm-workspace");
    expect(extensible?.blueprint.recommendedPacks).toContain("nx-monorepo");

    const prepared = prepareProjectScaffold(
      "fnd_fixture_workspace_scaffold_prepare",
    );
    const paths = prepared.record.plan.files.map((file) => file.path);

    expect(paths).toContain("pnpm-workspace.yaml");
    expect(paths).toContain("packages/core/package.json");
    expect(paths).toContain("packages/react/package.json");
    expect(paths).toContain("packages/testing/package.json");
    expect(paths).toContain("examples/vanilla-basic/package.json");
    expect(paths).toContain("examples/react-basic/package.json");
    expect(paths).toContain("nx.json");
    expect(prepared.record.templateVersions[0]?.id).toBe(
      "typescript-pnpm-workspace-starter",
    );

    const validation = validateWorkspaceScaffoldPlan(prepared.record.plan);
    expect(validation.valid).toBe(true);
    expect(validation.violations).toEqual([]);
  });

  it("keeps packages from referencing examples in generated content", () => {
    seedWorkspaceWorkshop("fnd_fixture_workspace_scaffold_invariants");
    const prepared = prepareProjectScaffold(
      "fnd_fixture_workspace_scaffold_invariants",
    );
    for (const file of prepared.record.plan.files) {
      if (!file.path.startsWith("packages/")) continue;
      expect(file.content).not.toContain("examples/");
    }
  });
});
