import {
  NEUTRON_MUTATION_CHECK_STATUSES,
  NEUTRON_MUTATION_PROJECT_STATE_CHANGES,
  NEUTRON_MUTATION_VERIFICATION_EVIDENCE_SCHEMA_URN,
  NEUTRON_MUTATION_VERIFICATION_STATUSES,
  type NeutronMutationByteCheck,
  type NeutronMutationRollbackProjection,
  type NeutronMutationVerificationEvidence,
} from "../../protocol/src/neutron-mutation-verification.js";
import { assertNeutronMutationDigest } from "./neutron-mutation-canonical.js";
import { digestNeutronMutationVerificationEvidence } from "./neutron-mutation-verification-digest.js";
import {
  isObject,
  nonEmpty,
  oneOf,
  strings,
} from "./neutron-runtime-helpers.js";

const SECRET_KEYS = [
  "approvalToken",
  "previousContent",
  "grantedApprovals",
  "prompt",
  "reasoning",
  "content",
] as const;

export function validateNeutronMutationVerificationEvidence(
  value: unknown,
): NeutronMutationVerificationEvidence {
  if (!isObject(value)) {
    throw new Error("mutation verification evidence must be an object");
  }
  if (
    value.schemaVersion !== NEUTRON_MUTATION_VERIFICATION_EVIDENCE_SCHEMA_URN
  ) {
    throw new Error("unsupported neutron mutation verification schema");
  }
  rejectSecretKeys(value);
  const applied = value.applied === true;
  const status = oneOf(
    value.status,
    NEUTRON_MUTATION_VERIFICATION_STATUSES,
    "status",
  );
  const reconciliationRequired = value.reconciliationRequired === true;
  if (status === "verified" && reconciliationRequired) {
    throw new Error("verified evidence must not require reconciliation");
  }
  if (status === "reconciliation-required" && !reconciliationRequired) {
    throw new Error("reconciliation-required evidence must set the flag");
  }
  const unsigned = {
    schemaVersion: NEUTRON_MUTATION_VERIFICATION_EVIDENCE_SCHEMA_URN,
    evidenceId: nonEmpty(value.evidenceId, "evidenceId"),
    transactionId: nonEmpty(value.transactionId, "transactionId"),
    approvalId: nonEmpty(value.approvalId, "approvalId"),
    reviewArtifactDigest: assertNeutronMutationDigest(
      value.reviewArtifactDigest,
      "reviewArtifactDigest",
    ),
    planDigest: assertNeutronMutationDigest(value.planDigest, "planDigest"),
    projectId: nonEmpty(value.projectId, "projectId"),
    rootIdentity: nonEmpty(value.rootIdentity, "rootIdentity"),
    preApplyProjectStateDigest: assertNeutronMutationDigest(
      value.preApplyProjectStateDigest,
      "preApplyProjectStateDigest",
    ),
    ...(value.postApplyProjectStateDigest !== undefined
      ? {
          postApplyProjectStateDigest: assertNeutronMutationDigest(
            value.postApplyProjectStateDigest,
            "postApplyProjectStateDigest",
          ),
        }
      : {}),
    projectStateChange: oneOf(
      value.projectStateChange,
      NEUTRON_MUTATION_PROJECT_STATE_CHANGES,
      "projectStateChange",
    ),
    approvedChangedPaths: strings(
      value.approvedChangedPaths,
      "approvedChangedPaths",
    ),
    observedChangedPaths: strings(
      value.observedChangedPaths,
      "observedChangedPaths",
    ),
    verifiedPaths: strings(value.verifiedPaths, "verifiedPaths"),
    status,
    applied,
    byteVerification: validateByteVerification(value.byteVerification),
    writeSetVerification: validateWriteSet(value.writeSetVerification),
    consistencyVerification: validateConsistency(value.consistencyVerification),
    rollback: validateRollback(value.rollback),
    reconciliationRequired,
    verifiedAt: assertTimestamp(value.verifiedAt, "verifiedAt"),
    diagnostics: strings(value.diagnostics, "diagnostics"),
  };
  const evidenceDigest = assertNeutronMutationDigest(
    value.evidenceDigest,
    "evidenceDigest",
  );
  if (evidenceDigest !== digestNeutronMutationVerificationEvidence(unsigned)) {
    throw new Error("mutation verification evidence digest mismatch");
  }
  return { ...unsigned, evidenceDigest };
}

