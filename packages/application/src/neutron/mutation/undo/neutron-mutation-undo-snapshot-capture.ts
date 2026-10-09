import type { ApprovedApplyRollbackFile } from "../../../../../protocol/src/approved-apply.js";
import type { NeutronMutationApplyFailureCode } from "../../../../../protocol/src/neutron-mutation-apply.js";
import { compareNeutronMutationPaths } from "../../../../../validator/src/neutron-mutation-canonical.js";
import { exactNeutronMutationPathSetsEqual } from "../../../../../validator/src/neutron-mutation-path-set.js";
import {
  ApplyBlockedBeforeWrite,
  assertApprovedApplyBaselineCurrent,
} from "../../../approved-apply-baseline.js";
import type { FileSystem } from "../../../index.js";
import type { ParsedNeutronMutationApplyRequest } from "../apply/neutron-mutation-apply-parse.js";
import type { NeutronMutationTransactionRecord } from "../apply/neutron-mutation-apply-store.js";
import { canonicalizeNeutronMutationRoot } from "../apply/neutron-mutation-containment.js";
import {
  collectUndoSnapshotFiles,
  undoSnapshotBlocked,
} from "./neutron-mutation-undo-snapshot-files.js";
import {
  NEUTRON_MUTATION_UNDO_SNAPSHOT_SCHEMA_URN,
  type NeutronMutationUndoSnapshotDraft,
} from "./neutron-mutation-undo-snapshot-manifest.js";
import {
  abandonUndoSnapshot,
  persistPreparedUndoSnapshot,
  UndoSnapshotStoreError,
} from "./neutron-mutation-undo-snapshot-store.js";
import { payloadsMatch } from "./neutron-mutation-undo-snapshot-validate.js";
import { digestNeutronMutationObservedState } from "../verification/neutron-mutation-verification-state.js";

export type UndoSnapshotPreparation =
  | { readonly kind: "skipped" }
  | {
      readonly kind: "ready";
      readonly manifestDigest: string;
      readonly baseline: readonly ApprovedApplyRollbackFile[];
    }
  | {
      readonly kind: "failed";
      readonly failureCode: NeutronMutationApplyFailureCode;
    };

/**
 * Captures and durably stores restoration material before any project write.
 * A missing trusted directory skips the claim. Production host Apply always
 * supplies `durableStateDirectory`.
 */
export async function prepareHostUndoSnapshot(input: {
  readonly directory: string | undefined;
  readonly fs: FileSystem;
  readonly request: ParsedNeutronMutationApplyRequest;
  readonly record: NeutronMutationTransactionRecord;
  readonly preApplyProjectStateDigest: string;
  readonly fault?: "persist" | "validate";
}): Promise<UndoSnapshotPreparation> {
  const directory = input.directory?.trim() ?? "";
  if (directory === "") return { kind: "skipped" };
  try {
    return await prepareInDirectory(input, directory);
  } catch (error) {
    return failureFrom(error);
  }
}

async function prepareInDirectory(
  input: {
    readonly fs: FileSystem;
    readonly request: ParsedNeutronMutationApplyRequest;
    readonly record: NeutronMutationTransactionRecord;
    readonly preApplyProjectStateDigest: string;
    readonly fault?: "persist" | "validate";
  },
  directory: string,
): Promise<UndoSnapshotPreparation> {
  const captured = await captureStrictBaseline(input);
  await assertObservedDigest(input);
  if (input.fault === "persist") {
    throw new ApplyBlockedBeforeWrite(
      "restoration-snapshot-failed",
      "restoration-snapshot-failed",
    );
  }
  const persisted = await persistPreparedUndoSnapshot({
    directory,
    draft: captured.draft,
    payloads: captured.payloads,
  });
  try {
    if (
      input.fault === "validate" ||
      !(await payloadsMatch(directory, persisted))
    ) {
      throw undoSnapshotBlocked("restoration-snapshot-invalid");
    }
    await assertApprovedApplyBaselineCurrent(
      input.request.proposal.plan.targetRoot,
      captured.baseline,
      input.fs,
    );
    await assertObservedDigest(input);
  } catch (error) {
    await abandonQuietly(directory, input.record.transactionId);
    throw error;
  }
  return {
    kind: "ready",
    manifestDigest: persisted.manifestDigest,
    baseline: captured.baseline,
  };
}

