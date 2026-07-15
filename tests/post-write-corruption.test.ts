import { describe, expect, it } from "vitest";
import {
  createMemoryFileSystem,
  synchronizeGeneratedFiles,
  type FileSystem,
  type PostWriteCorruptionContext,
  type PostWriteCorruptionCode,
} from "@intentloom/cli";
import { checksum, type GeneratedFile } from "@intentloom/core";
import {
  assertProjectStateUnchanged,
  snapshotProjectState,
} from "./project-state.js";

const root = "/project";
const manifestPath = `${root}/.aif/manifest.lock.json`;
const sourceMapPath = `${root}/.aif/source-map.json`;
const existingPath = `${root}/AGENTS.md`;
const createdPath = `${root}/docs/new.md`;

const files: readonly GeneratedFile[] = [
  {
    path: "AGENTS.md",
    content: "new generated contents\n",
    sources: ["adapter:codex", "canonical:policies/base.md"],
    checksum: "ignored",
  },
  {
    path: "docs/new.md",
    content: "newly created contents\n",
    sources: ["adapter:codex", "canonical:workflows/sync.md"],
    checksum: "ignored",
  },
];

type JsonObject = Record<string, unknown>;

async function readJson(fs: FileSystem, path: string): Promise<JsonObject> {
  return JSON.parse(await fs.read(path)) as JsonObject;
}

async function writeJson(
  fs: FileSystem,
  path: string,
  value: JsonObject,
): Promise<void> {
  await fs.write(path, `${JSON.stringify(value, null, 2)}\n`);
}

function records(value: JsonObject, key: "generated" | "files"): JsonObject[] {
  return value[key] as JsonObject[];
}

interface CorruptionCase {
  readonly name: string;
  readonly code: PostWriteCorruptionCode;
  readonly corrupt: (context: PostWriteCorruptionContext) => Promise<void>;
}

