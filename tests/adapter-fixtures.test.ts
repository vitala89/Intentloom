import { resolve } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { generateAdapter, getAdapterContract } from "@aif/adapters";
import { loadCatalog, type AdapterName, type Catalog } from "@aif/core";
import {
  createMemoryFileSystem,
  doctorProject,
  initProject,
  syncProject,
} from "@aif/cli";
import { validateGeneratedFiles } from "@aif/validator";

const adapters = ["claude", "codex", "cursor", "copilot"] as const;
const catalogRoot = resolve("catalog");
let catalog: Catalog;

const uniquePath: Readonly<Record<AdapterName, string>> = {
  claude: ".claude/skills/aif-branch-finisher/SKILL.md",
  codex: ".agents/skills/aif-branch-finisher/SKILL.md",
  cursor: ".cursor/rules/aif-core.mdc",
  copilot: ".github/copilot-instructions.md",
};

const skillPath: Readonly<Record<AdapterName, string>> = {
  claude: ".claude/skills/aif-branch-finisher/SKILL.md",
  codex: ".agents/skills/aif-branch-finisher/SKILL.md",
  cursor: ".agents/skills/aif-branch-finisher/SKILL.md",
  copilot: ".github/skills/aif-branch-finisher/SKILL.md",
};

function options(adapter: AdapterName) {
  return {
    root: "/project",
    profile: "generic",
    adapters: [adapter] as readonly AdapterName[],
    catalogRoot,
  };
}

beforeAll(async () => {
  catalog = await loadCatalog(catalogRoot);
});

describe("per-adapter fixture matrix", () => {
  it.each(adapters)("%s generates minimal supported output only", (adapter) => {
    const result = generateAdapter(adapter, {
      policies: ["policies/core.md"],
      workflows: [],
      templates: [],
      skills: [],
    });
    expect(result.files.length).toBeGreaterThan(0);
    expect(validateGeneratedFiles(result.files)).toEqual([]);
    expect(result.files.map((file) => file.path)).not.toEqual(
      expect.arrayContaining([
        ".claude/settings.json",
        ".codex/config.toml",
        ".cursorrules",
        ".github/agents/aif.agent.md",
      ]),
    );
  });

  it.each(adapters)(
    "%s generates complete canonical skill output",
    (adapter) => {
      const result = generateAdapter(adapter, catalog);
      expect(result.files.length).toBeGreaterThan(catalog.skills.length);
      expect(validateGeneratedFiles(result.files)).toEqual([]);
      expect(
        result.files.filter((file) => file.path.endsWith("/SKILL.md")),
      ).toHaveLength(catalog.skills.length);
      expect(
        result.files.every((file) =>
          file.sources.every((source) => !source.startsWith("/")),
        ),
      ).toBe(true);
    },
  );

  it.each(adapters)(
    "%s preserves a project-owned root instruction",
    async (adapter) => {
      const initial = { "/project/AGENTS.md": "project-owned\n" };
      const fs = createMemoryFileSystem(initial);
      const result = await initProject(
        { ...options(adapter), dryRun: true },
        fs,
      );
      expect(result.changes).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ path: "AGENTS.md", kind: "conflict" }),
        ]),
      );
      expect([...fs.files.entries()]).toEqual(Object.entries(initial));
    },
  );

  it.each(adapters)("%s preserves a project-owned skill", async (adapter) => {
    const path = skillPath[adapter];
    const initial = { [`/project/${path}`]: "project skill\n" };
    const fs = createMemoryFileSystem(initial);
    const result = await initProject({ ...options(adapter), dryRun: true }, fs);
    expect(result.changes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path, kind: "conflict" }),
      ]),
    );
    expect([...fs.files.entries()]).toEqual(Object.entries(initial));
  });

  it.each(adapters)(
    "%s diagnoses modified generated output",
    async (adapter) => {
      const fs = createMemoryFileSystem();
      await initProject(options(adapter), fs);
      const path = uniquePath[adapter];
      await fs.write(`/project/${path}`, "modified private content\n");
      const before = [...fs.files.entries()];
      const report = await doctorProject(options(adapter), fs);
      expect(report.findings).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ code: "generated-checksum-drift", path }),
        ]),
      );
      expect(JSON.stringify(report)).not.toContain("modified private content");
      expect([...fs.files.entries()]).toEqual(before);
    },
  );

  it.each(adapters)(
    "%s diagnoses stale adapter output version",
    async (adapter) => {
      const fs = createMemoryFileSystem();
      await initProject(options(adapter), fs);
      const manifestPath = "/project/.aif/manifest.lock.json";
      const manifest = JSON.parse(await fs.read(manifestPath));
      manifest.adapterOutputVersion = "0.0.0";
      await fs.write(manifestPath, `${JSON.stringify(manifest)}\n`);
      const report = await doctorProject(options(adapter), fs);
      expect(report.findings).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ code: "adapter-version-stale" }),
        ]),
      );
    },
  );

  it.each(adapters)(
    "%s reports unsupported and experimental status honestly",
    (adapter) => {
      const contract = getAdapterContract(adapter);
      expect(contract.unsupportedCapabilities.length).toBeGreaterThan(0);
      expect(contract.experimentalCapabilities).toEqual(
        adapter === "cursor"
          ? ["agent-skills"]
          : adapter === "copilot"
            ? ["custom-agents"]
            : [],
      );
    },
  );

  it.each(adapters)(
    "%s second generation produces zero diff",
    async (adapter) => {
      const fs = createMemoryFileSystem();
      await initProject(options(adapter), fs);
      const before = [...fs.files.entries()];
      const second = await syncProject(options(adapter), fs);
      expect(second.changes).toEqual([]);
      expect([...fs.files.entries()]).toEqual(before);
    },
  );

  it.each(adapters)(
    "%s removal reports stale ownership without deletion",
    async (adapter) => {
      const fs = createMemoryFileSystem();
      await initProject(options(adapter), fs);
      const path = uniquePath[adapter];
      const before = [...fs.files.entries()];
      const replacement: AdapterName = adapter === "codex" ? "claude" : "codex";
      const report = await doctorProject(options(replacement), fs);
      expect(report.findings).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ code: "adapter-selection-conflict" }),
          expect.objectContaining({ code: "manifest-entry-orphaned", path }),
        ]),
      );
      expect([...fs.files.entries()]).toEqual(before);
      expect(fs.files.has(`/project/${path}`)).toBe(true);
    },
  );
});

