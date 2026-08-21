import type {
  ExtensionHealthFinding,
  ExtensionLockEntry,
  ExtensionLockfile,
} from "@intentloom/protocol";
import type { FileSystem } from "../propose-and-apply-extension-adoption.js";
import { compareSpecializedPackFindings } from "./specialized-pack-external-health-findings.js";
import {
  inspectDuplicateExternalSpecializedPackIdentities,
  inspectExternalSpecializedPackLockEntry,
  isExternalSpecializedPackCandidate,
  listExternalSpecializedPackRecords,
} from "./specialized-pack-external-health-lock.js";
import {
  canInspectLocalSpecializedPackManifest,
  inspectLocalSpecializedPackManifest,
} from "./specialized-pack-external-health-local.js";

export { isExternalSpecializedPackCandidate } from "./specialized-pack-external-health-lock.js";
export {
  SPECIALIZED_PACK_INTEGRITY_INVALID,
  SPECIALIZED_PACK_LOCK_INVALID,
  SPECIALIZED_PACK_MANIFEST_DIGEST_MISMATCH,
  SPECIALIZED_PACK_MANIFEST_IDENTITY_MISMATCH,
  SPECIALIZED_PACK_MANIFEST_MISSING,
  SPECIALIZED_PACK_PIN_INVALID,
  SPECIALIZED_PACK_TRUST_INVALID,
  isSpecializedPackSecurityFinding,
} from "./specialized-pack-external-health-findings.js";

export interface InspectExternalSpecializedPackHealthOptions {
  readonly root: string;
  readonly lockPath: string;
  readonly fs: FileSystem;
}

async function inspectOneExternalSpecializedPack(
  key: string,
  entry: ExtensionLockEntry,
  lockPath: string,
  options: InspectExternalSpecializedPackHealthOptions,
): Promise<ExtensionHealthFinding[]> {
  const lockFindings = inspectExternalSpecializedPackLockEntry(
    key,
    entry,
    lockPath,
  );
  if (!canInspectLocalSpecializedPackManifest(entry)) return lockFindings;
  const localFindings = await inspectLocalSpecializedPackManifest(entry, {
    root: options.root,
    fs: options.fs,
  });
  return [...lockFindings, ...localFindings];
}

export async function inspectExternalSpecializedPackHealth(
  lockfile: ExtensionLockfile,
  options: InspectExternalSpecializedPackHealthOptions,
): Promise<readonly ExtensionHealthFinding[]> {
  const records = listExternalSpecializedPackRecords(lockfile);
  const findings: ExtensionHealthFinding[] = [
    ...inspectDuplicateExternalSpecializedPackIdentities(
      records,
      options.lockPath,
    ),
  ];
  for (const record of records) {
    if (!isExternalSpecializedPackCandidate(record.entry)) continue;
    findings.push(
      ...(await inspectOneExternalSpecializedPack(
        record.key,
        record.entry,
        options.lockPath,
        options,
      )),
    );
  }
  return findings.sort(compareSpecializedPackFindings);
}
