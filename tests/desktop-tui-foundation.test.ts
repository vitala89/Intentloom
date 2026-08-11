import { resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  FOUNDATION_FIXTURE_IDS,
  buildFoundationWorkshopProgressFromId,
  clearFoundationWorkshopStore,
  evaluateFoundationWorkshopReadiness,
  getFoundationFixtureWorkshop,
  installFoundationFixture,
  installFoundationFixtureCatalog,
  loadFoundationFixtureCatalog,
  renderFoundationWorkshopProgressText,
  renderFoundationWorkshopShellText,
  runFoundationCliCommand,
} from "@intentloom/application";

const fixturePath = resolve(
  process.cwd(),
  "tests/fixtures/foundation/workshop-states.v1.json",
);

afterEach(() => {
  clearFoundationWorkshopStore();
});

describe("Engineering Workspace W2 Client: Desktop and TUI viewmodels", () => {
  it("renders the foundation workshop shell for empty and resume states", () => {
    const emptyText = renderFoundationWorkshopShellText({
      headline: "Foundation workshop",
      description:
        "Establish actors, workflows, quality scenarios, and readiness before blueprinting.",
      canStart: true,
      surfaceState: "empty",
    });
    expect(emptyText).toContain("Surface state: empty");
    expect(emptyText).toContain("Ready to start");

    const resumeText = renderFoundationWorkshopShellText({
      headline: "Foundation workshop",
      description:
        "Establish actors, workflows, quality scenarios, and readiness before blueprinting.",
      canStart: true,
      resumeWorkshopId: "fnd_fixture_partial_discovering",
      surfaceState: "resume",
    });
    expect(resumeText).toContain(
      "Resume workshop: fnd_fixture_partial_discovering",
    );
    expect(resumeText).toContain("Surface state: resume");
  });

  it("keeps CLI get parity with workshop progress viewmodels for frozen fixtures", async () => {
    const catalog = await loadFoundationFixtureCatalog(fixturePath);
    installFoundationFixtureCatalog(catalog);

    for (const fixtureId of FOUNDATION_FIXTURE_IDS) {
      const workshop = getFoundationFixtureWorkshop(catalog, fixtureId);
      const cliResult = runFoundationCliCommand("get", {
        workshopId: workshop.id,
        json: true,
      });
      expect(cliResult.exitCode).toBe(0);
      const cliParsed = JSON.parse(cliResult.stdout);

      const vm = buildFoundationWorkshopProgressFromId(workshop.id);
      expect(vm.workshopId).toBe(
        (cliParsed as { workshop: { id: string } }).workshop.id,
      );
      expect(vm.status).toBe(
        (cliParsed as { workshop: { status: string } }).workshop.status,
      );
      expect(vm.retentionStatus).toBe(
        (cliParsed as { retention: { status: string } }).retention.status,
      );
      expect(vm.readinessStatus).toBe(
        (cliParsed as { workshop: { readinessStatus: string } }).workshop
          .readinessStatus,
      );

      const text = renderFoundationWorkshopProgressText(vm);
      expect(text).toContain(`Foundation Workshop: ${workshop.id}`);
      expect(text).toContain(`Status: ${workshop.status}`);
      expect(text).toContain(`Readiness: ${workshop.readinessStatus}`);
    }
  });

  it("keeps summarize CLI parity with progress counts for readiness-ready fixture", async () => {
    const catalog = await loadFoundationFixtureCatalog(fixturePath);
    installFoundationFixture("foundation-fixture-readiness-ready", catalog);

    const summarize = runFoundationCliCommand("summarize", {
      workshopId: "fnd_fixture_readiness_ready",
      json: true,
    });
    expect(summarize.exitCode).toBe(0);
    const summary = JSON.parse(summarize.stdout) as {
      answeredQuestions: number;
      totalQuestions: number;
      pendingQuestions: number;
    };

    const vm = buildFoundationWorkshopProgressFromId(
      "fnd_fixture_readiness_ready",
    );
    expect(vm.answeredQuestions).toBe(summary.answeredQuestions);
    expect(vm.totalQuestions).toBe(summary.totalQuestions);
    expect(vm.pendingQuestions).toBe(summary.pendingQuestions);
    expect(vm.readinessStatus).toBe("ready");
  });

  it("surfaces conflict counts for the conflict-warning fixture", async () => {
    const catalog = await loadFoundationFixtureCatalog(fixturePath);
    installFoundationFixture("foundation-fixture-conflict-warning", catalog);

    const conflicts = runFoundationCliCommand("conflicts", {
      workshopId: "fnd_fixture_conflict_warning",
      json: true,
    });
    expect(conflicts.exitCode).toBe(0);
    const conflictPayload = JSON.parse(conflicts.stdout) as {
      conflicts: readonly unknown[];
    };

    const vm = buildFoundationWorkshopProgressFromId(
      "fnd_fixture_conflict_warning",
    );
    expect(vm.conflictCount).toBe(conflictPayload.conflicts.length);
    expect(vm.conflictCount).toBeGreaterThan(0);

    const text = renderFoundationWorkshopProgressText({
      ...vm,
      surfaceState: "ready",
    });
    expect(text).toContain(`Conflicts: ${vm.conflictCount}`);
  });

  it("surfaces readiness status and CLI readiness parity for blocking and ready fixtures", async () => {
    const catalog = await loadFoundationFixtureCatalog(fixturePath);
    installFoundationFixture("foundation-fixture-readiness-blocking", catalog);

    const blockingVm = buildFoundationWorkshopProgressFromId(
      "fnd_fixture_readiness_blocking",
    );
    expect(blockingVm.readinessStatus).toBe("blocked");

    installFoundationFixture("foundation-fixture-readiness-ready", catalog);
    evaluateFoundationWorkshopReadiness("fnd_fixture_readiness_ready");

    const readiness = runFoundationCliCommand("readiness", {
      workshopId: "fnd_fixture_readiness_ready",
      json: true,
    });
    expect(readiness.exitCode).toBe(0);
    const readinessPayload = JSON.parse(readiness.stdout) as {
      blockingCount: number;
      warningCount: number;
      readinessStatus: string;
    };

    const readyVm = buildFoundationWorkshopProgressFromId(
      "fnd_fixture_readiness_ready",
    );
    expect(readyVm.readinessStatus).toBe(readinessPayload.readinessStatus);
    expect(readyVm.blockingFindings).toBe(readinessPayload.blockingCount);
    expect(readyVm.warningFindings).toBe(readinessPayload.warningCount);
  });

  it("represents deleted workshops with the deleted surface state", async () => {
    const catalog = await loadFoundationFixtureCatalog(fixturePath);
    installFoundationFixture("foundation-fixture-empty-draft", catalog);

    const beforeDelete = buildFoundationWorkshopProgressFromId(
      "fnd_fixture_empty_draft",
    );

    const deleted = runFoundationCliCommand("delete", {
      workshopId: "fnd_fixture_empty_draft",
      json: true,
    });
    expect(deleted.exitCode).toBe(0);

    const missing = runFoundationCliCommand("get", {
      workshopId: "fnd_fixture_empty_draft",
      json: true,
    });
    expect(missing.exitCode).toBe(1);

    const vm = {
      ...beforeDelete,
      surfaceState: "deleted" as const,
    };
    expect(renderFoundationWorkshopProgressText(vm)).toContain(
      "Surface state: deleted",
    );
  });
});
