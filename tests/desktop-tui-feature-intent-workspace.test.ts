import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  FEATURE_INTENT_FIXTURE_IDS,
  buildFeatureIntentWorkspaceViewModel,
  createFeatureIntentFixtureFileSystem,
  getFeatureIntentFixture,
  loadFeatureIntentFixtureCatalog,
  prepareFeatureIntentWorkspace,
  renderFeatureIntentWorkspaceText,
  runFeatureIntentWorkspaceCliCommand,
} from "@intentloom/application";

const catalog = loadFeatureIntentFixtureCatalog();

describe("Engineering Workspace W10 Client: Desktop and TUI viewmodels", () => {
  it("builds panel viewmodels for frozen fixture IDs", async () => {
    for (const fixtureId of FEATURE_INTENT_FIXTURE_IDS) {
      const fixture = getFeatureIntentFixture(catalog, fixtureId);
      const overview = await prepareFeatureIntentWorkspace(
        {
          root: resolve(fixture.root),
          title: fixture.title,
          summary: fixture.summary,
          now: () => 1_700_000_000_000,
        },
        createFeatureIntentFixtureFileSystem(fixture),
      );
      const viewmodel = buildFeatureIntentWorkspaceViewModel(overview, "ready");
      expect(viewmodel.title).toBe(fixture.expected.title);
      expect(viewmodel.packages).toEqual(fixture.expected.expectedPackages);
      expect(viewmodel.alternatives).toHaveLength(
        fixture.expected.alternativeCount,
      );
      expect(viewmodel.planSteps.length).toBeGreaterThan(0);
      expect(viewmodel.mutationAllowed).toBe(false);
      expect(viewmodel.executionGate).toBe("w11-blocked");
    }
  });

  it("renders impact, alternatives, and plan preview for the tauri fixture", async () => {
    const fixture = getFeatureIntentFixture(
      catalog,
      "feature-fixture-tauri-window",
    );
    const overview = await prepareFeatureIntentWorkspace(
      {
        root: resolve(fixture.root),
        title: fixture.title,
        summary: fixture.summary,
        now: () => 1_700_000_000_000,
      },
      createFeatureIntentFixtureFileSystem(fixture),
    );
    const viewmodel = buildFeatureIntentWorkspaceViewModel(overview, "ready");
    const text = renderFeatureIntentWorkspaceText(viewmodel);

    expect(text).toContain("Feature Intent Workspace:");
    expect(text).toContain("Add desktop window controls");
    expect(text).toContain("apps/desktop");
    expect(text).toContain("Narrow scope (selected)");
    expect(text).toContain("Hold for explicit W11 bounded execution approval");
    expect(text).toContain("Mutation allowed: false");
  });

  it("keeps CLI prepare JSON parity with panel viewmodels", async () => {
    for (const fixtureId of FEATURE_INTENT_FIXTURE_IDS) {
      const fixture = getFeatureIntentFixture(catalog, fixtureId);
      const fixtureRoot = resolve(fixture.root);
      const fs = createFeatureIntentFixtureFileSystem(fixture);
      const overview = await prepareFeatureIntentWorkspace(
        {
          root: fixtureRoot,
          title: fixture.title,
          summary: fixture.summary,
          now: () => 1_700_000_000_000,
        },
        fs,
      );
      const viewmodel = buildFeatureIntentWorkspaceViewModel(overview, "ready");
      const cliResult = await runFeatureIntentWorkspaceCliCommand("prepare", {
        root: fixtureRoot,
        title: fixture.title,
        summary: fixture.summary,
        json: true,
        fs,
      });
      expect(cliResult.exitCode).toBe(0);
      const parsed = JSON.parse(cliResult.stdout) as {
        title: string;
        alternativeCount: number;
        mutationAllowed: boolean;
        executionGate: string;
      };
      expect(parsed.title).toBe(viewmodel.title);
      expect(parsed.alternativeCount).toBe(viewmodel.alternativeCount);
      expect(parsed.mutationAllowed).toBe(false);
      expect(parsed.executionGate).toBe("w11-blocked");
    }
  });
});
