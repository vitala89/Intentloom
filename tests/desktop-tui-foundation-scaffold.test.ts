import { afterEach, describe, expect, it } from "vitest";
import {
  approveFoundationBlueprint,
  buildFoundationScaffoldCompareViewModel,
  buildFoundationScaffoldPrepareViewModel,
  buildFoundationScaffoldValidateViewModel,
  clearFoundationBlueprintStore,
  clearFoundationScaffoldStore,
  clearFoundationWorkshopStore,
  compareProjectScaffoldPlan,
  createFoundationWorkshop,
  prepareProjectScaffold,
  recordFoundationWorkshopAnswer,
  renderFoundationScaffoldCompareText,
  renderFoundationScaffoldPrepareText,
  renderFoundationScaffoldValidateText,
  runFoundationScaffoldCliCommand,
  validateProjectScaffoldPlan,
} from "@intentloom/application";
import {
  FOUNDATION_SCAFFOLD_COMPARE_SCHEMA_URN,
  FOUNDATION_SCAFFOLD_PREPARE_SCHEMA_URN,
  FOUNDATION_SCAFFOLD_VALIDATE_SCHEMA_URN,
} from "@intentloom/protocol";

afterEach(() => {
  clearFoundationWorkshopStore();
  clearFoundationBlueprintStore();
  clearFoundationScaffoldStore();
});

function seedApprovedWorkshop(workshopId: string) {
  createFoundationWorkshop({
    root: "/tmp/foundation-scaffold-client",
    idea: "Strict TypeScript helper library",
    workshopId,
  });
  recordFoundationWorkshopAnswer(workshopId, {
    questionId: "fq5_workflow",
    value: "Library consumers import typed helpers",
    confidence: "confirmed",
    timestamp: Date.now(),
  });
  approveFoundationBlueprint(workshopId, "recommended", "reviewer");
}

describe("Engineering Workspace W6 Client: Desktop and TUI scaffold viewmodels", () => {
  it("renders scaffold prepare text with tree, deps, capabilities, and checks", () => {
    seedApprovedWorkshop("fnd_fixture_scaffold_client_prepare");
    const prepare = prepareProjectScaffold(
      "fnd_fixture_scaffold_client_prepare",
    );
    const vm = buildFoundationScaffoldPrepareViewModel(prepare, "ready");
    const text = renderFoundationScaffoldPrepareText(vm);

    expect(text).toContain(
      "Foundation scaffold plan: fnd_fixture_scaffold_client_prepare",
    );
    expect(text).toContain("Workshop unchanged: yes");
    expect(text).toContain("package.json");
    expect(text).toContain("typescript");
    expect(text).toContain("filesystem.write");
    expect(text).toContain("script:build");
    expect(text).toContain("Surface state: ready");
  });

  it("renders scaffold compare and validate viewmodels", () => {
    seedApprovedWorkshop("fnd_fixture_scaffold_client_lifecycle");
    const prepare = prepareProjectScaffold(
      "fnd_fixture_scaffold_client_lifecycle",
    );
    const compare = compareProjectScaffoldPlan(
      "fnd_fixture_scaffold_client_lifecycle",
      prepare.record.plan.planId,
      ["README.md"],
    );
    const compareVm = buildFoundationScaffoldCompareViewModel(compare, "ready");
    expect(compareVm.collisions).toContain("README.md");
    expect(renderFoundationScaffoldCompareText(compareVm)).toContain(
      "Collision paths: README.md",
    );

    const validated = validateProjectScaffoldPlan(
      "fnd_fixture_scaffold_client_lifecycle",
      prepare.record.plan.planId,
    );
    const validateVm = buildFoundationScaffoldValidateViewModel(
      validated,
      "ready",
    );
    expect(validateVm.valid).toBe(true);
    expect(renderFoundationScaffoldValidateText(validateVm)).toContain(
      "Approval required: yes",
    );
  });

  it("keeps CLI scaffold-prepare parity with prepare viewmodels", async () => {
    seedApprovedWorkshop("fnd_fixture_scaffold_client_cli");

    const cliPrepare = await runFoundationScaffoldCliCommand(
      "scaffold-prepare",
      {
        workshopId: "fnd_fixture_scaffold_client_cli",
        json: true,
      },
    );
    expect(cliPrepare.exitCode).toBe(0);
    const cliPayload = JSON.parse(cliPrepare.stdout) as {
      schemaVersion: string;
      record: { planDigest: string };
    };
    expect(cliPayload.schemaVersion).toBe(
      FOUNDATION_SCAFFOLD_PREPARE_SCHEMA_URN,
    );

    const appPrepare = prepareProjectScaffold(
      "fnd_fixture_scaffold_client_cli",
    );
    const vm = buildFoundationScaffoldPrepareViewModel(appPrepare, "ready");
    expect(vm.planDigest).toBe(cliPayload.record.planDigest);
    expect(vm.files.length).toBeGreaterThan(0);
  });

  it("keeps CLI scaffold-compare and validate parity with viewmodels", async () => {
    seedApprovedWorkshop("fnd_fixture_scaffold_client_compare");
    const prepared = prepareProjectScaffold(
      "fnd_fixture_scaffold_client_compare",
    );
    const planId = prepared.record.plan.planId;

    const cliCompare = await runFoundationScaffoldCliCommand(
      "scaffold-compare",
      {
        workshopId: "fnd_fixture_scaffold_client_compare",
        planId,
        existingPaths: ["README.md"],
        json: true,
      },
    );
    expect(cliCompare.exitCode).toBe(0);
    const comparePayload = JSON.parse(cliCompare.stdout) as {
      schemaVersion: string;
      collisions: string[];
    };
    expect(comparePayload.schemaVersion).toBe(
      FOUNDATION_SCAFFOLD_COMPARE_SCHEMA_URN,
    );
    const compareVm = buildFoundationScaffoldCompareViewModel(
      compareProjectScaffoldPlan(
        "fnd_fixture_scaffold_client_compare",
        planId,
        ["README.md"],
      ),
      "ready",
    );
    expect(compareVm.collisions).toEqual(comparePayload.collisions);

    const cliValidate = await runFoundationScaffoldCliCommand(
      "scaffold-validate",
      {
        workshopId: "fnd_fixture_scaffold_client_compare",
        planId,
        json: true,
      },
    );
    expect(cliValidate.exitCode).toBe(0);
    const validatePayload = JSON.parse(cliValidate.stdout) as {
      schemaVersion: string;
      planDigest: string;
    };
    expect(validatePayload.schemaVersion).toBe(
      FOUNDATION_SCAFFOLD_VALIDATE_SCHEMA_URN,
    );
    expect(validatePayload.planDigest).toBe(prepared.record.planDigest);
  });
});
