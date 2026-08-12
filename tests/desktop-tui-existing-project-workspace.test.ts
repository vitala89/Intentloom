import { describe, expect, it } from "vitest";
import {
  EXISTING_PROJECT_FIXTURE_IDS,
  buildExistingProjectWorkspaceViewModel,
  createExistingProjectFixtureFileSystem,
  getExistingProjectFixture,
  loadExistingProjectFixtureCatalog,
  prepareExistingProjectWorkspace,
  renderExistingProjectWorkspaceText,
  runExistingProjectWorkspaceCliCommand,
} from "@intentloom/application";

const catalog = loadExistingProjectFixtureCatalog();

describe("Engineering Workspace W9 Client: Desktop and TUI viewmodels", () => {
  it("builds workspace viewmodels for frozen fixture IDs", async () => {
    for (const fixtureId of EXISTING_PROJECT_FIXTURE_IDS) {
      const fixture = getExistingProjectFixture(catalog, fixtureId);
      const fs = createExistingProjectFixtureFileSystem(fixture);
      const overview = await prepareExistingProjectWorkspace(
        {
          root: fixture.root,
          scope: fixture.scope,
          now: () => 1_700_000_000_000,
        },
        fs,
      );
      const viewmodel = buildExistingProjectWorkspaceViewModel(
        overview,
        "ready",
      );
      expect(viewmodel.root).toBe(fixture.root);
      expect(viewmodel.profile).toBe(fixture.expected.inspectProfile);
    }
  });

  it("renders accessible text summary for tauri-detected fixture", async () => {
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
    const viewmodel = buildExistingProjectWorkspaceViewModel(overview, "ready");
    const text = renderExistingProjectWorkspaceText(viewmodel);

    expect(text).toContain("Existing Project Workspace:");
    expect(text).toContain("Specialized candidates: 1");
    expect(text).toContain("pack-tauri-desktop");
    expect(text).toContain("Flow:");
  });

  it("keeps CLI prepare parity with workspace viewmodels for frozen fixtures", async () => {
    for (const fixtureId of EXISTING_PROJECT_FIXTURE_IDS) {
      const fixture = getExistingProjectFixture(catalog, fixtureId);
      const fs = createExistingProjectFixtureFileSystem(fixture);
      const overview = await prepareExistingProjectWorkspace(
        {
          root: fixture.root,
          scope: fixture.scope,
          now: () => 1_700_000_000_000,
        },
        fs,
      );
      const viewmodel = buildExistingProjectWorkspaceViewModel(
        overview,
        "ready",
      );
      const cliResult = await runExistingProjectWorkspaceCliCommand("prepare", {
        root: fixture.root,
        scope: fixture.scope,
        json: true,
        fs,
      });
      expect(cliResult.exitCode).toBe(0);
      const cliParsed = JSON.parse(cliResult.stdout) as {
        profile: string;
        specializedCandidateCount: number;
      };
      expect(cliParsed.profile).toBe(viewmodel.profile);
      expect(cliParsed.specializedCandidateCount).toBe(
        viewmodel.specializedCandidateCount,
      );
    }
  });
});
