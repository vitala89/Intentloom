import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  CONTINUOUS_LOOP_FIXTURE_IDS,
  buildContinuousLoopWorkspaceViewModel,
  createContinuousLoopFixtureFileSystem,
  getContinuousLoopFixture,
  loadContinuousLoopFixtureCatalog,
  prepareContinuousLoopWorkspace,
  renderContinuousLoopWorkspaceText,
  runContinuousLoopWorkspaceCliCommand,
} from "@intentloom/application";

const catalog = loadContinuousLoopFixtureCatalog();

function fixtureOptions(fixture: ReturnType<typeof getContinuousLoopFixture>) {
  return {
    root: resolve(fixture.root),
    previous: fixture.previous,
    current: fixture.current,
    now: () => 1_700_000_000_000,
    ...(fixture.projectId !== undefined
      ? { projectId: fixture.projectId }
      : {}),
    ...(fixture.changeKind !== undefined
      ? { changeKind: fixture.changeKind }
      : {}),
    ...(fixture.memoryContent !== undefined
      ? { memoryContent: fixture.memoryContent }
      : {}),
    ...(fixture.applyRequested !== undefined
      ? { applyRequested: fixture.applyRequested }
      : {}),
    ...(fixture.grantedApprovals !== undefined
      ? { grantedApprovals: fixture.grantedApprovals }
      : {}),
  };
}

describe("Engineering Workspace W12 Client: Desktop and TUI viewmodels", () => {
  it("builds panel viewmodels for frozen fixture IDs", async () => {
    for (const fixtureId of CONTINUOUS_LOOP_FIXTURE_IDS) {
      const fixture = getContinuousLoopFixture(catalog, fixtureId);
      const overview = await prepareContinuousLoopWorkspace(
        fixtureOptions(fixture),
        createContinuousLoopFixtureFileSystem(fixture),
      );
      const viewmodel = buildContinuousLoopWorkspaceViewModel(
        overview,
        fixture.expected.loopGate === "unsupported" ? "unsupported" : "ready",
      );
      expect(viewmodel.loopGate).toBe(fixture.expected.loopGate);
      expect(viewmodel.mutationAllowed).toBe(fixture.expected.mutationAllowed);
      const diagnosticNeedles = fixture.expected.diagnosticIncludes
        ? [fixture.expected.diagnosticIncludes]
        : [];
      expect(
        diagnosticNeedles.every((needle) =>
          viewmodel.diagnostics.some((item) => item.includes(needle)),
        ),
      ).toBe(true);
    }
  });

  it("renders gate, change kind, and apply status for the ready-memory fixture", async () => {
    const fixture = getContinuousLoopFixture(
      catalog,
      "loop-fixture-ready-memory",
    );
    const overview = await prepareContinuousLoopWorkspace(
      fixtureOptions(fixture),
      createContinuousLoopFixtureFileSystem(fixture),
    );
    const viewmodel = buildContinuousLoopWorkspaceViewModel(overview, "ready");
    const text = renderContinuousLoopWorkspaceText(viewmodel);

    expect(text).toContain("Continuous Loop Workspace:");
    expect(text).toContain("Loop gate: accepted");
    expect(text).toContain("Change kind: code");
    expect(text).toContain("Mutation allowed: true");
    expect(text).toContain("Memory: accepted");
    expect(text).toContain("Next feature: Address finding-new");
  });

  it("keeps CLI JSON parity with panel viewmodels", async () => {
    for (const fixtureId of CONTINUOUS_LOOP_FIXTURE_IDS) {
      const fixture = getContinuousLoopFixture(catalog, fixtureId);
      const fixtureRoot = resolve(fixture.root);
      const overview = await prepareContinuousLoopWorkspace(
        fixtureOptions(fixture),
        createContinuousLoopFixtureFileSystem(fixture),
      );
      const viewmodel = buildContinuousLoopWorkspaceViewModel(
        overview,
        "ready",
      );
      const command = fixture.applyRequested === true ? "execute" : "prepare";
      const cliResult = await runContinuousLoopWorkspaceCliCommand(command, {
        root: fixtureRoot,
        previous: fixture.previous,
        current: fixture.current,
        json: true,
        fs: createContinuousLoopFixtureFileSystem(fixture),
        ...(fixture.projectId !== undefined
          ? { projectId: fixture.projectId }
          : {}),
        ...(fixture.changeKind !== undefined
          ? { changeKind: fixture.changeKind }
          : {}),
        ...(fixture.memoryContent !== undefined
          ? { memoryContent: fixture.memoryContent }
          : {}),
        ...(fixture.applyRequested !== undefined
          ? { applyRequested: fixture.applyRequested }
          : {}),
        ...(fixture.grantedApprovals !== undefined
          ? { grantedApprovals: fixture.grantedApprovals }
          : {}),
      });
      expect(cliResult.exitCode).toBe(0);
      const parsed = JSON.parse(cliResult.stdout) as {
        loopGate: string;
        mutationAllowed: boolean;
        changeKind: string;
      };
      expect(parsed.loopGate).toBe(viewmodel.loopGate);
      expect(parsed.mutationAllowed).toBe(viewmodel.mutationAllowed);
      expect(parsed.changeKind).toBe(viewmodel.changeKind);
    }
  });
});
