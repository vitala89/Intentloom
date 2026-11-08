import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import * as application from "@intentloom/application";
import {
  createMemoryFileSystem,
  discoverSkills,
  getSkillAtLevel,
} from "@intentloom/application";
import {
  applicationCycles,
  relativeSpecifiers,
} from "./application-source-cycles.js";

const catalogReadNames = [
  "parseSkillProgressive",
  "discoverSkills",
  "getSkillAtLevel",
  "createSkillProposal",
  "listSkillProposals",
  "getSkillProposal",
  "updateSkillProposalState",
  "rollbackSkill",
  "evaluateSkillProposal",
  "listSkillEvaluations",
  "getSkillEvaluation",
  "validateSkillExtensionLock",
  "listProceduralMemorySummary",
  "inspectProceduralMemory",
  "prepareSkillMutationPlan",
  "applySkillMutationPlan",
] as const;

const applicationExportKeys = [
  ".",
  "./model-adapter",
  "./ollama-model-adapter",
  "./neutron-runtime",
  "./neutron-n2",
  "./neutron-context-assembly",
  "./neutron-n4",
  "./neutron-scheduler",
  "./neutron-graph-mutation",
  "./neutron-session",
  "./engineering-assessment",
  "./engineering-quality",
];

const outsideComponents = [
  "host-file-system.ts",
  "project-path.ts",
  "skill-markdown.ts",
  "skills/skill-progressive-parse.ts",
  "skills/skill-discovery.ts",
  "agent-session/agent-session.ts",
  "memory/persistent-memory-store.ts",
  "memory/persistent-memory-lifecycle.ts",
  "memory/persistent-memory-retrieval.ts",
];

function skillFile(name: string): string {
  return `---\nname: ${name}\n---\n\n# ${name}\n`;
}

describe("P1H.3a skill catalog read extraction", () => {
  it("keeps the sixteen skill names on the package root and adds no skills export key", () => {
    for (const name of catalogReadNames) {
      expect(typeof application[name]).toBe("function");
    }
    const packageJson = JSON.parse(
      readFileSync("packages/application/package.json", "utf8"),
    ) as { exports: Record<string, string> };
    expect(Object.keys(packageJson.exports)).toEqual(applicationExportKeys);
    expect(packageJson.exports).not.toHaveProperty("./skills");
  });

  it("ignores catalogRoot and defaults discovery to the catalog level", async () => {
    const fs = createMemoryFileSystem({
      "/project/skills/alpha/SKILL.md": skillFile("alpha"),
      "/custom/skills/decoy/SKILL.md": skillFile("decoy"),
    });
    const withoutCatalogRoot = await discoverSkills({ root: "/project" }, fs);
    const withCatalogRoot = await discoverSkills(
      { root: "/project", catalogRoot: "/custom" },
      fs,
    );

    expect(withCatalogRoot).toEqual(withoutCatalogRoot);
    expect(withoutCatalogRoot.level).toBe("catalog");
    expect(withoutCatalogRoot.skills.map((skill) => skill.id)).toEqual([
      "alpha",
    ]);
    expect(withoutCatalogRoot.skills[0]?.level).toBe("catalog");
  });

  it("prefers catalogRoot and then falls back to skills/<id>/SKILL.md", async () => {
    const fs = createMemoryFileSystem({
      "/project/catalog/skills/alpha/SKILL.md": skillFile("from-catalog"),
      "/project/skills/alpha/SKILL.md": skillFile("from-fallback"),
      "/custom/skills/alpha/SKILL.md": skillFile("from-custom"),
      "/project/skills/beta/SKILL.md": skillFile("beta-fallback"),
    });

    const preferred = await getSkillAtLevel(
      "alpha",
      "catalog",
      { root: "/project" },
      fs,
    );
    const custom = await getSkillAtLevel(
      "alpha",
      "catalog",
      { root: "/project", catalogRoot: "/custom" },
      fs,
    );
    const fallback = await getSkillAtLevel(
      "beta",
      "catalog",
      { root: "/project" },
      fs,
    );
    const missing = await getSkillAtLevel(
      "missing",
      "catalog",
      { root: "/project" },
      fs,
    );

    expect(preferred?.name).toBe("from-catalog");
    expect(custom?.name).toBe("from-custom");
    expect(fallback?.name).toBe("beta-fallback");
    expect(missing).toBeNull();
  });

  it("still rejects a skill id that resolves outside the catalog root", async () => {
    const fs = createMemoryFileSystem({});
    await expect(
      getSkillAtLevel("../../outside", "catalog", { root: "/project" }, fs),
    ).rejects.toThrow("path traversal: skills/../../outside/SKILL.md");
  });

  it("keeps the new skill modules outside the recorded source cycles", () => {
    const importComponents = applicationCycles(false);
    const reexportComponents = applicationCycles(true);
    expect(importComponents.map((component) => component.length)).toEqual([
      3, 3,
    ]);
    expect(reexportComponents.map((component) => component.length)).toEqual([
      4, 29, 3,
    ]);
    expect(importComponents[0]).toEqual([
      "approved-apply-baseline.ts",
      "generated-file-sync-declared.ts",
      "index.ts",
    ]);
    const members = new Set(
      [...importComponents, ...reexportComponents].flat(),
    );
    for (const file of outsideComponents) {
      expect(members.has(file)).toBe(false);
    }
    const barrel = reexportComponents.find((component) =>
      component.includes("index.ts"),
    );
    expect(barrel).toHaveLength(29);
    expect(relativeSpecifiers("skills/skill-discovery.ts", true)).toContain(
      "./skill-progressive-parse.js",
    );
    expect(relativeSpecifiers("skills/skill-discovery.ts", true)).not.toContain(
      "../index.js",
    );
    expect(
      relativeSpecifiers("skills/skill-progressive-parse.ts", true),
    ).not.toContain("../index.js");
    expect(
      relativeSpecifiers(
        "neutron/context/neutron-context-collectors.ts",
        false,
      ),
    ).toEqual(
      expect.arrayContaining([
        "../../index.js",
        "../../skills/skill-discovery.js",
      ]),
    );
  });
});
