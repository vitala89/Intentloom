import {
  NEUTRON_MUTATION_APPLY_FAILURE_CODES,
  NEUTRON_MUTATION_APPLY_RESULT_SCHEMA_URN,
  NEUTRON_MUTATION_APPLY_STATUSES,
  type NeutronMutationApplyResult,
} from "../../protocol/src/neutron-mutation-apply.js";
import { assertNeutronMutationDigest } from "./neutron-mutation-canonical.js";
import { validateNeutronMutationVerificationEvidence } from "./neutron-mutation-verification.js";
import {
  isObject,
  nonEmpty,
  oneOf,
  strings,
} from "./neutron-runtime-helpers.js";

export function validateNeutronMutationApplyResult(
  value: unknown,
): NeutronMutationApplyResult {
  if (!isObject(value)) {
    throw new Error("mutation apply result must be an object");
  }
  if (value.schemaVersion !== NEUTRON_MUTATION_APPLY_RESULT_SCHEMA_URN) {
    throw new Error("unsupported neutron mutation apply result schema");
  }
  rejectSecretFields(value);
  const status = oneOf(value.status, NEUTRON_MUTATION_APPLY_STATUSES, "status");
  const applied = value.applied === true;
  const success = status === "applied" || status === "replay-recovered";
  if (applied && !success) {
    throw new Error("applied true is only valid for successful statuses");
  }
  if (!applied && status === "applied") {
    throw new Error("status applied requires applied true");
  }
  const failureCode =
    value.failureCode === undefined
      ? undefined
      : oneOf(
          value.failureCode,
          NEUTRON_MUTATION_APPLY_FAILURE_CODES,
          "failureCode",
        );
  if (applied && failureCode !== undefined) {
    throw new Error("successful apply result must not include failureCode");
  }
  if (!applied && failureCode === undefined && status !== "replay-recovered") {
    throw new Error("unsuccessful apply result must include failureCode");
  }
  const verification =
    value.verification === undefined
      ? undefined
      : validateNeutronMutationVerificationEvidence(value.verification);
  const verificationStatus =
    value.verificationStatus === undefined
      ? undefined
      : oneOf(
          value.verificationStatus,
          [
            "verified",
            "verification-failed",
            "verification-incomplete",
            "reconciliation-required",
          ] as const,
          "verificationStatus",
        );
  const verificationEvidenceDigest =
    value.verificationEvidenceDigest === undefined
      ? undefined
      : assertNeutronMutationDigest(
          value.verificationEvidenceDigest,
          "verificationEvidenceDigest",
        );
  bindVerificationFields({
    applied,
    reconciliationRequired: value.reconciliationRequired === true,
    transactionId: nonEmpty(value.transactionId, "transactionId"),
    approvalId: nonEmpty(value.approvalId, "approvalId"),
    ...(verification !== undefined ? { verification } : {}),
    ...(verificationStatus !== undefined ? { verificationStatus } : {}),
    ...(verificationEvidenceDigest !== undefined
      ? { verificationEvidenceDigest }
      : {}),
  });
  return {
    schemaVersion: NEUTRON_MUTATION_APPLY_RESULT_SCHEMA_URN,
    transactionId: nonEmpty(value.transactionId, "transactionId"),
    approvalId: nonEmpty(value.approvalId, "approvalId"),
    reviewArtifactDigest: assertNeutronMutationDigest(
      value.reviewArtifactDigest,
      "reviewArtifactDigest",
    ),
    planDigest: assertNeutronMutationDigest(value.planDigest, "planDigest"),
    status,
    applied,
    changedPaths: strings(value.changedPaths, "changedPaths"),
    createdPaths: strings(value.createdPaths, "createdPaths"),
    updatedPaths: strings(value.updatedPaths, "updatedPaths"),
    unchangedPaths: strings(value.unchangedPaths, "unchangedPaths"),
    rollbackCompleted: value.rollbackCompleted === true,
    reconciliationRequired: value.reconciliationRequired === true,
    ...(failureCode !== undefined ? { failureCode } : {}),
    diagnostics: strings(value.diagnostics, "diagnostics"),
    ...(verificationStatus !== undefined ? { verificationStatus } : {}),
    ...(verificationEvidenceDigest !== undefined
      ? { verificationEvidenceDigest }
      : {}),
    ...(verification !== undefined ? { verification } : {}),
  };
}

function rejectSecretFields(value: Record<string, unknown>): void {
  if (Object.hasOwn(value, "approvalToken")) {
    throw new Error("mutation apply result must not include approvalToken");
  }
  if (Object.hasOwn(value, "previousContent")) {
    throw new Error("mutation apply result must not include previousContent");
  }
  if (Object.hasOwn(value, "grantedApprovals")) {
    throw new Error("mutation apply result must not include grantedApprovals");
  }
}

function bindVerificationFields(input: {
  readonly applied: boolean;
  readonly reconciliationRequired: boolean;
  readonly verification?: NeutronMutationApplyResult["verification"];
  readonly verificationStatus?: NeutronMutationApplyResult["verificationStatus"];
  readonly verificationEvidenceDigest?: string;
  readonly transactionId: string;
  readonly approvalId: string;
}): void {
  const evidence = input.verification;
  if (evidence === undefined) return;
  if (evidence.applied !== input.applied) {
    throw new Error("verification applied flag must match apply result");
  }
  if (evidence.transactionId !== input.transactionId) {
    throw new Error("verification evidence is bound to another transaction");
  }
  if (evidence.approvalId !== input.approvalId) {
    throw new Error("verification evidence is bound to another approval");
  }
  if (
    input.verificationStatus !== undefined &&
    input.verificationStatus !== evidence.status
  ) {
    throw new Error("verificationStatus must match nested evidence");
  }
  if (
    input.verificationEvidenceDigest !== undefined &&
    input.verificationEvidenceDigest !== evidence.evidenceDigest
  ) {
    throw new Error("verificationEvidenceDigest must match nested evidence");
  }
  if (evidence.reconciliationRequired !== input.reconciliationRequired) {
    throw new Error("verification reconciliation flag must match apply result");
  }
}
