import { adapterVersion } from "@intentloom/adapters";
import {
  INTENTLOOM_VERSION,
  checksum,
  type AdapterName,
  type GeneratedFile,
} from "@intentloom/core";

export const lockPath = ".aif/manifest.lock.json";
export const sourceMapPath = ".aif/source-map.json";
export const metadataFormatVersion = "1";
export const adapterOutputVersion = adapterVersion;
const transactionAdapterId = "aif:generated-files";

export interface TransactionMetadata {
  readonly manifest: string;
  readonly sourceMap: string;
}

interface MetadataPins {
  readonly profile: string;
  readonly adapters: readonly AdapterName[];
  readonly sourceHashes: readonly {
    readonly id: string;
    readonly checksum: string;
  }[];
}

interface SharedTransactionIdentity {
  readonly metadataFormatVersion: string;
  readonly frameworkVersion: string;
  readonly adapterOutputVersion: string;
  readonly adapterId: string;
  readonly canonicalSourceId: string;
}

function defaultMetadataPins(): MetadataPins {
  return {
    profile: "generic",
    adapters: ["codex"],
    sourceHashes: [
      {
        id: "transaction:generated",
        checksum: checksum("transaction:generated"),
      },
    ],
  };
}

function canonicalSourceIdentity(files: readonly GeneratedFile[]): string {
  return checksum(
    JSON.stringify([...new Set(files.flatMap((file) => file.sources))].sort()),
  );
}

function sharedTransactionIdentity(
  canonicalSourceId: string,
): SharedTransactionIdentity {
  return {
    metadataFormatVersion,
    frameworkVersion: INTENTLOOM_VERSION,
    adapterOutputVersion,
    adapterId: transactionAdapterId,
    canonicalSourceId,
  };
}

function manifestDocument(
  files: readonly GeneratedFile[],
  pins: MetadataPins,
  sharedMetadata: SharedTransactionIdentity,
) {
  return {
    schemaVersion: metadataFormatVersion,
    lockVersion: metadataFormatVersion,
    ownershipPolicy: "aif-owned-generated",
    profile: pins.profile,
    schemaVersions: {
      config: "1",
      manifestLock: "1",
      sourceMap: "1",
      planning: "1",
      agentSkillPolicy: "1",
    },
    adapters: [...(pins.adapters ?? [])]
      .sort()
      .map((id) => ({ id, version: adapterOutputVersion })),
    sourceHashes: [...(pins.sourceHashes ?? [])].sort((left, right) =>
      left.id.localeCompare(right.id),
    ),
    ...sharedMetadata,
    generated: files.map(({ path, checksum: fileChecksum }) => ({
      path,
      checksum: fileChecksum,
    })),
  };
}

function sourceMapDocument(
  files: readonly GeneratedFile[],
  sharedMetadata: SharedTransactionIdentity,
) {
  return {
    schemaVersion: metadataFormatVersion,
    ...sharedMetadata,
    files: files.map(({ path, checksum: fileChecksum, sources }) => ({
      path,
      checksum: fileChecksum,
      sources,
      ownership: "aif-owned-generated",
    })),
  };
}

export function buildTransactionMetadata(
  files: readonly GeneratedFile[],
  pins: MetadataPins = defaultMetadataPins(),
): TransactionMetadata {
  const sharedMetadata = sharedTransactionIdentity(
    canonicalSourceIdentity(files),
  );
  return {
    manifest: `${JSON.stringify(manifestDocument(files, pins, sharedMetadata), null, 2)}\n`,
    sourceMap: `${JSON.stringify(sourceMapDocument(files, sharedMetadata), null, 2)}\n`,
  };
}
