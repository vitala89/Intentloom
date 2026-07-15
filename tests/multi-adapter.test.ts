import { describe, expect, it } from "vitest";
import {
  generateAdapter,
  generateAdapters,
  mergeAdapterResults,
  type AdapterResult,
} from "@intentloom/adapters";
import { resolve } from "node:path";
import { checksum, type AdapterName, type Catalog } from "@intentloom/core";
import {
  createMemoryFileSystem,
  doctorProject,
  initProject,
  syncProject,
} from "@intentloom/cli";
import { validateGeneratedFiles } from "@intentloom/validator";

const catalog: Catalog = {
  policies: ["policies/core.md"],
  workflows: ["workflows/delivery.md"],
  templates: [],
  skills: [],
};

const allAdapters = ["claude", "codex", "cursor", "copilot"] as const;

function permutations<T>(values: readonly T[]): T[][] {
  if (values.length === 0) return [[]];
  return values.flatMap((value, index) =>
    permutations(values.filter((_, candidate) => candidate !== index)).map(
      (rest) => [value, ...rest],
    ),
  );
}

describe("multi-adapter generation", () => {
  it("rejects non-identical duplicate destinations with a stable key", () => {
    const claude = generateAdapter("claude", catalog);
    const codex = generateAdapter("codex", catalog);
    const conflicting: AdapterResult = {
      ...codex,
      files: codex.files.map((file) =>
        file.path === "AGENTS.md"
          ? {
              ...file,
              content: `${file.content}different\n`,
              checksum: checksum(`${file.content}different\n`),
            }
          : file,
      ),
    };
    expect(() => mergeAdapterResults([claude, conflicting])).toThrow(
      "adapter destination conflict: agents.md",
    );
  });

  it.each([
    ["Claude + Codex", ["claude", "codex"]],
    ["Claude + Cursor", ["claude", "cursor"]],
    ["Codex + Copilot", ["codex", "copilot"]],
    ["all four", allAdapters],
  ] as const)(
    "generates %s without shared destination duplication",
    (_name, selected) => {
      const result = generateAdapters(selected, catalog);
      expect(validateGeneratedFiles(result.files)).toEqual([]);
      expect(
        result.files.filter((file) => file.path === "AGENTS.md"),
      ).toHaveLength(1);
      expect(new Set(result.files.map((file) => file.path)).size).toBe(
        result.files.length,
      );
    },
  );

  it("generates a shared Codex/Cursor skill once", () => {
    const result = generateAdapters(["codex", "cursor"], {
      ...catalog,
      skills: [
        {
          name: "review",
          description: "Review changes.",
          sourcePath: "skills/review/SKILL.md",
          content:
            "---\nname: review\ndescription: Review changes.\n---\n\n# Review\n",
        },
      ],
    });
    expect(
      result.files.filter(
        (file) => file.path === ".agents/skills/review/SKILL.md",
      ),
    ).toHaveLength(1);
  });

  it.each(permutations(allAdapters).map((selected) => [selected] as const))(
    "keeps output stable for adapter order %j",
    (selected) => {
      expect(generateAdapters(selected, catalog)).toEqual(
        generateAdapters(allAdapters, catalog),
      );
    },
  );

  it("does not fabricate workflow representations unsupported by the contract", () => {
    const result = generateAdapters(allAdapters, catalog);
    expect(result.files.flatMap((file) => file.sources)).not.toContain(
      "workflows/delivery.md",
    );
    expect(
      result.contracts.every(
        (contract) =>
          contract.canonicalSourceKinds.join(",") === "policy,skill",
      ),
    ).toBe(true);
  });

  it("aborts all-adapter writes for a project-owned shared file", async () => {
    const initial = { "/project/AGENTS.md": "project-owned\n" };
    const fs = createMemoryFileSystem(initial);
    const result = await initProject(
      {
        root: "/project",
        profile: "generic",
        adapters: allAdapters,
        catalogRoot: resolve("catalog"),
      },
      fs,
    );
    expect(result.changes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: "AGENTS.md", kind: "conflict" }),
      ]),
    );
    expect([...fs.files.entries()]).toEqual(Object.entries(initial));
  });

  it("all-adapter second sync is a no-op with deduplicated sources", async () => {
    const fs = createMemoryFileSystem();
    const options = {
      root: "/project",
      profile: "generic",
      adapters: allAdapters,
      catalogRoot: resolve("catalog"),
    };
    await initProject(options, fs);
    const before = [...fs.files.entries()];
    expect((await syncProject(options, fs)).changes).toEqual([]);
    expect([...fs.files.entries()]).toEqual(before);
    const manifest = JSON.parse(
      await fs.read("/project/.aif/manifest.lock.json"),
    );
    const sourceIds = manifest.sourceHashes.map(
      (source: { id: string }) => source.id,
    );
    expect(new Set(sourceIds).size).toBe(sourceIds.length);
  });

  it("removing one adapter reports stale output without deletion", async () => {
    const fs = createMemoryFileSystem();
    const options = {
      root: "/project",
      profile: "generic",
      adapters: allAdapters,
      catalogRoot: resolve("catalog"),
    };
    await initProject(options, fs);
    const before = [...fs.files.entries()];
    const remaining: readonly AdapterName[] = ["codex", "cursor", "copilot"];
    const report = await doctorProject({ ...options, adapters: remaining }, fs);
    expect(report.findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "manifest-entry-orphaned",
          path: "CLAUDE.md",
        }),
      ]),
    );
    expect([...fs.files.entries()]).toEqual(before);
    expect(fs.files.has("/project/CLAUDE.md")).toBe(true);
  });
});
