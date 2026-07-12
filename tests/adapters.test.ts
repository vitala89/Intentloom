import { describe, expect, it } from "vitest";
import { generateAllAdapters } from "@aif/adapters";
import type { Catalog } from "@aif/core";
import { validateGeneratedFiles } from "@aif/validator";

const catalog: Catalog = {
  policies: ["policies/context-policy.md"],
  workflows: [],
  templates: [],
  skills: [
    {
      name: "aif-orchestrator",
      description: "Coordinate a bounded task.",
      sourcePath: "skills/aif-orchestrator/SKILL.md",
      content:
        "---\nname: aif-orchestrator\ndescription: Coordinate a bounded task.\n---\n\n# Skill\n",
    },
  ],
};

describe("adapters", () => {
  it("generates deterministic layouts for all supported adapters", () => {
    const first = generateAllAdapters(catalog);
    const second = generateAllAdapters(catalog);
    expect(first).toEqual(second);
    expect(
      first.map((result) => result.files.map((file) => file.path)),
    ).toEqual([
      ["AGENTS.md", "CLAUDE.md", ".claude/skills/aif-orchestrator/SKILL.md"],
      ["AGENTS.md", ".agents/skills/aif-orchestrator/SKILL.md"],
      [
        "AGENTS.md",
        ".cursor/rules/aif-core.mdc",
        ".agents/skills/aif-orchestrator/SKILL.md",
      ],
      [
        "AGENTS.md",
        ".github/copilot-instructions.md",
        ".github/instructions/aif.instructions.md",
        ".github/skills/aif-orchestrator/SKILL.md",
      ],
    ]);
    expect(first.map((result) => validateGeneratedFiles(result.files))).toEqual(
      [[], [], [], []],
    );
  });
});
