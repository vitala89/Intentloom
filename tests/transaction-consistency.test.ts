import { describe, expect, it } from "vitest";
import {
  createMemoryFileSystem,
  synchronizeGeneratedFiles,
} from "@intentloom/cli";
import {
  assertProjectStateUnchanged,
  snapshotProjectState,
} from "./project-state.js";

describe("transaction consistency", () => {
  it("rolls back generated files when manifest finalization fails", async () => {
    const fs = createMemoryFileSystem({ "/project/existing.txt": "sentinel" });
    const before = await snapshotProjectState(fs);
    const result = await synchronizeGeneratedFiles(
      "/project",
      [
        {
          path: "AGENTS.md",
          content: "generated",
          sources: ["adapter:codex"],
          checksum: "ignored",
        },
      ],
      fs,
      { failAt: "manifest-finalize" },
    );
    expect(result.status).toBe("failed");
    expect(result.failedStage).toBe("manifest-finalize");
    expect(result.rollbackCompleted).toBe(true);
    assertProjectStateUnchanged(before, await snapshotProjectState(fs));
  });

  it.each([
    "generated-stage",
    "generated-commit",
    "manifest-stage",
    "manifest-finalize",
    "source-map-stage",
    "source-map-finalize",
    "post-write-consistency",
    "success-cleanup",
  ] as const)(
    "restores the complete initial state after %s failure",
    async (failAt) => {
      const fs = createMemoryFileSystem({
        "/project/existing.txt": "unrelated sentinel",
        "/project/.aif/manifest.lock.json": "old manifest\n",
        "/project/.aif/source-map.json": "old source map\n",
      });
      const before = await snapshotProjectState(fs);
      const result = await synchronizeGeneratedFiles(
        "/project",
        [
          {
            path: "AGENTS.md",
            content: "generated one",
            sources: ["adapter:codex"],
            checksum: "old",
          },
          {
            path: "docs/rules.md",
            content: "generated two",
            sources: ["canonical:rules"],
            checksum: "old",
          },
        ],
        fs,
        { failAt },
      );
      expect(result.status).toBe("failed");
      expect(result.failedStage).toBe(failAt);
      expect(result.rollbackCompleted).toBe(true);
      assertProjectStateUnchanged(before, await snapshotProjectState(fs));
    },
  );

  it("commits generated files and mutually matching metadata", async () => {
    const fs = createMemoryFileSystem();
    const result = await synchronizeGeneratedFiles(
      "/project",
      [
        {
          path: "AGENTS.md",
          content: "generated",
          sources: ["adapter:codex"],
          checksum: "ignored",
        },
      ],
      fs,
    );
    expect(result.status).toBe("success");
    const manifest = JSON.parse(
      await fs.read("/project/.aif/manifest.lock.json"),
    );
    const sourceMap = JSON.parse(
      await fs.read("/project/.aif/source-map.json"),
    );
    expect(manifest.generated).toEqual(
      sourceMap.files.map(
        ({ path, checksum }: { path: string; checksum: string }) => ({
          path,
          checksum,
        }),
      ),
    );
    expect(
      [...fs.files.keys()].some(
        (path) => path.includes("staging") || path.includes("backups"),
      ),
    ).toBe(false);
  });

  it("preserves original failure and reports incomplete generated-file rollback", async () => {
    const fs = createMemoryFileSystem({
      "/project/AGENTS.md": "old generated",
    });
    const result = await synchronizeGeneratedFiles(
      "/project",
      [
        {
          path: "AGENTS.md",
          content: "new generated",
          sources: ["adapter:codex"],
          checksum: "ignored",
        },
      ],
      fs,
      { failAt: "source-map-finalize", rollbackFailPaths: ["AGENTS.md"] },
    );
    expect(result.status).toBe("failed");
    expect(result.failedStage).toBe("source-map-finalize");
    expect(result.rollbackCompleted).toBe(false);
    expect(result.rollbackFailures).toEqual(["AGENTS.md"]);
    expect(result.diagnostics).toContain("transaction-rollback-incomplete");
  });

  it.each([
    ["new generated removal", {}, "AGENTS.md"],
    [
      "existing manifest restore",
      { "/project/.aif/manifest.lock.json": "old manifest" },
      ".aif/manifest.lock.json",
    ],
    ["absent manifest removal", {}, ".aif/manifest.lock.json"],
    [
      "existing source-map restore",
      { "/project/.aif/source-map.json": "old source map" },
      ".aif/source-map.json",
    ],
    ["absent source-map removal", {}, ".aif/source-map.json"],
  ])(
    "reports incomplete rollback for %s failure",
    async (_name, initial, rollbackPath) => {
      const fs = createMemoryFileSystem(initial);
      const result = await synchronizeGeneratedFiles(
        "/project",
        [
          {
            path: "AGENTS.md",
            content: "new",
            sources: ["adapter:codex"],
            checksum: "ignored",
          },
        ],
        fs,
        { failAt: "success-cleanup", rollbackFailPaths: [rollbackPath] },
      );
      expect(result.status).toBe("failed");
      expect(result.failedStage).toBe("success-cleanup");
      expect(result.rollbackCompleted).toBe(false);
      expect(result.rollbackFailures).toContain(rollbackPath);
      expect(result.diagnostics).toContain("transaction-rollback-incomplete");
    },
  );

  it("reports every failed rollback path deterministically", async () => {
    const fs = createMemoryFileSystem();
    const result = await synchronizeGeneratedFiles(
      "/project",
      [
        {
          path: "AGENTS.md",
          content: "new",
          sources: ["adapter:codex"],
          checksum: "ignored",
        },
      ],
      fs,
      {
        failAt: "success-cleanup",
        rollbackFailPaths: [
          "AGENTS.md",
          ".aif/manifest.lock.json",
          ".aif/source-map.json",
        ],
      },
    );
    expect(result.rollbackFailures).toEqual([
      ".aif/manifest.lock.json",
      ".aif/source-map.json",
      "AGENTS.md",
    ]);
  });
});
