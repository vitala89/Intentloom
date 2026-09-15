import type { GeneratedFile } from "@intentloom/core";
import type { NeutronMutationApplyFailureCode } from "../../protocol/src/neutron-mutation-apply.js";
import type {
  NeutronMutationApproval,
  NeutronMutationProposal,
} from "../../protocol/src/neutron-mutation.js";
import type { NeutronMutationReviewArtifact } from "../../protocol/src/neutron-mutation-review-artifact.js";
import { validateNeutronMutationApproval } from "../../validator/src/neutron-mutation-approval.js";
import { validateNeutronMutationProposal } from "../../validator/src/neutron-mutation.js";
import { validateNeutronMutationReviewArtifact } from "../../validator/src/neutron-mutation-review-artifact.js";
import type { NeutronMutationAuthorizationInput } from "./neutron-mutation-authorization.js";

const FORBIDDEN_ENVELOPE_KEYS = [
  "grantedApprovals",
  "approved",
  "mutationAllowed",
] as const;

export interface ParsedNeutronMutationApplyRequest {
  readonly proposal: NeutronMutationProposal;
  readonly approval: NeutronMutationApproval;
  readonly artifact: NeutronMutationReviewArtifact;
  readonly files: readonly GeneratedFile[];
  readonly transactionId: string;
  readonly authorization: NeutronMutationAuthorizationInput;
}

export function parseNeutronMutationApplyEnvelope(value: unknown): {
  readonly request?: ParsedNeutronMutationApplyRequest;
  readonly reason?: NeutronMutationApplyFailureCode;
} {
  if (typeof value !== "object" || value === null) {
    return { reason: "approval-invalid" };
  }
  const record = value as Record<string, unknown>;
  for (const key of FORBIDDEN_ENVELOPE_KEYS) {
    if (Object.hasOwn(record, key)) return { reason: "approval-invalid" };
  }
  if (typeof record.transactionId !== "string" || record.transactionId === "") {
    return { reason: "approval-invalid" };
  }
  if (!Array.isArray(record.files)) return { reason: "artifact-mismatch" };
  try {
    const proposal = validateNeutronMutationProposal(record.proposal);
    const approval = validateNeutronMutationApproval(record.approval);
    const artifact = validateNeutronMutationReviewArtifact(record.artifact);
    const authorization =
      record.authorization as NeutronMutationAuthorizationInput;
    if (
      authorization === undefined ||
      typeof authorization !== "object" ||
      authorization === null
    ) {
      return { reason: "approval-invalid" };
    }
    if (authorization.kind !== "host") return { reason: "approval-invalid" };
    if (approval.reviewArtifactDigest === undefined) {
      return { reason: "approval-invalid" };
    }
    return {
      request: {
        proposal,
        approval,
        artifact,
        files: record.files as readonly GeneratedFile[],
        transactionId: record.transactionId,
        authorization,
      },
    };
  } catch {
    return { reason: "approval-invalid" };
  }
}
