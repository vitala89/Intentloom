import { describe, expect, it } from "vitest";
import {
  createInceptionSession,
  recordInceptionAnswer,
  proposeProjectBlueprints,
  prepareProjectScaffoldPlan,
  formatScaffoldPlanDryRun,
  diffScaffoldPlan,
  validateWorkspaceScaffoldPlan,
} from "@intentloom/application";

describe("Project Inception Library Workspace Starter (Phase I7)", () => {
  it("generates a pnpm workspace scaffold plan for pnpm-workspace topology", () => {
    let session = createInceptionSession({
      root: "/tmp/workspace-test",
      idea: "Modular AI Agent Framework",
    });

    session = recordInceptionAnswer(session, {
      questionId: "q2_architecture_style",
      value: "pnpm-workspace",
      confidence: "confirmed",
      timestamp: Date.now(),
    });

    const blueprint = proposeProjectBlueprints(session).recommended;
    expect(blueprint.topology).toBe("pnpm-workspace");

    const plan = prepareProjectScaffoldPlan(blueprint, "/tmp/workspace-test");
    expect(plan.root).toBe("/tmp/workspace-test");

    const paths = plan.files.map((f) => f.path);
    expect(paths).toContain("pnpm-workspace.yaml");
    expect(paths).toContain("package.json");
    expect(paths).toContain("tsconfig.json");
    expect(paths).toContain("packages/core/package.json");
    expect(paths).toContain("packages/core/src/index.ts");
    expect(paths).toContain("packages/core/tests/index.test.ts");
    expect(paths).toContain("packages/react/package.json");
    expect(paths).toContain("packages/testing/package.json");
    expect(paths).toContain("examples/vanilla-basic/package.json");
    expect(paths).toContain("examples/react-basic/package.json");
    expect(paths).toContain("README.md");

    const workspaceYaml = plan.files.find(
      (f) => f.path === "pnpm-workspace.yaml",
    );
    expect(workspaceYaml?.content).toContain("packages/*");
    expect(workspaceYaml?.content).toContain("examples/*");

    const validation = validateWorkspaceScaffoldPlan(plan);
    expect(validation.valid).toBe(true);
  });

  it("includes nx.json when recommendedPacks contains nx-monorepo", () => {
    const session = createInceptionSession({
      root: "/tmp/nx-test",
      idea: "Nx Monorepo App",
    });

    const baseBlueprint = proposeProjectBlueprints(session).recommended;
    const nxBlueprint = {
      ...baseBlueprint,
      topology: "pnpm-workspace" as const,
      recommendedPacks: [...baseBlueprint.recommendedPacks, "nx-monorepo"],
    };

    const plan = prepareProjectScaffoldPlan(nxBlueprint, "/tmp/nx-test");
    const paths = plan.files.map((f) => f.path);

    expect(paths).toContain("nx.json");
    expect(plan.dependencies).toContain("nx");

    const nxJsonFile = plan.files.find((f) => f.path === "nx.json");
    expect(JSON.parse(nxJsonFile!.content)).toHaveProperty("targetDefaults");
  });

  it("formats dry-run preview and calculates path collisions for workspace plans", () => {
    let session = createInceptionSession({
      root: "/tmp/diff-test",
      idea: "Workspace Diff Test",
    });

    session = recordInceptionAnswer(session, {
      questionId: "q2_architecture_style",
      value: "pnpm-workspace",
      confidence: "confirmed",
      timestamp: Date.now(),
    });

    const blueprint = proposeProjectBlueprints(session).recommended;
    const plan = prepareProjectScaffoldPlan(blueprint, "/tmp/diff-test");

    const dryRun = formatScaffoldPlanDryRun(plan);
    expect(dryRun).toContain("[CREATE] pnpm-workspace.yaml (managed)");
    expect(dryRun).toContain("[CREATE] packages/core/package.json (managed)");
    expect(dryRun).toContain(
      "[CREATE] examples/vanilla-basic/package.json (managed)",
    );

    const diff = diffScaffoldPlan(plan, ["pnpm-workspace.yaml", "README.md"]);
    expect(diff.collisions).toEqual(["pnpm-workspace.yaml", "README.md"]);
    expect(diff.created).toContain("packages/core/package.json");
  });
});