const corruptionCases: readonly CorruptionCase[] = [
  {
    name: "rejects malformed committed manifest JSON",
    code: "manifest-json-malformed",
    corrupt: async ({ fileSystem }) =>
      fileSystem.write(manifestPath, "{ malformed"),
  },
  {
    name: "rejects malformed committed source-map JSON",
    code: "source-map-json-malformed",
    corrupt: async ({ fileSystem }) =>
      fileSystem.write(sourceMapPath, "{ malformed"),
  },
  {
    name: "rejects a generated file without a manifest entry",
    code: "manifest-entry-missing",
    corrupt: async ({ fileSystem }) => {
      const manifest = await readJson(fileSystem, manifestPath);
      manifest.generated = records(manifest, "generated").slice(1);
      await writeJson(fileSystem, manifestPath, manifest);
    },
  },
  {
    name: "rejects an existing generated file without a source-map entry",
    code: "source-map-entry-missing",
    corrupt: async ({ fileSystem }) => {
      const sourceMap = await readJson(fileSystem, sourceMapPath);
      sourceMap.files = records(sourceMap, "files").slice(1);
      await writeJson(fileSystem, sourceMapPath, sourceMap);
    },
  },
  {
    name: "rejects a manifest destination whose generated file is missing",
    code: "manifest-destination-missing",
    corrupt: async ({ fileSystem }) => {
      const manifest = await readJson(fileSystem, manifestPath);
      records(manifest, "generated").push({
        path: "missing-manifest-output.md",
        checksum: checksum("missing"),
      });
      await writeJson(fileSystem, manifestPath, manifest);
    },
  },
  {
    name: "rejects a source-map destination whose generated file is missing",
    code: "source-map-destination-missing",
    corrupt: async ({ fileSystem }) => {
      const sourceMap = await readJson(fileSystem, sourceMapPath);
      records(sourceMap, "files")[0]!.path = "missing-source-map-output.md";
      await writeJson(fileSystem, sourceMapPath, sourceMap);
    },
  },
  {
    name: "rejects a newly created generated file without ownership metadata",
    code: "generated-file-without-ownership",
    corrupt: async ({ fileSystem }) => {
      const sourceMap = await readJson(fileSystem, sourceMapPath);
      sourceMap.files = records(sourceMap, "files").filter(
        (record) => record.path !== "docs/new.md",
      );
      await writeJson(fileSystem, sourceMapPath, sourceMap);
    },
  },
  {
    name: "rejects an ownership record for a file that was not committed",
    code: "ownership-record-without-generated-file",
    corrupt: async ({ fileSystem }) => {
      const sourceMap = await readJson(fileSystem, sourceMapPath);
      records(sourceMap, "files").push({
        path: "uncommitted.md",
        checksum: checksum("uncommitted"),
        sources: ["canonical:uncommitted"],
        ownership: "aif-owned-generated",
      });
      await writeJson(fileSystem, sourceMapPath, sourceMap);
    },
  },
  {
    name: "rejects an actual generated checksum that differs from source-map metadata",
    code: "generated-checksum-mismatch",
    corrupt: async ({ fileSystem }) => {
      const sourceMap = await readJson(fileSystem, sourceMapPath);
      records(sourceMap, "files")[0]!.checksum = checksum("wrong source map");
      await writeJson(fileSystem, sourceMapPath, sourceMap);
    },
  },
  {
    name: "rejects a manifest checksum that differs from the source map",
    code: "manifest-source-map-checksum-mismatch",
    corrupt: async ({ fileSystem }) => {
      const manifest = await readJson(fileSystem, manifestPath);
      records(manifest, "generated")[0]!.checksum = checksum("wrong manifest");
      await writeJson(fileSystem, manifestPath, manifest);
    },
  },
  {
    name: "rejects a manifest checksum that differs from the actual generated file",
    code: "manifest-generated-checksum-mismatch",
    corrupt: async ({ fileSystem }) =>
      fileSystem.write(existingPath, "unexpected committed bytes\n"),
  },
  {
    name: "rejects actual committed generated bytes that differ from the plan",
    code: "committed-generated-bytes-mismatch",
    corrupt: async ({ fileSystem }) => {
      const corrupted = "semantically consistent but unplanned bytes\n";
      const corruptedChecksum = checksum(corrupted);
      await fileSystem.write(existingPath, corrupted);
      const manifest = await readJson(fileSystem, manifestPath);
      const sourceMap = await readJson(fileSystem, sourceMapPath);
      records(manifest, "generated")[0]!.checksum = corruptedChecksum;
      records(sourceMap, "files")[0]!.checksum = corruptedChecksum;
      await writeJson(fileSystem, manifestPath, manifest);
      await writeJson(fileSystem, sourceMapPath, sourceMap);
    },
  },
  {
    name: "rejects an absolute path stored in the manifest",
    code: "manifest-absolute-path",
    corrupt: async ({ fileSystem }) => {
      const manifest = await readJson(fileSystem, manifestPath);
      records(manifest, "generated")[0]!.path = "/outside/manifest.md";
      await writeJson(fileSystem, manifestPath, manifest);
    },
  },
  {
    name: "rejects an absolute path stored in the source map",
    code: "source-map-absolute-path",
    corrupt: async ({ fileSystem }) => {
      const sourceMap = await readJson(fileSystem, sourceMapPath);
      records(sourceMap, "files")[0]!.path = "/outside/source-map.md";
      await writeJson(fileSystem, sourceMapPath, sourceMap);
    },
  },
  {
    name: "rejects a project-root escape stored in the manifest",
    code: "manifest-path-escape",
    corrupt: async ({ fileSystem }) => {
      const manifest = await readJson(fileSystem, manifestPath);
      records(manifest, "generated")[0]!.path = "../manifest-escape.md";
      await writeJson(fileSystem, manifestPath, manifest);
    },
  },
  {
    name: "rejects a project-root escape stored in the source map",
    code: "source-map-path-escape",
    corrupt: async ({ fileSystem }) => {
      const sourceMap = await readJson(fileSystem, sourceMapPath);
      records(sourceMap, "files")[0]!.path = "../source-map-escape.md";
      await writeJson(fileSystem, sourceMapPath, sourceMap);
    },
  },
  {
    name: "rejects duplicate source-map ownership destinations",
    code: "source-map-duplicate-ownership",
    corrupt: async ({ fileSystem }) => {
      const sourceMap = await readJson(fileSystem, sourceMapPath);
      records(sourceMap, "files").push({ ...records(sourceMap, "files")[0] });
      await writeJson(fileSystem, sourceMapPath, sourceMap);
    },
  },
  {
    name: "rejects duplicate manifest destinations",
    code: "manifest-duplicate-destination",
    corrupt: async ({ fileSystem }) => {
      const manifest = await readJson(fileSystem, manifestPath);
      records(manifest, "generated").push({
        ...records(manifest, "generated")[0],
      });
      await writeJson(fileSystem, manifestPath, manifest);
    },
  },
  {
    name: "rejects destinations that collide after normalized comparison",
    code: "normalized-destination-duplicate",
    corrupt: async ({ fileSystem }) => {
      const manifest = await readJson(fileSystem, manifestPath);
      const sourceMap = await readJson(fileSystem, sourceMapPath);
      records(manifest, "generated").push({
        ...records(manifest, "generated")[0],
        path: "agents.md",
      });
      records(sourceMap, "files").push({
        ...records(sourceMap, "files")[0],
        path: "agents.md",
      });
      await writeJson(fileSystem, manifestPath, manifest);
      await writeJson(fileSystem, sourceMapPath, sourceMap);
    },
  },
  {
    name: "rejects a non-Intentloom ownership classification",
    code: "ownership-classification-invalid",
    corrupt: async ({ fileSystem }) => {
      const sourceMap = await readJson(fileSystem, sourceMapPath);
      records(sourceMap, "files")[0]!.ownership = "project-owned";
      await writeJson(fileSystem, sourceMapPath, sourceMap);
    },
  },
  {
    name: "rejects a generated file represented by multiple ownership records",
    code: "source-map-duplicate-ownership",
    corrupt: async ({ fileSystem }) => {
      const sourceMap = await readJson(fileSystem, sourceMapPath);
      records(sourceMap, "files").push({ ...records(sourceMap, "files")[1] });
      await writeJson(fileSystem, sourceMapPath, sourceMap);
    },
  },
  {
    name: "rejects a missing manifest adapter identifier",
    code: "adapter-id-missing",
    corrupt: async ({ fileSystem }) => {
      const manifest = await readJson(fileSystem, manifestPath);
      delete manifest.adapterId;
      await writeJson(fileSystem, manifestPath, manifest);
    },
  },
  {
    name: "rejects a missing source-map adapter identifier",
    code: "adapter-id-missing",
    corrupt: async ({ fileSystem }) => {
      const sourceMap = await readJson(fileSystem, sourceMapPath);
      delete sourceMap.adapterId;
      await writeJson(fileSystem, sourceMapPath, sourceMap);
    },
  },
  {
    name: "rejects adapter identifiers that differ between metadata files",
    code: "adapter-id-mismatch",
    corrupt: async ({ fileSystem }) => {
      const sourceMap = await readJson(fileSystem, sourceMapPath);
      sourceMap.adapterId = "different-adapter";
      await writeJson(fileSystem, sourceMapPath, sourceMap);
    },
  },
  {
    name: "rejects a missing manifest canonical-source identifier",
    code: "canonical-source-id-missing",
    corrupt: async ({ fileSystem }) => {
      const manifest = await readJson(fileSystem, manifestPath);
      delete manifest.canonicalSourceId;
      await writeJson(fileSystem, manifestPath, manifest);
    },
  },
  {
    name: "rejects a missing source-map canonical-source identifier",
    code: "canonical-source-id-missing",
    corrupt: async ({ fileSystem }) => {
      const sourceMap = await readJson(fileSystem, sourceMapPath);
      delete sourceMap.canonicalSourceId;
      await writeJson(fileSystem, sourceMapPath, sourceMap);
    },
  },
  {
    name: "rejects canonical-source identifiers that differ between metadata files",
    code: "canonical-source-id-mismatch",
    corrupt: async ({ fileSystem }) => {
      const sourceMap = await readJson(fileSystem, sourceMapPath);
      sourceMap.canonicalSourceId = "different-source";
      await writeJson(fileSystem, sourceMapPath, sourceMap);
    },
  },
  {
    name: "rejects missing framework versions",
    code: "framework-version-missing",
    corrupt: async ({ fileSystem }) => {
      const manifest = await readJson(fileSystem, manifestPath);
      const sourceMap = await readJson(fileSystem, sourceMapPath);
      delete manifest.frameworkVersion;
      delete sourceMap.frameworkVersion;
      await writeJson(fileSystem, manifestPath, manifest);
      await writeJson(fileSystem, sourceMapPath, sourceMap);
    },
  },
  {
    name: "rejects incompatible framework versions",
    code: "framework-version-incompatible",
    corrupt: async ({ fileSystem }) => {
      const manifest = await readJson(fileSystem, manifestPath);
      const sourceMap = await readJson(fileSystem, sourceMapPath);
      manifest.frameworkVersion = "9.0.0";
      sourceMap.frameworkVersion = "9.0.0";
      await writeJson(fileSystem, manifestPath, manifest);
      await writeJson(fileSystem, sourceMapPath, sourceMap);
    },
  },
  {
    name: "rejects missing adapter output versions",
    code: "adapter-output-version-missing",
    corrupt: async ({ fileSystem }) => {
      const manifest = await readJson(fileSystem, manifestPath);
      const sourceMap = await readJson(fileSystem, sourceMapPath);
      delete manifest.adapterOutputVersion;
      delete sourceMap.adapterOutputVersion;
      await writeJson(fileSystem, manifestPath, manifest);
      await writeJson(fileSystem, sourceMapPath, sourceMap);
    },
  },
  {
    name: "rejects incompatible adapter output versions",
    code: "adapter-output-version-incompatible",
    corrupt: async ({ fileSystem }) => {
      const manifest = await readJson(fileSystem, manifestPath);
      const sourceMap = await readJson(fileSystem, sourceMapPath);
      manifest.adapterOutputVersion = "9.0.0";
      sourceMap.adapterOutputVersion = "9.0.0";
      await writeJson(fileSystem, manifestPath, manifest);
      await writeJson(fileSystem, sourceMapPath, sourceMap);
    },
  },
  {
    name: "rejects incompatible metadata-format versions",
    code: "metadata-format-version-incompatible",
    corrupt: async ({ fileSystem }) => {
      const manifest = await readJson(fileSystem, manifestPath);
      manifest.metadataFormatVersion = "2";
      await writeJson(fileSystem, manifestPath, manifest);
    },
  },
  {
    name: "rejects committed manifest bytes that differ from finalized planned bytes",
    code: "committed-manifest-bytes-mismatch",
    corrupt: async ({ fileSystem }) => {
      const manifest = await readJson(fileSystem, manifestPath);
      await fileSystem.write(manifestPath, `${JSON.stringify(manifest)}\n`);
    },
  },
  {
    name: "rejects committed source-map bytes that differ from finalized planned bytes",
    code: "committed-source-map-bytes-mismatch",
    corrupt: async ({ fileSystem }) => {
      const sourceMap = await readJson(fileSystem, sourceMapPath);
      await fileSystem.write(sourceMapPath, `${JSON.stringify(sourceMap)}\n`);
    },
  },
];

