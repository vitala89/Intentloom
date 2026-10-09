import type { NeutronMutationApplyResult } from "../../../../../protocol/src/neutron/mutation/apply/neutron-mutation-apply.js";
import { ApplyBlockedBeforeWrite } from "../../../approved-apply-baseline.js";
import { executeTrustedDeclaredPathApply } from "../apply/neutron-mutation-apply-execute.js";
import type { ParsedNeutronMutationApplyRequest } from "../apply/neutron-mutation-apply-parse.js";
import { persistBeforeWrite } from "../apply/neutron-mutation-apply-persist.js";
import type {
  NeutronMutationApprovalStore,
  NeutronMutationTransactionRecord,
} from "../apply/neutron-mutation-apply-store.js";
import type { NeutronMutationApplyInput } from "../apply/neutron-mutation-apply-types.js";
import { persistExecutionWithVerification } from "../apply/neutron-mutation-apply-verify.js";
import { prepareHostUndoSnapshot } from "./neutron-mutation-undo-snapshot-capture.js";
import { restorationClaim } from "./neutron-mutation-undo-snapshot-manifest.js";
import {
  abandonUndoSnapshot,
  promoteUndoSnapshot,
} from "./neutron-mutation-undo-snapshot-store.js";

/**
 * Snapshot, then the existing declared-path Apply. A snapshot failure returns
 * before `executeTrustedDeclaredPathApply`. Failed Apply still uses sync rollback.
 */
export async function applyWithTrustedUndoSnapshot(input: {
  readonly apply: NeutronMutationApplyInput;
  readonly request: ParsedNeutronMutationApplyRequest;
  readonly store: NeutronMutationApprovalStore;
  readonly executing: NeutronMutationTransactionRecord;
  readonly preApplyProjectStateDigest: string;
  readonly currentProjectStateDigest: string;
  readonly hiddenMetadataExistedBefore: Readonly<Record<string, boolean>>;
}): Promise<NeutronMutationApplyResult> {
  const prepared = await prepareHostUndoSnapshot({
    directory: input.apply.durableStateDirectory,
    fs: input.apply.fs,
    request: input.request,
    record: input.executing,
    preApplyProjectStateDigest: input.preApplyProjectStateDigest,
    ...(input.apply.undoSnapshotFault !== undefined
      ? { fault: input.apply.undoSnapshotFault }
      : {}),
  });
  if (prepared.kind === "failed") {
    return persistBeforeWrite(
      input.store,
      input.executing,
      input.request,
      prepared.failureCode,
    );
  }
  try {
    const execution = await executeTrustedDeclaredPathApply({
      transactionId: input.request.transactionId,
      plan: input.request.proposal.plan,
      files: input.request.files,
      fs: input.apply.fs,
      currentProjectStateDigest: input.currentProjectStateDigest,
      ...(input.apply.now !== undefined ? { now: input.apply.now } : {}),
      ...(input.apply.failAt !== undefined
        ? { failAt: input.apply.failAt }
        : {}),
      ...(input.apply.rollbackFailPaths !== undefined
        ? { rollbackFailPaths: input.apply.rollbackFailPaths }
        : {}),
      ...(prepared.kind === "ready" ? { baseline: prepared.baseline } : {}),
    });
    const claim = await claimAppliedSnapshot(
      input,
      prepared,
      execution.applied,
    );
    if (!execution.applied && prepared.kind === "ready") {
      await abandonQuietly(input);
    }
    return persistExecutionWithVerification(
      input.apply,
      input.request,
      input.store,
      input.executing,
      execution,
      input.preApplyProjectStateDigest,
      input.hiddenMetadataExistedBefore,
      claim,
    );
  } catch (error) {
    if (error instanceof ApplyBlockedBeforeWrite) {
      await abandonQuietly(input);
      return persistBeforeWrite(
        input.store,
        input.executing,
        input.request,
        error.failureCode,
      );
    }
    throw error;
  }
}

async function claimAppliedSnapshot(
  input: {
    readonly apply: NeutronMutationApplyInput;
    readonly executing: NeutronMutationTransactionRecord;
  },
  prepared: Awaited<ReturnType<typeof prepareHostUndoSnapshot>>,
  applied: boolean,
) {
  if (!applied || prepared.kind !== "ready") return undefined;
  const directory = input.apply.durableStateDirectory;
  if (directory === undefined) return undefined;
  try {
    const promoted = await promoteUndoSnapshot({
      directory,
      transactionId: input.executing.transactionId,
      expectedManifestDigest: prepared.manifestDigest,
    });
    return restorationClaim(promoted.manifestDigest);
  } catch {
    await abandonQuietly(input);
    return undefined;
  }
}

async function abandonQuietly(input: {
  readonly apply: NeutronMutationApplyInput;
  readonly executing: NeutronMutationTransactionRecord;
}): Promise<void> {
  const directory = input.apply.durableStateDirectory;
  if (directory === undefined) return;
  try {
    await abandonUndoSnapshot({
      directory,
      transactionId: input.executing.transactionId,
    });
  } catch {
    /* Apply's own rollback remains the failure recovery path. */
  }
}
