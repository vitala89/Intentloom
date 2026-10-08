import type { NeutronMutationUndoPathProjection } from "../../protocol/src/neutron-mutation-undo-result.js";
import type { NeutronMutationTransactionRecord } from "./neutron-mutation-apply-store.js";
import { exactNeutronMutationPathSetsEqual } from "../../validator/src/neutron-mutation-path-set.js";
import {
  snapshotContentDigest,
  type NeutronMutationUndoSnapshotManifest,
} from "./neutron-mutation-undo-snapshot-manifest.js";
import {
  listUndoSnapshotPayloadDigests,
  readUndoSnapshotManifest,
  readUndoSnapshotPayload,
} from "./neutron-mutation-undo-snapshot-store.js";

export type NeutronMutationUndoSnapshotAssessment =
  | { readonly kind: "absent" }
  | { readonly kind: "corrupt" }
  | {
      readonly kind: "valid";
      readonly paths: readonly NeutronMutationUndoPathProjection[];
    };

/**
 * U1 reads digests and bindings only. Payload bytes are checked, then dropped.
 * A missing manifest on an unclaimed record is ordinary unavailability.
 * Any defect on a claimed record, or a corrupt manifest, fails closed.
 */
export async function assessNeutronMutationUndoSnapshot(input: {
  readonly directory: string;
  readonly record: NeutronMutationTransactionRecord;
  readonly root: string;
  readonly proposalId: string;
  readonly createdPaths: readonly string[];
  readonly updatedPaths: readonly string[];
  readonly unchangedPaths: readonly string[];
  readonly approvedPaths: readonly string[];
  readonly expectedDigests: ReadonlyMap<string, string>;
  readonly preApplyProjectStateDigest: string | undefined;
}): Promise<NeutronMutationUndoSnapshotAssessment> {
  const loaded = await loadManifest(
    input.directory,
    input.record.transactionId,
  );
  if (loaded === "corrupt") return { kind: "corrupt" };
  const claim = input.record.undoRestoration;
  if (loaded === undefined)
    return claim === undefined ? { kind: "absent" } : { kind: "corrupt" };
  if (claim === undefined) return { kind: "corrupt" };
  if (!bindingMatches(loaded, input, claim.manifestDigest)) {
    return { kind: "corrupt" };
  }
  if (!(await payloadsMatch(input.directory, loaded)))
    return { kind: "corrupt" };
  if (!writeSetMatches(loaded, input)) return { kind: "corrupt" };
  return { kind: "valid", paths: projectPaths(loaded) };
}

export async function payloadsMatch(
  directory: string,
  manifest: NeutronMutationUndoSnapshotManifest,
): Promise<boolean> {
  if (!filesAreInternallyBound(manifest)) return false;
  const expected = manifest.files.flatMap((file) =>
    file.payloadDigest === null ? [] : [file.payloadDigest],
  );
  let actual: readonly string[];
  try {
    actual = await listUndoSnapshotPayloadDigests(
      directory,
      manifest.transactionId,
    );
  } catch {
    return false;
  }
  if (!sameDigests(expected, actual)) return false;
  for (const digest of expected) {
    const bytes = await readUndoSnapshotPayload({
      directory,
      transactionId: manifest.transactionId,
      payloadDigest: digest,
    });
    if (bytes === undefined || snapshotContentDigest(bytes) !== digest) {
      return false;
    }
  }
  return true;
}

async function loadManifest(
  directory: string,
  transactionId: string,
): Promise<NeutronMutationUndoSnapshotManifest | undefined | "corrupt"> {
  try {
    return await readUndoSnapshotManifest(directory, transactionId);
  } catch {
    return "corrupt";
  }
}

function bindingMatches(
  manifest: NeutronMutationUndoSnapshotManifest,
  input: {
    readonly record: NeutronMutationTransactionRecord;
    readonly root: string;
    readonly proposalId: string;
    readonly approvedPaths: readonly string[];
    readonly preApplyProjectStateDigest: string | undefined;
  },
  manifestDigest: string,
): boolean {
  const record = input.record;
  return (
    manifest.state === "applied-source" &&
    manifest.manifestDigest === manifestDigest &&
    manifest.transactionId === record.transactionId &&
    manifest.approvalId === record.approvalId &&
    manifest.reviewArtifactDigest === record.reviewArtifactDigest &&
    manifest.planDigest === record.planDigest &&
    manifest.lockKey === record.lockKey &&
    manifest.root === input.root &&
    manifest.proposalId === input.proposalId &&
    manifest.preApplyProjectStateDigest === input.preApplyProjectStateDigest &&
    exactNeutronMutationPathSetsEqual(
      manifest.changedPaths,
      input.approvedPaths,
    )
  );
}

function writeSetMatches(
  manifest: NeutronMutationUndoSnapshotManifest,
  input: {
    readonly createdPaths: readonly string[];
    readonly updatedPaths: readonly string[];
    readonly unchangedPaths: readonly string[];
    readonly expectedDigests: ReadonlyMap<string, string>;
  },
): boolean {
  const expected = [...input.createdPaths, ...input.updatedPaths];
  if (
    !exactNeutronMutationPathSetsEqual(
      manifest.files.map((file) => file.path),
      expected,
    )
  ) {
    return false;
  }
  const unchanged = new Set(input.unchangedPaths);
  const created = new Set(input.createdPaths);
  const updated = new Set(input.updatedPaths);
  return manifest.files.every((file) => {
    if (unchanged.has(file.path)) return false;
    if (created.has(file.path) && file.effect !== "remove-created")
      return false;
    if (updated.has(file.path) && file.effect !== "restore-updated") {
      return false;
    }
    return input.expectedDigests.get(file.path) === file.expectedContentDigest;
  });
}

function filesAreInternallyBound(
  manifest: NeutronMutationUndoSnapshotManifest,
): boolean {
  const seen = new Set<string>();
  for (const file of manifest.files) {
    if (seen.has(file.path) || !manifest.changedPaths.includes(file.path)) {
      return false;
    }
    seen.add(file.path);
    if (file.effect === "restore-updated") {
      if (
        !file.existedBefore ||
        file.preApplyDigest === null ||
        file.payloadDigest !== file.preApplyDigest
      ) {
        return false;
      }
      continue;
    }
    if (
      file.existedBefore ||
      file.preApplyDigest !== null ||
      file.payloadDigest !== null
    ) {
      return false;
    }
  }
  return true;
}

function projectPaths(
  manifest: NeutronMutationUndoSnapshotManifest,
): readonly NeutronMutationUndoPathProjection[] {
  const paths = manifest.files.map((file) =>
    file.effect === "remove-created"
      ? {
          path: file.path,
          effect: "remove-created" as const,
          expectedContentDigest: file.expectedContentDigest,
        }
      : {
          path: file.path,
          effect: "restore-updated" as const,
          expectedContentDigest: file.expectedContentDigest,
          preApplyDigest: file.preApplyDigest ?? "",
        },
  );
  const ordered = [...paths];
  ordered.sort((left, right) => left.path.localeCompare(right.path));
  return ordered;
}

function sameDigests(
  expected: readonly string[],
  actual: readonly string[],
): boolean {
  const left = new Set(expected);
  const right = new Set(actual);
  if (left.size !== right.size) return false;
  for (const digest of left) {
    if (!right.has(digest)) return false;
  }
  return true;
}
