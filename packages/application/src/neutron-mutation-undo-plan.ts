import {
  canonicalNeutronMutationJson,
  compareNeutronMutationPaths,
  neutronMutationContentDigest,
} from "../../validator/src/neutron-mutation-canonical.js";
import { exactNeutronMutationPathSetsEqual } from "../../validator/src/neutron-mutation-path-set.js";
import type { NeutronMutationUndoPathProjection } from "../../protocol/src/neutron-mutation-undo-result.js";
import type { NeutronMutationTransactionRecord } from "./neutron-mutation-apply-store.js";
import {
  snapshotContentDigest,
  type NeutronMutationUndoSnapshotManifest,
} from "./neutron-mutation-undo-snapshot-manifest.js";
import {
  readUndoSnapshotManifest,
  readUndoSnapshotPayload,
} from "./neutron-mutation-undo-snapshot-store.js";

export interface NeutronMutationUndoPlanFile {
  readonly path: string;
  readonly effect: "restore-updated" | "remove-created";
  readonly expectedContentDigest: string;
  readonly payloadDigest: string | null;
  readonly payload: string | null;
}

export interface NeutronMutationUndoPlan {
  readonly manifestDigest: string;
  readonly pathSetDigest: string;
  readonly lockKey: string;
  readonly files: readonly NeutronMutationUndoPlanFile[];
}

export type UndoPlanLoad =
  | { readonly kind: "ready"; readonly plan: NeutronMutationUndoPlan }
  | { readonly kind: "unavailable" }
  | { readonly kind: "corrupt" };

/**
 * The write set is the validated snapshot. Caller paths are not an input.
 */
export async function loadUndoPlan(input: {
  readonly directory: string;
  readonly record: NeutronMutationTransactionRecord;
  readonly root: string;
  readonly proposalId: string;
  readonly declaredPaths: readonly NeutronMutationUndoPathProjection[];
}): Promise<UndoPlanLoad> {
  const manifest = await readManifest(
    input.directory,
    input.record.transactionId,
  );
  if (manifest === "corrupt") return { kind: "corrupt" };
  if (manifest === undefined) return { kind: "unavailable" };
  if (!boundToRecord(manifest, input)) return { kind: "corrupt" };
  const files = await planFiles(input.directory, manifest);
  if (files === undefined) return { kind: "corrupt" };
  return {
    kind: "ready",
    plan: {
      manifestDigest: manifest.manifestDigest,
      pathSetDigest: pathSetDigest(files),
      lockKey: manifest.lockKey,
      files,
    },
  };
}

export function undoTransactionIdentity(input: {
  readonly originalTransactionId: string;
  readonly snapshotManifestDigest: string;
  readonly attempt: number;
}): string {
  return neutronMutationContentDigest(
    canonicalNeutronMutationJson({
      attempt: input.attempt,
      kind: "neutron-mutation-undo-transaction",
      originalTransactionId: input.originalTransactionId,
      snapshotManifestDigest: input.snapshotManifestDigest,
    }),
  );
}

async function readManifest(
  directory: string,
  transactionId: string,
): Promise<NeutronMutationUndoSnapshotManifest | undefined | "corrupt"> {
  try {
    return await readUndoSnapshotManifest(directory, transactionId);
  } catch {
    return "corrupt";
  }
}

function boundToRecord(
  manifest: NeutronMutationUndoSnapshotManifest,
  input: {
    readonly record: NeutronMutationTransactionRecord;
    readonly root: string;
    readonly proposalId: string;
    readonly declaredPaths: readonly NeutronMutationUndoPathProjection[];
  },
): boolean {
  const record = input.record;
  const claim = record.undoRestoration;
  if (claim === undefined || manifest.state !== "applied-source") return false;
  if (manifest.manifestDigest !== claim.manifestDigest) return false;
  if (manifest.transactionId !== record.transactionId) return false;
  if (
    manifest.root !== input.root ||
    manifest.proposalId !== input.proposalId
  ) {
    return false;
  }
  if (manifest.lockKey !== record.lockKey) return false;
  return effectsMatch(manifest, input.declaredPaths);
}

function effectsMatch(
  manifest: NeutronMutationUndoSnapshotManifest,
  declaredPaths: readonly NeutronMutationUndoPathProjection[],
): boolean {
  if (
    !exactNeutronMutationPathSetsEqual(
      manifest.files.map((file) => file.path),
      declaredPaths.map((path) => path.path),
    )
  ) {
    return false;
  }
  const declared = new Map(declaredPaths.map((path) => [path.path, path]));
  return manifest.files.every((file) => {
    const expected = declared.get(file.path);
    return (
      expected !== undefined &&
      expected.effect === file.effect &&
      expected.expectedContentDigest === file.expectedContentDigest
    );
  });
}

async function planFiles(
  directory: string,
  manifest: NeutronMutationUndoSnapshotManifest,
): Promise<readonly NeutronMutationUndoPlanFile[] | undefined> {
  const files: NeutronMutationUndoPlanFile[] = [];
  for (const file of manifest.files) {
    const loaded = await planFile(directory, manifest.transactionId, file);
    if (loaded === undefined) return undefined;
    files.push(loaded);
  }
  const ordered = [...files];
  ordered.sort((left, right) =>
    compareNeutronMutationPaths(left.path, right.path),
  );
  return ordered;
}

async function planFile(
  directory: string,
  transactionId: string,
  file: NeutronMutationUndoSnapshotManifest["files"][number],
): Promise<NeutronMutationUndoPlanFile | undefined> {
  if (file.effect === "remove-created") {
    if (file.payloadDigest !== null) return undefined;
    return {
      path: file.path,
      effect: file.effect,
      expectedContentDigest: file.expectedContentDigest,
      payloadDigest: null,
      payload: null,
    };
  }
  if (file.payloadDigest === null) return undefined;
  const payload = await readUndoSnapshotPayload({
    directory,
    transactionId,
    payloadDigest: file.payloadDigest,
  });
  if (payload === undefined) return undefined;
  if (snapshotContentDigest(payload) !== file.payloadDigest) return undefined;
  return {
    path: file.path,
    effect: file.effect,
    expectedContentDigest: file.expectedContentDigest,
    payloadDigest: file.payloadDigest,
    payload,
  };
}

function pathSetDigest(files: readonly NeutronMutationUndoPlanFile[]): string {
  return neutronMutationContentDigest(
    canonicalNeutronMutationJson({
      files: files.map((file) => ({
        effect: file.effect,
        expectedContentDigest: file.expectedContentDigest,
        path: file.path,
        payloadDigest: file.payloadDigest,
      })),
    }),
  );
}
