import { afterEach, describe, expect, it } from "vitest";
import {
  applyFoundationProjectScaffold,
  approveFoundationBlueprint,
  buildFoundationScaffoldApplyViewModel,
  buildFoundationScaffoldRollbackViewModel,
  clearFoundationBlueprintStore,
  clearFoundationScaffoldApplyResults,
  clearFoundationScaffoldStore,
  clearFoundationWorkshopStore,
  createFoundationWorkshop,
  prepareProjectScaffold,
  recordFoundationWorkshopAnswer,
  renderFoundationScaffoldApplyText,
  renderFoundationScaffoldRollbackText,
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

function seedApprovedWorkshop(workshopId: string) {
  createFoundationWorkshop({
    root: "/tmp/foundation-scaffold-apply-client",
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

describe("Engineering Workspace W7 Client: Desktop and TUI scaffold apply viewmodels", () => {
  it("renders truthful applied transaction state", () => {
    seedApprovedWorkshop("fnd_fixture_scaffold_apply_client_applied");
    const prepared = prepareProjectScaffold(
      "fnd_fixture_scaffold_apply_client_applied",
    );
    const planId = prepared.record.plan.planId;
    const applied = applyFoundationProjectScaffold(
      "fnd_fixture_scaffold_apply_client_applied",
      planId,
      {
        fileWriter: () => undefined,
      },
    );
    const vm = buildFoundationScaffoldApplyViewModel(applied, "ready");
    const text = renderFoundationScaffoldApplyText(vm);

    expect(vm.status).toBe("applied");
    expect(text).toContain("Status: applied");
    expect(text).toContain("package.json");
    expect(text).toContain("Surface state: ready");
  });

  it("renders failed apply with rollback truthfully, not as success", () => {
    seedApprovedWorkshop("fnd_fixture_scaffold_apply_client_failed");
    const prepared = prepareProjectScaffold(
      "fnd_fixture_scaffold_apply_client_failed",
    );
    const planId = prepared.record.plan.planId;
    let count = 0;
    const failed = applyFoundationProjectScaffold(
      "fnd_fixture_scaffold_apply_client_failed",
      planId,
      {
        fileWriter: () => {
          count += 1;
          if (count === 3) throw new Error("Disk full simulation");
        },
      },
    );
    const vm = buildFoundationScaffoldApplyViewModel(failed, "ready");
    const text = renderFoundationScaffoldApplyText(vm);

    expect(vm.status).toBe("failed");
    expect(vm.writtenFiles).toEqual([]);
    expect(text).toContain("Status: failed");
    expect(text).toContain("Disk full simulation");
    expect(text).not.toContain("Status: applied");
  });

  it("renders rolled-back transaction state", () => {
    seedApprovedWorkshop("fnd_fixture_scaffold_apply_client_rollback");
    const prepared = prepareProjectScaffold(
      "fnd_fixture_scaffold_apply_client_rollback",
    );
    const planId = prepared.record.plan.planId;
    const fsState: Record<string, string | null> = {};
    const writer = (path: string, content: string | null) => {
      fsState[path] = content;
    };

    applyFoundationProjectScaffold(
      "fnd_fixture_scaffold_apply_client_rollback",
      planId,
      {
        fileWriter: writer as (path: string, content: string) => void,
      },
    );
    const rolledBack = rollbackFoundationProjectScaffold(
      "fnd_fixture_scaffold_apply_client_rollback",
      planId,
      { fileWriter: writer },
    );
    const vm = buildFoundationScaffoldRollbackViewModel(rolledBack, "ready");
    const text = renderFoundationScaffoldRollbackText(vm);

    expect(vm.status).toBe("rolled-back");
    expect(text).toContain("Status: rolled-back");
    expect(text).toContain("Surface state: ready");
  });

  it("keeps CLI scaffold-apply and rollback parity with apply viewmodels", async () => {
    seedApprovedWorkshop("fnd_fixture_scaffold_apply_client_cli");
    const prepared = await runFoundationScaffoldCliCommand("scaffold-prepare", {
      workshopId: "fnd_fixture_scaffold_apply_client_cli",
      json: true,
    });
    expect(prepared.exitCode).toBe(0);
    const preparePayload = JSON.parse(prepared.stdout) as {
      record: { plan: { planId: string } };
    };
    const planId = preparePayload.record.plan.planId;

    const cliApply = await runFoundationScaffoldCliCommand("scaffold-apply", {
      workshopId: "fnd_fixture_scaffold_apply_client_cli",
      planId,
      json: true,
    });
    expect(cliApply.exitCode).toBe(0);
    const applyPayload = JSON.parse(cliApply.stdout);
    expect(applyPayload.schemaVersion).toBe(
      FOUNDATION_SCAFFOLD_APPLY_SCHEMA_URN,
    );
    const cliApplyVm = buildFoundationScaffoldApplyViewModel(
      applyPayload,
      "ready",
    );
    expect(cliApplyVm.status).toBe("applied");
    expect(cliApplyVm.planId).toBe(planId);

    seedApprovedWorkshop("fnd_fixture_scaffold_apply_client_cli_app");
    const appPrepared = prepareProjectScaffold(
      "fnd_fixture_scaffold_apply_client_cli_app",
    );
    const appPlanId = appPrepared.record.plan.planId;
    const appApply = applyFoundationProjectScaffold(
      "fnd_fixture_scaffold_apply_client_cli_app",
      appPlanId,
      { fileWriter: () => undefined },
    );
    const appApplyVm = buildFoundationScaffoldApplyViewModel(appApply, "ready");
    expect(appApplyVm.status).toBe("applied");
    expect(appApplyVm.writtenFiles.length).toBeGreaterThan(0);

    const cliRollback = await runFoundationScaffoldCliCommand(
      "scaffold-rollback",
      {
        workshopId: "fnd_fixture_scaffold_apply_client_cli",
        planId,
        json: true,
      },
    );
    expect(cliRollback.exitCode).toBe(0);
    const rollbackPayload = JSON.parse(cliRollback.stdout);
    expect(rollbackPayload.schemaVersion).toBe(
      FOUNDATION_SCAFFOLD_ROLLBACK_SCHEMA_URN,
    );
    const cliRollbackVm = buildFoundationScaffoldRollbackViewModel(
      rollbackPayload,
      "ready",
    );
    expect(cliRollbackVm.status).toBe("rolled-back");
  });
});
