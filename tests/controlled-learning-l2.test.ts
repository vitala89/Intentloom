import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  createMemoryFileSystem,
  discoverSkills,
  getSkillAtLevel,
} from "@intentloom/application";
import { runCli } from "../packages/cli/src/command.js";

describe("Controlled Agent Learning Candidate L2 — Progressive Skill Discovery", () => {
  const sampleSkill1 = `---
name: sample-code-review
version: 1.2.0
description: Perform automated code review on bounded diffs
packs:
  - frontend
  - backend
roles:
  - reviewer
trustClass: canonical-policy
capabilities:
  - code-analysis
---

# sample-code-review

## Trigger

When a pull request or code change is ready for review.

## Inputs

- diff source code diff
- policy canonical policy document

## Procedure

1. Read diff.
2. Check for security or performance issues.

## Exact outputs

Review findings with severity and remediation steps.
`;

  const sampleSkill2 = `---
name: sample-deploy-helper
version: 2.0.0
description: Manage infrastructure and deployment tasks
packs:
  - devops
roles:
  - devops-engineer
trustClass: verified-evidence
capabilities:
  - deployment
---

# sample-deploy-helper

## Trigger

When deploying application to production.

## Inputs

- manifest deployment configuration

## Procedure

1. Validate configuration.
2. Trigger pipeline.

## Exact outputs

Deployment status log.
`;

  const fs = createMemoryFileSystem({
    "/project/catalog/skills/sample-code-review/SKILL.md": sampleSkill1,
    "/project/catalog/skills/sample-deploy-helper/SKILL.md": sampleSkill2,
  });

  it("loads skills progressively across 3 levels", async () => {
    const catalogSkill = await getSkillAtLevel(
      "sample-code-review",
      "catalog",
      { root: "/project" },
      fs,
    );
    expect(catalogSkill).not.toBeNull();
    expect(catalogSkill?.level).toBe("catalog");
    expect(catalogSkill?.id).toBe("sample-code-review");
    expect(catalogSkill?.name).toBe("sample-code-review");
    expect(catalogSkill?.version).toBe("1.2.0");
    expect(catalogSkill?.packs).toEqual(["frontend", "backend"]);
    expect(catalogSkill).not.toHaveProperty("inputs");
    expect(catalogSkill).not.toHaveProperty("content");

    const contractSkill = await getSkillAtLevel(
      "sample-code-review",
      "contract",
      { root: "/project" },
      fs,
    );
    expect(contractSkill).not.toBeNull();
    expect(contractSkill?.level).toBe("contract");
    expect(contractSkill).toHaveProperty("inputs");
    expect(contractSkill).not.toHaveProperty("content");

    const procedureSkill = await getSkillAtLevel(
      "sample-code-review",
      "procedure",
      { root: "/project" },
      fs,
    );
    expect(procedureSkill).not.toBeNull();
    expect(procedureSkill?.level).toBe("procedure");
    expect(procedureSkill).toHaveProperty("content");
    if (procedureSkill?.level === "procedure") {
      expect(procedureSkill.content).toContain("# sample-code-review");
    }
  });

  it("filters skills by pack and role", async () => {
    const devopsDiscovery = await discoverSkills(
      { root: "/project", pack: "devops" },
      fs,
    );
    expect(devopsDiscovery.skills.length).toBe(1);
    expect(devopsDiscovery.skills[0]!.id).toBe("sample-deploy-helper");

    const frontendDiscovery = await discoverSkills(
      { root: "/project", pack: "frontend" },
      fs,
    );
    expect(frontendDiscovery.skills.length).toBe(1);
    expect(frontendDiscovery.skills[0]!.id).toBe("sample-code-review");
  });

  it("logs discovery decisions and rejection rationale", async () => {
    const result = await discoverSkills(
      { root: "/project", pack: "frontend" },
      fs,
    );
    expect(result.decisions.length).toBe(2);

    const selected = result.decisions.find(
      (d) => d.skillId === "sample-code-review",
    );
    expect(selected?.status).toBe("selected");

    const rejected = result.decisions.find(
      (d) => d.skillId === "sample-deploy-helper",
    );
    expect(rejected?.status).toBe("rejected");
    expect(rejected?.reason).toContain("Skill pack does not match");
  });

  it("calculates context budget savings", async () => {
    const catalogResult = await discoverSkills(
      { root: "/project", level: "catalog" },
      fs,
    );
    expect(catalogResult.totalBudgetEstimate).toBeGreaterThan(0);
    expect(catalogResult.eagerBudgetEstimate).toBeGreaterThan(
      catalogResult.totalBudgetEstimate,
    );
    expect(catalogResult.budgetSavingsPercentage).toBeGreaterThan(0);
  });

  it("executes CLI intentloom skill discover commands", async () => {
    const stdout: string[] = [];
    const exitCode = await runCli(
      [
        "skill",
        "discover",
        "--root",
        "/project",
        "--level",
        "catalog",
        "--json",
      ],
      { catalogRoot: resolve("catalog"), fileSystem: fs },
      { stdout: (msg) => stdout.push(msg), stderr: () => undefined },
    );

    expect(exitCode).toBe(0);
    const parsed = JSON.parse(stdout.join("\n"));
    expect(parsed.level).toBe("catalog");
    expect(parsed.skills.length).toBe(2);
    expect(parsed.budgetSavingsPercentage).toBeGreaterThan(0);
  });
});
