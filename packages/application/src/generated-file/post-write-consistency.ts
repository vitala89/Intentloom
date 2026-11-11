import type { GeneratedFile } from "@intentloom/core";
import type { FileSystem } from "../host-file-system.js";
import { inside } from "../project-path.js";
import { checksumCascade } from "./post-write-checksum-cascade.js";
import {
  invalidPostWriteState,
  metadataRecords,
  ownershipPathAgreement,
  identityAgreement,
  parseCommittedMetadata,
  type MetadataRecord,
} from "./post-write-metadata-checks.js";
import { versionAgreement } from "./post-write-version-checks.js";
import type {
  InvalidPostWriteValidation,
  PostWriteValidationResult,
  ValidPostWriteValidation,
} from "./transaction-contracts.js";
import { lockPath, sourceMapPath } from "./transaction-metadata.js";

export class PostWriteValidationFailure extends Error {
  constructor(readonly validation: InvalidPostWriteValidation) {
    super(validation.code);
  }
}

export interface PostWriteValidationInput {
  readonly root: string;
  readonly files: readonly GeneratedFile[];
  readonly manifestBytes: string;
  readonly sourceMapBytes: string;
  readonly createdGeneratedPaths: ReadonlySet<string>;
  readonly fs: FileSystem;
}

function recordsByPath(
  records: readonly MetadataRecord[],
): Map<string, MetadataRecord> {
  return new Map(
    records
      .filter((record) => typeof record.path === "string")
      .map((record) => [record.path as string, record]),
  );
}

async function destinationPresence(
  input: PostWriteValidationInput,
  manifestRecords: readonly MetadataRecord[],
  sourceMapRecords: readonly MetadataRecord[],
): Promise<InvalidPostWriteValidation | null> {
  const plannedByPath = new Map(input.files.map((file) => [file.path, file]));
  for (const record of manifestRecords) {
    const path = record.path as string;
    if (!(await input.fs.exists(inside(input.root, path))))
      return invalidPostWriteState(
        "manifest-destination-missing",
        [lockPath, path],
        [path],
      );
  }
  for (const record of sourceMapRecords) {
    const path = record.path as string;
    if (!(await input.fs.exists(inside(input.root, path))))
      return invalidPostWriteState(
        plannedByPath.has(path)
          ? "source-map-destination-missing"
          : sourceMapRecords.length > input.files.length
            ? "ownership-record-without-generated-file"
            : "source-map-destination-missing",
        [sourceMapPath, path],
        [path],
      );
  }
  return null;
}

function plannedEntryPresence(
  input: PostWriteValidationInput,
  manifestRecords: readonly MetadataRecord[],
  sourceMapRecords: readonly MetadataRecord[],
): InvalidPostWriteValidation | null {
  const manifestByPath = recordsByPath(manifestRecords);
  const sourceMapByPath = recordsByPath(sourceMapRecords);
  for (const file of input.files) {
    if (!manifestByPath.has(file.path))
      return invalidPostWriteState(
        "manifest-entry-missing",
        [lockPath, file.path],
        [file.path],
      );
    if (!sourceMapByPath.has(file.path))
      return invalidPostWriteState(
        input.createdGeneratedPaths.has(file.path)
          ? "generated-file-without-ownership"
          : "source-map-entry-missing",
        [sourceMapPath, file.path],
        [file.path],
      );
  }
  return null;
}

function committedMetadataBytes(
  committedManifestBytes: string,
  committedSourceMapBytes: string,
  manifestBytes: string,
  sourceMapBytes: string,
): InvalidPostWriteValidation | null {
  if (committedManifestBytes !== manifestBytes)
    return invalidPostWriteState("committed-manifest-bytes-mismatch", [
      lockPath,
    ]);
  if (committedSourceMapBytes !== sourceMapBytes)
    return invalidPostWriteState("committed-source-map-bytes-mismatch", [
      sourceMapPath,
    ]);
  return null;
}

function validCommittedOwnership(
  fileCount: number,
  manifestCount: number,
  sourceMapCount: number,
): ValidPostWriteValidation {
  return {
    status: "valid",
    checkedGeneratedFileCount: fileCount,
    checkedManifestEntryCount: manifestCount,
    checkedSourceMapEntryCount: sourceMapCount,
    checksumsValidated: true,
    ownershipValidated: true,
    pathsValidated: true,
    versionsValidated: true,
    metadataBytesValidated: true,
  };
}

export async function validateCommittedOwnershipState(
  input: PostWriteValidationInput,
): Promise<PostWriteValidationResult> {
  const committedManifestBytes = await input.fs.read(
    inside(input.root, lockPath),
  );
  const committedSourceMapBytes = await input.fs.read(
    inside(input.root, sourceMapPath),
  );
  const parsed = parseCommittedMetadata(
    committedManifestBytes,
    committedSourceMapBytes,
  );
  if ("status" in parsed) return parsed;
  const identity = identityAgreement(parsed.manifest, parsed.sourceMap);
  if (identity) return identity;
  const versions = versionAgreement(parsed.manifest, parsed.sourceMap);
  if (versions) return versions;
  const manifestRecords = metadataRecords(parsed.manifest, "generated");
  const sourceMapRecords = metadataRecords(parsed.sourceMap, "files");
  const ownership = ownershipPathAgreement(
    parsed.manifest,
    manifestRecords,
    sourceMapRecords,
  );
  if (ownership) return ownership;
  const present = await destinationPresence(
    input,
    manifestRecords,
    sourceMapRecords,
  );
  if (present) return present;
  const entries = plannedEntryPresence(
    input,
    manifestRecords,
    sourceMapRecords,
  );
  if (entries) return entries;
  const sums = await checksumCascade(
    input.root,
    input.files,
    input.fs,
    manifestRecords,
    sourceMapRecords,
  );
  if (sums) return sums;
  const bytes = committedMetadataBytes(
    committedManifestBytes,
    committedSourceMapBytes,
    input.manifestBytes,
    input.sourceMapBytes,
  );
  if (bytes) return bytes;
  return validCommittedOwnership(
    input.files.length,
    manifestRecords.length,
    sourceMapRecords.length,
  );
}
