import { afterEach, describe, expect, it } from "vitest";
import {
  applyFoundationProjectScaffold,
  approveFoundationBlueprint,
  clearFoundationBlueprintStore,
  clearFoundationScaffoldApplyResults,
  clearFoundationScaffoldStore,
  clearFoundationWorkshopStore,
  createFoundationWorkshop,
  prepareProjectScaffold,
  recordFoundationWorkshopAnswer,
  rollbackFoundationProjectScaffold,
  runFoundationScaffoldCliCommand,
} from "@intentloom/application";
import {
  FOUNDATION_SCAFFOLD_APPLY_SCHEMA_URN,
  FOUNDATION_SCAFFOLD_ROLLBACK_SCHEMA_URN,
} from "@intentloom/protocol";

afterEach(() => {
  clearFoundationWorkshopStore();
  clearFoundationBlueprintStore();
  clearFoundationScaffoldStore();
  clearFoundationScaffoldApplyResults();
});

function seedApprovedWorkshop(workshopId: string, idea: string) {
  createFoundationWorkshop({
    root: "/tmp/foundation-scaffold-apply",
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

describe("Engineering Workspace W7: foundation scaffold apply", () => {
  it("applies transactionally to an empty root with revalidation", () => {
    seedApprovedWorkshop(
      "fnd_fixture_scaffold_apply",
      "Strict TypeScript helper library",
    );
    const prepared = prepareProjectScaffold("fnd_fixture_scaffold_apply");
    const planId = prepared.record.plan.planId;
    const writtenMap: Record<string, string> = {};
    const writer = (path: string, content: string) => {
      writtenMap[path] = content;
    };

    const applied = applyFoundationProjectScaffold(
      "fnd_fixture_scaffold_apply",
      planId,
      { fileWriter: writer },
    );

    expect(applied.schemaVersion).toBe(FOUNDATION_SCAFFOLD_APPLY_SCHEMA_URN);
    expect(applied.result.status).toBe("applied");
    expect(applied.result.writtenFiles.length).toBe(5);
    expect(writtenMap["package.json"]).toBeDefined();
    expect(writtenMap["src/index.ts"]).toContain("Strict TypeScript helper");
  });

  it("fails closed when the target root is not empty", () => {
    seedApprovedWorkshop(
      "fnd_fixture_scaffold_apply_collision",
      "Strict TypeScript helper library",
    );
    const prepared = prepareProjectScaffold(
      "fnd_fixture_scaffold_apply_collision",
    );
    expect(() =>
      applyFoundationProjectScaffold(
        "fnd_fixture_scaffold_apply_collision",
        prepared.record.plan.planId,
        { existingPaths: ["package.json"] },
      ),
    ).toThrow(/empty root/);
  });

  it("fails closed without required capability grants", () => {
    seedApprovedWorkshop(
      "fnd_fixture_scaffold_apply_caps",
      "Strict TypeScript helper library",
    );
    const prepared = prepareProjectScaffold("fnd_fixture_scaffold_apply_caps");
    expect(() =>
      applyFoundationProjectScaffold(
        "fnd_fixture_scaffold_apply_caps",
        prepared.record.plan.planId,
        { grantedCapabilities: ["filesystem.write"] },
      ),
    ).toThrow(/Missing capability grant: scaffold.apply/);
  });

  it("reports failed apply with rollback truthfully when writer throws", () => {
    seedApprovedWorkshop(
      "fnd_fixture_scaffold_apply_error",
      "Strict TypeScript helper library",
    );
    const prepared = prepareProjectScaffold("fnd_fixture_scaffold_apply_error");
    const writtenMap: Record<string, string> = {};
    let count = 0;
    const errorWriter = (path: string, content: string) => {
      count += 1;
      if (count === 3) throw new Error("Disk full simulation");
      writtenMap[path] = content;
    };

    const failed = applyFoundationProjectScaffold(
      "fnd_fixture_scaffold_apply_error",
      prepared.record.plan.planId,
      { fileWriter: errorWriter },
    );

    expect(failed.result.status).toBe("failed");
    expect(failed.result.error).toContain("Disk full simulation");
    expect(failed.result.writtenFiles).toEqual([]);
  });

  it("rolls back applied scaffold byte-for-byte", () => {
    seedApprovedWorkshop(
      "fnd_fixture_scaffold_apply_rollback",
      "Strict TypeScript helper library",
    );
    const prepared = prepareProjectScaffold(
      "fnd_fixture_scaffold_apply_rollback",
    );
    const planId = prepared.record.plan.planId;
    const fsState: Record<string, string | null> = {};
    const writer = (path: string, content: string | null) => {
      fsState[path] = content;
    };

    const applied = applyFoundationProjectScaffold(
      "fnd_fixture_scaffold_apply_rollback",
      planId,
      {
        fileWriter: writer as (path: string, content: string) => void,
      },
    );
    expect(applied.result.status).toBe("applied");
    expect(fsState["package.json"]).toBeDefined();

    const rolledBack = rollbackFoundationProjectScaffold(
      "fnd_fixture_scaffold_apply_rollback",
      planId,
      { fileWriter: writer },
    );
    expect(rolledBack.schemaVersion).toBe(
      FOUNDATION_SCAFFOLD_ROLLBACK_SCHEMA_URN,
    );
    expect(rolledBack.result.status).toBe("rolled-back");
    expect(fsState["package.json"]).toBeNull();
  });

  it("reaches CLI parity for scaffold apply command", async () => {
    seedApprovedWorkshop(
      "fnd_fixture_scaffold_apply_cli",
      "Strict TypeScript helper library",
    );
    const prepared = await runFoundationScaffoldCliCommand("scaffold-prepare", {
      workshopId: "fnd_fixture_scaffold_apply_cli",
      json: true,
    });
    expect(prepared.exitCode).toBe(0);
    const preparePayload = JSON.parse(prepared.stdout);
    const planId = preparePayload.record.plan.planId as string;

    const cliApply = await runFoundationScaffoldCliCommand("scaffold-apply", {
      workshopId: "fnd_fixture_scaffold_apply_cli",
      planId,
      json: true,
    });
    expect(cliApply.exitCode).toBe(0);
    const applyPayload = JSON.parse(cliApply.stdout);
    expect(applyPayload.schemaVersion).toBe(
      FOUNDATION_SCAFFOLD_APPLY_SCHEMA_URN,
    );
    expect(applyPayload.result.status).toBe("applied");
  });
});
