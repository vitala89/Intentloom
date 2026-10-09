import type { GeneratedFile } from "@intentloom/core";
import type { ApprovedApplyRollbackFile } from "../../../../../protocol/src/approved-apply.js";
import {
  NEUTRON_MUTATION_REVIEW_MAX_AGGREGATE_CONTENT_BYTES,
  NEUTRON_MUTATION_REVIEW_MAX_FILE_CONTENT_BYTES,
} from "../../../../../protocol/src/neutron/mutation/review/neutron-mutation-review-artifact.js";
import { compareNeutronMutationPaths } from "../../../../../validator/src/neutron-mutation-canonical.js";
import {
  ApplyBlockedBeforeWrite,
  approvedApplyPathHasSymlink,
} from "../../../approved-apply-baseline.js";
import type { FileSystem } from "../../../index.js";
import { assertNeutronMutationPathContained } from "../apply/neutron-mutation-containment.js";
import {
  snapshotContentDigest,
  type NeutronMutationUndoSnapshotFile,
} from "./neutron-mutation-undo-snapshot-manifest.js";

export function undoSnapshotBlocked(
  diagnostic: string,
): ApplyBlockedBeforeWrite {
  return new ApplyBlockedBeforeWrite("restoration-snapshot-failed", diagnostic);
}

export async function collectUndoSnapshotFiles(
  targetRoot: string,
  canonicalRoot: string,
  files: readonly GeneratedFile[],
  bindings: ReadonlyMap<string, string>,
  fs: FileSystem,
): Promise<{
  readonly baseline: readonly ApprovedApplyRollbackFile[];
  readonly files: readonly NeutronMutationUndoSnapshotFile[];
  readonly payloads: ReadonlyMap<string, string>;
}> {
  const baseline: ApprovedApplyRollbackFile[] = [];
  const snapshotFiles: NeutronMutationUndoSnapshotFile[] = [];
  const payloads = new Map<string, string>();
  let aggregate = 0;
  for (const file of files) {
    const prior = await readContainedPrior(
      canonicalRoot,
      targetRoot,
      file.path,
      fs,
    );
    baseline.push({ path: file.path, previousContent: prior });
    const expected = bindings.get(file.path);
    if (expected === undefined)
      throw undoSnapshotBlocked("restoration-snapshot-scope");
    const entry = snapshotEntry(file, prior, expected);
    if (entry === undefined) continue;
    if (entry.payload !== undefined) {
      aggregate = accountPayload(aggregate, entry.payload);
      const payloadDigest = entry.file.payloadDigest;
      if (payloadDigest === null) {
        throw undoSnapshotBlocked("restoration-snapshot-failed");
      }
      payloads.set(payloadDigest, entry.payload);
    }
    snapshotFiles.push(entry.file);
  }
  snapshotFiles.sort((left, right) =>
    compareNeutronMutationPaths(left.path, right.path),
  );
  return { baseline, files: snapshotFiles, payloads };
}

function snapshotEntry(
  file: GeneratedFile,
  prior: string | null,
  expectedContentDigest: string,
):
  | {
      readonly file: NeutronMutationUndoSnapshotFile;
      readonly payload?: string;
    }
  | undefined {
  if (prior === null) {
    return {
      file: {
        path: file.path,
        effect: "remove-created",
        existedBefore: false,
        preApplyDigest: null,
        expectedContentDigest,
        payloadDigest: null,
      },
    };
  }
  if (prior === file.content) return undefined;
  const payloadDigest = snapshotContentDigest(prior);
  return {
    payload: prior,
    file: {
      path: file.path,
      effect: "restore-updated",
      existedBefore: true,
      preApplyDigest: payloadDigest,
      expectedContentDigest,
      payloadDigest,
    },
  };
}

async function readContainedPrior(
  canonicalRoot: string,
  targetRoot: string,
  path: string,
  fs: FileSystem,
): Promise<string | null> {
  if (!(await assertNeutronMutationPathContained(canonicalRoot, path, fs))) {
    throw undoSnapshotBlocked("restoration-snapshot-escape");
  }
  if (await approvedApplyPathHasSymlink(targetRoot, path, fs)) {
    throw undoSnapshotBlocked("restoration-snapshot-escape");
  }
  const fullPath = `${targetRoot}/${path}`;
  try {
    if (await fs.isSymbolicLink(fullPath)) {
      throw undoSnapshotBlocked("restoration-snapshot-escape");
    }
    if (!(await fs.exists(fullPath))) return null;
    return await fs.read(fullPath);
  } catch (error) {
    if (error instanceof ApplyBlockedBeforeWrite) throw error;
    throw undoSnapshotBlocked("restoration-snapshot-failed");
  }
}

function accountPayload(aggregate: number, payload: string): number {
  const bytes = Buffer.byteLength(payload, "utf8");
  if (
    bytes > NEUTRON_MUTATION_REVIEW_MAX_FILE_CONTENT_BYTES ||
    aggregate + bytes > NEUTRON_MUTATION_REVIEW_MAX_AGGREGATE_CONTENT_BYTES
  ) {
    throw undoSnapshotBlocked("restoration-snapshot-bound");
  }
  return aggregate + bytes;
}
