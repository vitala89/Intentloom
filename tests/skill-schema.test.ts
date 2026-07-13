import { resolve } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import {
  createArtifactValidator,
  validateSkillSet,
  type ArtifactValidator,
} from "@aif/validator";

let validator: ArtifactValidator;
beforeAll(async () => {
  validator = await createArtifactValidator(resolve("catalog/schemas"));
});

const body = `# aif-example\n\n## Trigger\n\nUse when testing. Do not trigger otherwise.\n\n## Inputs\n\n- input\n\n## Exact outputs\n\nReturn output.\n\n## Stop conditions\n\nStop when done.\n`;
function skill(
  frontmatter: string,
  content = body,
  path = "skills/aif-example/SKILL.md",
) {
  return validator.validate({
    artifactType: "agent-skill",
    documentPath: path,
    format: "skill",
    source: `---\n${frontmatter}\n---\n${content}`,
    skillPolicy: "aif-catalog",
  });
}

describe("Agent Skill schema and AIF policy", () => {
  it("accepts a valid Agent Skill", () =>
    expect(
      skill("name: aif-example\ndescription: Example skill. Use when testing.")
        .status,
    ).toBe("valid"));
  it("rejects malformed frontmatter", () =>
    expect(skill("name: [").structuralErrors[0]?.code).toBe("yaml-malformed"));
  it("rejects a missing description", () =>
    expect(skill("name: aif-example").status).toBe("invalid"));
  it("rejects an unsupported frontmatter field", () =>
    expect(
      skill("name: aif-example\ndescription: Example\ntrigger: automatic")
        .structuralErrors[0]?.code,
    ).toBe("schema-unknown-property"));
  it("requires trigger conditions", () =>
    expect(
      skill(
        "name: aif-example\ndescription: Example",
        body.replace("## Trigger", "## Activation"),
      ).semanticErrors.map((error) => error.code),
    ).toContain("skill-trigger-required"));
  it("requires non-trigger conditions", () =>
    expect(
      skill(
        "name: aif-example\ndescription: Example",
        body.replace("Do not trigger otherwise.", "Use carefully."),
      ).semanticErrors.map((error) => error.code),
    ).toContain("skill-non-trigger-required"));
  it("requires stop conditions", () =>
    expect(
      skill(
        "name: aif-example\ndescription: Example",
        body.replace("## Stop conditions", "## Completion"),
      ).semanticErrors.map((error) => error.code),
    ).toContain("skill-stop-condition-required"));
  it("rejects an external reference escape", () =>
    expect(
      skill(
        "name: aif-example\ndescription: Example",
        `${body}\nSee [outside](../outside.md).\n`,
      ).semanticErrors.map((error) => error.code),
    ).toContain("skill-reference-escape"));
  it("rejects unsafe URI schemes", () =>
    expect(
      skill(
        "name: aif-example\ndescription: Example",
        `${body}\nSee [outside](file:///etc/passwd).\n`,
      ).semanticErrors.map((error) => error.code),
    ).toContain("skill-reference-escape"));
  it("keeps portable Agent Skills independent of AIF catalog policy", () =>
    expect(
      validator.validate({
        artifactType: "agent-skill",
        documentPath: "skills/portable/SKILL.md",
        format: "skill",
        source:
          "---\nname: portable\ndescription: Portable example\n---\n# Portable\n\nUse this skill carefully.\n",
      }).status,
    ).toBe("valid"));
  it("accepts the Agent Skills metadata extension", () =>
    expect(
      skill(
        "name: aif-example\ndescription: Example\nmetadata:\n  aif-policy: '1'",
      ).status,
    ).toBe("valid"));
  it("rejects duplicate skill names across a set", () => {
    expect(
      validateSkillSet(
        validator,
        [
          {
            path: "one/aif-example/SKILL.md",
            content: `---\nname: aif-example\ndescription: Example\n---\n${body}`,
          },
          {
            path: "two/aif-example/SKILL.md",
            content: `---\nname: aif-example\ndescription: Other\n---\n${body}`,
          },
        ],
        { aifCatalogPolicy: true },
      ).errors.map((error) => error.code),
    ).toContain("duplicate-skill-name");
  });
  it("allows expected duplicate skill copies across adapter roots", () => {
    const document = {
      path: ".agents/skills/aif-example/SKILL.md",
      content: `---\nname: aif-example\ndescription: Example\n---\n${body}`,
    };
    expect(
      validateSkillSet(validator, [
        document,
        { ...document, path: ".claude/skills/aif-example/SKILL.md" },
      ]).errors,
    ).toEqual([]);
  });
});
