import { describe, expect, it } from "vitest";
import {
  createMemoryFileSystem,
  destinationCollisionKey,
  synchronizeGeneratedFiles,
  type FileSystem,
  type TransactionResult,
} from "@intentloom/cli";
import {
  INTENTLOOM_VERSION,
  checksum,
  type GeneratedFile,
} from "@intentloom/core";
import { snapshotProjectState } from "./project-state.js";

const root = "/project";
const manifestPath = `${root}/.aif/manifest.lock.json`;
const sourceMapPath = `${root}/.aif/source-map.json`;
const oneFile: readonly GeneratedFile[] = [
  {
    path: "AGENTS.md",
    content: "generated one\n",
    sources: ["adapter:codex", "canonical:policies/base.md"],
    checksum: "ignored",
  },
];
const twoFiles: readonly GeneratedFile[] = [
  ...oneFile,
  {
    path: "docs/rules.md",
    content: "generated two\n",
    sources: ["adapter:codex", "canonical:workflows/review.md"],
    checksum: "ignored",
  },
];

type JsonObject = Record<string, unknown>;

async function metadata(fs: FileSystem): Promise<{
  manifest: JsonObject;
  sourceMap: JsonObject;
}> {
  return {
    manifest: JSON.parse(await fs.read(manifestPath)) as JsonObject,
    sourceMap: JSON.parse(await fs.read(sourceMapPath)) as JsonObject,
  };
}

async function expectValid(
  files: readonly GeneratedFile[] = oneFile,
  initial: Record<string, string> = {},
): Promise<{
  fs: ReturnType<typeof createMemoryFileSystem>;
  result: TransactionResult;
}> {
  const fs = createMemoryFileSystem(initial);
  const result = await synchronizeGeneratedFiles(root, files, fs);
  expect(result.status).toBe("success");
  expect(result.postWriteValidation).toEqual({
    status: "valid",
    checkedGeneratedFileCount: files.length,
    checkedManifestEntryCount: files.length,
    checkedSourceMapEntryCount: files.length,
    checksumsValidated: true,
    ownershipValidated: true,
    pathsValidated: true,
    versionsValidated: true,
    metadataBytesValidated: true,
  });
  return { fs, result };
}