describe("provider-specific adapter fixtures", () => {
  it("Claude generates root guidance as one AGENTS import", () => {
    const result = generateAdapter("claude", catalog);
    expect(
      result.files.find((file) => file.path === "CLAUDE.md")?.content,
    ).toContain("@AGENTS.md");
    expect(
      result.files.filter((file) => file.path === "AGENTS.md"),
    ).toHaveLength(1);
  });

  it("Claude preserves an existing project-owned CLAUDE.md", async () => {
    const initial = { "/project/CLAUDE.md": "project Claude guidance\n" };
    const fs = createMemoryFileSystem(initial);
    const result = await initProject(
      { ...options("claude"), dryRun: true },
      fs,
    );
    expect(result.changes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: "CLAUDE.md", kind: "conflict" }),
      ]),
    );
    expect([...fs.files.entries()]).toEqual(Object.entries(initial));
  });

  it("Codex emits only the accepted root hierarchy without local config", () => {
    const result = generateAdapter("codex", catalog);
    expect(
      result.files.filter((file) => file.path.endsWith("AGENTS.md")),
    ).toHaveLength(1);
    expect(result.files.map((file) => file.path)).not.toContain(
      ".codex/config.toml",
    );
    expect(result.contract.compatibilityNotes.join(" ")).toContain(
      "explicit project profile mapping",
    );
  });

  it("Cursor emits current global and path-scoped MDC rules only", () => {
    const result = generateAdapter("cursor", catalog, {
      profile: "typescript",
    });
    expect(result.files.map((file) => file.path)).toEqual(
      expect.arrayContaining([
        ".cursor/rules/aif-core.mdc",
        ".cursor/rules/aif-typescript.mdc",
      ]),
    );
    expect(result.files.map((file) => file.path)).not.toEqual(
      expect.arrayContaining([".cursorrules", ".cursorignore"]),
    );
    expect(
      result.files.find((file) => file.path === ".cursor/rules/aif-core.mdc")
        ?.content,
    ).toMatch(
      /^---\ndescription: AIF shared project guidance\nalwaysApply: true\n---\n/u,
    );
  });

  it("Cursor preserves an existing project-owned current rule", async () => {
    const path = ".cursor/rules/aif-core.mdc";
    const initial = { [`/project/${path}`]: "project Cursor rule\n" };
    const fs = createMemoryFileSystem(initial);
    const result = await initProject(
      { ...options("cursor"), dryRun: true },
      fs,
    );
    expect(result.changes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path, kind: "conflict" }),
      ]),
    );
    expect([...fs.files.entries()]).toEqual(Object.entries(initial));
  });

  it("Copilot emits global plus multiple deterministic instruction files", () => {
    const result = generateAdapter("copilot", catalog, {
      profile: "typescript",
    });
    const paths = result.files.map((file) => file.path);
    expect(paths).toEqual(
      expect.arrayContaining([
        ".github/copilot-instructions.md",
        ".github/instructions/aif.instructions.md",
        ".github/instructions/aif-typescript.instructions.md",
      ]),
    );
    expect(
      result.files.find((file) =>
        file.path.endsWith("aif-typescript.instructions.md"),
      )?.content,
    ).toMatch(/^---\napplyTo: "\*\*\/\*\.ts,\*\*\/\*\.tsx"\n---\n/u);
    expect(
      result.files.find(
        (file) => file.path === ".github/instructions/aif.instructions.md",
      )?.content,
    ).toMatch(/^---\napplyTo: "\*\*"\n---\n/u);
  });

  it("Copilot preserves an existing project-owned instruction", async () => {
    const path = ".github/copilot-instructions.md";
    const initial = { [`/project/${path}`]: "project Copilot guidance\n" };
    const fs = createMemoryFileSystem(initial);
    const result = await initProject(
      { ...options("copilot"), dryRun: true },
      fs,
    );
    expect(result.changes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path, kind: "conflict" }),
      ]),
    );
    expect([...fs.files.entries()]).toEqual(Object.entries(initial));
  });

  it("Copilot preserves an existing project-owned path instruction", async () => {
    const path = ".github/instructions/aif.instructions.md";
    const initial = { [`/project/${path}`]: "project scoped guidance\n" };
    const fs = createMemoryFileSystem(initial);
    const result = await initProject(
      { ...options("copilot"), dryRun: true },
      fs,
    );
    expect(result.changes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path, kind: "conflict" }),
      ]),
    );
    expect([...fs.files.entries()]).toEqual(Object.entries(initial));
  });

  it("Copilot leaves unrelated project-owned .github content untouched", async () => {
    const initial = {
      "/project/.github/workflows/ci.yml": "project workflow\n",
    };
    const fs = createMemoryFileSystem(initial);
    await initProject(options("copilot"), fs);
    expect(await fs.read("/project/.github/workflows/ci.yml")).toBe(
      "project workflow\n",
    );
  });
});
