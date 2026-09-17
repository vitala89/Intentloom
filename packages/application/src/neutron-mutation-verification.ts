import type { NeutronMutationReviewFileBinding } from "../../protocol/src/neutron-mutation-review-artifact.js";
import type { NeutronMutationRollbackProjection } from "../../protocol/src/neutron-mutation-verification.js";
import type { NeutronMutationVerificationEvidence } from "../../protocol/src/neutron-mutation-verification.js";
import { verifyNeutronMutationCommittedBytes } from "./neutron-mutation-verification-bytes.js";
import { buildNeutronMutationVerificationEvidence } from "./neutron-mutation-verification-build.js";
import { verifyNeutronMutationWriteSet } from "./neutron-mutation-verification-paths.js";
import { digestNeutronMutationObservedState } from "./neutron-mutation-verification-state.js";
import type { FileSystem } from "./index.js";

export interface NeutronMutationVerificationInput {
  readonly transactionId: string;
  readonly approvalId: string;
  readonly reviewArtifactDigest: string;
  readonly planDigest: string;
  readonly projectId: string;
  readonly root: string;
  readonly fs: FileSystem;
  readonly preApplyProjectStateDigest: string;
  readonly committedProjectStateDigest?: string;
  readonly approvedChangedPaths: readonly string[];
  readonly createdPaths: readonly string[];
  readonly updatedPaths: readonly string[];
  readonly unchangedPaths: readonly string[];
  readonly fileBindings: readonly NeutronMutationReviewFileBinding[];
  readonly applied: boolean;
  readonly rollback: NeutronMutationRollbackProjection;
  readonly hiddenMetadataExistedBefore: Readonly<Record<string, boolean>>;
  readonly now?: () => number;
}

export async function verifyNeutronMutationResult(
  input: NeutronMutationVerificationInput,
): Promise<NeutronMutationVerificationEvidence> {
  const observedDigest = await digestNeutronMutationObservedState({
    root: input.root,
    fs: input.fs,
    paths: input.approvedChangedPaths,
  });
  const extraDiagnostics = concurrentEditDiagnostics(input, observedDigest);
  const rollback = input.applied
    ? input.rollback
    : await verifyRollbackState(input, observedDigest);
  const byteChecks = input.applied
    ? await verifyNeutronMutationCommittedBytes({
        root: input.root,
        fs: input.fs,
        fileBindings: input.fileBindings,
      })
    : input.fileBindings.map((binding) => ({
        path: binding.path,
        expectedContentDigest: binding.contentDigest,
        existed: false,
        matched: false,
      }));
  const accountedPaths = [
    ...input.createdPaths,
    ...input.updatedPaths,
    ...input.unchangedPaths,
  ];
  const writeSet = await verifyNeutronMutationWriteSet({
    root: input.root,
    fs: input.fs,
    approvedChangedPaths: input.approvedChangedPaths,
    accountedPaths,
    hiddenMetadataExistedBefore: input.hiddenMetadataExistedBefore,
  });
  return buildNeutronMutationVerificationEvidence({
    transactionId: input.transactionId,
    approvalId: input.approvalId,
    reviewArtifactDigest: input.reviewArtifactDigest,
    planDigest: input.planDigest,
    projectId: input.projectId,
    rootIdentity: input.root,
    preApplyProjectStateDigest: input.preApplyProjectStateDigest,
    postApplyProjectStateDigest: observedDigest,
    approvedChangedPaths: input.approvedChangedPaths,
    observedChangedPaths: [...input.createdPaths, ...input.updatedPaths],
    fileBindings: input.fileBindings,
    byteChecks: input.applied ? byteChecks : [],
    writeSet: input.applied
      ? writeSet
      : {
          status: "not-applicable",
          undeclaredPaths: [],
          missingApprovedPaths: [],
        },
    applied: input.applied,
    rollback,
    verifiedAt: input.now?.() ?? Date.now(),
    extraDiagnostics,
  });
}

async function verifyRollbackState(
  input: NeutronMutationVerificationInput,
  observedDigest: string,
): Promise<NeutronMutationRollbackProjection> {
  if (!input.rollback.attempted) return input.rollback;
  const verified =
    input.rollback.completed &&
    input.rollback.failedPaths.length === 0 &&
    observedDigest === input.preApplyProjectStateDigest;
  return {
    ...input.rollback,
    verified,
    postRollbackProjectStateDigest: observedDigest,
  };
}

function concurrentEditDiagnostics(
  input: NeutronMutationVerificationInput,
  observedDigest: string,
): readonly string[] {
  if (input.committedProjectStateDigest === undefined) return [];
  if (input.committedProjectStateDigest === observedDigest) return [];
  return ["project-changed-after-apply"];
}
