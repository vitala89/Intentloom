import { describe, expect, it } from "vitest";
import { createMemoryFileSystem, synchronizeGeneratedFiles } from "@aif/cli";
import {
  assertProjectStateUnchanged,
  snapshotProjectState,
} from "./project-state.js";

describe("collision abort execution", () => {
  it("rejects a lone noncanonical traversal without writing", async () => {
    const fs = createMemoryFileSystem({
      "/project/existing.md": "project sentinel\n",
    });
    const before = await snapshotProjectState(fs);
    const result = await synchronizeGeneratedFiles(
      "/project",
      [
        {
          path: "docs/../AGENTS.md",
          content: "unsafe",
          sources: ["policies/core.md"],
          checksum: "ignored",
        },
      ],
      fs,
    );
    expect(result.status).toBe("failed");
    expect(result.diagnostics).toEqual(["invalid-stored-path"]);
    expect(result.changes).toEqual([
      expect.objectContaining({
        path: "docs/../AGENTS.md",
        kind: "security-error",
      }),
    ]);
    assertProjectStateUnchanged(before, await snapshotProjectState(fs));
  });

  it("preserves project state byte-for-byte for a case-only collision", async () => {
    const fs = createMemoryFileSystem({
      "/project/existing.md": "generated sentinel",
      "/project/.aif/manifest.lock.json": "manifest sentinel\n",
      "/project/.aif/source-map.json": "source-map sentinel\n",
      "/project/.aif/staging/keep.txt": "staging sentinel",
      "/project/.aif/backups/keep.txt": "backup sentinel",
    });
    const before = await snapshotProjectState(fs);
    const result = await synchronizeGeneratedFiles(
      "/project",
      [
        {
          path: "AGENTS.md",
          content: "one",
          sources: ["adapter:codex"],
          checksum: "one",
        },
        {
          path: "agents.md",
          content: "two",
          sources: ["adapter:cursor"],
          checksum: "two",
        },
      ],
      fs,
    );
    expect(result.diagnostics).toContain("destination-collision");
    assertProjectStateUnchanged(before, await snapshotProjectState(fs));
  });

  it.each([
    ["nested case", ["Docs/Rules.md", "docs/rules.md"]],
    ["mixed separators", ["docs\\rules.md", "docs/rules.md"]],
    ["redundant leading segment", ["./AGENTS.md", "AGENTS.md"]],
    ["dot segment", ["docs/../AGENTS.md", "AGENTS.md"]],
    ["NFC Unicode", ["Cafe\u0301.md", "Caf\u00e9.md"]],
    ["duplicate adapter", ["AGENTS.md", "AGENTS.md"]],
    [
      "manifest metadata",
      [".AIF/MANIFEST.LOCK.JSON", ".aif/manifest.lock.json"],
    ],
    ["source-map metadata", [".AIF/SOURCE-MAP.JSON", ".aif/source-map.json"]],
    ["three sources", ["AGENTS.md", "agents.md", "Agents.md"]],
    ["four sources", ["AGENTS.md", "agents.md", "Agents.md", "aGeNtS.mD"]],
  ])(
    "preserves all project bytes for %s collision in both orders",
    async (_name, paths) => {
      for (const ordered of [paths, [...paths].reverse()]) {
        const fs = createMemoryFileSystem({
          "/project/existing.md": "generated sentinel",
          "/project/.aif/manifest.lock.json": "manifest sentinel\n",
          "/project/.aif/source-map.json": "source-map sentinel\n",
          "/project/.aif/staging/keep.txt": "staging sentinel",
          "/project/.aif/backups/keep.txt": "backup sentinel",
        });
        const before = await snapshotProjectState(fs);
        const result = await synchronizeGeneratedFiles(
          "/project",
          ordered.map((path, index) => ({
            path,
            content: `content:${index}`,
            sources: [`source:${index}`],
            checksum: `checksum:${index}`,
          })),
          fs,
        );
        expect(result.diagnostics).toContain("destination-collision");
        assertProjectStateUnchanged(before, await snapshotProjectState(fs));
      }
    },
  );

  it.each([
    [
      "manifest absent",
      { "/project/.aif/source-map.json": "source-map sentinel\n" },
    ],
    [
      "source map absent",
      { "/project/.aif/manifest.lock.json": "manifest sentinel\n" },
    ],
    ["both metadata files absent", {}],
  ])("keeps %s metadata absent after rejection", async (_name, initial) => {
    const fs = createMemoryFileSystem(initial);
    const before = await snapshotProjectState(fs);
    const result = await synchronizeGeneratedFiles(
      "/project",
      [
        {
          path: "AGENTS.md",
          content: "one",
          sources: ["one"],
          checksum: "one",
        },
        {
          path: "agents.md",
          content: "two",
          sources: ["two"],
          checksum: "two",
        },
      ],
      fs,
    );
    expect(result.diagnostics).toEqual(["destination-collision"]);
    assertProjectStateUnchanged(before, await snapshotProjectState(fs));
  });
});
