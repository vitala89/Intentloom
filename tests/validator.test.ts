import { describe, expect, it } from "vitest";
import { generatedFile } from "@intentloom/core";
import {
  validateCanonicalReferences,
  validateConfigDocument,
  validateGeneratedFiles,
  validateSkillDocuments,
} from "@intentloom/validator";

describe("validators", () => {
  it("reports malformed and duplicate skills", () => {
    const valid = "---\nname: aif-test\ndescription: Test skill\n---\n";
    const diagnostics = validateSkillDocuments([
      { path: "a/SKILL.md", content: valid },
      { path: "b/SKILL.md", content: valid },
      { path: "c/SKILL.md", content: "# bad" },
    ]);
    expect(diagnostics.map((item) => item.code)).toEqual([
      "duplicate-skill-name",
      "malformed-skill",
    ]);
  });
  it("rejects invalid config and conflicting destinations", () => {
    expect(validateConfigDocument("profile: generic")).toHaveLength(1);
    const file = generatedFile("AGENTS.md", "hello", [
      "policies/context-policy.md",
    ]);
    expect(
      validateGeneratedFiles([file, file]).map((item) => item.code),
    ).toContain("conflicting-destination");
  });
  it("reports broken canonical references", () => {
    expect(
      validateCanonicalReferences(
        ["policies/missing.md"],
        ["policies/context-policy.md"],
      )[0]?.code,
    ).toBe("broken-canonical-reference");
  });
});
