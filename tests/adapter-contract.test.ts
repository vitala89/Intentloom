import { describe, expect, it } from "vitest";
import {
  generateAdapter,
  generateAdapters,
  getAdapterContract,
} from "@intentloom/adapters";
import type { Catalog } from "@intentloom/core";

const catalog: Catalog = {
  policies: ["policies/core.md"],
  workflows: [],
  templates: [],
  skills: [
    {
      name: "review",
      description: "Review a change.",
      sourcePath: "skills/review/SKILL.md",
      content:
        "---\nname: review\ndescription: Review a change.\n---\n\n# Review\n",
    },
  ],
};

describe("normalized adapter contract", () => {
  it("declares Claude capabilities and generation guarantees", () => {
    expect(getAdapterContract("claude")).toEqual({
      id: "claude",
      outputVersion: "0.1.0",
      supportedCapabilities: ["repository-instructions", "agent-skills"],
      sharedStandardCapabilities: ["shared-agents-guidance"],
      experimentalCapabilities: [],
      unsupportedCapabilities: ["hooks", "permissions", "custom-agents"],
      canonicalSourceKinds: ["policy", "skill"],
      canonicalSourceReferences: ["policies/*.md", "skills/*/SKILL.md"],
      generatedDestinationPatterns: [
        ".claude/skills/<skill>/SKILL.md",
        "AGENTS.md",
        "CLAUDE.md",
      ],
      destinationOwnership: "aif-owned-generated",
      requiredGeneratedHeader: true,
      schemaValidation: "generated-file",
      deterministicGeneration: true,
      compatibilityNotes: [
        "CLAUDE.md imports the shared root AGENTS.md guidance.",
      ],
      migrationNotes: [
        "Adapter removal reports owned outputs as stale and never deletes them implicitly.",
      ],
    });
  });

  it("uses only real canonical sources for derivative and profile output", () => {
    const claude = generateAdapter("claude", catalog);
    expect(
      claude.files.find((file) => file.path === "CLAUDE.md")?.sources,
    ).toEqual(catalog.policies);
    const scoped = generateAdapters(["cursor", "copilot"], catalog, {
      profile: "typescript",
    });
    for (const file of scoped.files.filter((candidate) =>
      candidate.path.includes("aif-typescript"),
    ))
      expect(file.sources).toEqual(catalog.policies);
    expect(scoped.files.flatMap((file) => file.sources)).not.toEqual(
      expect.arrayContaining([expect.stringMatching(/^profiles\//u)]),
    );
  });

  it("merges all adapters once with order-independent sorted destinations", () => {
    const forward = generateAdapters(
      ["claude", "codex", "cursor", "copilot"],
      catalog,
    );
    const reverse = generateAdapters(
      ["copilot", "cursor", "codex", "claude"],
      catalog,
    );
    expect(reverse).toEqual(forward);
    expect(forward.adapters).toEqual(["claude", "codex", "copilot", "cursor"]);
    expect(forward.files.map((file) => file.path)).toEqual([
      ".agents/skills/review/SKILL.md",
      ".claude/skills/review/SKILL.md",
      ".cursor/rules/intentloom-core.mdc",
      ".github/copilot-instructions.md",
      ".github/instructions/intentloom.instructions.md",
      ".github/skills/review/SKILL.md",
      "AGENTS.md",
      "CLAUDE.md",
    ]);
  });

  it.each(["claude", "codex", "cursor", "copilot"] as const)(
    "%s output carries adapter-version provenance with valid frontmatter",
    (adapter) => {
      const result = generateAdapter(adapter, catalog);
      expect(result.contract).toBe(getAdapterContract(adapter));
      for (const file of result.files)
        expect(file.content, file.path).toContain(
          "Intentloom adapter output version: 0.1.0",
        );
      for (const file of result.files.filter((candidate) =>
        /(?:SKILL\.md|\.mdc|\.instructions\.md)$/u.test(candidate.path),
      ))
        expect(file.content, file.path).toMatch(/^---\n/u);
    },
  );

  it.each([
    ["typescript", "**/*.ts,**/*.tsx"],
    ["angular", "**/*.ts,**/*.html"],
    ["rust", "**/*.rs"],
    ["tauri", "src-tauri/**"],
    ["angular-tauri", "**/*.ts,**/*.html,src-tauri/**"],
  ])("generates deterministic %s path-scoped rules", (profile, applyTo) => {
    const result = generateAdapters(["cursor", "copilot"], catalog, {
      profile,
    });
    expect(
      result.files.find(
        (file) => file.path === `.cursor/rules/intentloom-${profile}.mdc`,
      )?.content,
    ).toContain(`globs: "${applyTo}"`);
    expect(
      result.files.find(
        (file) =>
          file.path ===
          `.github/instructions/intentloom-${profile}.instructions.md`,
      )?.content,
    ).toContain(`applyTo: "${applyTo}"`);
  });
});
