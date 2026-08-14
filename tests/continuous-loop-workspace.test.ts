import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  CONTINUOUS_LOOP_MEMORY_APPROVAL,
  createContinuousLoopFixtureFileSystem,
  getContinuousLoopFixture,
  listContinuousLoopOperations,
  loadContinuousLoopFixtureCatalog,
  prepareContinuousLoopWorkspace,
  runContinuousLoopWorkspaceCliCommand,
  buildContinuousLoopWorkspaceViewModel,
  renderContinuousLoopWorkspaceText,
} from "@intentloom/application";
import { CONTINUOUS_LOOP_WORKSPACE_OVERVIEW_SCHEMA_URN } from "@intentloom/protocol";
import { validateContinuousLoopWorkspaceOverview } from "@intentloom/validator";

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

describe("Engineering Workspace W12 Core: continuous development loop", () => {
  it("lists the five composed operations", () => {
    expect(listContinuousLoopOperations()).toEqual([
      "refreshAssessment",
      "classifyFindings",
      "proposeProjectMemory",
      "reviewMemoryUpdate",
      "suggestNextFeature",
    ]);
  });

  it("accepts a reviewed memory update after a compatible code refresh", async () => {
    const fixture = getContinuousLoopFixture(
      catalog,
      "loop-fixture-ready-memory",
    );
    const fs = createContinuousLoopFixtureFileSystem(fixture);
    const overview = await prepareContinuousLoopWorkspace(
      fixtureOptions(fixture),
      fs,
    );
    expect(overview.schemaVersion).toBe(
      CONTINUOUS_LOOP_WORKSPACE_OVERVIEW_SCHEMA_URN,
    );
    expect(overview.loopGate).toBe("accepted");
    expect(overview.mutationAllowed).toBe(true);
    expect(overview.comparison.changeKind).toBe("code");
    expect(overview.comparison.newFindingIds).toEqual(["finding-new"]);
    expect(overview.comparison.fixedFindingIds).toEqual(["finding-old"]);
    expect(overview.memoryProposal.lifecycleState).toBe("accepted");
    validateContinuousLoopWorkspaceOverview(overview);
    const written = await fs.read(
      resolve(fixture.root, ".aif/memory/items/w12-loop-ready.json"),
    );
    expect(written).toContain("working-context");
  });

  it("blocks memory apply without an explicit approval", async () => {
    const fixture = getContinuousLoopFixture(
      catalog,
      "loop-fixture-blocked-unapproved",
    );
    const overview = await prepareContinuousLoopWorkspace(
      fixtureOptions(fixture),
      createContinuousLoopFixtureFileSystem(fixture),
    );
    expect(overview.loopGate).toBe("w12-blocked");
    expect(overview.mutationAllowed).toBe(false);
    expect(overview.diagnostics).toContain(
      "apply-blocked:memory-approval-missing",
    );
    expect(overview.memoryApply.applied).toBe(false);
  });

  it("keeps incompatible history from becoming a memory write", async () => {
    const fixture = getContinuousLoopFixture(
      catalog,
      "loop-fixture-incompatible-history",
    );
    const overview = await prepareContinuousLoopWorkspace(
      fixtureOptions(fixture),
      createContinuousLoopFixtureFileSystem(fixture),
    );
    expect(overview.loopGate).toBe("incompatible");
    expect(overview.comparison.compatible).toBe(false);
    expect(overview.diagnostics).toContain(
      "historical-incompatible:schema-or-project",
    );
    expect(overview.memoryApply.applied).toBe(false);
  });

  it("rejects model-interpretation changes as unsupported", async () => {
    const fixture = getContinuousLoopFixture(
      catalog,
      "loop-fixture-model-interpretation",
    );
    const overview = await prepareContinuousLoopWorkspace(
      fixtureOptions(fixture),
      createContinuousLoopFixtureFileSystem(fixture),
    );
    expect(overview.loopGate).toBe("unsupported");
    expect(overview.comparison.changeKind).toBe("model-interpretation");
    expect(overview.diagnostics).toContain(
      "model-interpretation-not-auto-accepted",
    );
    expect(overview.mutationAllowed).toBe(false);
  });

  it("keeps prepare read-only even when apply is requested on the fixture", async () => {
    const fixture = getContinuousLoopFixture(
      catalog,
      "loop-fixture-ready-memory",
    );
    const overview = await prepareContinuousLoopWorkspace(
      {
        ...fixtureOptions(fixture),
        applyRequested: false,
        grantedApprovals: [CONTINUOUS_LOOP_MEMORY_APPROVAL],
      },
      createContinuousLoopFixtureFileSystem(fixture),
    );
    expect(overview.loopGate).toBe("ready");
    expect(overview.memoryProposal.lifecycleState).toBe("draft");
    expect(overview.memoryApply.attempted).toBe(false);
  });

  it("rejects CLI validation failures for missing snapshots", async () => {
    const result = await runContinuousLoopWorkspaceCliCommand("prepare", {
      root: "/tmp/loop",
      json: true,
    });
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("previous and current snapshots");
  });

  it("builds client viewmodel and JSON CLI output from overview", async () => {
    const fixture = getContinuousLoopFixture(
      catalog,
      "loop-fixture-blocked-unapproved",
    );
    const overview = await prepareContinuousLoopWorkspace(
      fixtureOptions(fixture),
      createContinuousLoopFixtureFileSystem(fixture),
    );
    const viewmodel = buildContinuousLoopWorkspaceViewModel(overview, "ready");
    const text = renderContinuousLoopWorkspaceText(viewmodel);
    expect(text).toContain("Loop gate: w12-blocked");
    const result = await runContinuousLoopWorkspaceCliCommand("prepare", {
      root: resolve(fixture.root),
      previous: fixture.previous,
      current: fixture.current,
      json: true,
      fs: createContinuousLoopFixtureFileSystem(fixture),
    });
    expect(result.exitCode).toBe(0);
    const parsed = JSON.parse(result.stdout) as {
      loopGate: string;
      mutationAllowed: boolean;
    };
    expect(parsed.loopGate).toBe("ready");
    expect(parsed.mutationAllowed).toBe(false);
  });
});