async function captureStrictBaseline(input: {
  readonly fs: FileSystem;
  readonly request: ParsedNeutronMutationApplyRequest;
  readonly record: NeutronMutationTransactionRecord;
  readonly preApplyProjectStateDigest: string;
}): Promise<{
  readonly baseline: readonly ApprovedApplyRollbackFile[];
  readonly draft: NeutronMutationUndoSnapshotDraft;
  readonly payloads: ReadonlyMap<string, string>;
}> {
  const request = input.request;
  const targetRoot = request.proposal.plan.targetRoot;
  const canonical = await canonicalizeNeutronMutationRoot(targetRoot, input.fs);
  if (canonical === undefined || canonical !== input.record.lockKey) {
    throw undoSnapshotBlocked("restoration-snapshot-escape");
  }
  assertApprovedFileSet(request);
  const bindings = new Map(
    request.artifact.fileBindings.map((binding) => [
      binding.path,
      binding.contentDigest,
    ]),
  );
  const collected = await collectUndoSnapshotFiles(
    targetRoot,
    canonical,
    request.files,
    bindings,
    input.fs,
  );
  const changedPaths = [...request.artifact.changedPaths];
  changedPaths.sort(compareNeutronMutationPaths);
  return {
    baseline: collected.baseline,
    payloads: collected.payloads,
    draft: {
      schemaVersion: NEUTRON_MUTATION_UNDO_SNAPSHOT_SCHEMA_URN,
      transactionId: input.record.transactionId,
      approvalId: input.record.approvalId,
      proposalId: request.proposal.proposalId,
      reviewArtifactDigest: request.artifact.artifactDigest,
      planDigest: request.artifact.planDigest,
      root: request.proposal.root,
      lockKey: input.record.lockKey,
      preApplyProjectStateDigest: input.preApplyProjectStateDigest,
      changedPaths,
      files: collected.files,
    },
  };
}

function assertApprovedFileSet(
  request: ParsedNeutronMutationApplyRequest,
): void {
  const approved = request.artifact.changedPaths;
  try {
    if (
      !exactNeutronMutationPathSetsEqual(
        request.files.map((file) => file.path),
        approved,
      ) ||
      !exactNeutronMutationPathSetsEqual(
        request.proposal.plan.changedPaths,
        approved,
      )
    ) {
      throw undoSnapshotBlocked("restoration-snapshot-scope");
    }
  } catch (error) {
    if (error instanceof ApplyBlockedBeforeWrite) throw error;
    throw undoSnapshotBlocked("restoration-snapshot-scope");
  }
}

async function assertObservedDigest(input: {
  readonly fs: FileSystem;
  readonly request: ParsedNeutronMutationApplyRequest;
  readonly preApplyProjectStateDigest: string;
}): Promise<void> {
  const observed = await digestNeutronMutationObservedState({
    root: input.request.proposal.plan.targetRoot,
    fs: input.fs,
    paths: input.request.artifact.changedPaths,
  });
  if (observed !== input.preApplyProjectStateDigest) {
    throw new ApplyBlockedBeforeWrite(
      "project-stale",
      "restoration-baseline-changed",
    );
  }
}

async function abandonQuietly(
  directory: string,
  transactionId: string,
): Promise<void> {
  try {
    await abandonUndoSnapshot({ directory, transactionId });
  } catch {
    /* The before-write failure is already authoritative. */
  }
}

function failureFrom(error: unknown): {
  readonly kind: "failed";
  readonly failureCode: NeutronMutationApplyFailureCode;
} {
  if (error instanceof ApplyBlockedBeforeWrite) {
    return { kind: "failed", failureCode: error.failureCode };
  }
  if (error instanceof UndoSnapshotStoreError) {
    return { kind: "failed", failureCode: "restoration-snapshot-failed" };
  }
  return { kind: "failed", failureCode: "restoration-snapshot-failed" };
}
