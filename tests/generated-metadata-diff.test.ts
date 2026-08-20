import { describe, expect, it } from "vitest";
import {
  compareGeneratedArtifact,
  isMetadataJsonPath,
  planExistingGeneratedChange,
} from "../packages/application/src/generated-metadata-compare.js";
import {
  createMemoryFileSystem,
  diffProject,
  initProject,
} from "../packages/application/src/index.js";

const options = {
  root: "/project",
  profile: "generic" as const,
  adapters: ["codex"] as const,
};

function compactJson(text: string): string {
  return `${JSON.stringify(JSON.parse(text))}\n`;
}

function prettyJson(text: string): string {
  return `${JSON.stringify(JSON.parse(text), null, 2)}\n`;
}

describe("generated metadata JSON comparison", () => {
  it("treats only AIF metadata JSON paths as semantic documents", () => {
    expect(isMetadataJsonPath(".aif/source-map.json")).toBe(true);
    expect(isMetadataJsonPath(".aif/manifest.lock.json")).toBe(true);
    expect(isMetadataJsonPath(".aif/config.yaml")).toBe(false);
    expect(isMetadataJsonPath("AGENTS.md")).toBe(false);
  });

  it("ignores JSON formatting for source-map and manifest metadata", () => {
    const pretty = prettyJson(
      JSON.stringify({
        schemaVersion: "1",
        files: [{ path: "AGENTS.md", sources: ["project:config"] }],
      }),
    );
    const compact = compactJson(pretty);
    expect(pretty).not.toBe(compact);
    expect(
      compareGeneratedArtifact(".aif/source-map.json", pretty, compact),
    ).toEqual({ equal: true });
    expect(
      compareGeneratedArtifact(".aif/manifest.lock.json", pretty, compact),
    ).toEqual({ equal: true });
  });

  it("detects semantic source-map changes", () => {
    const current = prettyJson(
      JSON.stringify({
        schemaVersion: "1",
        files: [
          {
            path: "AGENTS.md",
            checksum: "a".repeat(64),
            sources: ["project:config"],
            ownership: "aif-owned-generated",
          },
        ],
      }),
    );
    const changedChecksum = prettyJson(
      JSON.stringify({
        schemaVersion: "1",
        files: [
          {
            path: "AGENTS.md",
            checksum: "b".repeat(64),
            sources: ["project:config"],
            ownership: "aif-owned-generated",
          },
        ],
      }),
    );
    expect(
      compareGeneratedArtifact(
        ".aif/source-map.json",
        current,
        changedChecksum,
      ),
    ).toEqual({
      equal: false,
      reason: "existing metadata JSON differs; explicit resolution required",
    });
  });

  it("does not normalize malformed metadata JSON", () => {
    expect(compareGeneratedArtifact(".aif/source-map.json", "{", "{}")).toEqual(
      {
        equal: false,
        reason:
          "existing metadata JSON is malformed; explicit resolution required",
      },
    );
  });

  it("keeps non-JSON generated artifacts byte-identical", () => {
    expect(compareGeneratedArtifact("AGENTS.md", "alpha\n", "alpha\n")).toEqual(
      { equal: true },
    );
    expect(
      compareGeneratedArtifact("AGENTS.md", "alpha\n", "alpha \n"),
    ).toEqual({
      equal: false,
      reason: "existing file is not identical; explicit resolution required",
    });
  });

  it("does not report drift after formatter-only metadata rewrite", async () => {
    const fs = createMemoryFileSystem();
    await initProject({ ...options, dryRun: false }, fs);
    const sourceMapPath = "/project/.aif/source-map.json";
    const lockPath = "/project/.aif/manifest.lock.json";
    const agentsPath = "/project/AGENTS.md";
    const originalSourceMap = await fs.read(sourceMapPath);
    const originalLock = await fs.read(lockPath);
    const originalAgents = await fs.read(agentsPath);
    await fs.write(sourceMapPath, compactJson(originalSourceMap));
    await fs.write(lockPath, compactJson(originalLock));
    expect(await fs.read(sourceMapPath)).not.toBe(originalSourceMap);
    expect(await fs.read(lockPath)).not.toBe(originalLock);

    const first = await diffProject(options, fs);
    const second = await diffProject(options, fs);
    expect(first).toEqual(second);
    expect(first.changes).toEqual([]);
    expect(first.diagnostics).toEqual([]);

    const mutated = JSON.parse(await fs.read(sourceMapPath)) as {
      files: { checksum: string }[];
    };
    mutated.files[0]!.checksum = "c".repeat(64);
    await fs.write(sourceMapPath, prettyJson(JSON.stringify(mutated)));
    expect(await diffProject(options, fs)).toEqual(
      expect.objectContaining({
        changes: [
          expect.objectContaining({
            path: ".aif/source-map.json",
            kind: "conflict",
            reason:
              "existing metadata JSON differs; explicit resolution required",
          }),
        ],
      }),
    );

    await fs.write(sourceMapPath, compactJson(originalSourceMap));
    await fs.write(lockPath, "{");
    expect(await diffProject(options, fs)).toEqual(
      expect.objectContaining({
        changes: [
          expect.objectContaining({
            path: ".aif/manifest.lock.json",
            kind: "conflict",
            reason:
              "existing metadata JSON is malformed; explicit resolution required",
          }),
        ],
      }),
    );

    await fs.write(lockPath, compactJson(originalLock));
    await fs.write(sourceMapPath, "{");
    expect(await diffProject(options, fs)).toEqual({
      changes: [
        {
          path: ".aif/source-map.json",
          kind: "conflict",
          reason: "malformed source-map; refusing all writes",
        },
      ],
      diagnostics: ["invalid source-map"],
    });

    await fs.write(sourceMapPath, compactJson(originalSourceMap));
    await fs.write(agentsPath, `${originalAgents} trailing\n`);
    expect(await diffProject(options, fs)).toEqual(
      expect.objectContaining({
        changes: [
          expect.objectContaining({
            path: "AGENTS.md",
            kind: "conflict",
            reason:
              "existing file is not identical; explicit resolution required",
          }),
        ],
      }),
    );
  });

  it("approved overwrite turns differing generated files into updates", () => {
    expect(
      planExistingGeneratedChange({
        path: ".aif/config.yaml",
        existing: "old\n",
        desired: "new\n",
        sync: true,
        ownedChecksum: undefined,
        checksum: (value) => value,
        approvedOverwrite: true,
      }),
    ).toEqual({
      path: ".aif/config.yaml",
      kind: "update",
      reason: "approved adoption replaces generated output",
      content: "new\n",
    });
    expect(
      planExistingGeneratedChange({
        path: ".cursor/rules/intentloom-core.mdc",
        existing: "old\n",
        desired: "new\n",
        sync: true,
        ownedChecksum: "other",
        checksum: (value) => value,
        approvedOverwrite: true,
      })?.kind,
    ).toBe("update");
    expect(
      planExistingGeneratedChange({
        path: ".aif/config.yaml",
        existing: "old\n",
        desired: "new\n",
        sync: true,
        ownedChecksum: undefined,
        checksum: (value) => value,
      })?.kind,
    ).toBe("conflict");
  });
});
