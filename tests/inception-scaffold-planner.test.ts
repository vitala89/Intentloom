import { describe, expect, it } from "vitest";
import {
  createInceptionSession,
  proposeProjectBlueprints,
  prepareProjectScaffoldPlan,
  formatScaffoldPlanDryRun,
  diffScaffoldPlan,
} from "@intentloom/application";
import { validateScaffoldPlan } from "@intentloom/validator";

describe("Project Inception Minimal Scaffold Planner (Phase I5)", () => {
  it("generates a deterministic scaffold plan for minimal TypeScript library", () => {
    const session = createInceptionSession({
      root: "/tmp/planner-test",
      idea: "Minimal math utilities library",
    });

    const blueprint = proposeProjectBlueprints(session).recommended;
    const plan = prepareProjectScaffoldPlan(blueprint, "/tmp/planner-test");

    expect(plan.planId).toMatch(/^scaffold_\d+$/);
    expect(plan.root).toBe("/tmp/planner-test");
    expect(plan.blueprintDigest).toBe(blueprint.digest);
    expect(plan.files.length).toBe(5);

    const paths = plan.files.map((f) => f.path);
    expect(paths).toEqual([
      "package.json",
      "tsconfig.json",
      "src/index.ts",
      "tests/index.test.ts",
      "README.md",
    ]);

    const pkgFile = plan.files.find((f) => f.path === "package.json");
    expect(pkgFile).toBeDefined();
    expect(pkgFile?.isManaged).toBe(true);
    expect(JSON.parse(pkgFile!.content)).toMatchObject({
      name: "minimal-math-utilities-library",
      type: "module",
    });

    expect(plan.dependencies).toEqual(["typescript", "vitest"]);
  });

  it("formats human-readable dry-run output without side effects", () => {
    const session = createInceptionSession({
      root: "/tmp/dryrun-test",
      idea: "Dry run test",
    });

    const blueprint = proposeProjectBlueprints(session).recommended;
    const plan = prepareProjectScaffoldPlan(blueprint, "/tmp/dryrun-test");
    const dryRunText = formatScaffoldPlanDryRun(plan);

    expect(dryRunText).toContain("Scaffold Dry-Run Plan:");
    expect(dryRunText).toContain("Target Root: /tmp/dryrun-test");
    expect(dryRunText).toContain("[CREATE] package.json (managed)");
    expect(dryRunText).toContain("Proposed Dependencies: typescript, vitest");
  });

  it("detects path collisions against existing files", () => {
    const session = createInceptionSession({
      root: "/tmp/collision-test",
      idea: "Collision test",
    });

    const blueprint = proposeProjectBlueprints(session).recommended;
    const plan = prepareProjectScaffoldPlan(blueprint, "/tmp/collision-test");

    const existingPaths = ["package.json", "README.md"];
    const diff = diffScaffoldPlan(plan, existingPaths);

    expect(diff.collisions).toEqual(["package.json", "README.md"]);
    expect(diff.created).toEqual([
      "tsconfig.json",
      "src/index.ts",
      "tests/index.test.ts",
    ]);
    expect(diff.skipped).toEqual([]);
  });

  it("validates scaffold plan structure strictly", () => {
    expect(() => validateScaffoldPlan(null)).toThrow("expected object");
    expect(() =>
      validateScaffoldPlan({
        planId: "p1",
        root: "/tmp",
        blueprintDigest: "abc",
        files: [
          {
            path: "test.txt",
            action: "invalid_action",
            content: "",
            isManaged: false,
          },
        ],
        dependencies: [],
        scripts: {},
        createdAt: 1000,
      }),
    ).toThrow("Invalid file.action");
  });
});
