import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  createFeatureIntent,
  createFeatureIntentFixtureFileSystem,
  getFeatureIntentFixture,
  listFeatureIntentOperations,
  loadFeatureIntentFixtureCatalog,
  prepareFeatureIntentWorkspace,
  prepareImplementationPlan,
  renderFeatureIntentWorkspaceText,
  buildFeatureIntentWorkspaceViewModel,
  runFeatureIntentWorkspaceCliCommand,
} from "@intentloom/application";
import { FEATURE_INTENT_WORKSPACE_OVERVIEW_SCHEMA_URN } from "@intentloom/protocol";
import { validateFeatureIntentWorkspaceOverview } from "@intentloom/validator";

const catalog = loadFeatureIntentFixtureCatalog();

describe("Engineering Workspace W10 Core: feature intent orchestration", () => {
  it("lists the five composed operations", () => {
    expect(listFeatureIntentOperations()).toEqual([
      "createFeatureIntent",
      "resolveAffectedScope",
      "analyzeArchitectureImpact",
      "prepareImplementationAlternatives",
      "prepareImplementationPlan",
    ]);
  });

  it("creates a versioned read-only feature intent", () => {
    const intent = createFeatureIntent({
      title: "Add structured logging",
      summary: "Introduce a project-local logging helper.",
      now: () => 1_700_000_000_000,
    });
    expect(intent.id).toBe("fi-add-structured-logging-1700000000000");
    expect(intent.readOnly).toBe(true);
  });

  it("slugs punctuation-heavy titles without regular expressions", () => {
    const intent = createFeatureIntent({
      title: `---Add---structured---${"-".repeat(400)}logging---`,
      summary: "Keep the identifier linear-time.",
      now: () => 1_700_000_000_000,
    });
    expect(intent.id).toBe("fi-add-structured-logging-1700000000000");
  });

  it("prepares generic logging impact without mutation", async () => {
    const fixture = getFeatureIntentFixture(
      catalog,
      "feature-fixture-generic-logging",
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

    expect(overview.schemaVersion).toBe(
      FEATURE_INTENT_WORKSPACE_OVERVIEW_SCHEMA_URN,
    );
    expect(overview.readOnly).toBe(true);
    expect(overview.affectedScope.packages).toEqual(
      fixture.expected.expectedPackages,
    );
    expect(overview.plan.mutationAllowed).toBe(false);
    expect(overview.plan.executionGate).toBe("w11-blocked");
    expect(overview.alternatives).toHaveLength(
      fixture.expected.alternativeCount,
    );
    validateFeatureIntentWorkspaceOverview(overview);
  });

  it("marks public API risk for the TypeScript export fixture", async () => {
    const fixture = getFeatureIntentFixture(
      catalog,
      "feature-fixture-typescript-api",
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

    expect(overview.affectedScope.publicApiSurfaces).toContain("src/index.ts");
    expect(overview.affectedScope.foundationPresent).toBe(true);
    expect(overview.affectedScope.decisionPaths).toContain(
      "docs/decisions/0001-public-api.md",
    );
    expect(overview.architectureImpact.publicApiChangeRisk).toBe("likely");
  });

  it("resolves tauri desktop and core packages from observed graph", async () => {
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

    expect(overview.affectedScope.packages).toEqual(
      fixture.expected.expectedPackages,
    );
    expect(overview.affectedScope.specializedPackIds).toContain(
      "pack-tauri-desktop",
    );
    expect(overview.architectureImpact.summary).toContain(
      "Add desktop window controls",
    );
  });

  it("keeps implementation plans review-only", () => {
    const plan = prepareImplementationPlan({
      alternatives: [
        {
          id: "alt-narrow-scope",
          strategy: "narrow-scope",
          title: "Narrow scope",
          summary: "Stay inside listed packages.",
          tradeoffs: ["Smallest blast radius"],
        },
      ],
    });
    expect(plan.reviewRequired).toBe(true);
    expect(plan.mutationAllowed).toBe(false);
    expect(plan.steps.every((step) => step.mutationAllowed === false)).toBe(
      true,
    );
  });

  it("builds client viewmodel and text renderer from overview", async () => {
    const fixture = getFeatureIntentFixture(
      catalog,
      "feature-fixture-generic-logging",
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
    expect(viewmodel.surfaceState).toBe("ready");
    expect(text).toContain("Feature Intent Workspace:");
    expect(text).toContain("Execution gate: w11-blocked");
  });

  it("returns JSON CLI prepare output matching viewmodel", async () => {
    const fixture = getFeatureIntentFixture(
      catalog,
      "feature-fixture-tauri-window",
    );
    const result = await runFeatureIntentWorkspaceCliCommand("prepare", {
      root: resolve(fixture.root),
      title: fixture.title,
      summary: fixture.summary,
      json: true,
      fs: createFeatureIntentFixtureFileSystem(fixture),
    });
    expect(result.exitCode).toBe(0);
    const parsed = JSON.parse(result.stdout) as {
      specializedPackIds: readonly string[];
      mutationAllowed: boolean;
    };
    expect(parsed.specializedPackIds).toContain("pack-tauri-desktop");
    expect(parsed.mutationAllowed).toBe(false);
  });
});
