import type {
  ExtensionHealthFinding,
  ExtensionLockEntry,
  ExtensionLockfile,
} from "@intentloom/protocol";
import { QUALITY_SPECIALIZED_PACK_SCHEMA_URN } from "@intentloom/protocol";
import {
  SPECIALIZED_PACK_LOCK_INVALID,
  specializedPackFinding,
} from "./specialized-pack-external-health-findings.js";
import {
  inspectSpecializedPackIdentityAndSchema,
  inspectSpecializedPackPersistedSource,
  inspectSpecializedPackTrustMetadata,
} from "./specialized-pack-external-health-lock-fields.js";

export function isExternalSpecializedPackCandidate(
  entry: ExtensionLockEntry,
): boolean {
  if (entry.manifestSchemaVersion === QUALITY_SPECIALIZED_PACK_SCHEMA_URN) {
    return true;
  }
  return (
    entry.category === "policy-pack" && entry.installationType === "referenced"
  );
}

export function inspectExternalSpecializedPackLockEntry(
  key: string,
  entry: ExtensionLockEntry,
  path: string,
): ExtensionHealthFinding[] {
  return [
    ...inspectSpecializedPackIdentityAndSchema(key, entry, path),
    ...inspectSpecializedPackPersistedSource(entry, path),
    ...inspectSpecializedPackTrustMetadata(entry, path),
  ];
}

export function inspectDuplicateExternalSpecializedPackIdentities(
  records: readonly {
    readonly key: string;
    readonly entry: ExtensionLockEntry;
  }[],
  path: string,
): ExtensionHealthFinding[] {
  const grouped = new Map<string, string[]>();
  for (const record of records) {
    if (!isExternalSpecializedPackCandidate(record.entry)) continue;
    const id = record.entry.extensionId;
    const keys = grouped.get(id) ?? [];
    keys.push(record.key);
    grouped.set(id, keys);
  }
  const findings: ExtensionHealthFinding[] = [];
  for (const [id, keys] of [...grouped.entries()].sort(([left], [right]) =>
    left.localeCompare(right),
  )) {
    if (keys.length < 2) continue;
    findings.push(
      specializedPackFinding(
        id,
        SPECIALIZED_PACK_LOCK_INVALID,
        "error",
        path,
        `${id}: the same specialized-pack id is bound to contradictory active entries`,
        "Repair or replace the specialized-pack lock entry after explicit review.",
      ),
    );
  }
  return findings;
}

export function listExternalSpecializedPackRecords(
  lockfile: ExtensionLockfile,
): readonly {
  readonly key: string;
  readonly entry: ExtensionLockEntry;
}[] {
  return Object.entries(lockfile.extensions)
    .map(([key, entry]) => ({ key, entry }))
    .sort((left, right) => {
      const id = left.entry.extensionId.localeCompare(right.entry.extensionId);
      return id !== 0 ? id : left.key.localeCompare(right.key);
    });
}