function validateByteVerification(value: unknown) {
  if (!isObject(value)) throw new Error("byteVerification must be an object");
  rejectSecretKeys(value);
  if (!Array.isArray(value.files)) {
    throw new Error("byteVerification.files must be an array");
  }
  return {
    status: oneOf(value.status, NEUTRON_MUTATION_CHECK_STATUSES, "byteStatus"),
    files: value.files.map((entry, index) =>
      validateByteCheck(entry, `byteVerification.files[${index}]`),
    ),
  };
}

function validateByteCheck(
  value: unknown,
  field: string,
): NeutronMutationByteCheck {
  if (!isObject(value)) throw new Error(`${field} must be an object`);
  rejectSecretKeys(value);
  const actual =
    value.actualContentDigest === undefined
      ? undefined
      : assertNeutronMutationDigest(
          value.actualContentDigest,
          `${field}.actualContentDigest`,
        );
  return {
    path: nonEmpty(value.path, `${field}.path`),
    expectedContentDigest: assertNeutronMutationDigest(
      value.expectedContentDigest,
      `${field}.expectedContentDigest`,
    ),
    ...(actual !== undefined ? { actualContentDigest: actual } : {}),
    existed: value.existed === true,
    matched: value.matched === true,
  };
}

function validateWriteSet(value: unknown) {
  if (!isObject(value)) {
    throw new Error("writeSetVerification must be an object");
  }
  rejectSecretKeys(value);
  return {
    status: oneOf(
      value.status,
      NEUTRON_MUTATION_CHECK_STATUSES,
      "writeSetStatus",
    ),
    undeclaredPaths: strings(value.undeclaredPaths, "undeclaredPaths"),
    missingApprovedPaths: strings(
      value.missingApprovedPaths,
      "missingApprovedPaths",
    ),
  };
}

function validateConsistency(value: unknown) {
  if (!isObject(value)) {
    throw new Error("consistencyVerification must be an object");
  }
  rejectSecretKeys(value);
  if (value.code !== "independent-filesystem-read") {
    throw new Error("consistencyVerification.code is unsupported");
  }
  return {
    status: oneOf(
      value.status,
      NEUTRON_MUTATION_CHECK_STATUSES,
      "consistencyStatus",
    ),
    code: "independent-filesystem-read" as const,
  };
}

function validateRollback(value: unknown): NeutronMutationRollbackProjection {
  if (!isObject(value)) throw new Error("rollback must be an object");
  rejectSecretKeys(value);
  const previous =
    value.previousContentDigests === undefined
      ? []
      : validatePreviousDigests(value.previousContentDigests);
  const post =
    value.postRollbackProjectStateDigest === undefined
      ? undefined
      : assertNeutronMutationDigest(
          value.postRollbackProjectStateDigest,
          "postRollbackProjectStateDigest",
        );
  return {
    attempted: value.attempted === true,
    completed: value.completed === true,
    verified: value.verified === true,
    createdPaths: strings(value.createdPaths, "rollback.createdPaths"),
    restoredPaths: strings(value.restoredPaths, "rollback.restoredPaths"),
    failedPaths: strings(value.failedPaths, "rollback.failedPaths"),
    previousContentDigests: previous,
    ...(post !== undefined ? { postRollbackProjectStateDigest: post } : {}),
  };
}

function validatePreviousDigests(
  value: unknown,
): NeutronMutationVerificationEvidence["rollback"]["previousContentDigests"] {
  if (!Array.isArray(value)) {
    throw new Error("previousContentDigests must be an array");
  }
  return value.map((entry, index) => {
    if (!isObject(entry)) {
      throw new Error(`previousContentDigests[${index}] must be an object`);
    }
    rejectSecretKeys(entry);
    const existedBefore = entry.existedBefore === true;
    const digest =
      entry.digest === null
        ? null
        : assertNeutronMutationDigest(
            entry.digest,
            `previousContentDigests[${index}].digest`,
          );
    if (!existedBefore && digest !== null) {
      throw new Error("create paths must not claim a previous content digest");
    }
    return {
      path: nonEmpty(entry.path, `previousContentDigests[${index}].path`),
      existedBefore,
      restored: entry.restored === true,
      digest,
    };
  });
}

function rejectSecretKeys(value: Record<string, unknown>): void {
  for (const key of SECRET_KEYS) {
    if (Object.hasOwn(value, key)) {
      throw new Error(`verification evidence must not include ${key}`);
    }
  }
}

function assertTimestamp(value: unknown, field: string): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    throw new Error(`${field} must be a finite non-negative number`);
  }
  return value;
}