describe("post-write corruption validation", () => {
  for (const testCase of corruptionCases) {
    it(testCase.name, async () => {
      const fs = createMemoryFileSystem({
        [existingPath]: "old generated contents\n",
        [manifestPath]: "old manifest bytes\n",
        [sourceMapPath]: "old source-map bytes\n",
        [`${root}/unrelated-sentinel.txt`]: "unrelated sentinel\n",
      });
      const before = await snapshotProjectState(fs);

      const result = await synchronizeGeneratedFiles(root, files, fs, {
        corruptAfterFinalization: testCase.corrupt,
      });

      expect(result.status).toBe("failed");
      expect(result.failedStage).toBe("post-write-consistency");
      expect(result.postWriteValidation).toMatchObject({
        status: "invalid",
        code: testCase.code,
      });
      expect(result.diagnostics).toContain(testCase.code);
      expect(result.rollbackAttempted).toBe(true);
      expect(result.rollbackCompleted).toBe(true);
      expect(result.rollbackFailures).toEqual([]);
      const validation = result.postWriteValidation;
      expect(validation?.status).toBe("invalid");
      if (validation?.status === "invalid") {
        expect(
          validation.affectedPaths.every((path) => !path.startsWith("/")),
        ).toBe(true);
        expect(
          validation.affectedIdentifiers.every(
            (identifier) => !identifier.includes("old generated contents"),
          ),
        ).toBe(true);
      }
      assertProjectStateUnchanged(before, await snapshotProjectState(fs));
      expect(await fs.read(`${root}/unrelated-sentinel.txt`)).toBe(
        "unrelated sentinel\n",
      );
      expect(await fs.read(existingPath)).toBe("old generated contents\n");
      expect(await fs.exists(createdPath)).toBe(false);
      expect(
        [...fs.files.keys()].some(
          (path) => path.includes("staging") || path.includes("backup"),
        ),
      ).toBe(false);
    });
  }
});
