import { afterEach, describe, expect, it } from "vitest";
import {
  approveFoundationBlueprint,
  clearFoundationBlueprintStore,
  clearFoundationScaffoldStore,
  clearFoundationWorkshopStore,
  compareProjectScaffoldPlan,
  createFoundationWorkshop,
  getFoundationWorkshop,
  getProjectScaffoldPlan,
  prepareProjectScaffold,
  recordFoundationWorkshopAnswer,
  runFoundationScaffoldCliCommand,
  validateProjectScaffoldPlan,
} from "@intentloom/application";
import {
  FOUNDATION_SCAFFOLD_COMPARE_SCHEMA_URN,
  FOUNDATION_SCAFFOLD_GET_SCHEMA_URN,
  FOUNDATION_SCAFFOLD_PREPARE_SCHEMA_URN,
  FOUNDATION_SCAFFOLD_VALIDATE_SCHEMA_URN,
} from "@intentloom/protocol";

afterEach(() => {
  clearFoundationWorkshopStore();
  clearFoundationBlueprintStore();
  clearFoundationScaffoldStore();
});

function seedApprovedWorkshop(workshopId: string, idea: string) {
  createFoundationWorkshop({
    root: "/tmp/foundation-scaffold",
    idea,
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

describe("Engineering Workspace W6: foundation scaffold planner", () => {
  it("fails closed without an approved blueprint", () => {
    createFoundationWorkshop({
      root: "/tmp/foundation-scaffold-unapproved",
      idea: "Strict TypeScript helper library",
      workshopId: "fnd_fixture_scaffold_unapproved",
    });
    expect(() =>
      prepareProjectScaffold("fnd_fixture_scaffold_unapproved"),
    ).toThrow(/approved blueprint/);
  });

  it("prepares a deterministic side-effect-free TypeScript library plan", () => {
    seedApprovedWorkshop(
      "fnd_fixture_scaffold_prepare",
      "Strict TypeScript helper library",
    );
    const before = getFoundationWorkshop("fnd_fixture_scaffold_prepare");

    const first = prepareProjectScaffold("fnd_fixture_scaffold_prepare");
    const second = prepareProjectScaffold("fnd_fixture_scaffold_prepare");

    expect(first.schemaVersion).toBe(FOUNDATION_SCAFFOLD_PREPARE_SCHEMA_URN);
    expect(first.workshopUnchanged).toBe(true);
    expect(
      first.record.plan.files.some((file) => file.path === "package.json"),
    ).toBe(true);
    expect(first.record.plan.dependencies).toEqual(
      expect.arrayContaining(["typescript", "vitest"]),
    );
    expect(first.record.requiredCapabilities).toEqual([
      "filesystem.write",
      "scaffold.apply",
    ]);
    expect(first.record.verificationChecks).toEqual(
      expect.arrayContaining(["script:build", "script:test", "typecheck:tsc"]),
    );
    expect(first.record.templateVersions[0]?.id).toBe(
      "typescript-library-starter",
    );
    expect(first.record.planDigest).toMatch(/^[a-f0-9]{64}$/);
    expect(second.record.plan.planId).toBe(first.record.plan.planId);
    expect(second.record.planDigest).toBe(first.record.planDigest);
    expect(getFoundationWorkshop("fnd_fixture_scaffold_prepare")).toEqual(
      before,
    );
  });

  it("gets, compares, and validates stored plans without filesystem mutation", () => {
    seedApprovedWorkshop(
      "fnd_fixture_scaffold_lifecycle",
      "Strict TypeScript helper library",
    );
    const prepared = prepareProjectScaffold("fnd_fixture_scaffold_lifecycle");
    const planId = prepared.record.plan.planId;

    const fetched = getProjectScaffoldPlan(
      "fnd_fixture_scaffold_lifecycle",
      planId,
    );
    expect(fetched.schemaVersion).toBe(FOUNDATION_SCAFFOLD_GET_SCHEMA_URN);
    expect(fetched.record.planDigest).toBe(prepared.record.planDigest);

    const compare = compareProjectScaffoldPlan(
      "fnd_fixture_scaffold_lifecycle",
      planId,
      ["README.md"],
    );
    expect(compare.schemaVersion).toBe(FOUNDATION_SCAFFOLD_COMPARE_SCHEMA_URN);
    expect(compare.collisions).toContain("README.md");
    expect(compare.created).toContain("package.json");

    const validated = validateProjectScaffoldPlan(
      "fnd_fixture_scaffold_lifecycle",
      planId,
    );
    expect(validated.schemaVersion).toBe(
      FOUNDATION_SCAFFOLD_VALIDATE_SCHEMA_URN,
    );
    expect(validated.valid).toBe(true);
    expect(validated.approvalRequired).toBe(true);
    expect(validated.planDigest).toBe(prepared.record.planDigest);
  });

  it("reaches CLI parity for scaffold prepare and validate commands", async () => {
    seedApprovedWorkshop(
      "fnd_fixture_scaffold_cli",
      "Strict TypeScript helper library",
    );

    const cliPrepare = await runFoundationScaffoldCliCommand(
      "scaffold-prepare",
      {
        workshopId: "fnd_fixture_scaffold_cli",
        json: true,
      },
    );
    expect(cliPrepare.exitCode).toBe(0);
    const preparePayload = JSON.parse(cliPrepare.stdout);
    expect(preparePayload.schemaVersion).toBe(
      FOUNDATION_SCAFFOLD_PREPARE_SCHEMA_URN,
    );
    const planId = preparePayload.record.plan.planId as string;

    const cliValidate = await runFoundationScaffoldCliCommand(
      "scaffold-validate",
      {
        workshopId: "fnd_fixture_scaffold_cli",
        planId,
        json: true,
      },
    );
    expect(cliValidate.exitCode).toBe(0);
    const validatePayload = JSON.parse(cliValidate.stdout);
    expect(validatePayload.valid).toBe(true);
    expect(validatePayload.planDigest).toBe(preparePayload.record.planDigest);
  });
});
