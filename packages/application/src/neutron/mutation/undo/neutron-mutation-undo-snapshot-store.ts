import { mkdir, readdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import {
  acquireDirectoryGate,
  exclusiveCreateUtf8File,
  readUtf8FileIfPresent,
  releaseDirectoryGate,
  replaceUtf8FileAtomic,
} from "../apply/neutron-mutation-apply-durable-fs.js";
import {
  decodeUndoSnapshotManifest,
  encodeUndoSnapshotManifest,
  sealUndoSnapshotManifest,
  undoSnapshotGatePath,
  undoSnapshotHome,
  undoSnapshotManifestPath,
  undoSnapshotPayloadPath,
  type NeutronMutationUndoSnapshotDraft,
  type NeutronMutationUndoSnapshotManifest,
} from "./neutron-mutation-undo-snapshot-manifest.js";

export class UndoSnapshotStoreError extends Error {
  readonly code:
    | "restoration-snapshot-failed"
    | "restoration-snapshot-conflict"
    | "restoration-snapshot-contended";

  constructor(code: UndoSnapshotStoreError["code"], message = code) {
    super(message);
    this.name = "UndoSnapshotStoreError";
    this.code = code;
  }
}

/**
 * Host-private snapshot store under the trusted durable directory.
 * Paths are hashes of the transaction id. Callers cannot choose them.
 * Payload bytes are plaintext at rest. U2 does not encrypt them.
 */
export async function persistPreparedUndoSnapshot(input: {
  readonly directory: string;
  readonly draft: NeutronMutationUndoSnapshotDraft;
  readonly payloads: ReadonlyMap<string, string>;
}): Promise<NeutronMutationUndoSnapshotManifest> {
  const manifest = sealUndoSnapshotManifest(input.draft, "prepared");
  return withSnapshotGate(input.directory, manifest.transactionId, async () => {
    const existing = await readManifest(
      input.directory,
      manifest.transactionId,
    );
    if (existing !== undefined) {
      await assertSameSource(
        input.directory,
        existing,
        manifest,
        input.payloads,
      );
      return existing;
    }
    await writePayloads(
      input.directory,
      manifest.transactionId,
      input.payloads,
    );
    await exclusiveManifest(input.directory, manifest);
    return readRequiredManifest(input.directory, manifest.transactionId);
  });
}

export async function promoteUndoSnapshot(input: {
  readonly directory: string;
  readonly transactionId: string;
  readonly expectedManifestDigest: string;
}): Promise<NeutronMutationUndoSnapshotManifest> {
  return withSnapshotGate(input.directory, input.transactionId, async () => {
    const existing = await readRequiredManifest(
      input.directory,
      input.transactionId,
    );
    if (
      existing.state !== "prepared" ||
      existing.manifestDigest !== input.expectedManifestDigest
    ) {
      throw new UndoSnapshotStoreError("restoration-snapshot-conflict");
    }
    const promoted = sealUndoSnapshotManifest(existing, "applied-source");
    await replaceUtf8FileAtomic(
      undoSnapshotManifestPath(input.directory, input.transactionId),
      encodeUndoSnapshotManifest(promoted),
    );
    return readRequiredManifest(input.directory, input.transactionId);
  });
}

export async function abandonUndoSnapshot(input: {
  readonly directory: string;
  readonly transactionId: string;
}): Promise<void> {
  await withSnapshotGate(input.directory, input.transactionId, async () => {
    const existing = await readManifest(input.directory, input.transactionId);
    if (existing === undefined || existing.state !== "prepared") return;
    const abandoned = sealUndoSnapshotManifest(existing, "abandoned");
    await replaceUtf8FileAtomic(
      undoSnapshotManifestPath(input.directory, input.transactionId),
      encodeUndoSnapshotManifest(abandoned),
    );
  });
}

export async function readUndoSnapshotManifest(
  directory: string,
  transactionId: string,
): Promise<NeutronMutationUndoSnapshotManifest | undefined> {
  return readManifest(directory, transactionId);
}

export async function readUndoSnapshotPayload(input: {
  readonly directory: string;
  readonly transactionId: string;
  readonly payloadDigest: string;
}): Promise<string | undefined> {
  return readUtf8FileIfPresent(
    undoSnapshotPayloadPath(
      input.directory,
      input.transactionId,
      input.payloadDigest,
    ),
  );
}

export async function listUndoSnapshotPayloadDigests(
  directory: string,
  transactionId: string,
): Promise<readonly string[]> {
  const folder = join(undoSnapshotHome(directory, transactionId), "payloads");
  try {
    const entries = await readdir(folder, { withFileTypes: true });
    if (entries.some((entry) => !entry.isFile())) {
      throw new UndoSnapshotStoreError("restoration-snapshot-failed");
    }
    return entries.map((entry) => `sha256:${entry.name}`);
  } catch (error) {
    if (isNotFound(error)) return [];
    if (error instanceof UndoSnapshotStoreError) throw error;
    throw new UndoSnapshotStoreError("restoration-snapshot-failed");
  }
}

async function withSnapshotGate<T>(
  directory: string,
  transactionId: string,
  operation: () => Promise<T>,
): Promise<T> {
  await mkdir(join(directory, "undo-snapshots"), { recursive: true });
  const gate = undoSnapshotGatePath(directory, transactionId);
  if (!(await acquireDirectoryGate(gate))) {
    throw new UndoSnapshotStoreError("restoration-snapshot-contended");
  }
  try {
    return await operation();
  } finally {
    await releaseDirectoryGate(gate);
  }
}

async function writePayloads(
  directory: string,
  transactionId: string,
  payloads: ReadonlyMap<string, string>,
): Promise<void> {
  for (const [digest, bytes] of payloads) {
    const path = undoSnapshotPayloadPath(directory, transactionId, digest);
    await mkdir(dirname(path), { recursive: true });
    const created = await exclusiveCreateUtf8File(path, bytes);
    if (created === "created") continue;
    const current = await readUtf8FileIfPresent(path);
    if (current !== bytes) {
      throw new UndoSnapshotStoreError("restoration-snapshot-conflict");
    }
  }
}

async function exclusiveManifest(
  directory: string,
  manifest: NeutronMutationUndoSnapshotManifest,
): Promise<void> {
  const path = undoSnapshotManifestPath(directory, manifest.transactionId);
  const created = await exclusiveCreateUtf8File(
    path,
    encodeUndoSnapshotManifest(manifest),
  );
  if (created === "created") return;
  throw new UndoSnapshotStoreError("restoration-snapshot-conflict");
}

async function assertSameSource(
  directory: string,
  existing: NeutronMutationUndoSnapshotManifest,
  incoming: NeutronMutationUndoSnapshotManifest,
  payloads: ReadonlyMap<string, string>,
): Promise<void> {
  if (
    existing.state !== "prepared" ||
    existing.manifestDigest !== incoming.manifestDigest
  ) {
    throw new UndoSnapshotStoreError("restoration-snapshot-conflict");
  }
  for (const [digest, bytes] of payloads) {
    const current = await readUndoSnapshotPayload({
      directory,
      transactionId: existing.transactionId,
      payloadDigest: digest,
    });
    if (current !== bytes) {
      throw new UndoSnapshotStoreError("restoration-snapshot-conflict");
    }
  }
}

async function readRequiredManifest(
  directory: string,
  transactionId: string,
): Promise<NeutronMutationUndoSnapshotManifest> {
  const manifest = await readManifest(directory, transactionId);
  if (manifest === undefined) {
    throw new UndoSnapshotStoreError("restoration-snapshot-failed");
  }
  return manifest;
}

async function readManifest(
  directory: string,
  transactionId: string,
): Promise<NeutronMutationUndoSnapshotManifest | undefined> {
  const raw = await readUtf8FileIfPresent(
    undoSnapshotManifestPath(directory, transactionId),
  );
  if (raw === undefined) return undefined;
  try {
    return decodeUndoSnapshotManifest(raw);
  } catch {
    throw new UndoSnapshotStoreError("restoration-snapshot-failed");
  }
}

function isNotFound(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "ENOENT"
  );
}