describe("successful post-write consistency", () => {
  it("normalizes Windows host paths in the portable memory filesystem", async () => {
    const fs = createMemoryFileSystem();
    await fs.write("C:\\project\\AGENTS.md", "generated one\n");
    expect(await fs.read("/project/AGENTS.md")).toBe("generated one\n");
    expect(await fs.list("C:\\project")).toEqual(["/project/AGENTS.md"]);
  });

  it("validates creation of one generated file with absent metadata", async () => {
    const { fs } = await expectValid();
    expect(await fs.read(`${root}/AGENTS.md`)).toBe("generated one\n");
  });

  it("validates creation of multiple generated files", async () => {
    const { result } = await expectValid(twoFiles);
    expect(result.postWriteValidation).toMatchObject({
      checkedGeneratedFileCount: 2,
    });
  });

  it("validates update of one existing Intentloom-owned generated file", async () => {
    const fs = createMemoryFileSystem();
    await synchronizeGeneratedFiles(root, oneFile, fs);
    const updated = [{ ...oneFile[0]!, content: "updated one\n" }];
    const result = await synchronizeGeneratedFiles(root, updated, fs);
    expect(result.status).toBe("success");
    expect(await fs.read(`${root}/AGENTS.md`)).toBe("updated one\n");
  });

  it("validates update of multiple existing Intentloom-owned generated files", async () => {
    const fs = createMemoryFileSystem();
    await synchronizeGeneratedFiles(root, twoFiles, fs);
    const updated = twoFiles.map((file) => ({
      ...file,
      content: `${file.content.trim()} updated\n`,
    }));
    const result = await synchronizeGeneratedFiles(root, updated, fs);
    expect(result.status).toBe("success");
    expect(result.postWriteValidation).toMatchObject({
      checkedGeneratedFileCount: 2,
    });
  });

  it("validates a mixed create and update transaction", async () => {
    const fs = createMemoryFileSystem();
    await synchronizeGeneratedFiles(root, oneFile, fs);
    const mixed = [
      { ...oneFile[0]!, content: "updated existing\n" },
      twoFiles[1]!,
    ];
    const result = await synchronizeGeneratedFiles(root, mixed, fs);
    expect(result.status).toBe("success");
    expect(
      result.changes
        .filter(
          (change) =>
            change.path !== ".aif/manifest.lock.json" &&
            change.path !== ".aif/source-map.json",
        )
        .map((change) => change.kind)
        .sort(),
    ).toEqual(["create", "update"]);
  });

  it("validates when manifest and source map already exist", async () => {
    const fs = createMemoryFileSystem();
    await synchronizeGeneratedFiles(root, oneFile, fs);
    const result = await synchronizeGeneratedFiles(root, oneFile, fs);
    expect(result.status).toBe("success");
    expect(result.postWriteValidation?.status).toBe("valid");
  });

  it("validates when manifest and source map are initially absent", async () => {
    const { fs } = await expectValid();
    expect(await fs.exists(manifestPath)).toBe(true);
    expect(await fs.exists(sourceMapPath)).toBe(true);
  });

  it("validates actual generated checksums against source-map checksums", async () => {
    const { fs } = await expectValid(twoFiles);
    const { sourceMap } = await metadata(fs);
    for (const record of sourceMap.files as JsonObject[]) {
      expect(record.checksum).toBe(
        checksum(await fs.read(`${root}/${String(record.path)}`)),
      );
    }
  });

  it("validates manifest checksums against source-map checksums", async () => {
    const { fs } = await expectValid(twoFiles);
    const { manifest, sourceMap } = await metadata(fs);
    expect(manifest.generated).toEqual(
      (sourceMap.files as JsonObject[]).map(({ path, checksum }) => ({
        path,
        checksum,
      })),
    );
  });

  it("validates manifest checksums against actual generated files", async () => {
    const { fs } = await expectValid(twoFiles);
    const { manifest } = await metadata(fs);
    for (const record of manifest.generated as JsonObject[]) {
      expect(record.checksum).toBe(
        checksum(await fs.read(`${root}/${String(record.path)}`)),
      );
    }
  });

  it("validates agreeing adapter identifiers", async () => {
    const { fs } = await expectValid();
    const { manifest, sourceMap } = await metadata(fs);
    expect(manifest.adapterId).toBe(sourceMap.adapterId);
  });

  it("validates agreeing canonical-source identifiers", async () => {
    const { fs } = await expectValid();
    const { manifest, sourceMap } = await metadata(fs);
    expect(manifest.canonicalSourceId).toBe(sourceMap.canonicalSourceId);
  });

  it("validates compatible framework versions", async () => {
    const { fs } = await expectValid();
    const { manifest, sourceMap } = await metadata(fs);
    expect(manifest.frameworkVersion).toBe(INTENTLOOM_VERSION);
    expect(sourceMap.frameworkVersion).toBe(INTENTLOOM_VERSION);
  });

  it("validates compatible adapter output versions", async () => {
    const { fs } = await expectValid();
    const { manifest, sourceMap } = await metadata(fs);
    expect(manifest.adapterOutputVersion).toBe("0.1.0");
    expect(sourceMap.adapterOutputVersion).toBe("0.1.0");
  });

  it("validates compatible metadata-format versions", async () => {
    const { fs } = await expectValid();
    const { manifest, sourceMap } = await metadata(fs);
    expect(manifest.metadataFormatVersion).toBe("1");
    expect(sourceMap.metadataFormatVersion).toBe("1");
  });

  it("stores no absolute generated destination paths", async () => {
    const { fs } = await expectValid(twoFiles);
    const { manifest, sourceMap } = await metadata(fs);
    const paths = [
      ...(manifest.generated as JsonObject[]),
      ...(sourceMap.files as JsonObject[]),
    ].map((record) => String(record.path));
    expect(paths.every((path) => !path.startsWith("/"))).toBe(true);
  });

  it("stores no project-root escape paths", async () => {
    const { fs } = await expectValid(twoFiles);
    const { manifest, sourceMap } = await metadata(fs);
    const paths = [
      ...(manifest.generated as JsonObject[]),
      ...(sourceMap.files as JsonObject[]),
    ].map((record) => String(record.path));
    expect(
      paths.every((path) => path !== ".." && !path.startsWith("../")),
    ).toBe(true);
  });

  it("stores no duplicate normalized destination", async () => {
    const { fs } = await expectValid(twoFiles);
    const { sourceMap } = await metadata(fs);
    const keys = (sourceMap.files as JsonObject[]).map((record) =>
      destinationCollisionKey(String(record.path)),
    );
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("gives every generated file ownership metadata", async () => {
    const { fs } = await expectValid(twoFiles);
    const { sourceMap } = await metadata(fs);
    expect(
      (sourceMap.files as JsonObject[]).every(
        (record) => record.ownership === "aif-owned-generated",
      ),
    ).toBe(true);
  });

  it("stores no ownership record for a missing generated file", async () => {
    const { fs } = await expectValid(twoFiles);
    const { sourceMap } = await metadata(fs);
    for (const record of sourceMap.files as JsonObject[])
      expect(await fs.exists(`${root}/${String(record.path)}`)).toBe(true);
  });

  it("validates actual committed metadata bytes against planned bytes", async () => {
    const { result } = await expectValid(twoFiles);
    expect(result.postWriteValidation).toMatchObject({
      metadataBytesValidated: true,
    });
  });

  it("leaves no transaction staging or backup artifact", async () => {
    const { fs } = await expectValid(twoFiles);
    expect(
      [...fs.files.keys()].some(
        (path) => path.includes("staging") || path.includes("backup"),
      ),
    ).toBe(false);
  });

  it("produces zero diff on a second identical sync", async () => {
    const fs = createMemoryFileSystem();
    await synchronizeGeneratedFiles(root, twoFiles, fs);
    const before = await snapshotProjectState(fs);
    const second = await synchronizeGeneratedFiles(root, twoFiles, fs);
    expect(second.status).toBe("success");
    expect(second.changes).toEqual([]);
    expect(await snapshotProjectState(fs)).toEqual(before);
  });
});
