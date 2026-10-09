import {
  canonicalNeutronMutationJson,
  neutronMutationContentDigest,
} from "../../../../../validator/src/neutron-mutation-canonical.js";
import { NEUTRON_MUTATION_APPROVAL_MAX_LIFETIME_MS } from "../approval/neutron-mutation-approval-issue-types.js";

export const NEUTRON_MUTATION_UNDO_CLASS = "undo" as const;

export interface HostUndoApprovalBinding {
  readonly path: string;
  readonly digest: string;
}

export interface HostUndoApprovalPayloadBinding {
  readonly path: string;
  readonly payloadDigest: string | null;
}

/**
 * Host-only Undo approval. `approvalToken` never leaves the application
 * process. An Apply approval is a different mutation class and cannot
 * satisfy `isHostUndoApproval`.
 */
export interface HostUndoApproval {
  readonly mutationClass: typeof NEUTRON_MUTATION_UNDO_CLASS;
  readonly approvalId: string;
  readonly approvalDigest: string;
  readonly approvalToken: string;
  readonly originalTransactionId: string;
  readonly undoTransactionId: string;
  readonly root: string;
  readonly projectId: string;
  readonly sessionId: string;
  readonly graphId: string;
  readonly proposalId: string;
  readonly pathSetDigest: string;
  readonly snapshotManifestDigest: string;
  readonly expectedContentDigests: readonly HostUndoApprovalBinding[];
  readonly restorationPayloadDigests: readonly HostUndoApprovalPayloadBinding[];
  readonly approvedAt: number;
  readonly approvalValidUntil: number;
}

export interface HostUndoApprovalFacts {
  readonly originalTransactionId: string;
  readonly undoTransactionId: string;
  readonly root: string;
  readonly projectId: string;
  readonly sessionId: string;
  readonly graphId: string;
  readonly proposalId: string;
  readonly pathSetDigest: string;
  readonly snapshotManifestDigest: string;
  readonly expectedContentDigests: readonly HostUndoApprovalBinding[];
  readonly restorationPayloadDigests: readonly HostUndoApprovalPayloadBinding[];
  readonly now: number;
}

export function issueHostUndoApproval(
  facts: HostUndoApprovalFacts,
): HostUndoApproval {
  const unsigned = unsignedApproval(facts);
  const approvalDigest = neutronMutationContentDigest(
    canonicalNeutronMutationJson(unsigned),
  );
  return {
    ...unsigned,
    approvalDigest,
    approvalToken: `approved:${approvalDigest}`,
  };
}

export function isHostUndoApproval(
  value: HostUndoApproval,
  now: number,
): boolean {
  if (value.mutationClass !== NEUTRON_MUTATION_UNDO_CLASS) return false;
  if (value.approvalValidUntil < now) return false;
  const unsigned = unsignedFrom(value);
  const digest = neutronMutationContentDigest(
    canonicalNeutronMutationJson(unsigned),
  );
  return (
    value.approvalDigest === digest &&
    value.approvalToken === `approved:${digest}`
  );
}

function unsignedApproval(facts: HostUndoApprovalFacts) {
  return {
    mutationClass: NEUTRON_MUTATION_UNDO_CLASS,
    approvalId: neutronMutationContentDigest(
      canonicalNeutronMutationJson({
        kind: "neutron-mutation-undo-approval-id",
        originalTransactionId: facts.originalTransactionId,
        undoTransactionId: facts.undoTransactionId,
        snapshotManifestDigest: facts.snapshotManifestDigest,
      }),
    ),
    originalTransactionId: facts.originalTransactionId,
    undoTransactionId: facts.undoTransactionId,
    root: facts.root,
    projectId: facts.projectId,
    sessionId: facts.sessionId,
    graphId: facts.graphId,
    proposalId: facts.proposalId,
    pathSetDigest: facts.pathSetDigest,
    snapshotManifestDigest: facts.snapshotManifestDigest,
    expectedContentDigests: facts.expectedContentDigests.map((entry) => ({
      path: entry.path,
      digest: entry.digest,
    })),
    restorationPayloadDigests: facts.restorationPayloadDigests.map((entry) => ({
      path: entry.path,
      payloadDigest: entry.payloadDigest,
    })),
    approvedAt: facts.now,
    approvalValidUntil: facts.now + NEUTRON_MUTATION_APPROVAL_MAX_LIFETIME_MS,
  };
}

function unsignedFrom(approval: HostUndoApproval) {
  return {
    mutationClass: NEUTRON_MUTATION_UNDO_CLASS,
    approvalId: approval.approvalId,
    originalTransactionId: approval.originalTransactionId,
    undoTransactionId: approval.undoTransactionId,
    root: approval.root,
    projectId: approval.projectId,
    sessionId: approval.sessionId,
    graphId: approval.graphId,
    proposalId: approval.proposalId,
    pathSetDigest: approval.pathSetDigest,
    snapshotManifestDigest: approval.snapshotManifestDigest,
    expectedContentDigests: approval.expectedContentDigests.map((entry) => ({
      path: entry.path,
      digest: entry.digest,
    })),
    restorationPayloadDigests: approval.restorationPayloadDigests.map(
      (entry) => ({
        path: entry.path,
        payloadDigest: entry.payloadDigest,
      }),
    ),
    approvedAt: approval.approvedAt,
    approvalValidUntil: approval.approvalValidUntil,
  };
}
