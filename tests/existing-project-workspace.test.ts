import { describe, expect, it } from "vitest";
import {
  buildExistingProjectWorkspaceViewModel,
  createExistingProjectFixtureFileSystem,
  getExistingProjectFixture,
  loadExistingProjectFixtureCatalog,
  listExistingProjectScanScopes,
  prepareExistingProjectWorkspace,
  renderExistingProjectWorkspaceText,
  runExistingProjectWorkspaceCliCommand,
} from "@intentloom/application";
import { EXISTING_PROJECT_WORKSPACE_OVERVIEW_SCHEMA_URN } from "@intentloom/protocol";
import { validateExistingProjectWorkspaceOverview } from "@intentloom/validator";

const catalog = loadExistingProjectFixtureCatalog();

describe("Engineering Workspace W9 Core: existing project workspace orchestration", () => {
  it("lists supported scan scopes", () => {
    expect(listExistingProjectScanScopes()).toEqual([
      "quick",
      "standard",
      "deep",
    ]);
  });

  it("prepares generic uninitialized project overview on standard scope", async () => {
    const fixture = getExistingProjectFixture(
      catalog,
      "existing-fixture-generic-uninitialized",
    );
    const fs = createExistingProjectFixtureFileSystem(fixture);
    const overview = await prepareExistingProjectWorkspace(
      {
        root: fixture.root,
        scope: fixture.scope,
        now: () => 1_700_000_000_000,
      },
      fs,
    );

    expect(overview.schemaVersion).toBe(
      EXISTING_PROJECT_WORKSPACE_OVERVIEW_SCHEMA_URN,
    );
    expect(overview.readOnly).toBe(true);
    expect(overview.inspect.profile).toBe(fixture.expected.inspectProfile);
    expect(overview.inspect.readiness).toBe(fixture.expected.inspectReadiness);
    expect(overview.specializedPacks.candidateCount).toBe(
      fixture.expected.specializedCandidateCount,
    );
    expect(overview.adoption?.operationCount).toBe(
      fixture.expected.adoptionOperationCount,
    );
    expect(overview.assessment?.findingsCount).toBe(
      fixture.expected.assessmentFindingsCount,
    );
    expect(overview.doctor?.findingCount).toBe(
      fixture.expected.doctorFindingCount,
    );
    validateExistingProjectWorkspaceOverview(overview);
  });

  it("prepares quick scope without doctor or assessment sections", async () => {
    const fixture = getExistingProjectFixture(
      catalog,
      "existing-fixture-typescript-ready",
    );
    const fs = createExistingProjectFixtureFileSystem(fixture);
    const overview = await prepareExistingProjectWorkspace(
      { root: fixture.root, scope: "quick", now: () => 1_700_000_000_000 },
      fs,
    );

    expect(overview.scope).toBe("quick");
    expect(overview.inspect.profile).toBe("typescript");
    expect(overview.inspect.readiness).toBe("ready");
    expect(overview.doctor).toBeUndefined();
    expect(overview.assessment).toBeUndefined();
    expect(
      overview.flowSteps.some(
        (step) => step.id === "doctor" && step.status === "skipped",
      ),
    ).toBe(false);
  });

  it("detects tauri specialized pack candidates on standard scope", async () => {
    const fixture = getExistingProjectFixture(
      catalog,
      "existing-fixture-tauri-detected",
    );
    const fs = createExistingProjectFixtureFileSystem(fixture);
    const overview = await prepareExistingProjectWorkspace(
      {
        root: fixture.root,
        scope: fixture.scope,
        now: () => 1_700_000_000_000,
      },
      fs,
    );

    expect(overview.specializedPacks.candidateCount).toBe(1);
    expect(overview.specializedPacks.compatiblePackIds).toContain(
      "pack-tauri-desktop",
    );
  });

  it("builds client viewmodel and text renderer from overview", async () => {
    const fixture = getExistingProjectFixture(
      catalog,
      "existing-fixture-generic-uninitialized",
    );
    const fs = createExistingProjectFixtureFileSystem(fixture);
    const overview = await prepareExistingProjectWorkspace(
      { root: fixture.root, scope: "standard", now: () => 1_700_000_000_000 },
      fs,
    );
    const viewmodel = buildExistingProjectWorkspaceViewModel(overview, "ready");
    const text = renderExistingProjectWorkspaceText(viewmodel);

    expect(viewmodel.surfaceState).toBe("ready");
    expect(viewmodel.flowSteps.length).toBeGreaterThan(0);
    expect(text).toContain("Existing Project Workspace:");
    expect(text).toContain("Surface state: ready");
  });

  it("returns JSON CLI prepare output matching viewmodel", async () => {
    const fixture = getExistingProjectFixture(
      catalog,
      "existing-fixture-tauri-detected",
    );
    const fs = createExistingProjectFixtureFileSystem(fixture);
    const result = await runExistingProjectWorkspaceCliCommand("prepare", {
      root: fixture.root,
      scope: "standard",
      json: true,
      fs,
    });

    expect(result.exitCode).toBe(0);
    const parsed = JSON.parse(result.stdout) as {
      compatiblePackIds: readonly string[];
      specializedCandidateCount: number;
    };
    expect(parsed.specializedCandidateCount).toBe(1);
    expect(parsed.compatiblePackIds).toContain("pack-tauri-desktop");
  });
});
