import { normalizeOutputPath } from "@intentloom/core";
import { sourceMapPath } from "../generated-file/transaction-metadata.js";
import type { FileSystem } from "../host-file-system.js";
import { inside } from "../project-path.js";

interface OwnershipRecord {
  readonly path: string;
  readonly checksum: string;
  readonly ownership: "aif-owned-generated";
}

export async function ownership(
  root: string,
  fs: FileSystem,
): Promise<Map<string, OwnershipRecord> | null> {
  const path = inside(root, sourceMapPath);
  if (!(await fs.exists(path))) return new Map();
  try {
    const value = JSON.parse(await fs.read(path)) as {
      schemaVersion?: unknown;
      files?: unknown;
    };
    if (value.schemaVersion !== "1" || !Array.isArray(value.files)) return null;
    return ownershipRecords(value.files);
  } catch {
    return null;
  }
}

function ownershipRecords(
  files: readonly unknown[],
): Map<string, OwnershipRecord> | null {
  const records = new Map<string, OwnershipRecord>();
  for (const record of files) {
    const normalized = normalizeOwnershipRecord(record);
    if (normalized === null || records.has(normalized.path)) return null;
    records.set(normalized.path, normalized);
  }
  return records;
}

function normalizeOwnershipRecord(record: unknown): OwnershipRecord | null {
  if (typeof record !== "object" || record === null) return null;
  const item = record as Record<string, unknown>;
  if (
    typeof item.path !== "string" ||
    typeof item.checksum !== "string" ||
    item.ownership !== "aif-owned-generated"
  )
    return null;
  const normalized = normalizeOutputPath(item.path);
  if (normalized !== item.path) return null;
  return {
    path: normalized,
    checksum: item.checksum,
    ownership: "aif-owned-generated",
  };
}
