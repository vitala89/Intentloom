import { resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  INCEPTION_FIXTURE_IDS,
  buildInceptionSessionProgressFromId,
  clearInceptionSessionStore,
  getInceptionFixtureSession,
  installInceptionFixture,
  installInceptionFixtureCatalog,
  loadInceptionFixtureCatalog,
  renderInceptionNewProjectShellText,
  renderInceptionSessionProgressText,
  runInceptionCliCommand,
} from "@intentloom/application";

const fixturePath = resolve(
  process.cwd(),
  "tests/fixtures/inception/session-states.v1.json",
);

afterEach(() => {
  clearInceptionSessionStore();
});

describe("Engineering Workspace W1 Client: Desktop and TUI viewmodels", () => {
  it("renders the new project shell for empty and resume states", () => {
    const emptyText = renderInceptionNewProjectShellText({
      headline: "Start a new project",
      description:
        "Describe your idea and answer discovery questions before any files are created.",
      canStart: true,
      surfaceState: "empty",
    });
    expect(emptyText).toContain("Surface state: empty");
    expect(emptyText).toContain("Ready to start");

    const resumeText = renderInceptionNewProjectShellText({
      headline: "Start a new project",
      description:
        "Describe your idea and answer discovery questions before any files are created.",
      canStart: true,
      resumeSessionId: "inc_fixture_partial_discovering",
      surfaceState: "resume",
    });
    expect(resumeText).toContain(
      "Resume session: inc_fixture_partial_discovering",
    );
    expect(resumeText).toContain("Surface state: resume");
  });

  it("keeps CLI get parity with session progress viewmodels for frozen fixtures", async () => {
    const catalog = await loadInceptionFixtureCatalog(fixturePath);
    installInceptionFixtureCatalog(catalog);

    for (const fixtureId of INCEPTION_FIXTURE_IDS) {
      const session = getInceptionFixtureSession(catalog, fixtureId);
      const cliResult = runInceptionCliCommand("get", {
        sessionId: session.id,
        json: true,
      });
      expect(cliResult.exitCode).toBe(0);
      const cliParsed = JSON.parse(cliResult.stdout);

      const vm = buildInceptionSessionProgressFromId(session.id);
      expect(vm.sessionId).toBe(
        (cliParsed as { session: { id: string } }).session.id,
      );
      expect(vm.status).toBe(
        (cliParsed as { session: { status: string } }).session.status,
      );
      expect(vm.retentionStatus).toBe(
        (cliParsed as { retention: { status: string } }).retention.status,
      );

      const text = renderInceptionSessionProgressText(vm);
      expect(text).toContain(`Inception Session: ${session.id}`);
      expect(text).toContain(`Status: ${session.status}`);
    }
  });

  it("keeps summarize CLI parity with progress counts for summary-complete fixture", async () => {
    const catalog = await loadInceptionFixtureCatalog(fixturePath);
    installInceptionFixture(catalog, "inception-fixture-summary-complete");

    const summarize = runInceptionCliCommand("summarize", {
      sessionId: "inc_fixture_summary_complete",
      json: true,
    });
    expect(summarize.exitCode).toBe(0);
    const summary = JSON.parse(summarize.stdout) as {
      answeredQuestions: number;
      totalQuestions: number;
      pendingQuestions: number;
    };

    const vm = buildInceptionSessionProgressFromId(
      "inc_fixture_summary_complete",
    );
    expect(vm.answeredQuestions).toBe(summary.answeredQuestions);
    expect(vm.totalQuestions).toBe(summary.totalQuestions);
    expect(vm.pendingQuestions).toBe(summary.pendingQuestions);
    expect(vm.progressPercent).toBe(100);
  });

  it("surfaces conflict counts for the conflict-warning fixture", async () => {
    const catalog = await loadInceptionFixtureCatalog(fixturePath);
    installInceptionFixture(catalog, "inception-fixture-conflict-warning");

    const conflicts = runInceptionCliCommand("conflicts", {
      sessionId: "inc_fixture_conflict_warning",
      json: true,
    });
    expect(conflicts.exitCode).toBe(0);
    const conflictPayload = JSON.parse(conflicts.stdout) as {
      conflicts: readonly unknown[];
    };

    const vm = buildInceptionSessionProgressFromId(
      "inc_fixture_conflict_warning",
    );
    expect(vm.conflictCount).toBe(conflictPayload.conflicts.length);
    expect(vm.conflictCount).toBeGreaterThan(0);

    const text = renderInceptionSessionProgressText({
      ...vm,
      surfaceState: "ready",
    });
    expect(text).toContain(`Conflicts: ${vm.conflictCount}`);
  });

  it("represents deleted sessions with the deleted surface state", async () => {
    const catalog = await loadInceptionFixtureCatalog(fixturePath);
    installInceptionFixture(catalog, "inception-fixture-empty-discovering");

    const beforeDelete = buildInceptionSessionProgressFromId(
      "inc_fixture_empty_discovering",
    );

    const deleted = runInceptionCliCommand("delete", {
      sessionId: "inc_fixture_empty_discovering",
      json: true,
    });
    expect(deleted.exitCode).toBe(0);

    const missing = runInceptionCliCommand("get", {
      sessionId: "inc_fixture_empty_discovering",
      json: true,
    });
    expect(missing.exitCode).toBe(1);

    const vm = {
      ...beforeDelete,
      surfaceState: "deleted" as const,
    };
    expect(renderInceptionSessionProgressText(vm)).toContain(
      "Surface state: deleted",
    );
  });
});
