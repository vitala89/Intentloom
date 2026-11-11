import { normalizeStoredPath } from "@intentloom/core";
import { destinationCollisionKey } from "../destination-collisions.js";
import type {
  InvalidPostWriteValidation,
  PostWriteCorruptionCode,
} from "./transaction-contracts.js";
import { lockPath, sourceMapPath } from "./transaction-metadata.js";

export type MetadataObject = Record<string, unknown>;
export type MetadataRecord = Record<string, unknown>;

export function invalidPostWriteState(
  code: PostWriteCorruptionCode,
  affectedPaths: readonly string[],
  affectedIdentifiers: readonly string[] = [],
): InvalidPostWriteValidation {
  return {
    status: "invalid",
    code,
    affectedPaths: [...new Set(affectedPaths)].sort(),
    affectedIdentifiers: [...new Set(affectedIdentifiers)].sort(),
  };
}

export function metadataRecords(
  value: MetadataObject,
  key: "generated" | "files",
): MetadataRecord[] {
  return Array.isArray(value[key])
    ? (value[key] as MetadataRecord[]).filter(
        (record) => typeof record === "object" && record !== null,
      )
    : [];
}

function pathFailure(
  metadata: "manifest" | "source-map",
  records: readonly MetadataRecord[],
): InvalidPostWriteValidation | null {
  const metadataPath = metadata === "manifest" ? lockPath : sourceMapPath;
  const absoluteCode = `${metadata}-absolute-path` as PostWriteCorruptionCode;
  const escapeCode = `${metadata}-path-escape` as PostWriteCorruptionCode;
  for (const [index, record] of records.entries()) {
    const path = record.path;
    const identifier = `${metadata}.${index}`;
    if (
      typeof path !== "string" ||
      path.startsWith("/") ||
      /^[A-Za-z]:[\\/]/u.test(path)
    )
      return invalidPostWriteState(absoluteCode, [metadataPath], [identifier]);
    try {
      if (normalizeStoredPath(path) !== path)
        return invalidPostWriteState(escapeCode, [metadataPath], [identifier]);
    } catch {
      return invalidPostWriteState(escapeCode, [metadataPath], [identifier]);
    }
  }
  return null;
}

function duplicateFailure(
  metadata: "manifest" | "source-map",
  records: readonly MetadataRecord[],
): InvalidPostWriteValidation | null {
  const metadataPath = metadata === "manifest" ? lockPath : sourceMapPath;
  const exact = new Set<string>();
  for (const [index, record] of records.entries()) {
    if (typeof record.path !== "string") continue;
    if (exact.has(record.path))
      return invalidPostWriteState(
        metadata === "manifest"
          ? "manifest-duplicate-destination"
          : "source-map-duplicate-ownership",
        [metadataPath, record.path],
        [`${metadata}.${index}`],
      );
    exact.add(record.path);
  }
  const normalized = new Map<string, string>();
  for (const [index, record] of records.entries()) {
    if (typeof record.path !== "string") continue;
    const key = destinationCollisionKey(record.path);
    const previous = normalized.get(key);
    if (previous !== undefined && previous !== record.path)
      return invalidPostWriteState(
        "normalized-destination-duplicate",
        [metadataPath, previous, record.path],
        [`${metadata}.${index}`, key],
      );
    normalized.set(key, record.path);
  }
  return null;
}

function missingIdentity(
  manifest: MetadataObject,
  sourceMap: MetadataObject,
  key: "adapterId" | "canonicalSourceId",
  code: "adapter-id-missing" | "canonical-source-id-missing",
): InvalidPostWriteValidation | null {
  const affected: string[] = [];
  if (typeof manifest[key] !== "string" || manifest[key] === "")
    affected.push(lockPath);
  if (typeof sourceMap[key] !== "string" || sourceMap[key] === "")
    affected.push(sourceMapPath);
  return affected.length === 0
    ? null
    : invalidPostWriteState(code, affected, [key]);
}

export function parseCommittedMetadata(
  committedManifestBytes: string,
  committedSourceMapBytes: string,
):
  | { readonly manifest: MetadataObject; readonly sourceMap: MetadataObject }
  | InvalidPostWriteValidation {
  let manifest: MetadataObject;
  try {
    manifest = JSON.parse(committedManifestBytes) as MetadataObject;
  } catch {
    return invalidPostWriteState("manifest-json-malformed", [lockPath]);
  }
  let sourceMap: MetadataObject;
  try {
    sourceMap = JSON.parse(committedSourceMapBytes) as MetadataObject;
  } catch {
    return invalidPostWriteState("source-map-json-malformed", [sourceMapPath]);
  }
  return { manifest, sourceMap };
}

export function identityAgreement(
  manifest: MetadataObject,
  sourceMap: MetadataObject,
): InvalidPostWriteValidation | null {
  const adapterMissing = missingIdentity(
    manifest,
    sourceMap,
    "adapterId",
    "adapter-id-missing",
  );
  if (adapterMissing) return adapterMissing;
  if (manifest.adapterId !== sourceMap.adapterId)
    return invalidPostWriteState(
      "adapter-id-mismatch",
      [lockPath, sourceMapPath],
      ["adapterId"],
    );
  const canonicalMissing = missingIdentity(
    manifest,
    sourceMap,
    "canonicalSourceId",
    "canonical-source-id-missing",
  );
  if (canonicalMissing) return canonicalMissing;
  if (manifest.canonicalSourceId !== sourceMap.canonicalSourceId)
    return invalidPostWriteState(
      "canonical-source-id-mismatch",
      [lockPath, sourceMapPath],
      ["canonicalSourceId"],
    );
  return null;
}

function sourceMapOwnershipClassification(
  sourceMapRecords: readonly MetadataRecord[],
): InvalidPostWriteValidation | null {
  for (const [index, record] of sourceMapRecords.entries())
    if (record.ownership !== "aif-owned-generated")
      return invalidPostWriteState(
        "ownership-classification-invalid",
        [sourceMapPath, String(record.path ?? "")].filter(Boolean),
        [`source-map.${index}`, "ownership"],
      );
  return null;
}

export function ownershipPathAgreement(
  manifest: MetadataObject,
  manifestRecords: readonly MetadataRecord[],
  sourceMapRecords: readonly MetadataRecord[],
): InvalidPostWriteValidation | null {
  if (manifest.ownershipPolicy !== "aif-owned-generated")
    return invalidPostWriteState(
      "ownership-classification-invalid",
      [lockPath],
      ["ownershipPolicy"],
    );
  const manifestPathFailure = pathFailure("manifest", manifestRecords);
  if (manifestPathFailure) return manifestPathFailure;
  const sourceMapPathFailure = pathFailure("source-map", sourceMapRecords);
  if (sourceMapPathFailure) return sourceMapPathFailure;
  const manifestDuplicate = duplicateFailure("manifest", manifestRecords);
  if (manifestDuplicate) return manifestDuplicate;
  const sourceMapDuplicate = duplicateFailure("source-map", sourceMapRecords);
  if (sourceMapDuplicate) return sourceMapDuplicate;
  return sourceMapOwnershipClassification(sourceMapRecords);
}
