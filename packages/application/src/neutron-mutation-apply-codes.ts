import type { NeutronMutationApplyFailureCode } from "../../protocol/src/neutron-mutation-apply.js";
import type { NeutronMutationPreflightRejectionReason } from "../../protocol/src/neutron-mutation.js";
import type { MutationPayloadVerificationCode } from "./neutron-mutation-review-payload.js";

export function mapPreflightReasonToApplyCode(
  reason: NeutronMutationPreflightRejectionReason,
): NeutronMutationApplyFailureCode {
  switch (reason) {
    case "invalid-approval":
    case "capability-denied":
      return "approval-invalid";
    case "approval-expired":
      return "approval-expired";
    case "replayed-approval":
      return "approval-consumed";
    case "proposal-digest-mismatch":
      return "artifact-mismatch";
    case "approval-scope-mismatch":
    case "affected-path-mismatch":
      return "path-scope-mismatch";
    case "root-mismatch":
      return "containment-failed";
    case "project-state-mismatch":
      return "project-stale";
    case "cancelled":
      return "cancelled-before-write";
    default:
      return "approval-invalid";
  }
}

export function mapPayloadCodeToApplyCode(
  code: MutationPayloadVerificationCode,
): NeutronMutationApplyFailureCode {
  switch (code) {
    case "content-mismatch":
    case "digest-mismatch":
      return "content-mismatch";
    case "artifact-digest-mismatch":
      return "artifact-mismatch";
    case "root-mismatch":
      return "containment-failed";
    case "extra-path":
    case "path-missing":
    case "duplicate-path":
    case "path-normalization-mismatch":
      return "path-scope-mismatch";
    default:
      return "artifact-mismatch";
  }
}
