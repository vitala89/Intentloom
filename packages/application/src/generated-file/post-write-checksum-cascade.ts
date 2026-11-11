import { checksum, type GeneratedFile } from "@intentloom/core";
import type { FileSystem } from "../host-file-system.js";
import { inside } from "../project-path.js";
import {
  invalidPostWriteState,
  type MetadataRecord,
} from "./post-write-metadata-checks.js";
import type { InvalidPostWriteValidation } from "./transaction-contracts.js";
import { lockPath, sourceMapPath } from "./transaction-metadata.js";

function recordsByPath(
  records: readonly MetadataRecord[],
): Map<string, MetadataRecord> {
  return new Map(
    records
      .filter((record) => typeof record.path === "string")
      .map((record) => [record.path as string, record]),
  );
}

export async function checksumCascade(
  root: string,
  files: readonly GeneratedFile[],
  fs: FileSystem,
  manifestRecords: readonly MetadataRecord[],
  sourceMapRecords: readonly MetadataRecord[],
): Promise<InvalidPostWriteValidation | null> {
  const manifestByPath = recordsByPath(manifestRecords);
  const sourceMapByPath = recordsByPath(sourceMapRecords);
  for (const file of files) {
    const actualChecksum = checksum(await fs.read(inside(root, file.path)));
    const manifestChecksum = manifestByPath.get(file.path)!.checksum;
    const sourceMapChecksum = sourceMapByPath.get(file.path)!.checksum;
    const mismatch = checksumMismatch(
      file,
      actualChecksum,
      manifestChecksum,
      sourceMapChecksum,
    );
    if (mismatch) return mismatch;
  }
  return null;
}

function checksumMismatch(
  file: GeneratedFile,
  actualChecksum: string,
  manifestChecksum: unknown,
  sourceMapChecksum: unknown,
): InvalidPostWriteValidation | null {
  if (actualChecksum === file.checksum && sourceMapChecksum !== actualChecksum)
    return invalidPostWriteState(
      "generated-checksum-mismatch",
      [sourceMapPath, file.path],
      [file.path],
    );
  if (
    actualChecksum === file.checksum &&
    manifestChecksum !== sourceMapChecksum
  )
    return invalidPostWriteState(
      "manifest-source-map-checksum-mismatch",
      [lockPath, sourceMapPath, file.path],
      [file.path],
    );
  if (
    actualChecksum !== file.checksum &&
    manifestChecksum !== actualChecksum &&
    manifestChecksum === sourceMapChecksum
  )
    return invalidPostWriteState(
      "manifest-generated-checksum-mismatch",
      [lockPath, file.path],
      [file.path],
    );
  if (sourceMapChecksum !== actualChecksum)
    return invalidPostWriteState(
      "generated-checksum-mismatch",
      [sourceMapPath, file.path],
      [file.path],
    );
  if (manifestChecksum !== sourceMapChecksum)
    return invalidPostWriteState(
      "manifest-source-map-checksum-mismatch",
      [lockPath, sourceMapPath, file.path],
      [file.path],
    );
  if (manifestChecksum !== actualChecksum)
    return invalidPostWriteState(
      "manifest-generated-checksum-mismatch",
      [lockPath, file.path],
      [file.path],
    );
  if (actualChecksum !== file.checksum)
    return invalidPostWriteState(
      "committed-generated-bytes-mismatch",
      [file.path],
      [file.path],
    );
  return null;
}
