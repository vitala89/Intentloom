import { afterEach, describe, expect, it } from "vitest";
import {
  approveFoundationBlueprint,
  buildFoundationScaffoldPrepareViewModel,
  clearFoundationBlueprintStore,
  clearFoundationScaffoldStore,
  clearFoundationWorkshopStore,
  createFoundationWorkshop,
  prepareProjectScaffold,
  proposeFoundationBlueprints,
  recordFoundationWorkshopAnswer,
  renderFoundationScaffoldPrepareText,
  runFoundationScaffoldCliCommand,
} from "@intentloom/application";
import { FOUNDATION_SCAFFOLD_PREPARE_SCHEMA_URN } from "@intentloom/protocol";

afterEach(() => {
  clearFoundationWorkshopStore();
  clearFoundationBlueprintStore();
  clearFoundationScaffoldStore();
});

function seedWorkspaceWorkshop(workshopId: string) {
  createFoundationWorkshop({
    root: "/tmp/foundation-scaffold-workspace-client",
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

describe("Engineering Workspace W8 Client: Desktop and TUI workspace scaffold viewmodels", () => {
  it("builds workspace prepare viewmodel with packages/examples grouping and nx chip", () => {
    seedWorkspaceWorkshop("fnd_fixture_scaffold_workspace_client_prepare");
    const proposal = proposeFoundationBlueprints(
      "fnd_fixture_scaffold_workspace_client_prepare",
    );
    const extensible = proposal.alternatives.find(
      (entry) => entry.tier === "extensible",
    );
    expect(extensible?.blueprint.topology).toBe("pnpm-workspace");
    expect(extensible?.blueprint.recommendedPacks).toContain("nx-monorepo");

    const prepare = prepareProjectScaffold(
      "fnd_fixture_scaffold_workspace_client_prepare",
    );
    const vm = buildFoundationScaffoldPrepareViewModel(prepare, "ready");

    expect(vm.workspace).toBeDefined();
    expect(vm.workspace?.topology).toBe("pnpm-workspace");
    expect(vm.workspace?.hasNx).toBe(true);
    expect(vm.templateVersions).toContain(
      "typescript-pnpm-workspace-starter@1",
    );

    const groupLabels = vm.workspace?.groups.map((group) => group.label) ?? [];
    expect(groupLabels).toContain("packages/");
    expect(groupLabels).toContain("examples/");

    const packagePaths =
      vm.workspace?.groups
        .find((group) => group.label === "packages/")
        ?.files.map((file) => file.path) ?? [];
    expect(packagePaths).toContain("packages/core/package.json");
    expect(packagePaths).toContain("packages/react/package.json");
    expect(packagePaths).toContain("packages/testing/package.json");

    const examplePaths =
      vm.workspace?.groups
        .find((group) => group.label === "examples/")
        ?.files.map((file) => file.path) ?? [];
    expect(examplePaths).toContain("examples/vanilla-basic/package.json");
    expect(examplePaths).toContain("examples/react-basic/package.json");
  });

  it("renders workspace prepare text with topology, nx, and grouped tree", () => {
    seedWorkspaceWorkshop("fnd_fixture_scaffold_workspace_client_render");
    const prepare = prepareProjectScaffold(
      "fnd_fixture_scaffold_workspace_client_render",
    );
    const vm = buildFoundationScaffoldPrepareViewModel(prepare, "ready");
    const text = renderFoundationScaffoldPrepareText(vm);

    expect(text).toContain("Workspace topology: pnpm-workspace");
    expect(text).toContain("Nx orchestration: yes");
    expect(text).toContain("packages/ (");
    expect(text).toContain("examples/ (");
    expect(text).toContain("packages/core/package.json");
    expect(text).toContain("examples/react-basic/package.json");
    expect(text).toContain("Surface state: ready");
  });

  it("keeps CLI scaffold-prepare parity with workspace prepare viewmodels", async () => {
    seedWorkspaceWorkshop("fnd_fixture_scaffold_workspace_client_cli");

    const cliPrepare = await runFoundationScaffoldCliCommand(
      "scaffold-prepare",
      {
        workshopId: "fnd_fixture_scaffold_workspace_client_cli",
        json: true,
      },
    );
    expect(cliPrepare.exitCode).toBe(0);
    const cliPayload = JSON.parse(cliPrepare.stdout) as {
      schemaVersion: string;
      record: {
        planDigest: string;
        templateVersions: readonly { id: string; version: string }[];
        plan: { files: readonly { path: string }[] };
      };
    };
    expect(cliPayload.schemaVersion).toBe(
      FOUNDATION_SCAFFOLD_PREPARE_SCHEMA_URN,
    );
    expect(cliPayload.record.templateVersions[0]?.id).toBe(
      "typescript-pnpm-workspace-starter",
    );

    const appPrepare = prepareProjectScaffold(
      "fnd_fixture_scaffold_workspace_client_cli",
    );
    const vm = buildFoundationScaffoldPrepareViewModel(appPrepare, "ready");
    expect(vm.planDigest).toBe(cliPayload.record.planDigest);
    expect(vm.workspace?.topology).toBe("pnpm-workspace");
    expect(vm.workspace?.hasNx).toBe(true);
    expect(
      cliPayload.record.plan.files.some((file) => file.path === "nx.json"),
    ).toBe(true);
  });
});
