import { resolve } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { generateAdapter } from "@intentloom/adapters";
import { loadCatalog, type AdapterName, type Catalog } from "@intentloom/core";
import {
  createArtifactValidator,
  validateGeneratedFiles,
  validateSkillSet,
  type ArtifactValidator,
} from "@intentloom/validator";

const catalogRoot = resolve("catalog");
const expectedSkills = [
  "aif-extension-review",
  "aif-feature-discovery",
  "aif-task-router",
  "aif-verification-gate",
] as const;
const skillRoot: Readonly<Record<AdapterName, string>> = {
  claude: ".claude/skills",
  codex: ".agents/skills",
  cursor: ".agents/skills",
  copilot: ".github/skills",
};

let catalog: Catalog;
let validator: ArtifactValidator;

beforeAll(async () => {
  [catalog, validator] = await Promise.all([
    loadCatalog(catalogRoot),
    createArtifactValidator(resolve(catalogRoot, "schemas")),
  ]);
});

describe("curated skill routing catalog", () => {
  it("keeps the complete canonical skill set valid", () => {
    const result = validateSkillSet(
      validator,
      catalog.skills.map((skill) => ({
        path: skill.sourcePath,
        content: skill.content,
      })),
      { aifCatalogPolicy: true },
    );

    expect(result.errors).toEqual([]);
  });

  it("loads the initial routing, discovery, verification, and review skills", () => {
    const names = catalog.skills.map((skill) => skill.name);

    expect(names).toEqual(expect.arrayContaining(expectedSkills));
    expect(new Set(names).size).toBe(names.length);
  });

  it.each(["claude", "codex", "cursor", "copilot"] as const)(
    "generates every curated skill for %s without adapter diagnostics",
    (adapter) => {
      const result = generateAdapter(adapter, catalog);
      const paths = result.files.map((file) => file.path);

      for (const skill of expectedSkills) {
        expect(paths).toContain(`${skillRoot[adapter]}/${skill}/SKILL.md`);
      }
      expect(validateGeneratedFiles(result.files)).toEqual([]);
    },
  );
});
