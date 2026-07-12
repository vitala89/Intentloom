import { mkdtemp, mkdir, readFile, symlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it } from "vitest";
import { destinationCollisionKey, initProject, nodeFileSystem } from "@aif/cli";

describe("filesystem security", () => {
  it("rejects a broken generated-file symlink without creating its external target", async () => {
    const sandbox = await mkdtemp(join(tmpdir(), "aif-symlink-"));
    const project = join(sandbox, "project");
    const external = join(sandbox, "external");
    await mkdir(project);
    await mkdir(external);
    const target = join(external, "created-by-escape.md");
    await symlink(target, join(project, "AGENTS.md"));

    const result = await initProject(
      { root: project, profile: "generic", adapters: ["codex"] },
      nodeFileSystem,
    );

    expect(result.changes[0]?.kind).toBe("security-error");
    await expect(readFile(target, "utf8")).rejects.toThrow();
  });

  it.each([
    ["immediate parent", ".cursor", "cursor"],
    ["nested parent", ".github", "copilot"],
    ["metadata parent", ".aif", "codex"],
  ] as const)(
    "rejects an external %s symlink",
    async (_label, linkedPath, adapter) => {
      const sandbox = await mkdtemp(join(tmpdir(), "aif-parent-link-"));
      const project = join(sandbox, "project");
      const external = join(sandbox, "external");
      await mkdir(project);
      await mkdir(external);
      const sentinel = join(external, "sentinel.txt");
      await writeFile(sentinel, "unchanged");
      await symlink(external, join(project, linkedPath));

      const before = await readFile(sentinel, "utf8");
      const result = await initProject(
        {
          root: project,
          profile: "generic",
          adapters: [adapter],
          dryRun: true,
        },
        nodeFileSystem,
      );

      expect(result.changes[0]?.kind).toBe("security-error");
      expect(await readFile(sentinel, "utf8")).toBe(before);
    },
  );
});

describe("collision normalization", () => {
  it.each([
    ["AGENTS.md", "agents.md"],
    ["Docs/Rules.md", "docs/rules.md"],
    ["docs\\rules.md", "docs/rules.md"],
    ["./AGENTS.md", "AGENTS.md"],
    ["docs/../AGENTS.md", "AGENTS.md"],
    ["Cafe\u0301.md", "Caf\u00e9.md"],
  ])("treats %s and %s as one portable destination", (left, right) => {
    expect(destinationCollisionKey(left)).toBe(destinationCollisionKey(right));
  });
});
