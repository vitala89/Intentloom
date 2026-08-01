import { describe, expect, it } from "vitest";
import {
  createInceptionSession,
  proposeProjectBlueprints,
  prepareProjectScaffoldPlan,
  prepareDependencyInstallPlan,
  prepareGitInitPlan,
} from "@intentloom/application";
import {
  validateDependencyInstallPlan,
  validateGitInitPlan,
} from "@intentloom/validator";

describe("Project Inception Reviewed Dependency & Git Actions (Phase I8)", () => {
  it("generates deterministic dependency install plans for pnpm, npm, and yarn", () => {
    const session = createInceptionSession({
      root: "/tmp/dep-test",
      idea: "Dependency Action Test",
    });

    const blueprint = proposeProjectBlueprints(session).recommended;
    const scaffoldPlan = prepareProjectScaffoldPlan(blueprint, "/tmp/dep-test");

    const pnpmPlan = prepareDependencyInstallPlan(scaffoldPlan, "pnpm");
    expect(pnpmPlan.packageManager).toBe("pnpm");
    expect(pnpmPlan.command).toBe("pnpm add -D typescript vitest");

    const npmPlan = prepareDependencyInstallPlan(scaffoldPlan, "npm");
    expect(npmPlan.packageManager).toBe("npm");
    expect(npmPlan.command).toBe("npm install --save-dev typescript vitest");

    const yarnPlan = prepareDependencyInstallPlan(scaffoldPlan, "yarn");
    expect(yarnPlan.packageManager).toBe("yarn");
    expect(yarnPlan.command).toBe("yarn add -D typescript vitest");
  });

  it("generates a deterministic git init plan with standard .gitignore rules", () => {
    const gitPlan = prepareGitInitPlan("/tmp/git-test", {
      extraGitignore: ["coverage", ".cache"],
      commitMessage: "feat: initial commit",
    });

    expect(gitPlan.root).toBe("/tmp/git-test");
    expect(gitPlan.commitMessage).toBe("feat: initial commit");
    expect(gitPlan.gitignoreEntries).toContain("node_modules");
    expect(gitPlan.gitignoreEntries).toContain("coverage");
    expect(gitPlan.commands).toEqual([
      "git init",
      "git add .",
      'git commit -m "feat: initial commit"',
    ]);
  });

  it("validates dependency install and git init plan structures strictly", () => {
    expect(() => validateDependencyInstallPlan(null)).toThrow(
      "expected object",
    );
    expect(() =>
      validateDependencyInstallPlan({
        packageManager: "invalid_pm",
        dependencies: [],
        command: "test",
      }),
    ).toThrow("Invalid packageManager");

    expect(() => validateGitInitPlan(null)).toThrow("expected object");
    expect(() =>
      validateGitInitPlan({
        root: "",
        gitignoreEntries: [],
        commitMessage: "test",
        commands: [],
      }),
    ).toThrow("Invalid inception field 'gitPlan.root'");
  });
});
