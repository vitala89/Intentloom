import type { GeneratedFile } from "@intentloom/core";
import { describe, expect, it } from "vitest";
import {
  createMemoryFileSystem,
  synchronizeGeneratedFiles,
  type FileSystem,
} from "../packages/application/src/index.js";
import {
  assertProjectStateUnchanged,
  snapshotProjectState,
} from "./project-state.js";

const root = "/project";
const manifestPath = `${root}/.aif/manifest.lock.json`;
const sourceMapPath = `${root}/.aif/source-map.json`;
const existingPath = `${root}/AGENTS.md`;

const files: readonly GeneratedFile[] = [
  {
    path: "AGENTS.md",
    content: "new generated contents\n",
    sources: ["adapter:codex", "canonical:policies/base.md"],
    checksum: "ignored",
  },
];

type JsonObject = Record<string, unknown>;

async function readJson(fs: FileSystem, path: string): Promise<JsonObject> {
  return JSON.parse(await fs.read(path)) as JsonObject;
}

describe("manifest ownership classification", () => {
  it("rejects an invalid manifest ownershipPolicy before source-map ownership", async () => {
    const fs = createMemoryFileSystem({
      [existingPath]: "old generated contents\n",
      [manifestPath]: "old manifest bytes\n",
      [sourceMapPath]: "old source-map bytes\n",
    });
    const before = await snapshotProjectState(fs);

    const result = await synchronizeGeneratedFiles(root, files, fs, {
      corruptAfterFinalization: async ({ fileSystem }) => {
        const manifest = await readJson(fileSystem, manifestPath);
        manifest.ownershipPolicy = "project-owned";
        await fileSystem.write(
          manifestPath,
          `${JSON.stringify(manifest, null, 2)}\n`,
        );
      },
    });

    expect(result.status).toBe("failed");
    expect(result.failedStage).toBe("post-write-consistency");
    expect(result.postWriteValidation).toEqual({
      status: "invalid",
      code: "ownership-classification-invalid",
      affectedPaths: [".aif/manifest.lock.json"],
      affectedIdentifiers: ["ownershipPolicy"],
    });
    expect(result.diagnostics).toContain("ownership-classification-invalid");
    expect(result.rollbackAttempted).toBe(true);
    expect(result.rollbackCompleted).toBe(true);
    assertProjectStateUnchanged(before, await snapshotProjectState(fs));
    expect(await fs.read(existingPath)).toBe("old generated contents\n");
  });
});
