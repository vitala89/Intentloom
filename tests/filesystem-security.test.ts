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

  it.each(["manifest.lock.json", "source-map.json"])(
    "aborts the whole operation for a direct %s symlink",
    async (metadataFile) => {
      const sandbox = await mkdtemp(join(tmpdir(), "aif-manifest-link-"));
      const project = join(sandbox, "project");
      const external = join(sandbox, "manifest.json");
      await mkdir(join(project, ".aif"), { recursive: true });
      await writeFile(external, "sentinel");
      await symlink(external, join(project, ".aif", metadataFile));

      const result = await initProject(
        { root: project, profile: "generic", adapters: ["codex"] },
        nodeFileSystem,
      );

      expect(
        result.changes.some((change) => change.kind === "security-error"),
      ).toBe(true);
      expect(await readFile(external, "utf8")).toBe("sentinel");
      await expect(
        readFile(join(project, "AGENTS.md"), "utf8"),
      ).rejects.toThrow();
    },
  );

  it("revalidates a generated destination immediately before commit", async () => {
    const sandbox = await mkdtemp(join(tmpdir(), "aif-race-link-"));
    const project = join(sandbox, "project");
    const external = join(sandbox, "external.md");
    await mkdir(project);
    await writeFile(external, "sentinel");
    let substituted = false;
    const racingFs = {
      ...nodeFileSystem,
      async write(path: string, content: string) {
        if (!substituted) {
          substituted = true;
          await symlink(external, join(project, "AGENTS.md"));
        }
        await nodeFileSystem.write(path, content);
      },
    };

    await expect(
      initProject(
        { root: project, profile: "generic", adapters: ["codex"] },
        racingFs,
      ),
    ).rejects.toThrow();
    expect(await readFile(external, "utf8")).toBe("sentinel");
  });

  it.each([
    ["destination", "AGENTS.md", "codex"],
    ["adapter parent", ".cursor", "cursor"],
    ["metadata parent", ".aif", "codex"],
  ] as const)(
    "rejects a real %s symlink loop",
    async (_name, loopPath, adapter) => {
      const sandbox = await mkdtemp(join(tmpdir(), "aif-loop-"));
      const project = join(sandbox, "project");
      await mkdir(project);
      await symlink(loopPath, join(project, loopPath));
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
