import type { NeutronMutationReviewFileBinding } from "../../protocol/src/neutron-mutation-review-artifact.js";
import {
  NEUTRON_MUTATION_VERIFICATION_EVIDENCE_SCHEMA_URN,
  type NeutronMutationByteCheck,
  type NeutronMutationCheckStatus,
  type NeutronMutationProjectStateChange,
  type NeutronMutationRollbackProjection,
  type NeutronMutationVerificationEvidence,
  type NeutronMutationVerificationStatus,
  type NeutronMutationWriteSetVerification,
} from "../../protocol/src/neutron-mutation-verification.js";
import { digestNeutronMutationVerificationEvidence } from "../../validator/src/neutron-mutation-verification-digest.js";
import { validateNeutronMutationVerificationEvidence } from "../../validator/src/neutron-mutation-verification.js";

export interface NeutronMutationVerificationFacts {
  readonly transactionId: string;
  readonly approvalId: string;
  readonly reviewArtifactDigest: string;
  readonly planDigest: string;
  readonly projectId: string;
  readonly rootIdentity: string;
  readonly preApplyProjectStateDigest: string;
  readonly postApplyProjectStateDigest?: string;
  readonly approvedChangedPaths: readonly string[];
  readonly observedChangedPaths: readonly string[];
  readonly fileBindings: readonly NeutronMutationReviewFileBinding[];
  readonly byteChecks: readonly NeutronMutationByteCheck[];
  readonly writeSet: NeutronMutationWriteSetVerification;
  readonly applied: boolean;
  readonly rollback: NeutronMutationRollbackProjection;
  readonly verifiedAt: number;
  readonly extraDiagnostics?: readonly string[];
}

export function buildNeutronMutationVerificationEvidence(
  facts: NeutronMutationVerificationFacts,
): NeutronMutationVerificationEvidence {
  const verifiedPaths = facts.byteChecks
    .filter((check) => check.matched)
    .map((check) => check.path);
  const byteStatus = byteStatusFor(facts.applied, facts.byteChecks);
  const projectStateChange = projectStateFor(facts);
  const rollback = facts.rollback;
  const diagnostics = [
    ...(facts.extraDiagnostics ?? []),
    ...byteDiagnostics(facts.byteChecks),
    ...writeSetDiagnostics(facts.writeSet),
  ];
  const status = decideStatus({
    applied: facts.applied,
    byteStatus,
    writeSet: facts.writeSet.status,
    rollback,
    diagnostics,
  });
  const unsigned = {
    schemaVersion: NEUTRON_MUTATION_VERIFICATION_EVIDENCE_SCHEMA_URN,
    evidenceId: `${facts.transactionId}:verification`,
    transactionId: facts.transactionId,
    approvalId: facts.approvalId,
    reviewArtifactDigest: facts.reviewArtifactDigest,
    planDigest: facts.planDigest,
    projectId: facts.projectId,
    rootIdentity: facts.rootIdentity,
    preApplyProjectStateDigest: facts.preApplyProjectStateDigest,
    ...(facts.postApplyProjectStateDigest !== undefined
      ? { postApplyProjectStateDigest: facts.postApplyProjectStateDigest }
      : {}),
    projectStateChange,
    approvedChangedPaths: facts.approvedChangedPaths,
    observedChangedPaths: facts.observedChangedPaths,
    verifiedPaths,
    status,
    applied: facts.applied,
    byteVerification: { status: byteStatus, files: facts.byteChecks },
    writeSetVerification: facts.writeSet,
    consistencyVerification: {
      status: facts.applied ? byteStatus : rollbackStatus(rollback),
      code: "independent-filesystem-read" as const,
    },
    rollback,
    reconciliationRequired: status !== "verified",
    verifiedAt: facts.verifiedAt,
    diagnostics,
  };
  return validateNeutronMutationVerificationEvidence({
    ...unsigned,
    evidenceDigest: digestNeutronMutationVerificationEvidence(unsigned),
  });
}

function byteStatusFor(
  applied: boolean,
  checks: readonly NeutronMutationByteCheck[],
): NeutronMutationCheckStatus {
  if (!applied) return "not-applicable";
  if (checks.length === 0) return "incomplete";
  if (checks.some((check) => check.actualContentDigest === undefined)) {
    return "incomplete";
  }
  return checks.every((check) => check.matched) ? "matched" : "mismatched";
}

function rollbackStatus(
  rollback: NeutronMutationRollbackProjection,
): NeutronMutationCheckStatus {
  if (!rollback.attempted) return "not-applicable";
  if (rollback.verified) return "matched";
  if (!rollback.completed) return "mismatched";
  return "incomplete";
}

function projectStateFor(
  facts: NeutronMutationVerificationFacts,
): NeutronMutationProjectStateChange {
  if (facts.postApplyProjectStateDigest === undefined) return "unknown";
  if (facts.postApplyProjectStateDigest === facts.preApplyProjectStateDigest) {
    return "unchanged";
  }
  return "changed";
}

function decideStatus(input: {
  readonly applied: boolean;
  readonly byteStatus: NeutronMutationCheckStatus;
  readonly writeSet: NeutronMutationCheckStatus;
  readonly rollback: NeutronMutationRollbackProjection;
  readonly diagnostics: readonly string[];
}): NeutronMutationVerificationStatus {
  if (input.diagnostics.includes("project-changed-after-apply")) {
    return "verification-incomplete";
  }
  if (!input.applied) return decideFailedTransaction(input.rollback);
  if (input.byteStatus === "matched" && input.writeSet === "matched") {
    return "verified";
  }
  if (input.byteStatus === "incomplete" || input.writeSet === "incomplete") {
    return "verification-incomplete";
  }
  return "verification-failed";
}

function decideFailedTransaction(
  rollback: NeutronMutationRollbackProjection,
): NeutronMutationVerificationStatus {
  if (!rollback.completed || rollback.failedPaths.length > 0) {
    return "reconciliation-required";
  }
  if (rollback.verified) return "verified";
  return "reconciliation-required";
}

function byteDiagnostics(
  checks: readonly NeutronMutationByteCheck[],
): string[] {
  return checks
    .filter((check) => !check.matched)
    .map((check) => `byte-mismatch:${check.path}`);
}

function writeSetDiagnostics(
  writeSet: NeutronMutationWriteSetVerification,
): string[] {
  return [
    ...writeSet.undeclaredPaths.map((path) => `undeclared-write:${path}`),
    ...writeSet.missingApprovedPaths.map(
      (path) => `missing-approved-path:${path}`,
    ),
  ];
}
